# dsh-ssh

一个 DeepSeek Harness（DSH）Web 插件：在左侧栏加入 **SSH** 入口，用一个页面管理远程服务器和凭据（私钥、密码或 SSH Agent），并向 Agent 提供可以直接在远端执行命令的工具。

- **左侧栏入口**：点 **SSH** 打开服务器管理页。
- **认证方式**：SSH 私钥、SSH 登录密码、SSH Agent。
- **密钥配置**：生成 Ed25519 密钥、粘贴已有私钥，或使用本机私钥文件。
- **自动连接**：Agent 调用工具时自动读取已保存的凭据，不需要手动先开一个 SSH 会话。
- **凭据不出 Host**：浏览器只能看到服务器元数据和公钥；私钥和密码不会通过 Remote API 返回，也不会进入模型上下文。
- **主机校验**：首次连接自动接受并记录主机密钥，之后主机密钥变化会拒绝连接。
- **Agent 工具**：`ssh_list_servers`、`ssh_test_connection`、`ssh_exec`。

## 安装

当前未发布 npm 包，从源码安装到 DSH Web profile：

```bash
git clone https://github.com/rong-coder/dsh-ssh.git
cd dsh-ssh
npm test
dsh plugin --profile web add "link:$(pwd)"
```

然后把 `dsh-ssh` 加入 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles`，保留已有项：

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-ssh"
      ]
    }
  }
}
```

安装或更新后，刷新 Web 页面即可看到左侧栏 **SSH**。已经打开的页面若使用 DSH 的 HMR，通常会自动收到新的插件图；没有看到入口时刷新页面或重启 `dsh web`。

配置数据默认保存在 `~/.dsh/dsh-ssh/`。

## 使用

### 1. 添加服务器

点击左侧栏 **SSH → 添加服务器**，填写：

| 字段 | 说明 |
|---|---|
| 名称 | Agent 使用的服务器名称，例如“生产环境” |
| 主机地址 | IP 或域名，例如 `10.0.0.12` |
| 用户名 | SSH 登录用户，例如 `root` |
| 端口 | 默认 22 |
| 认证方式 | 私钥 / 密码 / SSH Agent |
| 私钥来源 | 生成 Ed25519 / 粘贴私钥 / 本机文件 |
| 登录密码 | 认证方式为“密码”时填写 |
| 备注 | 可选 |

私钥来源有三种：

