import * as THREE from 'three';
import type { AudioEngine, AudioData } from '../audio/AudioEngine';
import { BeatDetector } from '../audio/BeatDetector';
import { BaseVisualizer } from './visualizers/BaseVisualizer';
import type { PostProcessing } from './PostProcessing';
import { THEMES, type ThemeName, type ThemeColors } from './themes';
import {
  getParticleCount,
  getBarCount,
  getSegmentCount,
  getMaxDpr,
  shouldUseBloom,
  shouldUseAntialias,
  type QualityLevel,
} from '../utils/quality';

export type VisualizerName = 'spectrum' | 'waveform' | 'particles';
export type TickCallback = (delta: number) => void;

const IDLE_FRAME_MS = 50;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private visualizer: BaseVisualizer | null = null;
  private currentName: VisualizerName = 'spectrum';
  private audioEngine: AudioEngine | null = null;
  private beatDetector = new BeatDetector();
  private postProcessing: PostProcessing | null = null;
  private postProcessingPromise: Promise<PostProcessing> | null = null;
  private animationId: number | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private clock = new THREE.Clock();
  private sensitivity = 1.5;
  private theme: ThemeColors = THEMES.neon;
  private quality: QualityLevel = 'medium';
  private running = false;
  private tickCallbacks: TickCallback[] = [];
  private reduceMotion: boolean;
  private beatIntensity = 0;

  private ambientLight!: THREE.AmbientLight;
  private pointLight!: THREE.PointLight;

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.stop();
      void this.audioEngine?.suspend();
    } else {
      void this.audioEngine?.resume();
      this.start();
    }
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = this.createWebGLRenderer('medium');

    this.scene = new THREE.Scene();
    this.applyQualitySettings('medium');

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 1, 0);

    this.setupSceneLighting();
    void this.ensurePostProcessing();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private createWebGLRenderer(quality: QualityLevel): THREE.WebGLRenderer {
    return new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: shouldUseAntialias(quality),
      alpha: true,
      preserveDrawingBuffer: true,
    });
  }

  private applySceneAtmosphere(_quality: QualityLevel): void {
    const fogDensity = this.currentName === 'spectrum' ? 0.028 : 0.06;
    this.scene.fog = new THREE.FogExp2(this.theme.fog, fogDensity);
    this.renderer.setClearColor(this.theme.background, 1);
  }

  private applyQualitySettings(quality: QualityLevel): void {
    const maxDpr = getMaxDpr(quality);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    if (this.scene) {
      this.applySceneAtmosphere(quality);
    } else {
      this.renderer.setClearColor(this.theme.background, 1);
    }
  }

  private async ensurePostProcessing(): Promise<PostProcessing> {
    if (this.postProcessing) return this.postProcessing;
    if (!this.postProcessingPromise) {
      this.postProcessingPromise = import('./PostProcessing').then(({ PostProcessing }) => {
        const pp = new PostProcessing(this.renderer, this.scene, this.camera);
        pp.setEnabled(shouldUseBloom(this.quality));
        const accentStrength =
          this.currentName === 'spectrum'
            ? this.theme.name === 'sunset'
              ? 1.15
              : this.theme.name === 'mono'
                ? 0.65
                : 1.05
            : this.theme.name === 'sunset'
              ? 1.0
              : this.theme.name === 'mono'
                ? 0.4
                : 0.85;
        pp.setBloomStrength(accentStrength);
        this.postProcessing = pp;
        return pp;
      });
    }
    return this.postProcessingPromise;
  }

  private setupSceneLighting(): void {
    this.ambientLight = new THREE.AmbientLight(this.theme.ambient, 0.5);
    this.pointLight = new THREE.PointLight(this.theme.pointLight, 2, 20);
    this.pointLight.position.set(0, 5, 0);
    this.scene.add(this.ambientLight, this.pointLight);
  }

  setAudioEngine(engine: AudioEngine): void {
    this.audioEngine = engine;
  }

  onTick(callback: TickCallback): void {
    this.tickCallbacks.push(callback);
  }

  offTick(callback: TickCallback): void {
    this.tickCallbacks = this.tickCallbacks.filter((cb) => cb !== callback);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getCaptureStream(fps = 30): MediaStream {
    return this.canvas.captureStream(fps);
  }

  wakeUp(): void {
    // visualizer updates every frame; kept for Controls after load/seek
  }

  async captureScreenshot(): Promise<Blob | null> {
    const pp = await this.ensurePostProcessing();
    if (pp.isEnabled()) {
      return pp.captureToBlob();
    }
    this.renderer.render(this.scene, this.camera);
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  setQuality(quality: QualityLevel): void {
    const prev = this.quality;
    this.quality = quality;
    const needsRendererRecreate = shouldUseAntialias(prev) !== shouldUseAntialias(quality);

    if (needsRendererRecreate) {
      this.postProcessing?.dispose();
      this.postProcessing = null;
      this.postProcessingPromise = null;
      this.renderer.dispose();
      this.renderer = this.createWebGLRenderer(quality);
      this.handleResize();
      void this.ensurePostProcessing();
    }

    this.applyQualitySettings(quality);
    void this.ensurePostProcessing().then((pp) => pp.setEnabled(shouldUseBloom(quality)));
    if (prev !== quality) {
      void this.setVisualizer(this.currentName, true);
    }
    this.wakeUp();
  }

  getQuality(): QualityLevel {
    return this.quality;
  }

  private buildVisualizerOptions() {
    return {
      sensitivity: this.sensitivity,
      theme: this.theme,
      particleCount: getParticleCount(this.quality),
      barCount: getBarCount(this.quality),
      segmentCount: getSegmentCount(this.quality),
    };
  }

  async setVisualizer(name: VisualizerName, forceRecreate = false): Promise<void> {
    if (!forceRecreate && this.currentName === name && this.visualizer) return;

    this.clearVisualizer();
    this.currentName = name;
    const options = this.buildVisualizerOptions();

    switch (name) {
      case 'spectrum': {
        const { SpectrumBars } = await import('./visualizers/SpectrumBars');
        this.visualizer = new SpectrumBars(this.scene, options);
        break;
      }
      case 'waveform': {
        const { Waveform } = await import('./visualizers/Waveform');
        this.visualizer = new Waveform(this.scene, options);
        break;
      }
      case 'particles': {
        const { ParticleField } = await import('./visualizers/ParticleField');
        this.visualizer = new ParticleField(this.scene, options);
        break;
      }
    }
    this.applySceneAtmosphere(this.quality);
    this.wakeUp();
  }

  getVisualizerName(): VisualizerName {
    return this.currentName;
  }

  setSensitivity(value: number): void {
    this.sensitivity = value;
    this.visualizer?.setSensitivity(value);
  }

  setTheme(name: ThemeName): void {
    this.theme = THEMES[name];
    this.applySceneAtmosphere(this.quality);
    this.ambientLight.color.setHex(this.theme.ambient);
    this.pointLight.color.setHex(this.theme.pointLight);
    this.visualizer?.setTheme(this.theme);
    const accentStrength =
      this.currentName === 'spectrum'
        ? name === 'sunset'
          ? 1.15
          : name === 'mono'
            ? 0.65
            : 1.05
        : name === 'sunset'
          ? 1.0
          : name === 'mono'
            ? 0.4
            : 0.85;
    void this.ensurePostProcessing().then((pp) => pp.setBloomStrength(accentStrength));
    this.wakeUp();
  }

  getTheme(): ThemeName {
    return this.theme.name;
  }

  getBeatIntensity(): number {
    return this.beatIntensity;
  }

  setBeatSensitivity(value: number): void {
    this.beatDetector.setSensitivity(value);
  }

  getBeatSensitivity(): number {
    return this.beatDetector.getSensitivity();
  }

  /** Render one frame before capture (screenshot / recording). */
  renderFrameForCapture(): void {
    this.renderScene();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.scheduleNextFrame(false);
  }

  stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private scheduleNextFrame(idle: boolean): void {
    if (!this.running) return;
    if (idle) {
      this.idleTimer = setTimeout(this.runFrame, IDLE_FRAME_MS);
    } else {
      this.animationId = requestAnimationFrame(this.runFrame);
    }
  }

  private runFrame = (): void => {
    if (!this.running) return;
    this.animationId = null;
    this.idleTimer = null;

    const delta = this.clock.getDelta();
    const isActive = this.audioEngine?.getIsPlaying() ?? false;

    let data: AudioData = {
      frequency: new Uint8Array(0),
      timeDomain: new Uint8Array(0),
    };

    if (this.audioEngine) {
      data = this.audioEngine.getAudioData();
    }

    let envelope = 0;
    const hasSource = this.audioEngine?.hasAudioSource() ?? false;

    const motionScale = this.reduceMotion ? 0.35 : 1;

    if (this.visualizer) {
      this.beatIntensity =
        isActive || hasSource
          ? this.beatDetector.update(data.frequency, delta)
          : this.beatIntensity * 0.92;

      envelope = this.visualizer.applyEnvelope(isActive || hasSource, delta, motionScale);
      const displayEnvelope =
        !isActive && !hasSource ? 1 : Math.max(envelope, 0.5);

      this.visualizer.update(data, delta, displayEnvelope, this.beatIntensity);
    }

    if (isActive || hasSource) {
      for (const cb of this.tickCallbacks) {
        cb(delta);
      }
    }

    const isIdle = !isActive && !hasSource;
    this.renderScene();
    this.scheduleNextFrame(isIdle);
  };

  private renderScene(): void {
    if (!this.reduceMotion) {
      if (this.currentName === 'spectrum') {
        this.camera.position.x = Math.sin(Date.now() * 0.0002) * 0.35;
        this.camera.position.y = 3;
        this.camera.position.z = 8;
      } else {
        const beatZoom = 1 + this.beatIntensity * 0.03;
        this.camera.position.x = Math.sin(Date.now() * 0.0002) * 0.5;
        this.camera.position.y = 3;
        this.camera.position.z = 8 / beatZoom;
      }
      this.camera.lookAt(0, 1, 0);
    }

    if (this.postProcessing?.isEnabled()) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private clearVisualizer(): void {
    if (this.visualizer) {
      this.visualizer.dispose();
      this.visualizer = null;
    }
  }

  private handleResize = (): void => {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.postProcessing?.setSize(width, height);
  };

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.clearVisualizer();
    this.postProcessing?.dispose();
    this.renderer.dispose();
  }
}
