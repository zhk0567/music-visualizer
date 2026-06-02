import * as THREE from 'three';
import type { AudioEngine, AudioData } from '../audio/AudioEngine';
import { BaseVisualizer } from './visualizers/BaseVisualizer';
import { SpectrumBars } from './visualizers/SpectrumBars';
import { Waveform } from './visualizers/Waveform';
import { ParticleField } from './visualizers/ParticleField';

export type VisualizerName = 'spectrum' | 'waveform' | 'particles';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private visualizer: BaseVisualizer | null = null;
  private currentName: VisualizerName = 'spectrum';
  private audioEngine: AudioEngine | null = null;
  private animationId: number | null = null;
  private clock = new THREE.Clock();
  private sensitivity = 1.5;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a0f, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.08);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 1, 0);

    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  setAudioEngine(engine: AudioEngine): void {
    this.audioEngine = engine;
  }

  setVisualizer(name: VisualizerName): void {
    if (this.currentName === name && this.visualizer) return;

    this.clearVisualizer();
    this.currentName = name;

    const options = { sensitivity: this.sensitivity };

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
    if (this.visualizer) {
      this.visualizer = null;
      this.setVisualizer(this.currentName);
    }
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

    if (this.audioEngine) {
      data = this.audioEngine.getAudioData();
    }

    if (this.visualizer) {
      this.visualizer.update(data, delta);
    }

    this.camera.position.x = Math.sin(Date.now() * 0.0002) * 0.5;
    this.camera.lookAt(0, 1, 0);

    this.renderer.render(this.scene, this.camera);
  };

  private clearVisualizer(): void {
    if (this.visualizer) {
      this.visualizer.dispose();
      this.visualizer = null;
    }

    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((obj: THREE.Object3D) => {
      if (obj !== this.scene) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach((obj) => this.scene.remove(obj));
  }

  private handleResize = (): void => {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.clearVisualizer();
    this.renderer.dispose();
  }
}
