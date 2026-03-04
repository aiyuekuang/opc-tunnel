import WebSocket from 'ws';
import { EventEmitter } from 'node:events';

export interface WsClientOptions {
  url: string;
  opcId: string;
  secretKey: string;
  localPort: number;
}

/**
 * WebSocket client connecting to OPC backend /ws/skill
 * Handles registration, heartbeat (30s), auto-reconnect (5s)
 */
export class WsClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private options: WsClientOptions;

  constructor(options: WsClientOptions) {
    super();
    this.options = options;
  }

  connect(): void {
    if (this.destroyed) return;

    const ws = new WebSocket(this.options.url);
    this.ws = ws;

    ws.on('open', () => {
      this.emit('connected');
      // Register with backend
      this.send({
        event: 'skill:register',
        data: {
          opcId: this.options.opcId,
          secretKey: this.options.secretKey,
          localPort: this.options.localPort,
        },
      });
      this.startHeartbeat();
    });

    ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleMessage(msg);
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      this.emit('disconnected');
      this.stopHeartbeat();
      this.scheduleReconnect();
    });

    ws.on('error', (err: Error) => {
      this.emit('error', err);
      ws.close();
    });
  }

  private handleMessage(msg: any): void {
    const { event, data } = msg;

    switch (event) {
      case 'skill:registered':
        this.emit('registered', data);
        break;
      case 'skill:error':
        this.emit('skill-error', data);
        break;
      case 'signal:offer':
        this.emit('offer', data);
        break;
      case 'signal:ice':
        this.emit('ice', data);
        break;
      default:
        this.emit('message', msg);
    }
  }

  send(msg: { event: string; data: any }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendAnswer(peerId: string, sdp: string): void {
    this.send({
      event: 'signal:answer',
      data: { peerId, sdp },
    });
  }

  sendIce(peerId: string, candidate: string): void {
    this.send({
      event: 'signal:ice',
      data: { peerId, candidate },
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ event: 'skill:heartbeat', data: {} });
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    this.reconnectTimer = setTimeout(() => {
      this.emit('reconnecting');
      this.connect();
    }, 5_000);
  }

  destroy(): void {
    this.destroyed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
