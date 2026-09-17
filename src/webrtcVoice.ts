import Peer, { MediaConnection, DataConnection } from 'peerjs';

/**
 * Universal P2P Voice Room Manager using WebRTC Mesh (PeerJS)
 * Automatically discovers peers in the room even if database presence is delayed or offline!
 */
export class WebRTCVoiceRoomManager {
  private peer: Peer | null = null;
  private myUserId: string = '';
  private currentRoomId: string = '';
  private localStream: MediaStream | null = null;
  private activeCalls: Map<string, MediaConnection> = new Map();
  private activeDataConns: Map<string, DataConnection> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private onUserSpeakingChange: ((userId: string, isSpeaking: boolean) => void) | null = null;
  private onPeerDiscovered: ((remoteUserId: string) => void) | null = null;

  public async joinVoice(options: {
    userId: string;
    roomId: string;
    localStream: MediaStream;
    onUserSpeaking?: (userId: string, isSpeaking: boolean) => void;
    onPeerDiscovered?: (remoteUserId: string) => void;
  }): Promise<string> {
    this.leaveVoice();

    this.myUserId = options.userId;
    this.currentRoomId = options.roomId;
    this.localStream = options.localStream;
    this.onUserSpeakingChange = options.onUserSpeaking || null;
    this.onPeerDiscovered = options.onPeerDiscovered || null;

    const safeRoomId = options.roomId.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeUserId = options.userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const peerId = `rtx_${safeRoomId}_${safeUserId}`;

    return new Promise((resolve) => {
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer.on('open', (id) => {
        console.log('[WebRTC RTX Voice] Connected with PeerID:', id);
        this.setupIncomingHandlers();
        resolve(id);
      });

      this.peer.on('error', (err) => {
        console.warn('[WebRTC RTX Voice] Peer connection note:', err.type || err);
        resolve(peerId);
      });
    });
  }

  // Answer incoming media calls and data connections
  private setupIncomingHandlers() {
    if (!this.peer) return;

    // Incoming voice calls
    this.peer.on('call', (call) => {
      console.log('[WebRTC RTX Voice] Incoming call from:', call.peer);
      call.answer(this.localStream || undefined);

      call.on('stream', (remoteStream) => {
        this.attachRemoteStream(call.peer, remoteStream);
      });

      call.on('close', () => {
        this.cleanupPeerAudio(call.peer);
      });

      call.on('error', () => {
        this.cleanupPeerAudio(call.peer);
      });

      this.activeCalls.set(call.peer, call);

      const remoteUserId = this.extractUserIdFromPeerId(call.peer);
      if (remoteUserId && this.onPeerDiscovered) {
        this.onPeerDiscovered(remoteUserId);
      }
    });

    // Incoming P2P data connections for presence handshake
    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        conn.send({ type: 'HANDSHAKE', userId: this.myUserId, roomId: this.currentRoomId });
      });

      conn.on('data', (data: unknown) => {
        const payload = data as { type?: string; userId?: string; roomId?: string };
        if (payload?.type === 'HANDSHAKE' && payload.roomId === this.currentRoomId && payload.userId) {
          if (this.onPeerDiscovered) {
            this.onPeerDiscovered(payload.userId);
          }
          // Also call them back with audio if not called
          const expectedPeerId = `rtx_${this.currentRoomId.replace(/[^a-zA-Z0-9_-]/g, '')}_${payload.userId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
          this.callPeer(expectedPeerId);
        }
      });
    });
  }

  // Call another peer directly with voice stream
  public callPeer(remotePeerId: string) {
    if (!this.peer || !this.localStream) return;
    if (this.activeCalls.has(remotePeerId)) return;

    try {
      const call = this.peer.call(remotePeerId, this.localStream);
      if (!call) return;

      call.on('stream', (remoteStream) => {
        this.attachRemoteStream(remotePeerId, remoteStream);
      });

      call.on('close', () => {
        this.cleanupPeerAudio(remotePeerId);
      });

      call.on('error', () => {
        this.cleanupPeerAudio(remotePeerId);
      });

      this.activeCalls.set(remotePeerId, call);
    } catch (e) {
      console.warn('[WebRTC] Call peer warning:', e);
    }
  }

  // Helper to extract user ID
  private extractUserIdFromPeerId(peerId: string): string {
    const parts = peerId.split('_');
    if (parts.length >= 3) {
      return parts.slice(2).join('_');
    }
    return peerId;
  }

  // Attach remote stream to audio element and analyze speaking volume
  private attachRemoteStream(peerId: string, stream: MediaStream) {
    let audio = this.remoteAudioElements.get(peerId);
    if (!audio) {
      audio = new Audio();
      audio.autoplay = true;
      (audio as unknown as { playsInline?: boolean }).playsInline = true;
      this.remoteAudioElements.set(peerId, audio);
    }

    audio.srcObject = stream;
    audio.play().catch((err) => {
      console.log('Audio autoplay waiting for user interaction:', err);
    });

    // Web Audio Analyser to show green ring when friend talks
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const monitor = () => {
        if (!this.remoteAudioElements.has(peerId)) {
          try {
            ctx.close();
          } catch (e) {
            // ignore
          }
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const isSpeaking = sum / dataArray.length > 10;

        const userId = this.extractUserIdFromPeerId(peerId);
        if (this.onUserSpeakingChange) {
          this.onUserSpeakingChange(userId, isSpeaking);
        }
        requestAnimationFrame(monitor);
      };
      requestAnimationFrame(monitor);
    } catch (e) {
      // ignore
    }
  }

  private cleanupPeerAudio(peerId: string) {
    const audio = this.remoteAudioElements.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.remoteAudioElements.delete(peerId);
    }
    this.activeCalls.delete(peerId);
  }

  public leaveVoice() {
    this.activeCalls.forEach((call) => {
      try {
        call.close();
      } catch (e) {
        // ignore
      }
    });
    this.activeCalls.clear();

    this.activeDataConns.forEach((conn) => {
      try {
        conn.close();
      } catch (e) {
        // ignore
      }
    });
    this.activeDataConns.clear();

    this.remoteAudioElements.forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    this.remoteAudioElements.clear();

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {
        // ignore
      }
      this.peer = null;
    }
    this.localStream = null;
  }
}
