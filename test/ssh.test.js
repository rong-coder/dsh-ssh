import assert from 'node:assert/strict'
import { chmod, mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import test from 'node:test'
import { remoteCommand, execRemote, testRemote, shellQuote } from '../lib/ssh.js'
import { SshStore } from '../lib/store.js'

async function fakeServer() {
  const home = await mkdtemp(join(tmpdir(), 'dsh-ssh-runner-test-'))
  const store = new SshStore({ home })
  await store.init()
  const server = await store.saveServer({
    name: 'fake', host: 'host.example', port: 2222, username: 'tester', auth: 'key', generateKey: true,
  })
  return { store, server: await store.resolveServer(server.id) }
}

/** Put a fake `ssh` executable first on PATH for one test. */
async function withFakeSsh(script, run) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-ssh-bin-'))
  const file = join(dir, 'ssh')
  await writeFile(file, `#!/bin/sh\n${script}\n`, { mode: 0o700 })
  await chmod(file, 0o700)
  const previous = process.env.PATH
  process.env.PATH = `${dir}${delimiter}${previous ?? ''}`
  try {
    return await run(dir)
  } finally {
    process.env.PATH = previous
  }
}

test('quotes the remote command and working directory', () => {
  const command = remoteCommand("printf '%s' \"a b\"", '/tmp/space dir')
  assert.match(command, /^bash -lc '/)
  assert.match(command, /cd --/)
  assert.match(command, /a b/)
  assert.equal(shellQuote("x'y"), `'x'\\''y'`)
})

test('captures stdout, stderr, and the exit code', async () => {
  const { store, server } = await fakeServer()
  const result = await withFakeSsh(
    'printf "out\\n"; printf "err\\n" >&2; exit 7',
    () => execRemote(server, store, 'echo hi'),
  )
  assert.equal(result.exitCode, 7)
  assert.equal(result.stdout, 'out\n')
  assert.equal(result.stderr, 'err\n')
  assert.equal(result.timedOut, false)
  assert.equal(result.truncated, false)
})

test('times out and kills a hanging command', async () => {
  const { store, server } = await fakeServer()
  const started = Date.now()
  const result = await withFakeSsh('sleep 5', () => execRemote(server, store, 'sleep', { timeoutMs: 1000 }))
  assert.equal(result.timedOut, true)
  assert.ok(Date.now() - started < 4000)
})

test('honors caller cancellation', async () => {
  const { store, server } = await fakeServer()
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 150)
  const result = await withFakeSsh('sleep 5', () => execRemote(server, store, 'sleep', { signal: controller.signal, timeoutMs: 10000 }))
  assert.equal(result.aborted, true)
})

test('caps each captured stream', async () => {
  const { store, server } = await fakeServer()
  const result = await withFakeSsh(
    'i=0; while [ $i -lt 10000 ]; do printf x; i=$((i+1)); done',
    () => execRemote(server, store, 'spam', { maxOutputBytes: 4096 }),
  )
  assert.equal(result.stdout.length, 4096)
  assert.equal(result.truncated, true)
})

test('retries without system SSH config when ssh refuses it', async () => {
  const { store, server } = await fakeServer()
  const marker = join(await mkdtemp(join(tmpdir(), 'dsh-ssh-retry-')), 'calls')
  const script = [
    `printf '%s\\n' "$*" >> '${marker}'`,
    `case "$*" in *'-F /dev/null'*) printf 'ok\\n'; exit 0;; esac`,
    `printf 'Bad owner or permissions on /etc/ssh/ssh_config.d/20-systemd-ssh-proxy.conf\\n' >&2`,
    `exit 255`,
  ].join('\n')
  const result = await withFakeSsh(script, () => execRemote(server, store, 'echo hi'))
  assert.equal(result.exitCode, 0)
  assert.equal(result.stdout, 'ok\n')
  const calls = (await readFile(marker, 'utf8')).trim().split('\n')
  assert.equal(calls.length, 2)
  assert.doesNotMatch(calls[0], /-F \/dev\/null/)
  assert.match(calls[1], /-F \/dev\/null/)
})

test('testRemote reports ok only for an authenticated zero exit', async () => {
  const { store, server } = await fakeServer()
  const ok = await withFakeSsh('printf "dsh-ssh-ok\\nuser\\nLinux\\nhost\\n"', () => testRemote(server, store))
  assert.equal(ok.ok, true)
  const bad = await withFakeSsh('exit 255', () => testRemote(server, store))
  assert.equal(bad.ok, false)
})

test('password auth passes the secret through askpass env and never argv', async () => {
  const home = await mkdtemp(join(tmpdir(), 'dsh-ssh-password-test-'))
  const store = new SshStore({ home })
  await store.init()
  assert.match(await readFile(store.askpassPath, 'utf8'), /DSH_SSH_SECRET/)
  const created = await store.saveServer({
    name: 'password-fake', host: 'host.example', port: 22, username: 'tester',
    auth: 'password', password: 's3cret pass',
  })
  const server = { ...(await store.resolveServer(created.id)), knownHosts: 'strict' }
  const script = [
    `case "$*" in *"$DSH_SSH_SECRET"*) echo leaked-to-argv; exit 6;; esac`,
    `case "$*" in *"PreferredAuthentications=password,keyboard-interactive"*) ;; *) echo missing-auth; exit 5;; esac`,
    `case "$*" in *"StrictHostKeyChecking=accept-new"*) ;; *) echo missing-host-policy; exit 4;; esac`,
    `case "$*" in *" -i "*) echo has-key; exit 3;; esac`,
    `[ -n "$SSH_ASKPASS" ] || { echo no-askpass; exit 2; }`,
    `[ "$DSH_SSH_SECRET" = "s3cret pass" ] || { echo wrong-secret; exit 1; }`,
    `printf 'pwd-ok\\n'`,
  ].join('\n')
  const result = await withFakeSsh(script, () => execRemote(server, store, 'echo hi'))
  assert.equal(result.exitCode, 0)
  assert.equal(result.stdout, 'pwd-ok\n')
  assert.equal(result.stderr, '')
})
