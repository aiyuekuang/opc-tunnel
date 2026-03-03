# opc-tunnel

一键配置 Cloudflare Tunnel，让你的本地服务通过 OPC App 安全访问。

## 这是什么？

[OPC (One Person Company)](https://opc.app) 是一人公司展示平台。OPC 主可以在自己电脑上运行网站/服务，通过 Cloudflare Tunnel 让 App 用户安全访问——**流量不经过平台服务器，零带宽消耗**。

`opc-tunnel` 是帮助 OPC 主快速配置本地隧道的 CLI 工具。

## 快速开始

### 前置条件

- **Node.js** >= 18 ([下载](https://nodejs.org/))
- **Cloudflare 账号** (免费即可，[注册](https://dash.cloudflare.com/sign-up))
- 一个托管在 Cloudflare 的域名（用于创建隧道子域名）
- 本地运行的网站服务（如 `localhost:3000`）

### 第 1 步：登录 Cloudflare

首次使用需要先在电脑上登录 Cloudflare（会打开浏览器授权）：

```bash
# 如果还没装 cloudflared，工具会帮你自动安装，可以跳过这步
# macOS
brew install cloudflared

# 登录（浏览器会弹出，选择你的域名授权）
cloudflared tunnel login
```

### 第 2 步：在 OPC App 中获取 Token

```
打开 OPC App
  → 我的 OPC
    → Tunnel 配置
      → 点击「生成配置 Token」
        → 复制 Token 字符串
```

Token 是一串 Base64 编码的字符串，类似：
```
eyJvcGNJZCI6IjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTAxMiIsInR1bm5lbE5hbWUiOiJteS1vcGMiLCJkb21haW4iOiJteS1vcGMub3BjLmFwcCIsImFwaUJhc2UiOiJodHRwczovL2FwaS5vcGMuYXBwIiwibG9jYWxQb3J0IjozMDAwfQ==
```

Token 包含你的 OPC 配置信息（隧道名称、域名、本地端口等），由 App 根据你的 OPC 信息自动生成，有效期 24 小时。

### 第 3 步：运行配置命令

```bash
npx opc-tunnel setup --token <粘贴你的Token>
```

工具会自动完成以下 8 个步骤：

```
🔧 OPC Tunnel 配置工具
────────────────────────────────────────

✔ 配置信息: my-opc → my-opc.opc.app
  本地端口: 3000 | API: https://api.opc.app

系统: macos
✔ cloudflared 已安装 (2024.2.1)
✔ Tunnel 创建成功 (a1b2c3d4...)
✔ DNS 已配置: my-opc.opc.app
✔ 配置文件: ~/.cloudflared/config-my-opc.yml
✔ 已注册到 OPC 平台
✔ 开机自启已配置
✔ 隧道连通正常

✅ 配置完成！

  隧道名称: my-opc
  隧道域名: https://my-opc.opc.app
  本地服务: http://localhost:3000
  配置文件: /Users/xxx/.cloudflared/config-my-opc.yml

确保你的本地服务在 localhost:3000 运行，
用户就可以通过 OPC App 访问你的网站了。
```

### 完成！

配置完成后，只要你的电脑开着、本地服务在运行，OPC App 的用户就能访问你的网站了。隧道已设置为开机自启，无需每次手动启动。

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

> Token 仅用于初次配置，不会存储在本地。过期后需从 App 重新获取。

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

## 支持的系统

| 系统 | cloudflared 安装方式 | 开机自启方式 |
|------|-------------------|------------|
| macOS | Homebrew / 直接下载 | launchd (LaunchAgent) |
| Linux (Debian/Ubuntu) | apt (.deb) / 直接下载 | systemd (user service) |
| Linux (CentOS/RHEL) | yum (.rpm) / 直接下载 | systemd (user service) |
| Windows | winget | Task Scheduler |

## 常见问题

### cloudflared tunnel login 打不开浏览器？

在无桌面的 Linux 服务器上，`cloudflared tunnel login` 会输出一个 URL，复制到本地浏览器打开即可完成授权。

### Token 过期了怎么办？

回到 OPC App → Tunnel 配置 → 重新生成 Token，然后再跑一次 `npx opc-tunnel setup --token <新Token>`。已有的 Tunnel 不会被重复创建。

### 怎么更换本地端口？

在 App 中重新生成 Token 时可以指定端口，或者直接编辑配置文件 `~/.cloudflared/config-<tunnel-name>.yml` 里的 `service` 字段。

### 怎么停止隧道？

```bash
# 临时停止
# macOS
launchctl unload ~/Library/LaunchAgents/com.opc.tunnel.<name>.plist

# Linux
systemctl --user stop opc-tunnel-<name>

# 或者用 opc-tunnel 命令彻底移除
npx opc-tunnel remove --name <name>
```

### 我关机了用户还能访问吗？

不能。关机后隧道断开，用户访问时 App 会显示"服务暂时不可用"提示。重新开机后隧道会自动恢复（已配置开机自启）。

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
