export type AudioSourceType = 'file' | 'mic';

export interface AudioData {
  frequency: Uint8Array;
  timeDomain: Uint8Array;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;

  private audioBuffer: AudioBuffer | null = null;
  private sourceType: AudioSourceType = 'file';
  private isPlaying = false;
  private playbackStartTime = 0;
  private playbackOffset = 0;
  private duration = 0;

  private frequencyData: Uint8Array = new Uint8Array(0);
  private timeDomainData: Uint8Array = new Uint8Array(0);

  async ensureContext(): Promise<AudioContext> {
    if (!this.context) {
      this.context = new AudioContext();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.context.createGain();
      this.gainNode.gain.value = 0.8;
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.context.destination);

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Uint8Array(this.analyser.fftSize);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    return this.context;
  }

  getSourceType(): AudioSourceType {
    return this.sourceType;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getDuration(): number {
    return this.duration;
  }

  getCurrentTime(): number {
    if (!this.context || !this.isPlaying || this.sourceType === 'mic') {
      return this.playbackOffset;
    }
    return this.playbackOffset + (this.context.currentTime - this.playbackStartTime);
  }

  getAudioData(): AudioData {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
      this.analyser.getByteTimeDomainData(this.timeDomainData as Uint8Array<ArrayBuffer>);
    }
    return {
      frequency: this.frequencyData,
      timeDomain: this.timeDomainData,
    };
  }

  async loadFile(file: File): Promise<void> {
    await this.ensureContext();
    this.stopSource();

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;
    this.playbackOffset = 0;
    this.sourceType = 'file';
  }

  async switchToMic(): Promise<void> {
    await this.ensureContext();
    this.stopSource();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.sourceNode = this.context!.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.gainNode!);
      this.sourceType = 'mic';
      this.isPlaying = true;
      this.duration = 0;
      this.playbackOffset = 0;
    } catch (err) {
      throw new Error('无法访问麦克风，请检查权限设置');
    }
  }

  async play(): Promise<void> {
    await this.ensureContext();

    if (this.sourceType === 'mic') {
      if (!this.sourceNode) {
        await this.switchToMic();
      }
      this.isPlaying = true;
      return;
    }

    if (!this.audioBuffer) return;

    this.stopSource(false);

    const source = this.context!.createBufferSource();
    source.buffer = this.audioBuffer;
    source.loop = true;
    source.connect(this.gainNode!);

    source.onended = () => {
      if (this.isPlaying && this.sourceNode === source) {
        this.isPlaying = false;
      }
    };

    source.start(0, this.playbackOffset);
    this.playbackStartTime = this.context!.currentTime;
    this.sourceNode = source;
    this.isPlaying = true;
  }

  pause(): void {
    if (!this.isPlaying) return;

    if (this.sourceType === 'file') {
      this.playbackOffset = this.getCurrentTime();
      this.stopSource(false);
    }

    this.isPlaying = false;
  }

  seek(time: number): void {
    if (this.sourceType !== 'file' || !this.audioBuffer) return;

    this.playbackOffset = Math.max(0, Math.min(time, this.duration));

    if (this.isPlaying) {
      void this.play();
    }
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  getVolume(): number {
    return this.gainNode?.gain.value ?? 0.8;
  }

  stopMic(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode instanceof MediaStreamAudioSourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.isPlaying = false;
  }

  private stopSource(resetOffset = true): void {
    if (this.sourceNode instanceof AudioBufferSourceNode) {
      try {
        this.sourceNode.stop();
      } catch {
        // already stopped
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.sourceType === 'mic') {
      this.stopMic();
    }

    if (resetOffset) {
      this.playbackOffset = 0;
    }
  }

  dispose(): void {
    this.stopSource();
    this.stopMic();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }
}
