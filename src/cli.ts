import { Command } from 'commander';
import chalk from 'chalk';
import { setup } from './setup.js';
import { detectPlatform, isCloudflaredInstalled, getCloudflaredVersion } from './detect.js';
import { tunnelExists } from './tunnel.js';
import { removeService } from './service.js';

const program = new Command();

program
  .name('opc-tunnel')
  .description('OPC Tunnel 配置工具 — 一键打通本地服务到 OPC App')
  .version('0.1.0');

program
  .command('setup')
  .description('配置 Cloudflare Tunnel (从 OPC App 获取 Token)')
  .requiredOption('-t, --token <token>', '配置 Token (从 OPC App 获取)')
  .option('--no-service', '不创建开机自启服务')
  .action(async (options) => {
    try {
      await setup({
        token: options.token,
        noService: !options.service,
      });
    } catch (e: any) {
      console.error(chalk.red('❌ ' + e.message));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('查看当前 Tunnel 状态')
  .option('-n, --name <name>', 'Tunnel 名称')
  .action((options) => {
    console.log('');
    console.log(chalk.bold('📊 OPC Tunnel 状态'));
    console.log(chalk.dim('─'.repeat(40)));
    console.log('');

    // Platform
    const plat = detectPlatform();
    console.log(`  系统: ${plat}`);

    // cloudflared
    if (isCloudflaredInstalled()) {
      const version = getCloudflaredVersion();
      console.log(`  cloudflared: ${chalk.green('已安装')} ${chalk.dim(`(${version})`)}`);
    } else {
      console.log(`  cloudflared: ${chalk.red('未安装')}`);
      return;
    }

    // Tunnel
    if (options.name) {
      const info = tunnelExists(options.name);
      if (info) {
        console.log(`  Tunnel "${options.name}": ${chalk.green('存在')} ${chalk.dim(`(${info.id.slice(0, 8)}...)`)}`);
      } else {
        console.log(`  Tunnel "${options.name}": ${chalk.red('不存在')}`);
      }
    }

    console.log('');
  });

program
  .command('remove')
  .description('移除 Tunnel 配置和系统服务')
  .requiredOption('-n, --name <name>', 'Tunnel 名称')
  .action((options) => {
    console.log('');
    const plat = detectPlatform();

    try {
      removeService(plat, options.name);
      console.log(chalk.green(`✅ 已移除 Tunnel "${options.name}" 的系统服务`));
    } catch {
      console.log(chalk.yellow(`⚠ 未找到 "${options.name}" 的系统服务`));
    }

    console.log('');
    console.log(chalk.dim('注意: Tunnel 本身未删除。如需删除，请运行:'));
    console.log(chalk.cyan(`  cloudflared tunnel delete ${options.name}`));
    console.log('');
  });

program.parse();
