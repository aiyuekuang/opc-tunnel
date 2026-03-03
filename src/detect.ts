import { execSync } from 'node:child_process';
import { platform } from 'node:os';

export type Platform = 'macos' | 'windows' | 'linux';

export function detectPlatform(): Platform {
  const os = platform();
  if (os === 'darwin') return 'macos';
  if (os === 'win32') return 'windows';
  return 'linux';
}

export function isCloudflaredInstalled(): boolean {
  try {
    execSync('cloudflared --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function getCloudflaredVersion(): string | null {
  try {
    const output = execSync('cloudflared --version', { stdio: 'pipe' }).toString().trim();
    // Output like: cloudflared version 2024.2.1 (built 2024-02-15-...)
    const match = output.match(/version\s+([\d.]+)/);
    return match ? match[1] : output;
  } catch {
    return null;
  }
}

export function isTunnelRunning(tunnelName: string): boolean {
  try {
    const output = execSync('cloudflared tunnel list --output json', { stdio: 'pipe' }).toString();
    const tunnels = JSON.parse(output);
    return tunnels.some((t: any) => t.name === tunnelName);
  } catch {
    return false;
  }
}
