import chalk from 'chalk';
import ora from 'ora';
import { detectPlatform, isCloudflaredInstalled, getCloudflaredVersion } from './detect.js';
import { getInstallCommand, installCloudflared } from './install.js';
import { decodeToken, isTokenExpired } from './token.js';
import { registerTunnel, verifyTunnel } from './api.js';
import { generateConfig, writeConfig } from './config.js';
import { createTunnel, tunnelExists, routeDns } from './tunnel.js';
import { createService } from './service.js';

interface SetupOptions {
  token: string;
  noService?: boolean;
}

export async function setup(options: SetupOptions) {
  console.log('');
  console.log(chalk.bold('🔧 OPC Tunnel 配置工具'));
  console.log(chalk.dim('─'.repeat(40)));
  console.log('');

  // 1. Decode token
  const spinner = ora('解析配置 Token...').start();
  const token = decodeToken(options.token);

  if (isTokenExpired(token)) {
    spinner.fail('Token 已过期，请从 OPC App 重新获取');
    process.exit(1);
  }

  spinner.succeed(`配置信息: ${chalk.cyan(token.tunnelName)} → ${chalk.cyan(token.domain)}`);
  console.log(chalk.dim(`  本地端口: ${token.localPort} | API: ${token.apiBase}`));
  console.log('');

  // 2. Detect platform
  const plat = detectPlatform();
  console.log(chalk.dim(`系统: ${plat}`));

  // 3. Check cloudflared
  const spinner2 = ora('检查 cloudflared...').start();

  if (isCloudflaredInstalled()) {
    const version = getCloudflaredVersion();
    spinner2.succeed(`cloudflared 已安装 ${chalk.dim(`(${version})`)}`);
  } else {
    spinner2.text = '安装 cloudflared...';
    const { label } = getInstallCommand(plat);
    spinner2.text = `安装 cloudflared (${label})...`;

    try {
      installCloudflared(plat);
      spinner2.succeed('cloudflared 安装成功');
    } catch (e: any) {
      spinner2.fail('cloudflared 安装失败');
      console.log('');
      console.log(chalk.yellow('请手动安装 cloudflared:'));
      console.log(chalk.cyan('  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/'));
      console.log('');
      console.log('安装后重新运行此命令。');
      process.exit(1);
    }
  }

  // 4. Check if tunnel already exists
  const spinner3 = ora('创建 Tunnel...').start();
  let tunnelInfo = tunnelExists(token.tunnelName);

  if (tunnelInfo) {
    spinner3.succeed(`Tunnel "${token.tunnelName}" 已存在 ${chalk.dim(`(${tunnelInfo.id.slice(0, 8)}...)`)}`);
  } else {
    try {
      tunnelInfo = createTunnel(token.tunnelName);
      spinner3.succeed(`Tunnel 创建成功 ${chalk.dim(`(${tunnelInfo.id.slice(0, 8)}...)`)}`);
    } catch (e: any) {
      spinner3.fail('Tunnel 创建失败');
      if (e.message?.includes('login')) {
        console.log('');
        console.log(chalk.yellow('请先登录 Cloudflare:'));
        console.log(chalk.cyan('  cloudflared tunnel login'));
        console.log('');
        console.log('登录后重新运行此命令。');
      } else {
        console.log(chalk.red(e.message));
      }
      process.exit(1);
    }
  }

  // 5. Route DNS
  const spinner4 = ora(`配置 DNS (${token.domain})...`).start();
  try {
    routeDns(token.tunnelName, token.domain);
    spinner4.succeed(`DNS 已配置: ${chalk.cyan(token.domain)}`);
  } catch {
    spinner4.warn('DNS 配置跳过 (可能已存在)');
  }

  // 6. Generate config
  const spinner5 = ora('生成配置文件...').start();
  const configContent = generateConfig(token, {
    tunnelId: tunnelInfo.id,
    credentialsFile: tunnelInfo.credentialsFile,
  });
  const configPath = writeConfig(token.tunnelName, configContent);
  spinner5.succeed(`配置文件: ${chalk.dim(configPath)}`);

  // 7. Register with OPC platform
  const spinner6 = ora('注册到 OPC 平台...').start();
  try {
    await registerTunnel(token);
    spinner6.succeed('已注册到 OPC 平台');
  } catch (e: any) {
    spinner6.warn(`平台注册跳过: ${e.message}`);
  }

  // 8. Create system service (auto-start)
  if (!options.noService) {
    const spinner7 = ora('配置开机自启...').start();
    try {
      createService(plat, token.tunnelName);
      spinner7.succeed('开机自启已配置');
    } catch (e: any) {
      spinner7.warn(`开机自启配置失败: ${e.message}`);
      console.log(chalk.dim('  你可以手动启动: cloudflared tunnel --config ' + configPath + ' run'));
    }
  }

  // 9. Verify connectivity
  const spinner8 = ora('验证连通性...').start();
  // Wait a moment for tunnel to start
  await new Promise((r) => setTimeout(r, 3000));

  const ok = await verifyTunnel(token);
  if (ok) {
    spinner8.succeed('隧道连通正常');
  } else {
    spinner8.warn('暂时无法验证连通性 (隧道可能还在启动中)');
  }

  // Done!
  console.log('');
  console.log(chalk.green.bold('✅ 配置完成！'));
  console.log('');
  console.log(`  隧道名称: ${chalk.cyan(token.tunnelName)}`);
  console.log(`  隧道域名: ${chalk.cyan(`https://${token.domain}`)}`);
  console.log(`  本地服务: ${chalk.cyan(`http://localhost:${token.localPort}`)}`);
  console.log(`  配置文件: ${chalk.dim(configPath)}`);
  console.log('');
  console.log(chalk.dim('确保你的本地服务在 localhost:' + token.localPort + ' 运行，'));
  console.log(chalk.dim('用户就可以通过 OPC App 访问你的网站了。'));
  console.log('');
}
