# opc-tunnel

一键配置 Cloudflare Tunnel，让你的本地服务通过 OPC App 安全访问。

## 这是什么？

[OPC (One Person Company)](https://opc.app) 是一人公司展示平台。OPC 主可以在自己电脑上运行网站/服务，通过 Cloudflare Tunnel 让 App 用户安全访问——**流量不经过平台服务器，零带宽消耗**。

`opc-tunnel` 是帮助 OPC 主快速配置本地隧道的 CLI 工具。

---

## 快速开始

### 前置条件

- **Node.js** >= 18 ([下载](https://nodejs.org/))
- **Cloudflare 账号** (免费即可，[注册](https://dash.cloudflare.com/sign-up))
- 一个托管在 Cloudflare 的域名（用于创建隧道子域名）
- 本地运行的网站服务（如 `localhost:3000`）

---

### 第 1 步：安装 cloudflared

根据你的操作系统选择安装方式：

<details>
<summary><b>macOS</b></summary>

```bash
# 方式一：Homebrew（推荐）
brew install cloudflared

# 方式二：直接下载
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz | tar xz
sudo mv cloudflared /usr/local/bin/
```

</details>

<details>
<summary><b>Windows</b></summary>

**方式一：winget（推荐，Windows 10/11 自带）**

打开 **PowerShell**（以管理员身份运行）：

```powershell
winget install Cloudflare.cloudflared
```

安装完成后**关闭并重新打开** PowerShell，验证安装：

```powershell
cloudflared --version
```

**方式二：手动下载安装**

1. 访问 [cloudflared releases](https://github.com/cloudflare/cloudflared/releases/latest)
2. 下载 `cloudflared-windows-amd64.msi`
3. 双击 MSI 文件安装
4. 打开 PowerShell 验证：`cloudflared --version`

**方式三：Chocolatey**

```powershell
choco install cloudflared
```

> **注意**：Windows 上所有命令都在 **PowerShell** 或 **CMD** 中执行，不是 Git Bash。

</details>

<details>
<summary><b>Linux</b></summary>

```bash
# Debian/Ubuntu
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb

# CentOS/RHEL
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.rpm -o /tmp/cloudflared.rpm
sudo rpm -i /tmp/cloudflared.rpm

# 通用（直接下载二进制）
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
```

</details>

---

### 第 2 步：登录 Cloudflare

```bash
cloudflared tunnel login
```

执行后会打开浏览器，选择你的域名进行授权。

> **Windows 用户**：在 PowerShell 中执行此命令，浏览器会自动弹出。
>
> **无桌面的 Linux 服务器**：命令会输出一个 URL，复制到本地浏览器打开即可。

---

### 第 3 步：在 OPC App 中获取 Token

```
打开 OPC App
  → 我的 OPC
    → Tunnel 配置
      → 设置本地端口（默认 3000）
      → 点击「生成配置 Token」
        → 复制 Token 字符串
```

Token 是一串 Base64 编码的字符串，类似：
```
eyJvcGNJZCI6IjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTAxMiIsInR1bm5lbE5hbWUiOiJteS1vcGMiLCJkb21haW4iOiJteS1vcGMub3BjLmFwcCIsImFwaUJhc2UiOiJodHRwczovL2FwaS5vcGMuYXBwIiwibG9jYWxQb3J0IjozMDAwfQ==
```

Token 包含你的 OPC 配置信息（隧道名称、域名、本地端口等），由 App 自动生成。**Token 仅用于首次配置，配置完成后就不再需要。**有效期 7 天。

---

### 第 4 步：运行配置命令

**macOS / Linux：**

```bash
npx opc-tunnel setup --token <粘贴你的Token>
```

**Windows（PowerShell）：**

```powershell
npx opc-tunnel setup --token <粘贴你的Token>
```

> **Windows 注意事项**：
> - 请使用 **PowerShell** 或 **CMD**，不要用 Git Bash（可能有路径问题）
> - 如果提示 "npx 不是内部或外部命令"，说明 Node.js 未正确安装，请从 [nodejs.org](https://nodejs.org/) 重新安装
> - Token 很长，粘贴时确保完整（右键粘贴，不要 Ctrl+V 如果被截断）

工具会自动完成以下 8 个步骤：

```
🔧 OPC Tunnel 配置工具
────────────────────────────────────────

✔ 配置信息: my-opc → my-opc.opc.app
  本地端口: 3000 | API: https://api.opc.app

系统: windows
✔ cloudflared 已安装 (2024.2.1)
✔ Tunnel 创建成功 (a1b2c3d4...)
✔ DNS 已配置: my-opc.opc.app
✔ 配置文件: C:\Users\xxx\.cloudflared\config-my-opc.yml
✔ 已注册到 OPC 平台
✔ 开机自启已配置
✔ 隧道连通正常

✅ 配置完成！

  隧道名称: my-opc
  隧道域名: https://my-opc.opc.app
  本地服务: http://localhost:3000
```

### 完成！

配置完成后，只要你的电脑开着、本地服务在运行，OPC App 的用户就能访问你的网站了。隧道已设置为开机自启，无需每次手动启动。

---

## 各系统详细教程

### macOS 完整流程

```bash
# 1. 安装 cloudflared
brew install cloudflared

# 2. 登录 Cloudflare（浏览器弹出，选择域名授权）
cloudflared tunnel login

# 3. 从 OPC App 获取 Token，然后执行：
npx opc-tunnel setup --token eyJvcGNJZC...

# 完成！隧道已开机自启 (launchd)
# 查看状态
npx opc-tunnel status --name my-opc
```

### Windows 完整流程

**1. 安装 Node.js**

访问 [nodejs.org](https://nodejs.org/)，下载 LTS 版本，双击安装（一路 Next）。

安装完成后打开 PowerShell 验证：
```powershell
node --version   # 应该显示 v18.x 或更高
npm --version    # 应该显示 9.x 或更高
```

**2. 安装 cloudflared**

打开 PowerShell（以管理员身份运行）：
```powershell
winget install Cloudflare.cloudflared
```

关闭并重新打开 PowerShell，验证：
```powershell
cloudflared --version
```

**3. 登录 Cloudflare**

```powershell
cloudflared tunnel login
```

浏览器会自动弹出 Cloudflare 授权页面，选择你的域名后点击授权。

**4. 获取 Token 并运行**

从 OPC App 复制 Token 后：
```powershell
npx opc-tunnel setup --token eyJvcGNJZC...
```

**5. 验证**

配置完成后，可以在浏览器访问你的隧道域名验证：
```powershell
# 查看隧道状态
npx opc-tunnel status --name my-opc

# 测试连通性
curl https://my-opc.opc.app
```

> **Windows 开机自启**：工具会自动创建 Windows 计划任务 (Task Scheduler)，每次登录系统时自动启动隧道。

### Linux 完整流程

```bash
# 1. 安装 cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb

# 2. 登录 Cloudflare
cloudflared tunnel login
# 无桌面环境会输出 URL，复制到本地浏览器打开

# 3. 从 OPC App 获取 Token，然后执行：
npx opc-tunnel setup --token eyJvcGNJZC...

# 完成！隧道已开机自启 (systemd user service)
# 查看状态
systemctl --user status opc-tunnel-my-opc
```

---

## 命令

### `setup` — 一键配置

```bash
npx opc-tunnel setup --token <TOKEN>
npx opc-tunnel setup --token <TOKEN> --no-service  # 不配置开机自启
```

### `status` — 查看状态

```bash
npx opc-tunnel status
npx opc-tunnel status --name my-opc
```

### `remove` — 移除配置

```bash
npx opc-tunnel remove --name my-opc
```

---

## Token 说明

Token 是 OPC App 生成的 Base64 编码 JSON，包含以下信息：

| 字段 | 说明 | 示例 |
|------|------|------|
| `opcId` | 你的 OPC ID | `"12345678-1234-..."` |
| `tunnelName` | 隧道名称 | `"my-opc"` |
| `domain` | 隧道域名 | `"my-opc.opc.app"` |
| `apiBase` | 平台 API 地址 | `"https://api.opc.app"` |
| `localPort` | 本地服务端口 | `3000` |
| `expiresAt` | Token 过期时间 | `"2024-12-31T00:00:00Z"` |

原始 JSON 格式：
```json
{
  "opcId": "12345678-1234-1234-1234-123456789012",
  "tunnelName": "my-opc",
  "domain": "my-opc.opc.app",
  "apiBase": "https://api.opc.app",
  "localPort": 3000,
  "expiresAt": "2024-12-31T00:00:00Z"
}
```

> **Token 只是一次性配置凭证**：首次 `setup` 时用来传递你的 OPC 信息到电脑，配置完成后隧道靠 cloudflared 自身运行，与 Token 无关。只有重新配置（换域名、换电脑）时才需要新 Token。

---

## 原理

```
你的电脑 (localhost:3000)
    ↓ cloudflared tunnel (自动运行)
Cloudflare 网络 (my-opc.opc.app)
    ↓ Cloudflare Access 验证
OPC App (WebView + 认证头)
    ↓
用户看到你的网站
```

**为什么安全？**
- 流量通过 Cloudflare 加密网络传输，不经过 OPC 平台服务器
- Cloudflare Access 保护：只有通过 OPC App（携带 Service Token）才能访问
- 浏览器直接访问 `my-opc.opc.app` 会被 Cloudflare Access 拦截返回 403
- 你的电脑无需开放任何端口，无需公网 IP

---

## 支持的系统

| 系统 | cloudflared 安装方式 | 开机自启方式 | 终端工具 |
|------|-------------------|------------|---------|
| macOS | Homebrew / 直接下载 | launchd (LaunchAgent) | Terminal / iTerm2 |
| Windows 10/11 | winget / MSI / Chocolatey | Task Scheduler | PowerShell |
| Linux (Debian/Ubuntu) | apt (.deb) / 直接下载 | systemd (user service) | bash |
| Linux (CentOS/RHEL) | yum (.rpm) / 直接下载 | systemd (user service) | bash |

---

## 常见问题

### cloudflared 安装后命令找不到？

**Windows**：安装 cloudflared 后需要**关闭并重新打开** PowerShell，或者手动将安装路径加入系统 PATH。

**macOS**：如果 `brew install` 失败，先安装 Homebrew：
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### cloudflared tunnel login 打不开浏览器？

- **Windows**：确保默认浏览器设置正确，或手动复制终端输出的 URL 到浏览器
- **Linux 无桌面**：命令会输出一个 URL，复制到本地浏览器打开即可完成授权
- **macOS**：浏览器应该自动弹出，如果没有，检查终端输出的 URL

### Windows 上 npx 命令报错？

**"npx 不是内部或外部命令"**：
- Node.js 未安装或 PATH 未配置。重新安装 Node.js 并勾选"Add to PATH"选项。

**"execution policy"相关错误**：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Token 粘贴不完整**：
- 在 PowerShell 中右键粘贴（不要用 Ctrl+V）
- 或者用引号包裹 Token：`npx opc-tunnel setup --token "eyJvcGN..."`

### Token 过期了怎么办？

回到 OPC App → Tunnel 配置 → 重新生成 Token，然后再跑一次 `npx opc-tunnel setup --token <新Token>`。已有的 Tunnel 不会被重复创建。

### 怎么更换本地端口？

在 App 中重新生成 Token 时可以指定端口，或者直接编辑配置文件：

- **macOS/Linux**：`~/.cloudflared/config-<tunnel-name>.yml`
- **Windows**：`C:\Users\<用户名>\.cloudflared\config-<tunnel-name>.yml`

修改 `service` 字段中的端口号即可。

### 怎么停止隧道？

```bash
# macOS
launchctl unload ~/Library/LaunchAgents/com.opc.tunnel.<name>.plist

# Linux
systemctl --user stop opc-tunnel-<name>
```

```powershell
# Windows（PowerShell 管理员）
schtasks /End /TN "OPC-Tunnel-<name>"

# 或者用 opc-tunnel 命令彻底移除（全平台通用）
npx opc-tunnel remove --name <name>
```

### 我关机了用户还能访问吗？

不能。关机后隧道断开，用户访问时 App 会显示"服务暂时不可用"提示。重新开机后隧道会自动恢复（已配置开机自启）。

### Windows 怎么查看隧道日志？

隧道日志位于事件查看器，或者直接用命令查看：
```powershell
# 查看计划任务状态
schtasks /Query /TN "OPC-Tunnel-<name>"

# 手动前台运行（可看实时日志）
cloudflared tunnel --config C:\Users\<用户名>\.cloudflared\config-<name>.yml run
```

---

## 开发

```bash
git clone https://github.com/aiyuekuang/opc-tunnel.git
cd opc-tunnel
npm install
npm run dev     # watch mode
npm run build   # production build
```

## License

MIT
