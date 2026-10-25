import type { Peer } from 'peerjs';

class VoiceService {
  private localStream: MediaStream | null = null;
  private currentPeer: Peer | null = null;
  private mediaCalls: Map<string, any> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  
  // Audio analysis for Voice Activity Detection (VAD)
  private audioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private vadInterval: any = null;
  private consecutiveSpeakingCount = 0;
  private consecutiveSilentCount = 0;

  // Remote VADs (peerId -> { analyser: AnalyserNode, audioCtx: AudioContext })
  private remoteAnalysers: Map<string, AnalyserNode> = new Map();

  private isMuted = false;
  private isDeafened = false;
  private isSpeaking = false;

  private onSpeakingChangeCallback: ((isSpeaking: boolean) => void) | null = null;

  public init(peer: Peer) {
    this.currentPeer = peer;

    // Listen for incoming media calls from peers
    peer.on('call', (mediaCall) => {
      console.log('[VoiceService] Incoming voice call from:', mediaCall.peer);
      if (this.localStream) {
        mediaCall.answer(this.localStream);
      } else {
        // Answer without local stream if mic not started yet
        mediaCall.answer();
      }
      this.setupMediaCall(mediaCall, mediaCall.peer);
    });
  }

  public setOnSpeakingChange(cb: (isSpeaking: boolean) => void) {
    this.onSpeakingChangeCallback = cb;
  }

  public async startMicrophone(initialMuted = false): Promise<MediaStream | null> {
    if (this.localStream) {
      this.setMute(initialMuted);
      return this.localStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      this.localStream = stream;
      this.isMuted = initialMuted;
      stream.getAudioTracks().forEach(track => {
        track.enabled = !initialMuted;
      });

      this.setupLocalVAD(stream);

      // If we already have active calls, replace or add our track
      this.mediaCalls.forEach((call) => {
        try {
          const senders = call.peerConnection?.getSenders();
          const audioSender = senders?.find((s: any) => s.track?.kind === 'audio');
          const audioTrack = stream.getAudioTracks()[0];
          if (audioSender && audioTrack) {
            audioSender.replaceTrack(audioTrack);
          }
        } catch {
          // Ignore replaceTrack errors
        }
      });

      return stream;
    } catch (err) {
      console.warn('[VoiceService] Could not access microphone:', err);
      throw err;
    }
  }

  public callPeer(remotePeerId: string) {
    if (!this.currentPeer || !this.localStream) return;
    if (this.mediaCalls.has(remotePeerId)) return;

    try {
      console.log('[VoiceService] Calling peer for voice:', remotePeerId);
      const mediaCall = this.currentPeer.call(remotePeerId, this.localStream);
      if (mediaCall) {
        this.setupMediaCall(mediaCall, remotePeerId);
      }
    } catch (err) {
      console.warn('[VoiceService] Error calling peer for voice:', err);
    }
  }

  private setupMediaCall(mediaCall: any, peerId: string) {
    this.mediaCalls.set(peerId, mediaCall);

    mediaCall.on('stream', (remoteStream: MediaStream) => {
      console.log('[VoiceService] Received remote voice stream from:', peerId);
      this.attachRemoteStream(peerId, remoteStream);
    });

    mediaCall.on('close', () => {
      this.detachRemoteStream(peerId);
      this.mediaCalls.delete(peerId);
    });

    mediaCall.on('error', (err: any) => {
      console.warn('[VoiceService] Media call error with:', peerId, err);
      this.detachRemoteStream(peerId);
      this.mediaCalls.delete(peerId);
    });
  }

  private attachRemoteStream(peerId: string, stream: MediaStream) {
    let audio = this.remoteAudioElements.get(peerId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.setAttribute('playsinline', 'true');
      audio.style.display = 'none';
      document.body.appendChild(audio);
      this.remoteAudioElements.set(peerId, audio);
    }

    audio.srcObject = stream;
    audio.muted = this.isDeafened;

    audio.play().catch(err => {
      console.warn('[VoiceService] Autoplay prevented for voice stream:', err);
    });

    this.setupRemoteVAD(peerId, stream);
  }

  private detachRemoteStream(peerId: string) {
    const audio = this.remoteAudioElements.get(peerId);
    if (audio) {
      try {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      } catch {
        // ignore
      }
      this.remoteAudioElements.delete(peerId);
    }
    this.remoteAnalysers.delete(peerId);
  }

  private setupLocalVAD(stream: MediaStream) {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.localAnalyser = this.audioCtx.createAnalyser();
      this.localAnalyser.fftSize = 256;
      source.connect(this.localAnalyser);

      if (this.vadInterval) clearInterval(this.vadInterval);

      const buffer = new Uint8Array(this.localAnalyser.frequencyBinCount);

      this.vadInterval = setInterval(() => {
        if (!this.localAnalyser || this.isMuted) {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            this.onSpeakingChangeCallback?.(false);
          }
          return;
        }

        this.localAnalyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;

        // VAD threshold: average frequency energy above 15
        if (avg > 15) {
          this.consecutiveSpeakingCount++;
          this.consecutiveSilentCount = 0;
          if (this.consecutiveSpeakingCount >= 2 && !this.isSpeaking) {
            this.isSpeaking = true;
            this.onSpeakingChangeCallback?.(true);
          }
        } else {
          this.consecutiveSilentCount++;
          this.consecutiveSpeakingCount = 0;
          if (this.consecutiveSilentCount >= 4 && this.isSpeaking) {
            this.isSpeaking = false;
            this.onSpeakingChangeCallback?.(false);
          }
        }
      }, 100);
    } catch (e) {
      console.warn('[VoiceService] Local VAD initialization error:', e);
    }
  }

  private setupRemoteVAD(peerId: string, stream: MediaStream) {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
      }
      if (!this.audioCtx) return;

      const source = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      this.remoteAnalysers.set(peerId, analyser);
    } catch {
      // ignore
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
    if (muted && this.isSpeaking) {
      this.isSpeaking = false;
      this.onSpeakingChangeCallback?.(false);
    }
  }

  public setDeafen(deafened: boolean) {
    this.isDeafened = deafened;
    this.remoteAudioElements.forEach(audio => {
      audio.muted = deafened;
    });
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsDeafened(): boolean {
    return this.isDeafened;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public leave() {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try { track.stop(); } catch { /* ignore */ }
      });
      this.localStream = null;
    }

    this.mediaCalls.forEach(call => {
      try { call.close(); } catch { /* ignore */ }
    });
    this.mediaCalls.clear();

    this.remoteAudioElements.forEach(audio => {
      try {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      } catch { /* ignore */ }
    });
    this.remoteAudioElements.clear();
    this.remoteAnalysers.clear();

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try { this.audioCtx.close(); } catch { /* ignore */ }
      this.audioCtx = null;
    }

    this.isSpeaking = false;
    this.onSpeakingChangeCallback?.(false);
  }
}

export const voiceService = new VoiceService();
