/**
 * DSH SSH plugin — host half.
 *
 * Registers:
 *  - `ssh_list_servers`, `ssh_exec`, `ssh_test_connection` tools for the agent
 *  - an SRC-mode Typert Remote namespace (`ssh`) used by the sidebar settings page
 *
 * Credentials never leave the Host: the Remote surface exposes only public
 * metadata. Plaintext passwords stay in the Host-side secrets store.
 */
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { SshStore } from './store.js'
import { execRemote, testRemote, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS } from './ssh.js'

export const name = 'dsh-ssh'
export const inject = ['tools']

const REMOTE_METHOD_DESCRIPTOR = '@deepseek-ai/dsh-typert-protocol/remote-methods'

/** Convert any failure into a Remote failure with a readable message. */
function remoteFailure(error) {
  if (error instanceof RemoteError) return error
  const message = error instanceof Error ? error.message : String(error)
  return new RemoteError('ssh/invalid', message, {})
}

function pathsOf(store) {
  return {
    dataDir: store.dataDir,
    configPath: store.configPath,
    knownHostsPath: store.knownHostsPath,
  }
}

async function resolveToolServer(store, hint) {
  if (typeof hint === 'string' && hint.trim() !== '') return await store.resolveServer(hint)
  const servers = await store.listServers()
  if (servers.length === 1) {
    const full = await store.resolveServer(servers[0].id)
    return full
  }
  if (servers.length === 0) throw new Error('尚未配置 SSH 服务器，请先在左侧栏的 SSH 配置页添加服务器')
  throw new Error(`已配置 ${servers.length} 台服务器，请通过 server 参数指定名称或 id：${servers.map(server => server.name).join('、')}`)
}

function textBlock(text) {
  return [{ type: 'text', text }]
}

function formatExecResult(value) {
  const parts = []
  const state = value.timedOut ? '超时' : value.aborted ? '已取消' : value.exitCode === 0 ? '成功' : `退出码 ${value.exitCode}`
  parts.push(`[${value.serverName}] ${state} · ${value.durationMs}ms`)
  if (value.truncated) parts.push('（输出已截断）')
  if (value.stdout) parts.push(`--- stdout ---\n${value.stdout}`)
  if (value.stderr) parts.push(`--- stderr ---\n${value.stderr}`)
  if (!value.stdout && !value.stderr) parts.push('(无输出)')
  return parts.join('\n')
}

/** One live SSH service; Gateway's source-mode discovery reads the marker below. */
class SshService extends TypertRemoteService {
  constructor(ctx, store) {
    super(ctx, 'sshServers', { namespace: 'ssh' })
    this.store = store
  }

  /** Read configured servers and local storage paths. */
  async listServers() {
    try {
      return { servers: await this.store.listServers(), paths: pathsOf(this.store) }
    } catch (error) {
      throw remoteFailure(error)
    }
  }

  /** Create or update a server and its key material. */
  async saveServer(request) {
    try {
      if (request === null || typeof request !== 'object') throw new Error('缺少服务器配置')
      return { server: await this.store.saveServer(request) }
    } catch (error) {
      throw remoteFailure(error)
    }
  }

  /** Delete a server and its plugin-managed private key. */
  async removeServer(request) {
    try {
      if (request === null || typeof request !== 'object') throw new Error('缺少服务器 id')
      return { removed: true, server: await this.store.removeServer(request.id) }
    } catch (error) {
      throw remoteFailure(error)
    }
  }

  /** Test one saved server with a short SSH command. */
  async testServer(request) {
    try {
      if (request === null || typeof request !== 'object') throw new Error('缺少服务器 id')
      const server = await this.store.resolveServer(request.id)
      const result = await testRemote(server, this.store)
      return { ...result, publicKey: server.publicKey ?? null, keySource: server.keySource }
    } catch (error) {
      throw remoteFailure(error)
    }
  }
}

// The published Typert generator normally writes this descriptor. A third-party
// package can declare it directly: Gateway source-mode discovery reads exactly
// this versioned marker from the Service prototype.
Object.defineProperty(SshService.prototype, REMOTE_METHOD_DESCRIPTOR, {
  value: {
    version: 1,
    methods: ['listServers', 'saveServer', 'removeServer', 'testServer'].map(method => Object.freeze({
      method,
      invocation: Object.freeze({ kind: 'direct' }),
    })),
  },
  configurable: true,
})

