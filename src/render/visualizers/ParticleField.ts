import * as THREE from 'three';
import { BaseVisualizer, type VisualizerOptions } from './BaseVisualizer';
import type { AudioData } from '../../audio/AudioEngine';
import { hslToRgb } from '../themes';

const NOISE_SIZE = 256;

function buildNoiseTable(size: number): Float32Array {
  const table = new Float32Array(size * 3);
  for (let i = 0; i < size; i++) {
    table[i * 3] = (Math.random() - 0.5) * 2;
    table[i * 3 + 1] = (Math.random() - 0.5) * 2;
    table[i * 3 + 2] = (Math.random() - 0.5) * 2;
  }
  return table;
}

export class ParticleField extends BaseVisualizer {
  private points!: THREE.Points;
  private velocities: Float32Array;
  private basePositions: Float32Array;
  private material!: THREE.PointsMaterial;
  private particleCount: number;
  private noiseTable: Float32Array;
  private frameIndex = 0;

  constructor(scene: THREE.Scene, options: VisualizerOptions = {}) {
    super(scene, options);
    this.particleCount = options.particleCount ?? 3500;
    this.velocities = new Float32Array(this.particleCount * 3);
    this.basePositions = new Float32Array(this.particleCount * 3);
    this.noiseTable = buildNoiseTable(NOISE_SIZE);
    this.init();
  }

  protected init(): void {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1 + Math.random() * 4;

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      this.basePositions[i3] = positions[i3];
      this.basePositions[i3 + 1] = positions[i3 + 1];
      this.basePositions[i3 + 2] = positions[i3 + 2];

      this.velocities[i3] = (Math.random() - 0.5) * 0.02;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

      colors[i3] = 0.4 + Math.random() * 0.3;
      colors[i3 + 1] = 0.5 + Math.random() * 0.3;
      colors[i3 + 2] = 0.9 + Math.random() * 0.1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.root.add(this.points);
  }

  protected onThemeChanged(): void {
    this.refreshAllColors();
  }

  private refreshAllColors(): void {
    const colors = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    const colorArray = colors.array as Float32Array;
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const band = i % 3;
      const hue = this.theme.hueStart + band * 0.12;
      const [r, g, b] = hslToRgb(hue, this.theme.saturation || 0.8, 0.55);
      colorArray[i3] = r;
      colorArray[i3 + 1] = g;
      colorArray[i3 + 2] = b;
    }
    colors.needsUpdate = true;
  }

  update(data: AudioData, delta: number, envelope: number, beat: number): void {
    const freq = data.frequency;
    const len = freq.length;
    this.frameIndex++;

    const bass = len ? this.avgRange(freq, 0, Math.floor(len * 0.1)) : 0;
    const mid = len ? this.avgRange(freq, Math.floor(len * 0.1), Math.floor(len * 0.5)) : 0;
    const treble = len ? this.avgRange(freq, Math.floor(len * 0.5), len) : 0;

    const positions = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;
    const colorArray = colors.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const band = i % 3;
      const energy = band === 0 ? bass : band === 1 ? mid : treble;
      const force = (energy / 255) * this.sensitivity * envelope * (1 + beat * 0.2);

      const ni = ((i + this.frameIndex) % NOISE_SIZE) * 3;
      this.velocities[i3] += this.noiseTable[ni] * force * 0.05;
      this.velocities[i3 + 1] += force * 0.03 + this.noiseTable[ni + 1] * force * 0.02;
      this.velocities[i3 + 2] += this.noiseTable[ni + 2] * force * 0.05;

      const damp = 0.96;
      this.velocities[i3] *= damp;
      this.velocities[i3 + 1] *= damp;
      this.velocities[i3 + 2] *= damp;

      let px = posArray[i3] + this.velocities[i3];
      let py = posArray[i3 + 1] + this.velocities[i3 + 1];
      let pz = posArray[i3 + 2] + this.velocities[i3 + 2];

      const dist = Math.sqrt(px * px + py * py + pz * pz);
      const maxDist = 6 + force * 3;
      if (dist > maxDist) {
        const scale = maxDist / dist;
        px *= scale;
        py *= scale;
        pz *= scale;
      }

      const pull = 0.002;
      px += (this.basePositions[i3] - px) * pull;
      py += (this.basePositions[i3 + 1] - py) * pull;
      pz += (this.basePositions[i3 + 2] - pz) * pull;

      posArray[i3] = px;
      posArray[i3 + 1] = py;
      posArray[i3 + 2] = pz;

      const hue = this.theme.hueStart + band * 0.12 + force * 0.2;
      const [r, g, b] = hslToRgb(hue, this.theme.saturation || 0.8, 0.5 + force * 0.3);
      colorArray[i3] = r;
      colorArray[i3 + 1] = g;
      colorArray[i3 + 2] = b;
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;

    this.material.size = 0.04 + (bass / 255) * 0.08 * this.sensitivity * envelope;
    this.points.rotation.y += delta * 0.1;
  }

  private avgRange(data: Uint8Array, start: number, end: number): number {
    let sum = 0;
    const count = Math.max(1, end - start);
    for (let i = start; i < end; i++) {
      sum += data[i];
    }
    return sum / count;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.root);
  }
}
