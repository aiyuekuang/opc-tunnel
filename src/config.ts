import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { stringify } from 'yaml';
import type { TunnelToken } from './token.js';

export function getCloudflaredDir(): string {
  return join(homedir(), '.cloudflared');
}

export function getConfigPath(tunnelName: string): string {
  return join(getCloudflaredDir(), `config-${tunnelName}.yml`);
}

export interface TunnelCredentials {
  tunnelId: string;
  credentialsFile: string;
}

export function generateConfig(
  token: TunnelToken,
  credentials: TunnelCredentials,
): string {
  const config = {
    tunnel: credentials.tunnelId,
    'credentials-file': credentials.credentialsFile,
    ingress: [
      {
        hostname: token.domain,
        service: `http://localhost:${token.localPort}`,
      },
      { service: 'http_status:404' },
    ],
  };

  return stringify(config);
}

export function writeConfig(tunnelName: string, content: string): string {
  const dir = getCloudflaredDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const configPath = getConfigPath(tunnelName);
  writeFileSync(configPath, content, 'utf-8');
  return configPath;
}