export function createToolDefinitions(store) {
  return [
    defineTool({
      name: 'ssh_list_servers',
      description: 'List the SSH servers configured in the DSH SSH panel. Call this before ssh_exec or ssh_test_connection so you can use the right server name or id. Returns connection metadata only; private keys and passwords never leave the Host.',
      parameters: {},
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            servers: {
              type: 'array',
              required: true,
              items: {
                type: 'object',
                additionalProperties: true,
                properties: {
                  id: { type: 'string', required: true },
                  name: { type: 'string', required: true },
                  host: { type: 'string', required: true },
                  port: { type: 'integer', required: true },
                  username: { type: 'string', required: true },
                  auth: { type: 'string', required: true, enum: ['key', 'password', 'agent'] },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        render: (_args, value) => textBlock(value.servers.length === 0
          ? 'No SSH servers are configured yet. Ask the user to add one in the sidebar SSH panel.'
          : value.servers.map(server => `- ${server.name} (${server.id}): ${server.username}@${server.host}:${server.port} · ${server.auth === 'agent' ? 'SSH agent' : server.auth === 'password' ? 'password' : 'private key'}${server.description ? ` · ${server.description}` : ''}`).join('\n')),
      },
      async execute() {
        return { servers: await store.listServers() }
      },
    }),

    defineTool({
      name: 'ssh_exec',
      description: 'Run one shell command on a configured remote server over SSH using its saved key, password, or SSH agent. The connection is opened automatically for each call. Use ssh_list_servers first when you do not know the server name. Commands run through bash on the remote host. Output is returned with its exit code; non-zero exits are normal results, not thrown errors.',
      parameters: {
        server: {
          type: 'string',
          description: 'Server id or name from ssh_list_servers. May be omitted when exactly one server is configured.',
        },
        command: {
          type: 'string',
          required: true,
          description: 'Shell command to run on the remote host. Quote paths with spaces in the remote command itself.',
        },
        workdir: {
          type: 'string',
          description: 'Optional remote working directory. The command runs in a bash login shell after cd-ing there.',
        },
        timeout_ms: {
          type: 'integer',
          description: `Optional timeout in milliseconds (1000–${MAX_TIMEOUT_MS}); defaults to ${DEFAULT_TIMEOUT_MS}. The remote command is terminated when it expires.`,
        },
        max_output_bytes: {
          type: 'integer',
          description: 'Optional per-stream output cap in bytes (4096–1048576).',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            server: { type: 'string', required: true },
            serverName: { type: 'string', required: true },
            exitCode: { oneOf: [{ type: 'integer' }, { type: 'null' }] },
            signal: { type: 'string' },
            stdout: { type: 'string', required: true },
            stderr: { type: 'string', required: true },
            timedOut: { type: 'boolean', required: true },
            aborted: { type: 'boolean', required: true },
            truncated: { type: 'boolean', required: true },
            durationMs: { type: 'integer', required: true },
          },
        },
        render: (_args, value) => textBlock(formatExecResult(value)),
      },
      isConcurrencySafe: () => true,
      async execute(args, exec) {
        const server = await resolveToolServer(store, args.server)
        const result = await execRemote(server, store, args.command, {
          workdir: args.workdir,
          timeoutMs: args.timeout_ms,
          maxOutputBytes: args.max_output_bytes,
          signal: exec.signal,
        })
        return {
          server: server.id,
          serverName: server.name,
          exitCode: result.exitCode,
          signal: result.signal ?? '',
          stdout: result.stdout,
          stderr: result.stderr,
          timedOut: result.timedOut,
          aborted: result.aborted,
          truncated: result.truncated,
          durationMs: result.durationMs,
        }
      },
      presentCall: args => ({ card: 'generic', title: `SSH: ${args.server ?? 'remote server'}`, kind: 'execute', rawInput: args.command }),
    }),

    defineTool({
      name: 'ssh_test_connection',
      description: 'Check whether a configured SSH server is reachable and authentication works. Runs a small read-only probe (user, kernel, hostname). Use it after adding a server or when ssh_exec cannot connect.',
      parameters: {
        server: {
          type: 'string',
          description: 'Server id or name from ssh_list_servers. May be omitted when exactly one server is configured.',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            server: { type: 'string', required: true },
            serverName: { type: 'string', required: true },
            ok: { type: 'boolean', required: true },
            exitCode: { oneOf: [{ type: 'integer' }, { type: 'null' }] },
            signal: { type: 'string' },
            stdout: { type: 'string', required: true },
            stderr: { type: 'string', required: true },
            timedOut: { type: 'boolean', required: true },
            truncated: { type: 'boolean', required: true },
            durationMs: { type: 'integer', required: true },
          },
        },
        render: (_args, value) => textBlock(formatExecResult({ ...value, aborted: false })),
      },
      isConcurrencySafe: () => true,
      async execute(args, exec) {
        const server = await resolveToolServer(store, args.server)
        const result = await testRemote(server, store, { signal: exec.signal })
        return {
          server: server.id,
          serverName: server.name,
          ok: result.ok,
          exitCode: result.exitCode,
          signal: result.signal ?? '',
          stdout: result.stdout,
          stderr: result.stderr,
          timedOut: result.timedOut,
          truncated: result.truncated,
          durationMs: result.durationMs,
        }
      },
      presentCall: () => ({ card: 'generic', title: 'Test SSH connection', kind: 'other' }),
    }),
  ]
}

function registerTools(ctx, store) {
  for (const definition of createToolDefinitions(store)) ctx.tools.register(definition)
}

export async function apply(ctx) {
  const store = new SshStore({ home: resolveDshHome() })
  await store.init()
  // Instantiate the Service so Gateway source-mode discovery can find it.
  new SshService(ctx, store)
  registerTools(ctx, store)
}
