/**
 * Persistent SSH server configuration and private-key material.
 *
 * Everything lives under the DSH home so it survives plugin and DSH restarts:
 *   <home>/dsh-ssh/servers.json   server metadata (mode 600)
 *   <home>/dsh-ssh/keys/<id>      plugin-managed private keys (mode 600)
 *   <home>/dsh-ssh/known_hosts    host-key trust store for this plugin only
 *   <home>/dsh-ssh/secrets.json   plaintext SSH passwords (mode 600)
 *
 * Root-only helpers: this module imports Node builtins only so it can be unit
 * tested without the DSH runtime.
 */
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { chmod, mkdir, readFile, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve, isAbsolute, sep } from 'node:path'

const KEYGEN_TIMEOUT_MS = 20_000
const MAX_KEY_BYTES = 1024 * 1024
const MAX_NAME = 80
const MAX_HOST = 255
const MAX_USER = 64
const MAX_DESCRIPTION = 500
const MAX_PASSPHRASE = 1024
const MAX_PASSWORD = 4096

/** Expand the `~` and `~/` prefixes accepted in key-file fields. */
export function expandHomePath(value) {
  if (typeof value !== 'string') return value
  if (value === '~') return homedir()
  if (value.startsWith('~/') || value.startsWith('~\\')) return join(homedir(), value.slice(2))
  return value
}

