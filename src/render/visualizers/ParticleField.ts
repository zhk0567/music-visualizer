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
  private innerGlow!: THREE.Mesh;
  private floorGlow!: THREE.Mesh;
  private particleCount: number;
  private noiseTable: Float32Array;
  private frameIndex = 0;
  private idlePhase = 0;

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
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.renderOrder = 2;

    const innerGeo = new THREE.RingGeometry(0.8, 2.2, 48);
    const innerMat = new THREE.MeshBasicMaterial({
      color: this.theme.accent,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.innerGlow = new THREE.Mesh(innerGeo, innerMat);
    this.innerGlow.rotation.x = -Math.PI / 2;
    this.innerGlow.position.y = 0.01;
    this.innerGlow.renderOrder = 0;

    const floorGeo = new THREE.CircleGeometry(5.5, 64);
    const floorMat = new THREE.MeshBasicMaterial({
      color: this.theme.accent,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.floorGlow = new THREE.Mesh(floorGeo, floorMat);
    this.floorGlow.rotation.x = -Math.PI / 2;
    this.floorGlow.position.y = 0.005;
    this.floorGlow.renderOrder = 0;

    this.refreshAllColors();
    this.root.add(this.floorGlow, this.innerGlow, this.points);
  }

  protected onThemeChanged(): void {
    (this.innerGlow.material as THREE.MeshBasicMaterial).color.setHex(this.theme.accent);
    (this.floorGlow.material as THREE.MeshBasicMaterial).color.setHex(this.theme.accent);
    this.refreshAllColors();
  }

  private refreshAllColors(): void {
    const colors = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    const colorArray = colors.array as Float32Array;
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const band = i % 3;
      const hue = this.theme.hueStart + band * 0.12;
      const [r, g, b] = hslToRgb(hue, this.theme.saturation || 0.8, 0.72);
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
    const displayEnvelope = Math.max(0.55, envelope);
    const hasFreq = len > 0;

    if (!hasFreq) {
      this.idlePhase += delta * 1.8;
    }

    const bass = hasFreq ? this.avgRange(freq, 0, Math.floor(len * 0.1)) : 40 + Math.sin(this.idlePhase) * 20;
    const mid = hasFreq ? this.avgRange(freq, Math.floor(len * 0.1), Math.floor(len * 0.5)) : 30;
    const treble = hasFreq ? this.avgRange(freq, Math.floor(len * 0.5), len) : 25;

    const positions = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;
    const colorArray = colors.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const band = i % 3;
      const energy = band === 0 ? bass : band === 1 ? mid : treble;
      const force = hasFreq
        ? (energy / 255) * this.sensitivity * displayEnvelope * (1 + beat * 0.35)
        : 0.08 + Math.sin(this.idlePhase + i * 0.02) * 0.04;

      if (hasFreq) {
        const ni = ((i + this.frameIndex) % NOISE_SIZE) * 3;
        this.velocities[i3] += this.noiseTable[ni] * force * 0.05;
        this.velocities[i3 + 1] += force * 0.03 + this.noiseTable[ni + 1] * force * 0.02;
        this.velocities[i3 + 2] += this.noiseTable[ni + 2] * force * 0.05;

        const damp = 0.96;
        this.velocities[i3] *= damp;
        this.velocities[i3 + 1] *= damp;
        this.velocities[i3 + 2] *= damp;
      }

      let bx = this.basePositions[i3];
      let by = this.basePositions[i3 + 1];
      let bz = this.basePositions[i3 + 2];

      if (!hasFreq) {
        const drift = 0.15 + Math.sin(this.idlePhase + i * 0.015) * 0.12;
        bx += Math.sin(this.idlePhase * 0.7 + i * 0.01) * drift;
        by += Math.cos(this.idlePhase * 0.5 + i * 0.013) * drift * 0.6;
        bz += Math.sin(this.idlePhase * 0.6 + i * 0.011) * drift;
      }

      let px = posArray[i3] + this.velocities[i3];
      let py = posArray[i3 + 1] + this.velocities[i3 + 1];
      let pz = posArray[i3 + 2] + this.velocities[i3 + 2];

      const pull = hasFreq ? 0.002 : 0.008;
      px += (bx - px) * pull;
      py += (by - py) * pull;
      pz += (bz - pz) * pull;

      const dist = Math.sqrt(px * px + py * py + pz * pz);
      const maxDist = 6 + force * 3;
      if (dist > maxDist) {
        const scale = maxDist / dist;
        px *= scale;
        py *= scale;
        pz *= scale;
      }

      posArray[i3] = px;
      posArray[i3 + 1] = py;
      posArray[i3 + 2] = pz;

      const hue = this.theme.hueStart + band * 0.12 + force * 0.2;
      const lightness = Math.min(0.95, 0.72 + force * 0.35 + beat * 0.1);
      const [r, g, b] = hslToRgb(hue, this.theme.saturation || 0.8, lightness);
      colorArray[i3] = r;
      colorArray[i3 + 1] = g;
      colorArray[i3 + 2] = b;
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;

    const bassNorm = hasFreq ? bass / 255 : 0.2 + Math.sin(this.idlePhase) * 0.08;
    this.material.size = (0.05 + bassNorm * 0.1 * this.sensitivity * displayEnvelope) * (1 + beat * 0.25);
    this.points.rotation.y += delta * (hasFreq ? 0.1 : 0.04);

    (this.innerGlow.material as THREE.MeshBasicMaterial).opacity = 0.12 + beat * 0.15 + bassNorm * 0.1;
    (this.floorGlow.material as THREE.MeshBasicMaterial).opacity = 0.08 + beat * 0.08 + bassNorm * 0.05;
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
    this.innerGlow.geometry.dispose();
    (this.innerGlow.material as THREE.Material).dispose();
    this.floorGlow.geometry.dispose();
    (this.floorGlow.material as THREE.Material).dispose();
    this.scene.remove(this.root);
  }
}
