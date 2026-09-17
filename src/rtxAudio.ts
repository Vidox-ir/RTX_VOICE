/**
 * RTX Voice DSP & WebRTC Audio Processing Engine
 * Emulates hardware-style AI noise reduction, bass boost,
 * and room echo suppression using the Web Audio API (BiquadFilter, DynamicsCompressor, Analyser)
 */

export class RTXAudioEngine {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  // DSP processing chain
  private highpassFilter: BiquadFilterNode | null = null; // Eliminates desk bumps, low hums
  private lowpassFilter: BiquadFilterNode | null = null;  // Cuts harsh high-frequency noise & hiss
  private notchFilter: BiquadFilterNode | null = null;    // 50/60 Hz electrical mains hum
  private bassBoostFilter: BiquadFilterNode | null = null;// Broadcast warmth
  private compressor: DynamicsCompressorNode | null = null;// Studio AGC leveler
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private rawStream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private onVolumeCallback: ((vol: number, isSpeaking: boolean) => void) | null = null;

  public async startMicrophone(options: {
    noiseSuppression: number; // 0 - 100
    roomEchoRemoval: boolean;
    bassBoost: boolean;
    onVolume?: (vol: number, isSpeaking: boolean) => void;
  }): Promise<MediaStream> {
    this.stop();

    this.onVolumeCallback = options.onVolume || null;

    // Request raw mic stream with browser DSP turned on as tier 1
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: options.roomEchoRemoval,
        noiseSuppression: options.noiseSuppression > 20,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
      },
      video: false,
    };

    this.rawStream = await navigator.mediaDevices.getUserMedia(constraints);

    // Setup Web Audio Graph for RTX DSP (tier 2 RTX AI processing)
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioCtxClass({ sampleRate: 48000 });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.rawStream);

    // 1. Highpass (cuts room fan hum < 85Hz)
    this.highpassFilter = this.audioContext.createBiquadFilter();
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.value = 85 + (options.noiseSuppression / 100) * 35; // 85Hz - 120Hz
    this.highpassFilter.Q.value = 0.7;

    // 2. 50/60Hz notch filter for power line buzzing
    this.notchFilter = this.audioContext.createBiquadFilter();
    this.notchFilter.type = 'notch';
    this.notchFilter.frequency.value = 50;
    this.notchFilter.Q.value = 4.0;

    // 3. Lowpass filter (cuts high coil whine & keyboard click transients > 8.5kHz)
    this.lowpassFilter = this.audioContext.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    const suppressionRatio = options.noiseSuppression / 100;
    this.lowpassFilter.frequency.value = 16000 - suppressionRatio * 7000; // 16kHz down to 9kHz

    // 4. Bass Boost (Radio broadcast announcer tone)
    this.bassBoostFilter = this.audioContext.createBiquadFilter();
    this.bassBoostFilter.type = 'peaking';
    this.bassBoostFilter.frequency.value = 140;
    this.bassBoostFilter.gain.value = options.bassBoost ? 4.5 : 0;
    this.bassBoostFilter.Q.value = 1.0;

    // 5. Studio Compressor / RTX AI Leveler
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4 + suppressionRatio * 6; // up to 10:1 ratio for loud mechanical keyboards
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // 6. Gain control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.1;

    // 7. Analyser for visualizer & voice activity detection (VAD)
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.4;

    // 8. Stream output for WebRTC Peer connection
    this.destinationNode = this.audioContext.createMediaStreamDestination();

    // Connect audio node graph
    this.sourceNode
      .connect(this.highpassFilter)
      .connect(this.notchFilter)
      .connect(this.lowpassFilter)
      .connect(this.bassBoostFilter)
      .connect(this.compressor)
      .connect(this.gainNode)
      .connect(this.analyser)
      .connect(this.destinationNode);

    this.processedStream = this.destinationNode.stream;
    this.isRunning = true;

    // Start real-time volume detection loop
    this.startVolumeMonitoring();

    return this.processedStream;
  }

  public updateParameters(options: {
    noiseSuppression: number;
    roomEchoRemoval: boolean;
    bassBoost: boolean;
    isMuted: boolean;
  }) {
    if (!this.audioContext || !this.gainNode) return;

    if (options.isMuted) {
      this.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
    } else {
      this.gainNode.gain.setTargetAtTime(1.1, this.audioContext.currentTime, 0.01);
    }

    const suppressionRatio = Math.max(0, Math.min(100, options.noiseSuppression)) / 100;

    if (this.highpassFilter) {
      this.highpassFilter.frequency.setTargetAtTime(80 + suppressionRatio * 40, this.audioContext.currentTime, 0.05);
    }
    if (this.lowpassFilter) {
      this.lowpassFilter.frequency.setTargetAtTime(16000 - suppressionRatio * 7000, this.audioContext.currentTime, 0.05);
    }
    if (this.bassBoostFilter) {
      this.bassBoostFilter.gain.setTargetAtTime(options.bassBoost ? 5 : 0, this.audioContext.currentTime, 0.05);
    }
    if (this.compressor) {
      this.compressor.ratio.setTargetAtTime(3 + suppressionRatio * 7, this.audioContext.currentTime, 0.05);
    }
  }

  private startVolumeMonitoring() {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      if (!this.isRunning || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalized = Math.min(1, average / 128); // 0 to 1
      const isSpeaking = normalized > 0.08;

      if (this.onVolumeCallback) {
        this.onVolumeCallback(normalized, isSpeaking);
      }

      this.animationFrameId = requestAnimationFrame(checkVolume);
    };

    this.animationFrameId = requestAnimationFrame(checkVolume);
  }

  public getRawStream(): MediaStream | null {
    return this.rawStream;
  }

  public getProcessedStream(): MediaStream | null {
    return this.processedStream;
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.rawStream) {
      this.rawStream.getTracks().forEach((track) => track.stop());
      this.rawStream = null;
    }
    if (this.processedStream) {
      this.processedStream.getTracks().forEach((track) => track.stop());
      this.processedStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }
  }

  // Play Soundpad Synth SFX
  public static playSoundpad(freq: number, type: OscillatorType = 'sine', duration: number = 0.3) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      // frequency bend effect
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration * 0.4);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio synthesis failed', e);
    }
  }
}