export function posixQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`
}

function isWithin(parent, child) {
  const rel = relative(parent, child)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

function cleanText(value, field, max) {
  if (typeof value !== 'string') throw new Error(`${field} 必须是字符串`)
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new Error(`${field} 不能为空`)
  if (trimmed.length > max) throw new Error(`${field} 过长（最多 ${max} 个字符）`)
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) throw new Error(`${field} 含有控制字符`)
  return trimmed
}

function validatePassphrase(value) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw new Error('私钥口令必须是字符串')
  if (value.length > MAX_PASSPHRASE) throw new Error(`私钥口令过长（最多 ${MAX_PASSPHRASE} 个字符）`)
  if (value.includes('\u0000')) throw new Error('私钥口令不能包含 NUL 字符')
  return value.length === 0 ? null : value
}

function validatePassword(value) {
  if (typeof value !== 'string') throw new Error('登录密码必须是字符串')
  if (value.length > MAX_PASSWORD) throw new Error(`登录密码过长（最多 ${MAX_PASSWORD} 个字符）`)
  if (value.includes('\u0000')) throw new Error('登录密码不能包含 NUL 字符')
  return value.length === 0 ? null : value
}

function assertPrivateKeyText(value) {
  if (typeof value !== 'string') throw new Error('私钥内容必须是字符串')
  if (Buffer.byteLength(value, 'utf8') > MAX_KEY_BYTES) throw new Error('私钥文件过大（上限 1 MiB）')
  const text = value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trimEnd() + '\n'
  if (!text.includes('PRIVATE KEY-----')) throw new Error('这看起来不是 PEM/OpenSSH 私钥')
  return text
}

function summarizeGenError(result) {
  const stderr = String(result.stderr ?? '').trim()
  const stdout = String(result.stdout ?? '').trim()
  if (stderr) return stderr.split('\n').filter(Boolean).slice(-2).join(' ')
  if (stdout) return stdout
  return `ssh-keygen 退出码 ${result.code ?? 'unknown'}`
}

/** Run ssh-keygen without a shell, with a hard timeout. */
function runKeygen(args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    let child
    try {
      child = spawn('ssh-keygen', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...options.env },
      })
    } catch (error) {
      reject(error)
      return
    }
    const stdout = []
    const stderr = []
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, options.timeoutMs ?? KEYGEN_TIMEOUT_MS)
    child.stdout.on('data', (chunk) => stdout.push(chunk))
    child.stderr.on('data', (chunk) => stderr.push(chunk))
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolvePromise({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        timedOut,
      })
    })
  })
}

async function writeAtomic(path, content, mode) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temp = join(dirname(path), `.${randomUUID()}.tmp`)
  try {
    await writeFile(temp, content, { mode, flag: 'wx' })
    await chmod(temp, mode)
    await rename(temp, path)
    await chmod(path, mode)
  } catch (error) {
    await rm(temp, { force: true }).catch(() => {})
    throw error
  }
}

async function derivePublicKey(privateKeyPath, passphrase) {
  const args = ['-y', '-f', privateKeyPath]
  if (passphrase) args.splice(1, 0, '-P', passphrase)
  const result = await runKeygen(args)
  if (result.code !== 0) {
    const detail = summarizeGenError(result)
    if (/incorrect passphrase|bad passphrase/i.test(detail)) {
      throw new Error(`私钥口令不正确：${detail}`)
    }
    throw new Error(`无法读取私钥：${detail}`)
  }
  const publicKey = result.stdout.trim()
  if (!/^(ssh|ecdsa|sk)-/.test(publicKey)) throw new Error('ssh-keygen 没有返回有效的公钥')
  return publicKey
}

/** Validate and normalize one saved server record loaded from disk. */
function normalizeStored(record) {
  if (record === null || typeof record !== 'object') throw new Error('服务器记录必须是对象')
  if (typeof record.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(record.id)) throw new Error('服务器记录缺少有效 id')
  return { ...record }
}

/** Public, secret-free view of a configured server. */
export function toPublicServer(record) {
  const view = {
    id: record.id,
    name: record.name,
    host: record.host,
    port: record.port,
    username: record.username,
    auth: record.auth,
    keySource: record.keySource ?? (record.auth === 'agent' ? 'agent' : record.auth === 'password' ? 'password' : 'stored'),
    hasKey: Boolean(record.privateKeyPath),
    hasPassphrase: Boolean(record.passphrase),
    hasPassword: record.auth === 'password',
    publicKey: record.publicKey ?? null,
    description: record.description ?? '',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
  // keep the wire value lossless: omitted fields must not be present as undefined
  if (record.keySource === 'path' && record.privateKeyPath) view.keyPath = record.privateKeyPath
  return view
}

export class SshStore {
  /**
   * @param {{ home?: string, dataDir?: string, keygenRunner?: typeof runKeygen }} options
   */
  constructor(options = {}) {
    this.home = options.home ?? process.env.DSH_HOME ?? join(homedir(), '.dsh')
    this.dataDir = options.dataDir ?? join(this.home, 'dsh-ssh')
    this.configPath = join(this.dataDir, 'servers.json')
    this.keysDir = join(this.dataDir, 'keys')
    this.knownHostsPath = join(this.dataDir, 'known_hosts')
    this.secretsPath = join(this.dataDir, 'secrets.json')
    this.askpassPath = join(this.dataDir, 'askpass.sh')
    this._keygen = options.keygenRunner ?? runKeygen
    this._chain = Promise.resolve()
  }

  /** Create the private directory tree and the askpass helper. */
  async init() {
    await mkdir(this.dataDir, { recursive: true, mode: 0o700 })
    await mkdir(this.keysDir, { recursive: true, mode: 0o700 })
    for (const dir of [this.dataDir, this.keysDir]) {
      await chmod(dir, 0o700).catch(() => {})
    }
    const script = '#!/bin/sh\nprintf \'%s\' "$DSH_SSH_SECRET"\n'
    let current = ''
    try { current = await readFile(this.askpassPath, 'utf8') } catch {}
    if (current !== script) await writeAtomic(this.askpassPath, script, 0o700)
    await chmod(this.askpassPath, 0o700).catch(() => {})
    await this.ensureKnownHosts()
    try {
      await stat(this.secretsPath)
    } catch {
      await this._writeSecrets({ version: 1, passwords: {} })
    }
    await chmod(this.secretsPath, 0o600).catch(() => {})
  }

  async ensureKnownHosts() {
    try {
      await stat(this.knownHostsPath)
    } catch {
      await writeFile(this.knownHostsPath, '', { mode: 0o600, flag: 'wx' }).catch(() => {})
    }
    await chmod(this.knownHostsPath, 0o600).catch(() => {})
  }

  /** Absolute private-key path for a stored key. */
  storedKeyPath(id) {
    return join(this.keysDir, id)
  }

  async _readConfig() {
    let raw
    try {
      raw = await readFile(this.configPath, 'utf8')
    } catch (error) {
      if (error && error.code === 'ENOENT') return { version: 1, servers: [] }
      throw new Error(`无法读取 SSH 配置 ${this.configPath}：${error instanceof Error ? error.message : String(error)}`)
    }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      throw new Error(`SSH 配置文件不是有效 JSON（${this.configPath}）：${error instanceof Error ? error.message : String(error)}`)
    }
    if (parsed === null || typeof parsed !== 'object' || parsed.version !== 1 || !Array.isArray(parsed.servers)) {
      throw new Error(`SSH 配置文件格式不正确：${this.configPath}`)
    }
    parsed.servers = parsed.servers.map(normalizeStored)
    return parsed
  }

  async _writeConfig(config) {
    await writeAtomic(this.configPath, `${JSON.stringify(config, null, 2)}\n`, 0o600)
  }

  async _readSecrets() {
    let raw
    try {
      raw = await readFile(this.secretsPath, 'utf8')
    } catch (error) {
      if (error && error.code === 'ENOENT') return { version: 1, passwords: {} }
      throw new Error(`无法读取 SSH 密码文件：${error instanceof Error ? error.message : String(error)}`)
    }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error(`SSH 密码文件不是有效 JSON：${this.secretsPath}`)
    }
    if (parsed === null || typeof parsed !== 'object' || parsed.version !== 1
      || parsed.passwords === null || typeof parsed.passwords !== 'object' || Array.isArray(parsed.passwords)) {
      throw new Error(`SSH 密码文件格式不正确：${this.secretsPath}`)
    }
    return parsed
  }

  async _writeSecrets(secrets) {
    await writeAtomic(this.secretsPath, `${JSON.stringify(secrets, null, 2)}\n`, 0o600)
  }

  _withLock(operation) {
    const run = this._chain.then(operation, operation)
    this._chain = run.then(() => undefined, () => undefined)
    return run
  }

  /** Sanitized server list for the UI and agent. */
  async listServers() {
    const config = await this._readConfig()
    return config.servers
      .map(toPublicServer)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
  }

  /** Resolve by exact id, exact name, or case-insensitive name. */
  async resolveServer(key) {
    if (typeof key !== 'string' || key.trim() === '') throw new Error('请提供服务器的 id 或名称（可先调用 ssh_list_servers）')
    const needle = key.trim()
    const config = await this._readConfig()
    const exact = config.servers.find(server => server.id === needle)
      ?? config.servers.find(server => server.name === needle)
      ?? config.servers.find(server => server.name.toLocaleLowerCase() === needle.toLocaleLowerCase())
    if (exact) {
      if (exact.auth === 'password') {
        const secrets = await this._readSecrets()
        const password = secrets.passwords[exact.id]
        if (typeof password !== 'string' || password.length === 0) {
          throw new Error(`服务器“${exact.name}”的登录密码未配置，请编辑服务器并重新填写密码`)
        }
        return { ...exact, password }
      }
      return exact
    }
    const names = config.servers.map(server => `${server.name} (${server.id})`).join('、') || '（尚未配置任何服务器）'
    throw new Error(`找不到 SSH 服务器“${needle}”。已配置：${names}`)
  }

  _normalizeRequest(input) {
    if (input === null || typeof input !== 'object') throw new Error('请求参数必须是对象')
    const name = cleanText(input.name, '名称', MAX_NAME)
    const host = cleanText(input.host, '主机', MAX_HOST)
    if (/[\s/\\@]/.test(host) || host.startsWith('-')) throw new Error('主机地址不能包含空白、@、斜杠或以 - 开头')
    const username = cleanText(input.username, '用户名', MAX_USER)
    if (/[\s@]/.test(username) || username.startsWith('-')) throw new Error('用户名不能包含空白、@ 或以 - 开头')
    const portNumber = input.port === undefined || input.port === '' ? 22 : Number(input.port)
    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) throw new Error('端口必须是 1–65535 的整数')
    const auth = input.auth === 'agent' ? 'agent' : input.auth === 'password' ? 'password' : 'key'
    const description = typeof input.description === 'string' ? input.description.trim() : ''
    if (description.length > MAX_DESCRIPTION) throw new Error(`备注过长（最多 ${MAX_DESCRIPTION} 个字符）`)
    let privateKey = input.privateKey
    if (privateKey !== undefined && privateKey !== null && typeof privateKey === 'string' && privateKey.trim() === '') privateKey = undefined
    if (privateKey !== undefined) privateKey = assertPrivateKeyText(privateKey)
    let privateKeyPath = input.privateKeyPath
    if (privateKeyPath !== undefined && privateKeyPath !== null && typeof privateKeyPath === 'string' && privateKeyPath.trim() === '') privateKeyPath = undefined
    if (privateKeyPath !== undefined) {
      if (typeof privateKeyPath !== 'string') throw new Error('私钥文件路径必须是字符串')
      privateKeyPath = resolve(expandHomePath(privateKeyPath.trim()))
    }
    if (privateKey !== undefined && privateKeyPath !== undefined) throw new Error('不能同时粘贴私钥和指定私钥文件')
    const passphrase = input.passphrase === undefined ? undefined : validatePassphrase(input.passphrase)
    let password = input.password
    if (password === undefined || password === null || (typeof password === 'string' && password.length === 0)) password = undefined
    if (password !== undefined) password = validatePassword(password)
    const generateKey = input.generateKey === true
    if (generateKey && (privateKey !== undefined || privateKeyPath !== undefined)) throw new Error('生成新密钥时不能同时提供其他私钥')
    if (auth === 'agent' && (privateKey !== undefined || privateKeyPath !== undefined || generateKey)) {
      throw new Error('使用 SSH Agent 时不需要提供私钥')
    }
    if (auth === 'password' && (privateKey !== undefined || privateKeyPath !== undefined || generateKey)) {
      throw new Error('使用密码认证时不需要提供私钥')
    }
    return {
      name, host, username, port: portNumber, auth, description,
      privateKey, privateKeyPath, passphrase, generateKey,
      password: auth === 'password' ? password : undefined,
    }
  }

  async _installStoredKey(id, input) {
    await mkdir(this.keysDir, { recursive: true, mode: 0o700 })
    const finalPath = this.storedKeyPath(id)
    const tempPath = join(this.keysDir, `.${randomUUID()}`)
    try {
      if (input.generateKey) {
        const args = ['-q', '-t', 'ed25519', '-f', tempPath, '-N', input.passphrase ?? '', '-C', `dsh-ssh:${input.name}`]
        const generated = await this._keygen(args)
        if (generated.code !== 0) throw new Error(`生成密钥失败：${summarizeGenError(generated)}`)
        const publicKey = (await readFile(`${tempPath}.pub`, 'utf8')).trim()
        await rm(`${tempPath}.pub`, { force: true })
        await chmod(tempPath, 0o600)
        await rename(tempPath, finalPath)
        await chmod(finalPath, 0o600)
        return { privateKeyPath: finalPath, publicKey, keySource: 'generated' }
      }
      await writeAtomic(tempPath, input.privateKey, 0o600)
      const publicKey = await derivePublicKey(tempPath, input.passphrase)
      await rename(tempPath, finalPath)
      await chmod(finalPath, 0o600)
      return { privateKeyPath: finalPath, publicKey, keySource: 'stored' }
    } catch (error) {
      await rm(tempPath, { force: true }).catch(() => {})
      await rm(`${tempPath}.pub`, { force: true }).catch(() => {})
      throw error
    }
  }

  async _useKeyPath(input, existing) {
    const privateKeyPath = input.privateKeyPath
    let info
    try {
      info = await stat(privateKeyPath)
    } catch {
      throw new Error(`找不到私钥文件：${privateKeyPath}`)
    }
    if (!info.isFile()) throw new Error(`私钥路径不是普通文件：${privateKeyPath}`)
    const passphrase = input.passphrase !== undefined
      ? input.passphrase
      : (existing?.privateKeyPath === privateKeyPath ? (existing.passphrase ?? null) : null)
    const publicKey = await derivePublicKey(privateKeyPath, passphrase)
    return { privateKeyPath, publicKey, keySource: 'path', passphrase }
  }

  async _removeStoredKey(record) {
    if (!record?.privateKeyPath) return
    if (!isWithin(this.keysDir, record.privateKeyPath)) return
    await unlink(record.privateKeyPath).catch(() => {})
  }

  /**
   * Create or update one server. Key material is validated before the config
   * commit, so a failed key never leaves a server pointing at a broken key.
   */
  async saveServer(input) {
    return this._withLock(async () => {
      const request = this._normalizeRequest(input)
      const config = await this._readConfig()
      const secrets = await this._readSecrets()
      const existing = typeof input.id === 'string' && input.id !== ''
        ? config.servers.find(server => server.id === input.id)
        : undefined
      if (typeof input.id === 'string' && input.id !== '' && !existing) throw new Error('要更新的服务器不存在')
      if (existing?.auth === 'agent' && request.auth === 'key' && !request.privateKey && !request.privateKeyPath && !request.generateKey) {
        throw new Error('切换回密钥认证时，需要生成新密钥、粘贴私钥或指定私钥文件')
      }
      if (!existing && request.auth === 'key' && !request.privateKey && !request.privateKeyPath && !request.generateKey) {
        throw new Error('密钥认证需要生成新密钥、粘贴私钥或指定私钥文件')
      }
      let password = null
      if (request.auth === 'password') {
        password = request.password !== undefined
          ? request.password
          : (existing?.auth === 'password' ? secrets.passwords[existing.id] : undefined)
        if (typeof password !== 'string' || password.length === 0) {
          throw new Error('密码认证需要填写登录密码')
        }
      }
      const duplicate = config.servers.find(server => server.id !== existing?.id && server.name.toLocaleLowerCase() === request.name.toLocaleLowerCase())
      if (duplicate) throw new Error(`已存在同名服务器：${duplicate.name}`)

      const id = existing?.id ?? randomUUID()
      const now = new Date().toISOString()
      let keyFields
      let passphrase = null
      if (request.auth === 'agent') {
        keyFields = { privateKeyPath: null, publicKey: null, keySource: 'agent' }
      } else if (request.auth === 'password') {
        keyFields = { privateKeyPath: null, publicKey: null, keySource: 'password' }
      } else if (request.generateKey || request.privateKey !== undefined) {
        keyFields = await this._installStoredKey(id, request)
        passphrase = request.passphrase ?? null
      } else if (request.privateKeyPath !== undefined) {
        keyFields = await this._useKeyPath(request, existing)
        passphrase = keyFields.passphrase ?? null
      } else if (existing?.privateKeyPath) {
        passphrase = request.passphrase !== undefined ? request.passphrase : (existing.passphrase ?? null)
        const publicKey = await derivePublicKey(existing.privateKeyPath, passphrase)
        keyFields = { privateKeyPath: existing.privateKeyPath, publicKey, keySource: existing.keySource ?? 'stored' }
      } else {
        throw new Error('密钥认证缺少私钥，请生成、粘贴或指定私钥文件')
      }
      const record = {
        id,
        name: request.name,
        host: request.host,
        port: request.port,
        username: request.username,
        auth: request.auth,
        description: request.description,
        ...keyFields,
        passphrase: request.auth === 'key' ? passphrase : null,
        hasPassword: request.auth === 'password',
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      const servers = existing
        ? config.servers.map(server => server.id === id ? record : server)
        : [...config.servers, record]
      const nextPasswords = { ...secrets.passwords }
      if (request.auth === 'password') nextPasswords[id] = password
      else delete nextPasswords[id]
      // Write the password store first: a failed config commit leaves only an
      // unreferenced secret, never a server whose password was lost.
      await this._writeSecrets({ version: 1, passwords: nextPasswords })
      await this._writeConfig({ version: 1, servers })
      if (existing?.privateKeyPath && existing.privateKeyPath !== record.privateKeyPath) await this._removeStoredKey(existing)
      return toPublicServer(record)
    })
  }

  async removeServer(id) {
    if (typeof id !== 'string' || id === '') throw new Error('缺少服务器 id')
    return this._withLock(async () => {
      const config = await this._readConfig()
      const secrets = await this._readSecrets()
      const record = config.servers.find(server => server.id === id)
      if (!record) throw new Error('服务器不存在或已删除')
      await this._writeConfig({ version: 1, servers: config.servers.filter(server => server.id !== id) })
      if (Object.hasOwn(secrets.passwords, id)) {
        const nextPasswords = { ...secrets.passwords }
        delete nextPasswords[id]
        await this._writeSecrets({ version: 1, passwords: nextPasswords })
      }
      await this._removeStoredKey(record)
      return { id: record.id, name: record.name }
    })
  }

}

export const constants = {
  KEYGEN_TIMEOUT_MS,
  MAX_KEY_BYTES,
  MAX_DESCRIPTION,
  MAX_NAME,
  MAX_HOST,
  MAX_USER,
  MAX_PASSWORD,
  posixQuote,
  isWithin,
}
