/**
 * OpenSSH transport used by both the model-facing tools and the configuration
 * page's connection test. No shell is involved locally: every value reaches
 * ssh(1) as one argv element.
 */
import { spawn } from 'node:child_process'
import { posixQuote } from './store.js'

export const DEFAULT_TIMEOUT_MS = 120_000
export const MAX_TIMEOUT_MS = 600_000
export const DEFAULT_OUTPUT_BYTES = 256 * 1024
export const MAX_OUTPUT_BYTES = 1024 * 1024

/** Quote one string as a single POSIX shell word. */
export function shellQuote(value) {
  return posixQuote(String(value))
}

/** Compose the remote command executed by the user's login shell through bash. */
export function remoteCommand(command, workdir) {
  if (typeof command !== 'string' || command.trim() === '') throw new Error('命令不能为空')
  if (command.includes('\u0000')) throw new Error('命令不能包含 NUL 字符')
  const script = typeof workdir === 'string' && workdir.trim() !== ''
    ? `cd -- ${shellQuote(workdir)} && ${command}`
    : command
  return `bash -lc ${shellQuote(script)}`
}

function authArgs(server, store) {
  const args = [
    '-o', `ConnectTimeout=${server.connectTimeoutSeconds ?? 10}`,
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', `UserKnownHostsFile=${store.knownHostsPath}`,
    '-o', 'GlobalKnownHostsFile=/dev/null',
    '-o', 'LogLevel=ERROR',
    '-p', String(server.port),
  ]
  if (server.auth === 'key') {
    if (!server.privateKeyPath) throw new Error(`服务器“${server.name}”没有可用私钥`)
    args.push('-i', server.privateKeyPath, '-o', 'IdentitiesOnly=yes', '-o', 'PreferredAuthentications=publickey')
  } else if (server.auth === 'password') {
    if (typeof server.password !== 'string' || server.password.length === 0) {
      throw new Error(`服务器“${server.name}”没有可用的登录密码，请重新填写`)
    }
    args.push(
      '-o', 'PubkeyAuthentication=no',
      '-o', 'PasswordAuthentication=yes',
      '-o', 'KbdInteractiveAuthentication=yes',
      '-o', 'PreferredAuthentications=password,keyboard-interactive',
    )
  } else {
    args.push('-o', 'PreferredAuthentications=publickey')
  }
  args.push(
    '-o', (server.auth === 'password' || server.passphrase) ? 'BatchMode=no' : 'BatchMode=yes',
    '-o', 'NumberOfPasswordPrompts=1',
  )
  return args
}

function buildEnv(server, store) {
  const secret = server.auth === 'password' ? server.password : server.passphrase
  if (!secret) return { ...process.env }
  return {
    ...process.env,
    DSH_SSH_SECRET: secret,
    SSH_ASKPASS: store.askpassPath,
    SSH_ASKPASS_REQUIRE: 'force',
    DISPLAY: process.env.DISPLAY || ':0',
  }
}

/**
 * Execute one command on `server` and return captured output.
 * The child is terminated on timeout or caller cancellation; the promise
 * settles only after the process has exited.
 */
