import Peer, { MediaConnection } from 'peerjs';
import { AppUser } from './types';

/**
 * WebRTC Mesh Network for Real Voice Rooms using PeerJS cloud signaling (free)
 */
export class WebRTCVoiceRoomManager {
  private peer: Peer | null = null;
  private myUserId: string = '';
  private currentRoomId: string = '';
  private localStream: MediaStream | null = null;
  private activeCalls: Map<string, MediaConnection> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private onUserSpeakingChange: ((userId: string, isSpeaking: boolean) => void) | null = null;
  private onUserJoinLeave: (() => void) | null = null;

  public async joinVoice(options: {
    userId: string;
    roomId: string;
    localStream: MediaStream;
    onUserSpeaking?: (userId: string, isSpeaking: boolean) => void;
    onParticipantsChange?: () => void;
  }): Promise<string> {
    this.leaveVoice();

    this.myUserId = options.userId;
    this.currentRoomId = options.roomId;
    this.localStream = options.localStream;
    this.onUserSpeakingChange = options.onUserSpeaking || null;
    this.onUserJoinLeave = options.onParticipantsChange || null;

    // Clean room and user string to be alphanumeric
    const safeRoomId = options.roomId.replace(/[^a-zA-Z0-9_-]/g, '');
    const peerId = `rtx_${safeRoomId}_${options.userId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

    return new Promise((resolve, reject) => {
      // Free public PeerJS server
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ],
        },
      });

      this.peer.on('open', (id) => {
        console.log('[WebRTC RTX Voice] Connected with PeerID:', id);
        this.setupIncomingCalls();
        resolve(id);
      });

      this.peer.on('error', (err) => {
        console.warn('[WebRTC RTX Voice] Peer error:', err);
        // If ID taken or warning, still allow graceful fallback
        resolve(peerId);
      });
    });
  }

  // Answer incoming calls from other users in the room
  private setupIncomingCalls() {
    if (!this.peer) return;

    this.peer.on('call', (call) => {
      console.log('[WebRTC RTX Voice] Incoming call from:', call.peer);

      // Answer call with our processed RTX local audio stream
      call.answer(this.localStream || undefined);

      call.on('stream', (remoteStream) => {
        this.attachRemoteStream(call.peer, remoteStream);
      });

      call.on('close', () => {
        this.cleanupPeerAudio(call.peer);
      });

      call.on('error', (e) => {
        console.warn('[WebRTC RTX Voice] Call error:', e);
        this.cleanupPeerAudio(call.peer);
      });

      this.activeCalls.set(call.peer, call);
    });
  }

  // Call another peer directly
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
      console.warn('Call peer failed:', e);
    }
  }

  // Attach remote stream to an HTMLAudioElement and monitor volume
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
      console.log('Audio autoplay blocked until user gesture:', err);
    });

    // Web Audio Analyser for speaking indicator on other users
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
          ctx.close();
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const isSpeaking = sum / dataArray.length > 12;

        if (this.onUserSpeakingChange) {
          this.onUserSpeakingChange(peerId, isSpeaking);
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
    this.activeCalls.forEach((call) => call.close());
    this.activeCalls.clear();

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
