# dsh-ssh

DeepSeek Harness（DSH）Web 插件：在左侧栏管理 SSH 服务器，并让 Agent 直接在远端执行命令。凭据只保存在本机，不会返回浏览器或进入模型上下文。

## 功能

- **侧栏管理**：添加、编辑、删除服务器，测试连接，查看公钥。
- **三种认证**：私钥（生成 / 粘贴 / 本机文件）、登录密码、SSH Agent。
- **Agent 工具**：`ssh_list_servers`、`ssh_test_connection`、`ssh_exec`。
- **主机校验**：首次连接自动记录主机密钥，之后发生变化会拒绝连接。

## 安装

```bash
git clone https://github.com/rong-coder/dsh-ssh.git
cd dsh-ssh
dsh plugin --profile web add "link:$PWD"
```

再把 `dsh-ssh` 加入 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles`（保留已有项）：

```json
"bundles": [
  "@deepseek-ai/dsh-base",
  "@deepseek-ai/dsh-web-app",
  "dsh-ssh"
]
```

刷新页面即可看到左侧栏 **SSH**。配置数据默认保存在 `~/.dsh/dsh-ssh/`。

## 使用

### 添加服务器

点击 **SSH → 添加服务器**，填写：

| 字段 | 说明 |
|---|---|
| 名称 | Agent 引用服务器时使用，例如“生产环境” |
| 主机地址 / 端口 | IP 或域名；端口默认 22 |
| 用户名 | SSH 登录用户，例如 `root` |
| 认证方式 | 私钥 / 密码 / SSH Agent |
| 私钥来源 | 生成 Ed25519 / 粘贴私钥 / 本机文件 |
| 登录密码 | 认证方式为“密码”时填写 |
| 备注 | 可选 |

私钥来源：

- **生成 Ed25519**：保存后复制页面显示的公钥到远端 `~/.ssh/authorized_keys`。
- **粘贴私钥**：保存时用 `ssh-keygen -y` 校验并提取公钥。
- **本机文件**：填写已有私钥路径，支持 `~/.ssh/id_ed25519`；插件只记录路径，不复制私钥。

使用 **SSH Agent** 时无需私钥或密码，认证依赖 DSH 进程环境中的 `SSH_AUTH_SOCK`。

### 测试连接

服务器卡片上的 **测试连接** 会实际登录远端并执行只读探测（登录用户、内核版本、主机名），失败时显示 SSH 的错误信息。

### 让 Agent 使用

配置完成后直接对 Agent 说：

> 用 ssh_exec 在“生产环境”上查看磁盘占用和最近的错误日志。

Agent 会先调用 `ssh_list_servers` 找到服务器，再用 `ssh_exec` 执行命令。

## Agent 工具

| 工具 | 作用 |
|---|---|
| `ssh_list_servers` | 列出服务器；只返回元数据和公钥 |
| `ssh_test_connection` | 检查连通性和认证是否可用 |
| `ssh_exec` | 执行命令，返回 stdout、stderr 和退出码 |

`ssh_exec` 参数：

| 参数 | 必填 | 说明 |
|---|---|---|
| `server` | 否 | 名称或 id；只有一台服务器时可省略 |
| `command` | 是 | 远端 shell 命令 |
| `workdir` | 否 | 远端工作目录，命令通过 `bash -lc` 执行 |
| `timeout_ms` | 否 | 1000–600000，默认 120000 |
| `max_output_bytes` | 否 | 每条流的输出上限，默认 256 KiB |

命令通过本机 `ssh` 以 argv 传递，不经过本地 shell。非零退出码会作为正常结果返回，不会被当成工具异常。

## 安全与存储

数据位于 `~/.dsh/dsh-ssh/`：

```text
servers.json   服务器配置（600）
secrets.json   登录密码（600，明文）
keys/<id>      插件托管的私钥（600）
known_hosts    本插件专用的主机密钥
askpass.sh     OpenSSH 口令提示助手（700）
```

- 浏览器和模型只能看到服务器元数据和公钥，看不到私钥内容与密码。
- 密码和私钥口令以明文保存在本机，经 `SSH_ASKPASS` 传给 `ssh`，不会出现在命令行参数中。
- 主机密钥按 `accept-new` 处理：首次连接自动记录，之后变化会拒绝连接。
- 每次 `ssh_exec` 都新建连接，不启用 ControlMaster。超时会终止本地 SSH 进程组；远端命令可能短暂继续，长任务请使用 `tmux` 或 `nohup`。
- 插件以 DSH 运行用户的权限执行远端命令，只应配置可信服务器。

## 要求

- DSH `>=0.2.2-rc.1 <0.3.0`
- 本机安装 OpenSSH 客户端：`ssh`、`ssh-keygen`
- 远端有可用的 `bash`

## 排查

| 现象 | 处理 |
|---|---|
| 左侧栏没有 SSH | 刷新页面；确认 `dsh.profile.bundles` 包含 `dsh-ssh` 并重启 `dsh web` |
| `Permission denied (publickey)` | 检查公钥是否在远端 `authorized_keys`、登录用户和私钥是否匹配 |
| `Permission denied (password)` | 检查登录密码，确认远端允许密码认证 |
| `Host key verification failed` | 主机密钥已变化；确认无误后删除 `known_hosts` 中对应条目 |
| `incorrect passphrase` | 私钥口令不正确；编辑服务器并填写正确口令 |
| `Bad owner or permissions on ...` | 插件会自动用 `-F /dev/null` 重试；仍失败时修复系统 SSH 配置权限 |
| 超时 | 增大 `timeout_ms`，或把长任务放到远端 `tmux` / `nohup` 中 |

## 开发

```bash
npm test
```

`lib/` 结构：`index.js`（Agent 工具与 Remote 服务）、`client.js`（侧栏页面）、`store.js`（配置与密钥）、`ssh.js`（SSH 调用）。

## License

[MIT](LICENSE)
