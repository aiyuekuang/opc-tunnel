import { execSync } from 'node:child_process';
import type { Platform } from './detect.js';

function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function getInstallCommand(plat: Platform): { cmd: string; label: string } {
  switch (plat) {
    case 'macos':
      if (commandExists('brew')) {
        return { cmd: 'brew install cloudflared', label: 'Homebrew' };
      }
      return {
        cmd: 'curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz | tar xz && sudo mv cloudflared /usr/local/bin/',
        label: '直接下载',
      };

    case 'windows':
      return { cmd: 'winget install Cloudflare.cloudflared', label: 'winget' };

    case 'linux':
      if (commandExists('apt-get')) {
        return {
          cmd: 'curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb && sudo dpkg -i /tmp/cloudflared.deb',
          label: 'apt (deb)',
        };
      }
      if (commandExists('yum')) {
        return {
          cmd: 'curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.rpm -o /tmp/cloudflared.rpm && sudo rpm -i /tmp/cloudflared.rpm',
          label: 'yum (rpm)',
        };
      }
      return {
        cmd: 'curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared',
        label: '直接下载',
      };
  }
}

export function installCloudflared(plat: Platform): void {
  const { cmd } = getInstallCommand(plat);
  execSync(cmd, { stdio: 'inherit' });
}
