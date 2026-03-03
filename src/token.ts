export interface TunnelToken {
  opcId: string;
  tunnelName: string;
  domain: string;
  apiBase: string;
  localPort: number;
  expiresAt: string;
}

export function decodeToken(tokenStr: string): TunnelToken {
  try {
    const json = Buffer.from(tokenStr, 'base64').toString('utf-8');
    const data = JSON.parse(json);

    if (!data.opcId || !data.tunnelName || !data.domain || !data.apiBase) {
      throw new Error('Token 缺少必要字段');
    }

    return {
      opcId: data.opcId,
      tunnelName: data.tunnelName,
      domain: data.domain,
      apiBase: data.apiBase,
      localPort: data.localPort || 3000,
      expiresAt: data.expiresAt || '',
    };
  } catch (e: any) {
    if (e.message.includes('Token')) throw e;
    throw new Error('Token 格式无效，请从 OPC App 重新获取');
  }
}

export function isTokenExpired(token: TunnelToken): boolean {
  if (!token.expiresAt) return false;
  return new Date(token.expiresAt) < new Date();
}

export function encodeToken(data: TunnelToken): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}