export async function execRemote(server, store, command, options = {}) {
  if (!server || typeof server !== 'object') throw new Error('无效的服务器配置')
  const timeoutMs = Math.min(
    Math.max(Number.isFinite(options.timeoutMs) ? Math.floor(options.timeoutMs) : DEFAULT_TIMEOUT_MS, 1_000),
    MAX_TIMEOUT_MS,
  )
  const maxBytes = Math.min(
    Math.max(Number.isFinite(options.maxOutputBytes) ? Math.floor(options.maxOutputBytes) : DEFAULT_OUTPUT_BYTES, 4 * 1024),
    MAX_OUTPUT_BYTES,
  )
  const remote = remoteCommand(command, options.workdir)
  const ignoreSystemConfig = options._ignoreSystemConfig === true
  const baseArgs = [...authArgs(server, store), '--', `${server.username}@${server.host}`, remote]
  const args = ignoreSystemConfig ? ['-F', '/dev/null', ...baseArgs] : baseArgs
  const started = Date.now()
  const signal = options.signal
  if (signal?.aborted) {
    return { server: server.id, exitCode: null, signal: null, stdout: '', stderr: '', timedOut: false, aborted: true, truncated: false, durationMs: 0 }
  }

  return await new Promise((resolvePromise, reject) => {
    let child
    try {
      child = spawn('ssh', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: buildEnv(server, store),
        // A shell wrapper can leave grandchildren alive after ssh is signalled.
        // A process group lets cancellation reach the whole local tree.
        detached: process.platform !== 'win32',
      })
    } catch (error) {
      reject(new Error(`无法启动 ssh：${error instanceof Error ? error.message : String(error)}`))
      return
    }
    const stdoutChunks = []
    const stderrChunks = []
    let stdoutBytes = 0
    let stderrBytes = 0
    let truncated = false
    let timedOut = false
    let aborted = false
    let settled = false
    let timer
    let killTimer
    const signalChild = (name) => {
      try {
        if (process.platform !== 'win32' && child.pid !== undefined) process.kill(-child.pid, name)
        else child.kill(name)
      } catch { /* already gone */ }
    }
    const onAbort = () => {
      aborted = true
      signalChild('SIGTERM')
      killTimer = setTimeout(() => signalChild('SIGKILL'), 2_000)
    }
    const cleanup = () => {
      clearTimeout(timer)
      clearTimeout(killTimer)
      signal?.removeEventListener('abort', onAbort)
    }
    const fail = (error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error instanceof Error ? error : new Error(String(error)))
    }
    const finish = (code, exitSignal) => {
      if (settled) return
      const stderrText = Buffer.concat(stderrChunks).toString('utf8')
      if (!ignoreSystemConfig && !timedOut && !aborted && code === 255 && /Bad owner or permissions/.test(stderrText)) {
        settled = true
        cleanup()
        execRemote(server, store, command, { ...options, _ignoreSystemConfig: true }).then(resolvePromise, reject)
        return
      }
      settled = true
      cleanup()
      resolvePromise({
        server: server.id,
        exitCode: typeof code === 'number' ? code : null,
        signal: exitSignal ?? null,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: stderrText,
        timedOut,
        aborted,
        truncated,
        durationMs: Date.now() - started,
      })
    }
    child.on('error', fail)
    child.stdout.on('data', (chunk) => {
      if (stdoutBytes >= maxBytes) { truncated = true; return }
      const remaining = maxBytes - stdoutBytes
      const kept = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk
      stdoutChunks.push(kept)
      stdoutBytes += kept.length
      if (kept.length < chunk.length) truncated = true
    })
    child.stderr.on('data', (chunk) => {
      if (stderrBytes >= maxBytes) { truncated = true; return }
      const remaining = maxBytes - stderrBytes
      const kept = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk
      stderrChunks.push(kept)
      stderrBytes += kept.length
      if (kept.length < chunk.length) truncated = true
    })
    child.on('close', finish)
    signal?.addEventListener('abort', onAbort, { once: true })
    timer = setTimeout(() => {
      timedOut = true
      signalChild('SIGTERM')
      killTimer = setTimeout(() => signalChild('SIGKILL'), 2_000)
    }, timeoutMs)
  })
}

/** Run a short liveness probe that works on common POSIX remotes. */
export async function testRemote(server, store, options = {}) {
  const command = 'printf "dsh-ssh-ok\\n"; id -un 2>/dev/null || whoami; uname -sr; hostname 2>/dev/null || true'
  const result = await execRemote(server, store, command, { ...options, timeoutMs: options.timeoutMs ?? 20_000, maxOutputBytes: 64 * 1024 })
  return {
    ...result,
    ok: result.exitCode === 0 && !result.timedOut && !result.aborted,
  }
}
