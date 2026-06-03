import * as THREE from 'three';
import { BaseVisualizer, type VisualizerOptions } from './BaseVisualizer';
import type { AudioData } from '../../audio/AudioEngine';
import { hslToRgb } from '../themes';
import { getMotionProfile } from '../modeProfiles';

const BAND_COUNT = 3;
const motion = getMotionProfile('particles');

interface ParticleMeta {
  band: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  yOffset: number;
}

/** 纯粒子云 — 无地面圆环；播放时才明显可见 */
export class ParticleField extends BaseVisualizer {
  private points!: THREE.Points;
  private baseColors!: Float32Array;
  private meta!: ParticleMeta[];
  private material!: THREE.PointsMaterial;
  private particleCount: number;

  constructor(scene: THREE.Scene, options: VisualizerOptions = {}) {
    super(scene, options);
    this.particleCount = options.particleCount ?? 3500;
    this.baseColors = new Float32Array(this.particleCount * 3);
    this.meta = [];
    this.init();
  }

  protected init(): void {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    const bandRadii = [1.4, 2.6, 4.0];
    const perBand = Math.floor(this.particleCount / BAND_COUNT);

    for (let i = 0; i < this.particleCount; i++) {
      const band = Math.min(BAND_COUNT - 1, Math.floor(i / perBand));
      const orbitRadius = bandRadii[band] + (Math.random() - 0.5) * 0.35;
      const orbitAngle = Math.random() * Math.PI * 2;
      const orbitSpeed = 0.24 + band * 0.14 + Math.random() * 0.12;
      const yOffset = (Math.random() - 0.5) * 0.6;

      this.meta.push({ band, orbitRadius, orbitAngle, orbitSpeed, yOffset });

      const i3 = i * 3;
      positions[i3] = Math.cos(orbitAngle) * orbitRadius;
      positions[i3 + 1] = yOffset;
      positions[i3 + 2] = Math.sin(orbitAngle) * orbitRadius;

      const hue = this.theme.hueStart + band * 0.14;
      const [r, g, b] = hslToRgb(hue, this.theme.saturation || 0.85, 0.88);
      colors[i3] = r;
      colors[i3 + 1] = g;
      colors[i3 + 2] = b;
      this.baseColors[i3] = r;
      this.baseColors[i3 + 1] = g;
      this.baseColors[i3 + 2] = b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: motion.idleOpacity ?? 0.12,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
      fog: false,
      sizeAttenuation: true,
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
      const band = this.meta[i].band;
      const hue = this.theme.hueStart + band * 0.14;
      const [r, g, b] = hslToRgb(hue, this.theme.saturation || 0.85, 0.88);
      this.baseColors[i3] = r;
      this.baseColors[i3 + 1] = g;
      this.baseColors[i3 + 2] = b;
      colorArray[i3] = r;
      colorArray[i3 + 1] = g;
      colorArray[i3 + 2] = b;
    }
    colors.needsUpdate = true;
  }

  update(data: AudioData, delta: number, envelope: number, beat: number): void {
    const freq = data.frequency;
    const len = freq.length;
    const isLive = len > 0;
    const displayEnvelope = Math.max(envelope, motion.displayEnvelopeMin);
    const forceMul = motion.forceMultiplier ?? 1.5;
    const radialMul = motion.radialExpand ?? 1.55;
    const burstKick =
      beat > 0.5 ? (beat - 0.5) * 2 * (motion.beatBurstKick ?? 0.42) : 0;

    const bass = isLive ? this.avgRange(freq, 0, Math.floor(len * 0.1)) / 255 : 0;
    const mid = isLive ? this.avgRange(freq, Math.floor(len * 0.1), Math.floor(len * 0.5)) / 255 : 0;
    const treble = isLive ? this.avgRange(freq, Math.floor(len * 0.5), len) / 255 : 0;
    const bandEnergy = [
      Math.pow(bass, 0.82),
      Math.pow(mid, 0.82),
      Math.pow(treble, 0.82),
    ];

    this.material.opacity = isLive
      ? 0.9 + beat * 0.12 + burstKick * 0.15
      : (motion.idleOpacity ?? 0.12);
    this.material.size = isLive
      ? 0.06 + bass * 0.14 * this.sensitivity + beat * 0.05 + burstKick * 0.08
      : 0.03;

    const positions = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;
    const colorArray = colors.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const m = this.meta[i];
      const energy = bandEnergy[m.band];

      if (isLive) {
        const force =
          energy * displayEnvelope * this.sensitivity * forceMul * (1 + beat * motion.beatGain);
        m.orbitAngle += delta * m.orbitSpeed * (1 + force * 1.2);
        const bandBeat = m.band === 0 ? 1 : m.band === 1 ? 0.7 : 0.55;
        const radialExpand =
          1 + force * radialMul + beat * 0.38 * bandBeat + burstKick * (0.85 + m.band * 0.15);
        const r = m.orbitRadius * radialExpand;
        const yWave =
          m.yOffset + Math.sin(m.orbitAngle * 2.5 + beat * 2) * force * 0.8 + burstKick * 0.25;
        posArray[i * 3] = Math.cos(m.orbitAngle) * r;
        posArray[i * 3 + 1] = yWave;
        posArray[i * 3 + 2] = Math.sin(m.orbitAngle) * r;

        const bright = 0.48 + force * 1.0 + beat * 0.4 + burstKick * 0.35;
        const i3 = i * 3;
        colorArray[i3] = Math.min(1, this.baseColors[i3] * bright);
        colorArray[i3 + 1] = Math.min(1, this.baseColors[i3 + 1] * bright);
        colorArray[i3 + 2] = Math.min(1, this.baseColors[i3 + 2] * bright);
      } else {
        posArray[i * 3] = m.orbitRadius * 0.3 * Math.cos(m.orbitAngle);
        posArray[i * 3 + 1] = m.yOffset * 0.2;
        posArray[i * 3 + 2] = m.orbitRadius * 0.3 * Math.sin(m.orbitAngle);
        const i3 = i * 3;
        colorArray[i3] = this.baseColors[i3] * 0.35;
        colorArray[i3 + 1] = this.baseColors[i3 + 1] * 0.35;
        colorArray[i3 + 2] = this.baseColors[i3 + 2] * 0.35;
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    if (isLive) {
      this.points.rotation.y += delta * (0.08 + beat * 0.06 + burstKick * 0.04);
    }
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
