import assert from 'node:assert/strict'
import { stat, readFile, writeFile, mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { SshStore } from '../lib/store.js'

async function freshStore() {
  const home = await mkdtemp(join(tmpdir(), 'dsh-ssh-store-test-'))
  const store = new SshStore({ home })
  await store.init()
  return { home, store }
}

test('generates a key, stores metadata privately, and hides secrets', async () => {
  const { store } = await freshStore()
  const server = await store.saveServer({
    name: 'prod', host: '10.0.0.8', port: 2222, username: 'deploy', auth: 'key',
    generateKey: true, description: 'production',
  })
  assert.equal(server.keySource, 'generated')
  assert.match(server.publicKey, /^ssh-ed25519 /)
  assert.equal(server.keyPath, undefined)
  assert.equal('passphrase' in server, false)
  assert.equal('privateKeyPath' in server, false)
  const config = await store._readConfig()
  const stored = config.servers[0]
  assert.ok(stored.privateKeyPath.endsWith(server.id))
  assert.equal((await stat(store.configPath)).mode & 0o777, 0o600)
  assert.equal((await stat(stored.privateKeyPath)).mode & 0o777, 0o600)
})

test('rejects duplicate names and invalid hosts', async () => {
  const { store } = await freshStore()
  await store.saveServer({ name: 'one', host: 'host.example', username: 'u', auth: 'key', generateKey: true })
  await assert.rejects(
    store.saveServer({ name: 'ONE', host: 'other.example', username: 'u', auth: 'key', generateKey: true }),
    /同名/,
  )
  await assert.rejects(
    store.saveServer({ name: 'bad', host: 'host with space', username: 'u', auth: 'key', generateKey: true }),
    /主机地址/,
  )
})

test('updates metadata without replacing a preserved key', async () => {
  const { store } = await freshStore()
  const created = await store.saveServer({ name: 'keep', host: 'host.example', username: 'u', auth: 'key', generateKey: true })
  const updated = await store.saveServer({ id: created.id, name: 'kept', host: 'host.example', port: 2200, username: 'u', auth: 'key' })
  assert.equal(updated.name, 'kept')
  assert.equal(updated.publicKey, created.publicKey)
  assert.equal(updated.port, 2200)
  assert.equal((await store._readConfig()).servers.length, 1)
})

test('uses an external private-key path without copying it', async () => {
  const { store } = await freshStore()
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const run = promisify(execFile)
  const external = join(store.dataDir, '..', 'external-key')
  await run('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', external])
  const server = await store.saveServer({ name: 'external', host: 'host.example', username: 'u', auth: 'key', privateKeyPath: external })
  assert.equal(server.keySource, 'path')
  assert.equal(server.keyPath, external)
  assert.match(server.publicKey, /^ssh-ed25519 /)
  const config = await store._readConfig()
  assert.equal(config.servers[0].privateKeyPath, external)
})

test('removing a server removes its managed key but not an external one', async () => {
  const { store } = await freshStore()
  const created = await store.saveServer({ name: 'delete-me', host: 'host.example', username: 'u', auth: 'key', generateKey: true })
  const config = await store._readConfig()
  const keyPath = config.servers[0].privateKeyPath
  await store.removeServer(created.id)
  assert.equal((await store.listServers()).length, 0)
  await assert.rejects(stat(keyPath), /ENOENT/)

  const external = join(store.dataDir, '..', 'keep-key')
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  await promisify(execFile)('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', external])
  const second = await store.saveServer({ name: 'external-keep', host: 'host.example', username: 'u', auth: 'key', privateKeyPath: external })
  await store.removeServer(second.id)
  assert.ok((await stat(external)).isFile())
})

test('supports agent auth without key material', async () => {
  const { store } = await freshStore()
  const server = await store.saveServer({ name: 'agent', host: 'host.example', username: 'u', auth: 'agent' })
  assert.equal(server.auth, 'agent')
  assert.equal(server.hasKey, false)
  assert.equal(server.keySource, 'agent')
  assert.deepEqual(await readdir(store.keysDir), [])
})

test('reports malformed configuration instead of overwriting it', async () => {
  const { store } = await freshStore()
  await writeFile(store.configPath, '{ broken', { mode: 0o600 })
  await assert.rejects(store.listServers(), /不是有效 JSON/)
  assert.equal(await readFile(store.configPath, 'utf8'), '{ broken')
})

test('stores password authentication separately and never exposes the password', async () => {
  const { store } = await freshStore()
  const created = await store.saveServer({
    name: 'password-host', host: 'host.example', port: 22, username: 'tester',
    auth: 'password', password: 'p@ss word',
  })
  assert.equal(created.auth, 'password')
  assert.equal(created.hasPassword, true)
  assert.equal(created.hasKey, false)
  assert.equal('password' in created, false)
  assert.equal(JSON.stringify(created).includes('p@ss word'), false)

  const configText = await readFile(store.configPath, 'utf8')
  assert.equal(configText.includes('p@ss word'), false)
  const secretsText = await readFile(store.secretsPath, 'utf8')
  assert.equal(JSON.parse(secretsText).passwords[created.id], 'p@ss word')
  assert.equal((await stat(store.secretsPath)).mode & 0o777, 0o600)

  const full = await store.resolveServer(created.id)
  assert.equal(full.password, 'p@ss word')
  const listed = await store.listServers()
  assert.equal('password' in listed[0], false)
  assert.equal(JSON.stringify(listed).includes('p@ss word'), false)

  const kept = await store.saveServer({ id: created.id, name: 'password-host-2', host: 'host.example', port: 22, username: 'tester', auth: 'password' })
  assert.equal(kept.hasPassword, true)
  assert.equal((await store.resolveServer(created.id)).password, 'p@ss word')

  await store.saveServer({ id: created.id, name: 'password-host-2', host: 'host.example', port: 22, username: 'tester', auth: 'password', password: 'new secret' })
  assert.equal((await store.resolveServer(created.id)).password, 'new secret')

  await store.saveServer({ id: created.id, name: 'password-host-2', host: 'host.example', port: 22, username: 'tester', auth: 'agent' })
  assert.equal(JSON.parse(await readFile(store.secretsPath, 'utf8')).passwords[created.id], undefined)
})

test('requires a password for new password authentication and removes it with the server', async () => {
  const { store } = await freshStore()
  await assert.rejects(
    store.saveServer({ name: 'missing', host: 'host.example', username: 'u', auth: 'password' }),
    /需要填写登录密码/,
  )
  const created = await store.saveServer({ name: 'remove-password', host: 'host.example', username: 'u', auth: 'password', password: 'secret' })
  await store.removeServer(created.id)
  assert.equal(JSON.parse(await readFile(store.secretsPath, 'utf8')).passwords[created.id], undefined)
})
