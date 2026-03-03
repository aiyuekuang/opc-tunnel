# opc-tunnel

一键配置 Cloudflare Tunnel，让你的本地服务通过 OPC App 安全访问。

## 这是什么？

[OPC (One Person Company)](https://opc.app) 是一人公司展示平台。OPC 主可以在自己电脑上运行网站/服务，通过 Cloudflare Tunnel 让 App 用户安全访问——**流量不经过平台服务器，零带宽消耗**。

`opc-tunnel` 是帮助 OPC 主快速配置本地隧道的 CLI 工具。

## 快速开始

### 1. 在 OPC App 中获取配置 Token

打开 OPC App → 我的 OPC → Tunnel 配置 → 获取配置 Token

### 2. 在电脑上执行

```bash
npx opc-tunnel setup --token <YOUR_TOKEN>
```

工具会自动完成：
1. ✅ 检测操作系统 (macOS / Windows / Linux)
2. ✅ 检查并安装 cloudflared
3. ✅ 创建 Cloudflare Tunnel
4. ✅ 配置 DNS 路由
5. ✅ 生成配置文件
6. ✅ 注册到 OPC 平台
7. ✅ 配置开机自启
8. ✅ 验证连通性

## 前置条件

- **Node.js** >= 18
- **Cloudflare 账号** (免费即可)
- 本地运行的网站服务 (如 `localhost:3000`)

> 首次使用需要先执行 `cloudflared tunnel login` 登录 Cloudflare。

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

## Token 格式

Token 是 App 生成的 Base64 编码 JSON：

```json
{
  "opcId": "uuid",
  "tunnelName": "my-opc",
  "domain": "my-opc.opc.app",
  "apiBase": "https://api.opc.app",
  "localPort": 3000,
  "expiresAt": "2024-12-31T00:00:00Z"
}
```

## 原理

```
你的电脑 (localhost:3000)
    ↓ cloudflared tunnel
Cloudflare Network (my-opc.opc.app)
    ↓ Cloudflare Access (Service Auth)
OPC App (WebView + CF Headers)
    ↓
用户看到你的网站
```

- 流量通过 Cloudflare 网络传输，不经过 OPC 平台服务器
- Cloudflare Access 保护：只有通过 OPC App 才能访问
- 浏览器直接访问会被 Cloudflare Access 拦截 (403)

## 支持的系统

| 系统 | cloudflared 安装 | 开机自启 |
|------|----------------|---------|
| macOS | Homebrew / 直接下载 | launchd |
| Linux | apt / yum / 直接下载 | systemd (user) |
| Windows | winget | Task Scheduler |

## 开发

```bash
git clone https://github.com/opc-app/opc-tunnel.git
cd opc-tunnel
npm install
npm run dev     # watch mode
npm run build   # production build
```

## License

MIT
