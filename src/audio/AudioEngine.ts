export type AudioSourceType = 'file' | 'mic';
export type AnalyserPreset = 'responsive' | 'smooth';
export type PlaybackEvent = 'ended' | 'playing' | 'paused';

export interface AudioData {
  frequency: Uint8Array;
  timeDomain: Uint8Array;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private monitorGainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;

  private audioBuffer: AudioBuffer | null = null;
  private fileName = '';
  private sourceType: AudioSourceType = 'file';
  private isPlaying = false;
  private micPaused = false;
  private playbackStartTime = 0;
  private playbackOffset = 0;
  private duration = 0;
  private savedVolume = 0.8;
  private isMuted = false;
  private loopEnabled = true;
  private analyserPreset: AnalyserPreset = 'smooth';
  private playbackListeners: Array<(event: PlaybackEvent) => void> = [];

  private frequencyData: Uint8Array = new Uint8Array(0);
  private timeDomainData: Uint8Array = new Uint8Array(0);

  onPlaybackStateChange(listener: (event: PlaybackEvent) => void): () => void {
    this.playbackListeners.push(listener);
    return () => {
      this.playbackListeners = this.playbackListeners.filter((l) => l !== listener);
    };
  }

  private emitPlayback(event: PlaybackEvent): void {
    for (const listener of this.playbackListeners) {
      listener(event);
    }
  }

  async ensureContext(): Promise<AudioContext> {
    if (!this.context) {
      this.context = new AudioContext();
      this.analyser = this.context.createAnalyser();
      this.applyAnalyserPreset(this.analyserPreset);

      this.gainNode = this.context.createGain();
      this.gainNode.gain.value = this.savedVolume;

      this.monitorGainNode = this.context.createGain();
      this.monitorGainNode.gain.value = 1;

      this.gainNode.connect(this.analyser);
      this.gainNode.connect(this.monitorGainNode);
      this.monitorGainNode.connect(this.context.destination);

      this.reallocateAnalyserBuffers();
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    return this.context;
  }

  private applyAnalyserPreset(preset: AnalyserPreset): void {
    if (!this.analyser) return;
    if (preset === 'responsive') {
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.5;
    } else {
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.85;
    }
    this.reallocateAnalyserBuffers();
  }

  private reallocateAnalyserBuffers(): void {
    if (!this.analyser) return;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.fftSize);
  }

  getSourceType(): AudioSourceType {
    return this.sourceType;
  }

  getFileName(): string {
    return this.fileName;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  isMicPaused(): boolean {
    return this.micPaused;
  }

  getDuration(): number {
    return this.duration;
  }

  getLoop(): boolean {
    return this.loopEnabled;
  }

  setLoop(enabled: boolean): void {
    this.loopEnabled = enabled;
    if (this.sourceNode instanceof AudioBufferSourceNode) {
      this.sourceNode.loop = enabled;
    }
  }

  getAnalyserPreset(): AnalyserPreset {
    return this.analyserPreset;
  }

  setAnalyserPreset(preset: AnalyserPreset): void {
    this.analyserPreset = preset;
    this.applyAnalyserPreset(preset);
  }

  getCurrentTime(): number {
    if (!this.context || !this.isPlaying || this.sourceType === 'mic') {
      return this.playbackOffset;
    }
    const elapsed = this.context.currentTime - this.playbackStartTime;
    const time = this.playbackOffset + elapsed;
    if (this.duration <= 0) return time;
    if (this.loopEnabled) return time % this.duration;
    return Math.min(time, this.duration);
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
    this.prepareForFileSource();

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;
    this.playbackOffset = 0;
    this.fileName = file.name;
    this.sourceType = 'file';
    this.isPlaying = false;
    this.micPaused = false;
    this.updateMonitorGain();
  }

  async loadFromUrl(url: string, displayName: string): Promise<void> {
    await this.ensureContext();
    this.prepareForFileSource();

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('无法加载示例音频');
    }
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;
    this.playbackOffset = 0;
    this.fileName = displayName;
    this.sourceType = 'file';
    this.isPlaying = false;
    this.micPaused = false;
    this.updateMonitorGain();
  }

