import chalk from 'chalk';
import { WsClient } from './ws-client.js';
import { WebRTCPeer } from './webrtc-peer.js';
import { handleChat } from './chat-handler.js';
import { handleHttpRequest } from './http-proxy.js';
import { decodeDC } from './dc-protocol.js';
import type { SkillConfig } from './types.js';
import type { DCChatMessage, DCHttpRequest } from './dc-protocol.js';

/**
 * Core runtime that orchestrates:
 * 1. WS connection to OPC backend
 * 2. WebRTC peer management for incoming P2P connections
 * 3. Message routing (chat → OpenClaw, http → localhost)
 */
export class Skill {
  private wsClient: WsClient;
  private peers = new Map<string, WebRTCPeer>();
  private config: SkillConfig;

  constructor(config: SkillConfig) {
    this.config = config;

    const wsUrl = config.apiBase
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    const protocol = config.apiBase.startsWith('https') ? 'wss' : 'ws';

    this.wsClient = new WsClient({
      url: `${protocol}://${wsUrl}/ws/skill`,
      opcId: config.opcId,
      secretKey: config.secretKey,
      localPort: config.localPort,
    });

    this.setupWsHandlers();
  }

  private setupWsHandlers(): void {
    this.wsClient.on('connected', () => {
      console.log(chalk.green('  ✓ 已连接到 OPC 后端'));
    });

    this.wsClient.on('registered', () => {
      console.log(chalk.green('  ✓ Skill 已注册，等待用户连接...'));
    });

    this.wsClient.on('skill-error', (data: any) => {
      console.error(chalk.red(`  ✗ Skill 错误: ${data?.message || '未知错误'}`));
    });

    this.wsClient.on('disconnected', () => {
      console.log(chalk.yellow('  ⚠ 连接断开'));
    });

    this.wsClient.on('reconnecting', () => {
      console.log(chalk.dim('  ↻ 重连中...'));
    });

    this.wsClient.on('error', (err: Error) => {
      console.error(chalk.red(`  ✗ WS 错误: ${err.message}`));
    });

    // Handle incoming WebRTC offer
    this.wsClient.on('offer', (data: { peerId: string; sdp: string }) => {
      this.handleOffer(data.peerId, data.sdp);
    });

    // Handle incoming ICE candidate
    this.wsClient.on('ice', (data: { peerId: string; candidate: string }) => {
      const peer = this.peers.get(data.peerId);
      if (peer) {
        peer.addIceCandidate(data.candidate);
      }
    });
  }

  private async handleOffer(peerId: string, sdp: string): Promise<void> {
    console.log(chalk.cyan(`  → 新用户连接: ${peerId.slice(0, 8)}...`));

    // Clean up existing peer if any
    const existing = this.peers.get(peerId);
    if (existing) {
      existing.close();
      this.peers.delete(peerId);
    }

    const peer = new WebRTCPeer({
      peerId,
      onIceCandidate: (candidate) => {
        this.wsClient.sendIce(peerId, candidate);
      },
    });

    this.peers.set(peerId, peer);

    // Handle DataChannel messages
    peer.on('message', (raw: string) => {
      this.routeMessage(raw, peer);
    });

    peer.on('closed', () => {
      console.log(chalk.dim(`  ← 用户断开: ${peerId.slice(0, 8)}...`));
      this.peers.delete(peerId);
    });

    try {
      const answer = await peer.handleOffer(sdp);
      this.wsClient.sendAnswer(peerId, answer);
    } catch (err: any) {
      console.error(chalk.red(`  ✗ 处理 offer 失败: ${err.message}`));
      peer.close();
      this.peers.delete(peerId);
    }
  }

  private routeMessage(raw: string, peer: WebRTCPeer): void {
    try {
      const msg = decodeDC(raw);
      const sendDC = (data: string) => peer.sendMessage(data);

      switch (msg.type) {
        case 'chat':
          handleChat(msg as DCChatMessage, this.config.openclawPort, sendDC);
          break;
        case 'http-req':
          handleHttpRequest(msg as DCHttpRequest, this.config.localPort, sendDC);
          break;
        default:
          console.warn(chalk.yellow(`  未知消息类型: ${msg.type}`));
      }
    } catch {
      // ignore malformed messages
    }
  }

  start(): void {
    console.log('');
    console.log(chalk.bold('🚀 OpenClaw Skill 启动中...'));
    console.log(chalk.dim('─'.repeat(40)));
    console.log(`  OPC: ${chalk.cyan(this.config.opcName)}`);
    console.log(`  本地端口: ${chalk.cyan(String(this.config.localPort))}`);
    console.log(`  OpenClaw: ${chalk.cyan(`http://127.0.0.1:${this.config.openclawPort}`)}`);
    console.log(chalk.dim('─'.repeat(40)));
    console.log('');
    this.wsClient.connect();
  }

  stop(): void {
    // Close all peers
    for (const [id, peer] of this.peers) {
      peer.close();
      this.peers.delete(id);
    }
    this.wsClient.destroy();
    console.log(chalk.dim('  Skill 已停止'));
  }
}
