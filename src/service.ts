import { execSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Platform } from './detect.js';
import { getConfigPath } from './config.js';

/**
 * Create a system service for cloudflared tunnel (auto-start on boot)
 */
export function createService(plat: Platform, tunnelName: string): void {
  switch (plat) {
    case 'macos':
      createLaunchdService(tunnelName);
      break;
    case 'linux':
      createSystemdService(tunnelName);
      break;
    case 'windows':
      createWindowsTask(tunnelName);
      break;
  }
}

function createLaunchdService(tunnelName: string) {
  const plistName = `com.opc.tunnel.${tunnelName}`;
  const plistPath = join(homedir(), 'Library', 'LaunchAgents', `${plistName}.plist`);
  const configPath = getConfigPath(tunnelName);

  const cloudflaredPath = getCloudflaredBinPath();

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${plistName}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${cloudflaredPath}</string>
        <string>tunnel</string>
        <string>--config</string>
        <string>${configPath}</string>
        <string>run</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${join(homedir(), '.cloudflared', `${tunnelName}.log`)}</string>
    <key>StandardErrorPath</key>
    <string>${join(homedir(), '.cloudflared', `${tunnelName}.err.log`)}</string>
</dict>
</plist>`;

  const dir = join(homedir(), 'Library', 'LaunchAgents');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(plistPath, plist, 'utf-8');
  execSync(`launchctl load ${plistPath}`, { stdio: 'pipe' });
}

function createSystemdService(tunnelName: string) {
  const configPath = getConfigPath(tunnelName);
  const cloudflaredPath = getCloudflaredBinPath();

  const unit = `[Unit]
Description=OPC Cloudflare Tunnel (${tunnelName})
After=network.target

[Service]
Type=simple
ExecStart=${cloudflaredPath} tunnel --config ${configPath} run
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`;

  const serviceDir = join(homedir(), '.config', 'systemd', 'user');
  if (!existsSync(serviceDir)) {
    mkdirSync(serviceDir, { recursive: true });
  }

  const servicePath = join(serviceDir, `opc-tunnel-${tunnelName}.service`);
  writeFileSync(servicePath, unit, 'utf-8');

  execSync('systemctl --user daemon-reload', { stdio: 'pipe' });
  execSync(`systemctl --user enable opc-tunnel-${tunnelName}`, { stdio: 'pipe' });
  execSync(`systemctl --user start opc-tunnel-${tunnelName}`, { stdio: 'pipe' });
}

function createWindowsTask(tunnelName: string) {
  const configPath = getConfigPath(tunnelName);
  const cloudflaredPath = getCloudflaredBinPath();

  const taskName = `OPC-Tunnel-${tunnelName}`;
  const cmd = `schtasks /Create /TN "${taskName}" /TR "${cloudflaredPath} tunnel --config ${configPath} run" /SC ONLOGON /RL HIGHEST /F`;

  execSync(cmd, { stdio: 'pipe' });
  // Start immediately
  execSync(`schtasks /Run /TN "${taskName}"`, { stdio: 'pipe' });
}

function getCloudflaredBinPath(): string {
  try {
    return execSync('which cloudflared', { stdio: 'pipe' }).toString().trim();
  } catch {
    return 'cloudflared';
  }
}

export function removeService(plat: Platform, tunnelName: string): void {
  try {
    switch (plat) {
      case 'macos': {
        const plistName = `com.opc.tunnel.${tunnelName}`;
        const plistPath = join(homedir(), 'Library', 'LaunchAgents', `${plistName}.plist`);
        execSync(`launchctl unload ${plistPath}`, { stdio: 'pipe' });
        break;
      }
      case 'linux':
        execSync(`systemctl --user stop opc-tunnel-${tunnelName}`, { stdio: 'pipe' });
        execSync(`systemctl --user disable opc-tunnel-${tunnelName}`, { stdio: 'pipe' });
        break;
      case 'windows':
        execSync(`schtasks /Delete /TN "OPC-Tunnel-${tunnelName}" /F`, { stdio: 'pipe' });
        break;
    }
  } catch {
    // Service might not exist
  }
}
