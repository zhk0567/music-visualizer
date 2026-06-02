import * as THREE from 'three';
import type { AudioData } from '../../audio/AudioEngine';
import type { ThemeColors } from '../themes';
import { THEMES } from '../themes';

export interface VisualizerOptions {
  sensitivity?: number;
  theme?: ThemeColors;
  particleCount?: number;
  barCount?: number;
  segmentCount?: number;
}

export abstract class BaseVisualizer {
  protected scene: THREE.Scene;
  protected sensitivity: number;
  protected theme: ThemeColors;
  protected activityLevel = 1;
  protected root = new THREE.Group();

  constructor(scene: THREE.Scene, options: VisualizerOptions = {}) {
    this.scene = scene;
    this.sensitivity = options.sensitivity ?? 1.5;
    this.theme = options.theme ?? THEMES.neon;
    this.scene.add(this.root);
  }

  protected abstract init(): void;

  abstract update(data: AudioData, delta: number, envelope: number, beat: number): void;

  abstract dispose(): void;

  setSensitivity(value: number): void {
    this.sensitivity = value;
  }

  setTheme(theme: ThemeColors): void {
    this.theme = theme;
    this.onThemeChanged();
  }

  protected onThemeChanged(): void {
    // override in subclasses
  }

  applyEnvelope(isActive: boolean, delta: number, motionScale = 1): number {
    const rate = Math.min(1, delta * 4 * motionScale);
    const target = isActive ? 1 : 0;
    this.activityLevel += (target - this.activityLevel) * rate;
    return this.activityLevel;
  }

  getActivityLevel(): number {
    return this.activityLevel;
  }
}