  async loadDemoTone(): Promise<void> {
    await this.ensureContext();
    this.prepareForFileSource();

    const ctx = this.context!;
    const lengthSec = 12;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, sampleRate * lengthSec, sampleRate);

    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const mod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.25 * t);
        const tone = Math.sin(2 * Math.PI * 196 * t) * 0.2 + Math.sin(2 * Math.PI * 392 * t) * 0.1;
        data[i] = tone * mod;
      }
    }

    this.audioBuffer = buffer;
    this.duration = buffer.duration;
    this.playbackOffset = 0;
    this.fileName = '内置示例';
    this.sourceType = 'file';
    this.isPlaying = false;
    this.micPaused = false;
    this.updateMonitorGain();
  }

  async switchToMic(): Promise<void> {
    await this.ensureContext();
    this.stopSource();
    this.stopMic();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.sourceNode = this.context!.createMediaStreamSource(this.mediaStream);
      this.connectSource(this.sourceNode);
      this.sourceType = 'mic';
      this.fileName = '';
      this.isPlaying = true;
      this.micPaused = false;
      this.duration = 0;
      this.playbackOffset = 0;
      this.updateMonitorGain();
      this.emitPlayback('playing');
    } catch {
      throw new Error('无法访问麦克风，请检查权限设置');
    }
  }

  async play(): Promise<void> {
    await this.ensureContext();

    if (this.sourceType === 'mic') {
      if (!this.sourceNode) {
        await this.switchToMic();
        return;
      }
      this.micPaused = false;
      this.isPlaying = true;
      this.updateMonitorGain();
      this.emitPlayback('playing');
      return;
    }

    if (!this.audioBuffer) return;

    this.stopSource(false);

    const source = this.context!.createBufferSource();
    source.buffer = this.audioBuffer;
    source.loop = this.loopEnabled;
    this.connectSource(source);

    source.onended = () => {
      if (this.sourceNode !== source) return;
      if (this.loopEnabled) return;
      this.isPlaying = false;
      this.playbackOffset = this.duration;
      this.sourceNode = null;
      this.emitPlayback('ended');
    };

    source.start(0, this.playbackOffset);
    this.playbackStartTime = this.context!.currentTime;
    this.sourceNode = source;
    this.isPlaying = true;
    this.updateMonitorGain();
    this.emitPlayback('playing');
  }

  pause(): void {
    if (!this.isPlaying) return;

    if (this.sourceType === 'file') {
      this.playbackOffset = this.getCurrentTime();
      this.stopSource(false);
    } else if (this.sourceType === 'mic') {
      this.micPaused = true;
    }

    this.isPlaying = false;
    this.updateMonitorGain();
    this.emitPlayback('paused');
  }

  reset(): void {
    this.pause();
    this.stopMic();
    this.audioBuffer = null;
    this.fileName = '';
    this.duration = 0;
    this.playbackOffset = 0;
    this.sourceType = 'file';
    this.micPaused = false;
  }

  stopPlayback(): void {
    this.reset();
  }

  seek(time: number): void {
    if (this.sourceType !== 'file' || !this.audioBuffer) return;

    this.playbackOffset = Math.max(0, Math.min(time, this.duration));

    if (this.isPlaying) {
      void this.play();
    }
  }

  setVolume(value: number): void {
    this.savedVolume = Math.max(0, Math.min(1, value));
    this.applyGainState();
  }

  getVolume(): number {
    return this.savedVolume;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.applyGainState();
    return this.isMuted;
  }

  isMutedState(): boolean {
    return this.isMuted;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.applyGainState();
  }

  async suspend(): Promise<void> {
    if (this.context && this.context.state === 'running') {
      await this.context.suspend();
    }
  }

  async resume(): Promise<void> {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
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
    this.micPaused = false;
    this.isPlaying = false;
    this.updateMonitorGain();
  }

  private prepareForFileSource(): void {
    if (this.sourceType === 'mic') {
      this.stopMic();
    }
    this.stopSource();
  }

  private connectSource(source: AudioBufferSourceNode | MediaStreamAudioSourceNode): void {
    source.connect(this.gainNode!);
  }

  private updateMonitorGain(): void {
    if (!this.monitorGainNode) return;
    this.monitorGainNode.gain.value = this.sourceType === 'mic' ? 0 : 1;
    this.applyGainState();
  }

  private applyGainState(): void {
    if (!this.gainNode) return;
    const silent = this.isMuted || (this.sourceType === 'mic' && this.micPaused);
    this.gainNode.gain.value = silent ? 0 : this.savedVolume;
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
