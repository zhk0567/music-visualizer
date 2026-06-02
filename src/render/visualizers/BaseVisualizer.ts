import * as THREE from 'three';
import type { AudioData } from '../../audio/AudioEngine';

export interface VisualizerOptions {
  sensitivity?: number;
}

export abstract class BaseVisualizer {
  protected scene: THREE.Scene;
  protected sensitivity: number;

  constructor(scene: THREE.Scene, options: VisualizerOptions = {}) {
    this.scene = scene;
    this.sensitivity = options.sensitivity ?? 1.5;
  }

  protected abstract init(): void;

  abstract update(data: AudioData, delta: number): void;

  abstract dispose(): void;
}
