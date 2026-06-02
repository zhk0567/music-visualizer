import * as THREE from 'three';
import type { AudioEngine, AudioData } from '../audio/AudioEngine';
import { BeatDetector } from '../audio/BeatDetector';
import { BaseVisualizer } from './visualizers/BaseVisualizer';
import { SpectrumBars } from './visualizers/SpectrumBars';
import { Waveform } from './visualizers/Waveform';
import { ParticleField } from './visualizers/ParticleField';
import { PostProcessing } from './PostProcessing';
import { THEMES, type ThemeName, type ThemeColors } from './themes';
import {
  getParticleCount,
  getBarCount,
  getSegmentCount,
  getMaxDpr,
  shouldUseBloom,
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
  private animationId: number | null = null;
  private clock = new THREE.Clock();
  private sensitivity = 1.5;
  private theme: ThemeColors = THEMES.neon;
  private quality: QualityLevel = 'medium';
  private running = false;
  private tickCallbacks: TickCallback[] = [];
  private lastRenderMs = 0;
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

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.applyQualitySettings('medium');

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(this.theme.fog, 0.08);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 1, 0);

    this.setupSceneLighting();
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private applyQualitySettings(quality: QualityLevel): void {
    const maxDpr = getMaxDpr(quality);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    this.renderer.setClearColor(this.theme.background, 1);
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

  async captureScreenshot(): Promise<Blob | null> {
    if (this.postProcessing?.isEnabled()) {
      return this.postProcessing.captureToBlob();
    }
    this.renderer.render(this.scene, this.camera);
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  setQuality(quality: QualityLevel): void {
    const prev = this.quality;
    this.quality = quality;
    this.applyQualitySettings(quality);
    this.postProcessing?.setEnabled(shouldUseBloom(quality));
    if (prev !== quality) {
      this.setVisualizer(this.currentName, true);
    }
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

  setVisualizer(name: VisualizerName, forceRecreate = false): void {
    if (!forceRecreate && this.currentName === name && this.visualizer) return;

    this.clearVisualizer();
    this.currentName = name;
    const options = this.buildVisualizerOptions();

    switch (name) {
      case 'spectrum':
        this.visualizer = new SpectrumBars(this.scene, options);
        break;
      case 'waveform':
        this.visualizer = new Waveform(this.scene, options);
        break;
      case 'particles':
        this.visualizer = new ParticleField(this.scene, options);
        break;
    }
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
    this.renderer.setClearColor(this.theme.background, 1);
    this.scene.fog = new THREE.FogExp2(this.theme.fog, 0.08);
    this.ambientLight.color.setHex(this.theme.ambient);
    this.pointLight.color.setHex(this.theme.pointLight);
    this.visualizer?.setTheme(this.theme);
    const accentStrength = name === 'sunset' ? 1.0 : name === 'mono' ? 0.4 : 0.85;
    this.postProcessing?.setBloomStrength(accentStrength);
  }

  getTheme(): ThemeName {
    return this.theme.name;
  }

  getBeatIntensity(): number {
    return this.beatIntensity;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.animate();
  }

  stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    if (!this.running) return;

    this.animationId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    let data: AudioData = {
      frequency: new Uint8Array(0),
      timeDomain: new Uint8Array(0),
    };

    const isActive = this.audioEngine?.getIsPlaying() ?? false;

    if (this.audioEngine) {
      data = this.audioEngine.getAudioData();
    }

    this.beatIntensity = this.beatDetector.update(data.frequency, delta);

    let envelope = 0;
    if (this.visualizer) {
      envelope = this.visualizer.applyEnvelope(isActive, delta);
      this.visualizer.update(data, delta, envelope, this.beatIntensity);
    }

    for (const cb of this.tickCallbacks) {
      cb(delta);
    }

    const isIdle = !isActive && envelope < 0.05;
    const now = performance.now();
    if (isIdle && now - this.lastRenderMs < IDLE_FRAME_MS) {
      return;
    }
    this.lastRenderMs = now;

    if (!this.reduceMotion) {
      const beatZoom = 1 + this.beatIntensity * 0.03;
      this.camera.position.x = Math.sin(Date.now() * 0.0002) * 0.5;
      this.camera.position.z = 8 / beatZoom;
      this.camera.lookAt(0, 1, 0);
    }

    if (this.postProcessing?.isEnabled()) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };

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
