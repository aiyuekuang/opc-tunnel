import chalk from 'chalk';
import ora from 'ora';
import qrcode from 'qrcode-terminal';
import type { ApiResponse, QrSessionResponse, QrPollResponse } from './types.js';

function generateQrCode(url: string): Promise<void> {
  return new Promise((resolve) => {
    qrcode.generate(url, { small: true }, () => resolve());
  });
}

export interface QrSetupResult {
  opcId: string;
  opcName: string;
  secretKey: string;
}

export async function qrSetup(
  apiBase: string,
  localPort: number,
  openclawPort: number,
): Promise<QrSetupResult> {
  // 1. Create QR session
  const spinner = ora('创建授权会话...').start();

  const res = await fetch(`${apiBase}/api/skill/setup-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ localPort, openclawPort }),
  });

  const sessionData = (await res.json()) as ApiResponse<QrSessionResponse>;
  if (sessionData.code !== 0) {
    throw new Error(`创建会话失败: ${sessionData.msg}`);
  }

  const { sessionId, qrUrl } = sessionData.data;
  spinner.succeed('授权会话已创建');

  // 2. Display QR code
  console.log('');
  console.log(chalk.bold('📱 请用 OPC App 扫描下方二维码进行授权'));
  console.log(chalk.dim('   打开 OPC App → 扫一扫'));
  console.log('');

  await generateQrCode(qrUrl);

  console.log('');
  console.log(chalk.dim(`会话 ID: ${sessionId.slice(0, 8)}...`));
  console.log(chalk.dim('二维码有效期 5 分钟'));
  console.log('');

  // 3. Poll for approval
  const pollSpinner = ora('等待手机扫码授权...').start();
  const startTime = Date.now();
  const TIMEOUT = 5 * 60 * 1000;
  const INTERVAL = 2000;

  while (Date.now() - startTime < TIMEOUT) {
    await new Promise((r) => setTimeout(r, INTERVAL));

    const pollRes = await fetch(`${apiBase}/api/skill/setup-qr-poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    const pollData = (await pollRes.json()) as ApiResponse<QrPollResponse>;
    if (pollData.code !== 0) {
      throw new Error(`轮询失败: ${pollData.msg}`);
    }

    const { status, data } = pollData.data;

    if (status === 'approved' && data) {
      pollSpinner.succeed('授权成功！');
      return {
        opcId: data.opcId,
        opcName: data.opcName,
        secretKey: data.secretKey,
      };
    }

    if (status === 'expired') {
      pollSpinner.fail('会话已过期');
      throw new Error('授权超时，请重新运行 setup 命令');
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    pollSpinner.text = `等待手机扫码授权... (${elapsed}s)`;
  }

  pollSpinner.fail('授权超时');
  throw new Error('授权超时（5分钟），请重新运行 setup 命令');
}
