import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getCloudflaredDir } from './config.js';

export interface TunnelInfo {
  id: string;
  name: string;
  credentialsFile: string;
}

/**
 * Create a new cloudflared tunnel
 */
export function createTunnel(name: string): TunnelInfo {
  const output = execSync(`cloudflared tunnel create ${name}`, {
    stdio: 'pipe',
  }).toString();

  // Parse tunnel ID from output
  // Output like: Created tunnel xxx with id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const idMatch = output.match(/id\s+([0-9a-f-]{36})/i);
  if (!idMatch) {
    throw new Error('无法解析 Tunnel ID，请检查输出:\n' + output);
  }

  const tunnelId = idMatch[1];
  const credentialsFile = findCredentialsFile(tunnelId);

  return {
    id: tunnelId,
    name,
    credentialsFile,
  };
}

/**
 * Check if a tunnel with given name already exists
 */
export function tunnelExists(name: string): TunnelInfo | null {
  try {
    const output = execSync('cloudflared tunnel list --output json', {
      stdio: 'pipe',
    }).toString();
    const tunnels = JSON.parse(output);
    const found = tunnels.find((t: any) => t.name === name);
    if (!found) return null;

    return {
      id: found.id,
      name: found.name,
      credentialsFile: findCredentialsFile(found.id),
    };
  } catch {
    return null;
  }
}

/**
 * Route DNS for the tunnel
 */
export function routeDns(tunnelName: string, hostname: string): void {
  execSync(`cloudflared tunnel route dns ${tunnelName} ${hostname}`, {
    stdio: 'inherit',
  });
}

/**
 * Run tunnel (blocking)
 */
export function runTunnel(configPath: string): void {
  execSync(`cloudflared tunnel --config ${configPath} run`, {
    stdio: 'inherit',
  });
}

function findCredentialsFile(tunnelId: string): string {
  const dir = getCloudflaredDir();
  const expectedFile = join(dir, `${tunnelId}.json`);

  if (existsSync(expectedFile)) {
    return expectedFile;
  }

  // Search for credentials file
  if (existsSync(dir)) {
    const files = readdirSync(dir);
    const cred = files.find((f) => f.includes(tunnelId) && f.endsWith('.json'));
    if (cred) return join(dir, cred);
  }

  return expectedFile; // Return expected path even if not found yet
}