1. **生成 Ed25519**：Host 在本机生成密钥对，保存后页面显示公钥。把公钥复制到远端：

   ```sh
   mkdir -p ~/.ssh && chmod 700 ~/.ssh
   grep -qxF '<页面上的公钥>' ~/.ssh/authorized_keys 2>/dev/null || echo '<页面上的公钥>' >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

2. **粘贴私钥**：适合从密码管理器或其他工具导入。保存时会用 `ssh-keygen -y` 校验，并提取公钥。

3. **本机文件**：填写本机已有私钥路径，支持 `~/.ssh/id_ed25519`。插件只记住路径，不复制私钥。

使用 **密码认证** 时填写 SSH 登录密码。密码以明文保存在本机的独立密码文件中，文件权限为 `600`；服务器列表、测试结果和 Agent 工具结果都不会返回密码。

使用 **SSH Agent** 时不需要填私钥或密码，连接会读取启动 DSH 的用户环境中的 Agent。

### 2. 测试连接

服务器卡片上的 **测试连接** 会执行只读探测：

```sh
printf "dsh-ssh-ok\n"; id -un; uname -sr; hostname
```

成功后会显示登录用户、内核版本和耗时。失败时显示 SSH 的错误信息。

### 3. 让 Agent 使用

配置完成后直接对 Agent 说：

> 用 ssh_exec 在「生产环境」上查看磁盘占用和最近的错误日志。

Agent 会先调用 `ssh_list_servers` 找到服务器，再用 `ssh_exec` 执行命令。

## Agent 工具

### `ssh_list_servers`

列出已配置的服务器。返回 id、名称、地址、认证方式和公钥；**不返回私钥或密码**。

### `ssh_test_connection`

参数：`server`（名称或 id；只有一台服务器时可省略）。

执行上述只读探测，返回是否可达、退出码、stdout/stderr 和耗时。

### `ssh_exec`

参数：

| 参数 | 必填 | 说明 |
|---|---|---|
| `server` | 否 | 名称或 id；只有一台服务器时可省略 |
| `command` | 是 | 远端 shell 命令 |
| `workdir` | 否 | 远端工作目录；命令通过 `bash -lc` 执行 |
| `timeout_ms` | 否 | 1000–600000，默认 120000 |
| `max_output_bytes` | 否 | 每条流的输出上限，默认 256 KiB |

命令通过本机 `ssh` 可执行文件启动，参数以 argv 传递，不经过本地 shell。远端命令通过 `bash -lc` 执行；非零退出码会作为正常结果返回，不会被当成工具异常。

## 存储与安全

```text
~/.dsh/dsh-ssh/
├── servers.json      服务器元数据（600）
├── secrets.json      明文 SSH 登录密码（600）
├── keys/<uuid>       插件托管的私钥（600）
├── known_hosts       本插件专用的主机指纹（600）
└── askpass.sh        OpenSSH 口令提示助手（700）
```

- 私钥、密码和口令只保存在本机。`servers.json`、`secrets.json` 的权限为 `600`，插件托管的私钥文件权限为 `600`。
- **密码认证**：密码以明文保存在 `secrets.json` 中，经 `SSH_ASKPASS` 传给 `ssh`，不出现在命令行参数里；浏览器列表和 Agent 工具结果只暴露 `hasPassword` 布尔值。
- **口令保护私钥也会工作**：口令以明文保存在 `servers.json` 中，经 `SSH_ASKPASS` 传给 `ssh`。请依赖操作系统账户权限保护这台机器。
- 浏览器端不会拿到私钥或密码内容；Remote 接口只返回公钥和元数据。
- 主机密钥始终按 `accept-new` 处理：首次连接自动记录；之后主机密钥变化会拒绝连接。不再提供严格/TOFU 选择项。
- 每次 `ssh_exec` 都建立新的 SSH 连接，不启用 ControlMaster。这样超时或取消时能可靠关闭本机 SSH 进程及其进程组。远端命令可能会在连接断开后短暂继续，请避免用超时来取消具有破坏性的长任务。
- 本插件运行在本机 DSH Host 中，拥有你的操作系统用户权限。只应配置你信任的服务器；Agent 能执行远端命令，也能读取你允许它访问的内容。

## 要求

- DSH `0.2.2-rc.1` 及兼容的 0.2.x 运行时。
- 本机安装 OpenSSH 客户端：`ssh`、`ssh-keygen`。
- 远端有可用的 `bash`。
- Web profile 已启用 bundle（安装时已加入 `dsh.profile.bundles`）。

## 开发与测试

```bash
npm test
```

测试覆盖密钥生成/校验、密码存储与隔离、文件权限、外部私钥、服务器增删改、命令引用、超时、取消、输出截断，以及系统 SSH 配置不可读时的自动回退。

源码结构：

```text
lib/
├── index.js     Host 插件：Typert Remote 服务 + Agent 工具
├── client.js    浏览器插件：侧栏入口、配置页、表单
├── store.js     服务器配置、密钥生成/校验/持久化
└── ssh.js       ssh 调用、超时、取消、输出采集
```

## 排查

| 现象 | 处理 |
|---|---|
| 左侧栏没有 SSH | 刷新页面；确认 `dsh.profile.bundles` 中有 `dsh-ssh` 并重启 `dsh web` |
| `Bad owner or permissions on .../ssh_config.d/...` | 本插件会自动用 `-F /dev/null` 重试一次；仍失败时检查系统 SSH 配置权限 |
| `Permission denied (publickey)` | 确认公钥已加入远端 `authorized_keys`、远端用户正确、私钥与公钥匹配 |
| `Permission denied (password)` | 确认登录密码正确、远端允许密码认证 |
| `Host key verification failed` | 主机密钥已变化；检查配置目录下的 `known_hosts` |
| `incorrect passphrase` | 私钥口令不正确；编辑服务器并填写正确口令 |
| 超时 | 增大 `timeout_ms`，或把长任务放到远端 `tmux`/`nohup` 中 |

## License

[MIT](LICENSE)
