import chalk from 'chalk';
import { createInterface } from 'node:readline';
import type { ApiResponse } from './types.js';

const DEFAULT_API_BASE = 'http://117.72.173.146:3000';

interface LoginData {
  access_token: string;
  user: { id: string; nickname: string; email: string };
}

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      const rl = createInterface({ input: stdin, output: process.stdout });
      rl.question('', (answer) => { rl.close(); resolve(answer.trim()); });
      return;
    }

    stdin.setRawMode(true);
    stdin.resume();
    let input = '';

    const onData = (buf: Buffer) => {
      const c = buf.toString();
      if (c === '\n' || c === '\r') {
        stdin.removeListener('data', onData);
        stdin.setRawMode(false);
        stdin.pause();
        process.stdout.write('\n');
        resolve(input);
      } else if (c === '\u0003') {
        process.exit(0);
      } else if (c === '\u007F' || c === '\b') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        input += c;
        process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

export async function interactiveLogin(apiBase: string): Promise<{ jwt: string; nickname: string }> {
  const account = await prompt(chalk.cyan('📧 请输入 OPC 账号 (邮箱): '));
  if (!account) throw new Error('账号不能为空');

  const password = await promptPassword(chalk.cyan('🔑 请输入密码: '));
  if (!password) throw new Error('密码不能为空');

  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, password }),
  });

  const data = (await res.json()) as ApiResponse<LoginData>;
  if (data.code !== 0) {
    throw new Error(`登录失败: ${data.msg}`);
  }

  return {
    jwt: data.data.access_token,
    nickname: data.data.user.nickname,
  };
}

export { DEFAULT_API_BASE };
