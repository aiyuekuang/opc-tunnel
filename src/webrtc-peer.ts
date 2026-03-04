import { PeerConnection, DescriptionType } from 'node-datachannel';
import { EventEmitter } from 'node:events';

const ICE_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
];

export interface PeerOptions {
  peerId: string;
  onIceCandidate: (candidate: string) => void;
}

/**
 * Manages a single WebRTC PeerConnection (answerer side).
 * Receives offer → creates answer → establishes DataChannel.
 */
export class WebRTCPeer extends EventEmitter {
  private pc: InstanceType<typeof PeerConnection>;
  private dc: any = null;
  readonly peerId: string;

  constructor(options: PeerOptions) {
    super();
    this.peerId = options.peerId;

    this.pc = new PeerConnection(`peer-${options.peerId}`, {
      iceServers: ICE_SERVERS,
    });

    this.pc.onLocalCandidate((candidate: string, mid: string) => {
      options.onIceCandidate(JSON.stringify({ candidate, mid }));
    });

    this.pc.onDataChannel((dc: any) => {
      this.dc = dc;
      this.emit('datachannel', dc);

      dc.onMessage((msg: string | Buffer) => {
        const text = typeof msg === 'string' ? msg : msg.toString();
        this.emit('message', text);
      });

      dc.onClosed(() => {
        this.emit('datachannel-closed');
      });
    });

    this.pc.onStateChange((state: string) => {
      this.emit('state', state);
      if (state === 'closed' || state === 'failed' || state === 'disconnected') {
        this.emit('closed');
      }
    });
  }

  async handleOffer(sdp: string): Promise<string> {
    this.pc.setRemoteDescription(sdp, DescriptionType.Offer);
    const getDesc = this.pc.localDescription;
    if (!getDesc) throw new Error('Failed to create answer');
    const desc = typeof getDesc === 'function' ? getDesc() : getDesc;
    if (!desc) throw new Error('Failed to create answer');
    return desc.sdp ?? '';
  }

  addIceCandidate(candidateJson: string): void {
    try {
      const { candidate, mid } = JSON.parse(candidateJson);
      this.pc.addRemoteCandidate(candidate, mid || '0');
    } catch {
      // ignore malformed candidates
    }
  }

  sendMessage(msg: string): void {
    if (this.dc) {
      this.dc.sendMessage(msg);
    }
  }

  close(): void {
    if (this.dc) {
      try { this.dc.close(); } catch { /* ignore */ }
      this.dc = null;
    }
    try { this.pc.close(); } catch { /* ignore */ }
  }
}
