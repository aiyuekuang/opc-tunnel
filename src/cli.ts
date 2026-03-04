import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { DEFAULT_API_BASE, interactiveLogin } from './auth.js';
import { qrSetup } from './qr-auth.js';
import { loadConfig, saveConfig, configExists, getConfigPath } from './config.js';
import { Skill } from './skill.js';
import type { SkillConfig } from './types.js';
import type { ApiResponse } from './types.js';

const program = new Command();

program
  .name('openclaw-skill-opc')
  .description('OpenClaw Skill for OPC — AI 聊天 + P2P 网站访问')
  .version('1.0.0');

program
  .command('setup')
  .description('配置 Skill 并绑定到你的 OPC')
  .argument('<port>', '本地 Web 服务端口 (例如: 3000)', (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 1 || n > 65535) {
      throw new Error('端口号必须是 1-65535 之间的数字');
    }
    return n;
  })
  .option('--openclaw-port <port>', 'OpenClaw 端口', '18789')
  .option('--api <url>', 'OPC 后端地址', DEFAULT_API_BASE)
  .option('--login', '使用账号密码登录（替代扫码授权）')
  .action(async (port: number, options) => {
    try {
      console.log('');
      console.log(chalk.bold('🔧 OpenClaw Skill for OPC — 配置向导'));
      console.log(chalk.dim('─'.repeat(40)));
      console.log('');

      const apiBase = options.api;
      const openclawPort = parseInt(options.openclawPort, 10);

      let config: SkillConfig;

      if (options.login) {
        // Interactive login → fetch OPC info
        const loginResult = await interactiveLogin(apiBase);
        console.log('');
        ora().start().succeed(`登录成功，欢迎 ${chalk.cyan(loginResult.nickname)}`);

        // Generate skill key
        const spinner = ora('生成 Skill 密钥...').start();
        const res = await fetch(`${apiBase}/api/skill/generate-key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${loginResult.jwt}`,
          },
          body: JSON.stringify({ localPort: port }),
        });

        const data = (await res.json()) as ApiResponse<{ opcId: string; opcName: string; secretKey: string }>;
        if (data.code !== 0) throw new Error(data.msg);

        spinner.succeed('Skill 密钥已生成');

        config = {
          opcId: data.data.opcId,
          opcName: data.data.opcName,
          secretKey: data.data.secretKey,
          localPort: port,
          openclawPort,
          apiBase,
        };
      } else {
        // QR code scan
        const result = await qrSetup(apiBase, port, openclawPort);

        config = {
          opcId: result.opcId,
          opcName: result.opcName,
          secretKey: result.secretKey,
          localPort: port,
          openclawPort,
          apiBase,
        };
      }

      saveConfig(config);

      console.log('');
      console.log(chalk.green.bold('✅ 配置完成！'));
      console.log('');
      console.log(`  OPC: ${chalk.cyan(config.opcName)}`);
      console.log(`  本地端口: ${chalk.cyan(String(config.localPort))}`);
      console.log(`  OpenClaw: ${chalk.cyan(`http://127.0.0.1:${config.openclawPort}`)}`);
      console.log(`  配置文件: ${chalk.dim(getConfigPath())}`);
      console.log('');
      console.log(chalk.dim('运行以下命令启动 Skill:'));
      console.log(chalk.cyan('  openclaw-skill-opc start'));
      console.log('');
    } catch (e: any) {
      console.error(chalk.red('❌ ' + e.message));
      process.exit(1);
    }
  });

program
  .command('start')
  .description('启动 Skill (连接 OPC 后端，等待 P2P 连接)')
  .action(() => {
    try {
      if (!configExists()) {
        console.error(chalk.red('❌ 未找到配置，请先运行: openclaw-skill-opc setup <port>'));
        process.exit(1);
      }

      const config = loadConfig();
      const skill = new Skill(config);

      // Graceful shutdown
      const shutdown = () => {
        console.log('');
        skill.stop();
        process.exit(0);
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      skill.start();
    } catch (e: any) {
      console.error(chalk.red('❌ ' + e.message));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('查看当前 Skill 配置状态')
  .action(() => {
    console.log('');
    console.log(chalk.bold('📊 OpenClaw Skill 状态'));
    console.log(chalk.dim('─'.repeat(40)));
    console.log('');

    if (!configExists()) {
      console.log(chalk.yellow('  未配置。请运行: openclaw-skill-opc setup <port>'));
    } else {
      const config = loadConfig();
      console.log(`  OPC: ${chalk.cyan(config.opcName)}`);
      console.log(`  OPC ID: ${chalk.dim(config.opcId.slice(0, 8) + '...')}`);
      console.log(`  本地端口: ${chalk.cyan(String(config.localPort))}`);
      console.log(`  OpenClaw 端口: ${chalk.cyan(String(config.openclawPort))}`);
      console.log(`  API: ${chalk.dim(config.apiBase)}`);
      console.log(`  配置文件: ${chalk.dim(getConfigPath())}`);
    }

    console.log('');
  });

program.parse();
