import type { TunnelToken } from './token.js';

interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

export async function registerTunnel(token: TunnelToken): Promise<void> {
  const url = `${token.apiBase}/api/tunnel/register-from-cli`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      opcId: token.opcId,
      tunnelDomain: token.domain,
    }),
  });

  const data = (await res.json()) as ApiResponse;
  if (data.code !== 0) {
    throw new Error(`注册失败: ${data.msg}`);
  }
}

export async function verifyTunnel(token: TunnelToken): Promise<boolean> {
  try {
    const res = await fetch(`https://${token.domain}`, {
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
