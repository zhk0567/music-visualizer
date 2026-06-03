import * as THREE from 'three';
import { BaseVisualizer, type VisualizerOptions } from './BaseVisualizer';
import type { AudioData } from '../../audio/AudioEngine';
import { hslToRgb } from '../themes';
import { getMotionProfile, smoothToward } from '../modeProfiles';
import { freqIndexForBar } from './freqMapping';
import {
  createAccentGlowMaterial,
  createBarBodyMaterial,
  createBarCapMaterial,
} from './visualMaterials';

const MIN_BAR_SCALE = 0.18;
const RING_RADIUS = 3;
const motion = getMotionProfile('spectrum');

export class SpectrumBars extends BaseVisualizer {
  private mesh!: THREE.InstancedMesh;
  private capMesh!: THREE.InstancedMesh;
  private material!: THREE.MeshPhongMaterial;
  private capMaterial!: THREE.MeshPhongMaterial;
  private baseRing!: THREE.Mesh;
  private innerGlow!: THREE.Mesh;
  private floorGlow!: THREE.Mesh;
  private dummy = new THREE.Object3D();
  private colorHelper = new THREE.Color();
  private accentColor = new THREE.Color();
  private barCount: number;
  private heights!: Float32Array;
  private targets!: Float32Array;
  private baseColors!: Float32Array;
  private idlePhase = 0;
  private lastBass = 0;

  constructor(scene: THREE.Scene, options: VisualizerOptions = {}) {
    super(scene, options);
    this.barCount = options.barCount ?? 128;
    this.heights = new Float32Array(this.barCount);
    this.targets = new Float32Array(this.barCount);
    this.baseColors = new Float32Array(this.barCount * 3);
    this.accentColor.setHex(this.theme.accent);
    this.init();
  }

  protected init(): void {
    const geometry = new THREE.BoxGeometry(0.18, 1, 0.18);
    this.material = createBarBodyMaterial();

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.barCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;

    const capGeo = new THREE.BoxGeometry(0.22, 0.08, 0.22);
    this.capMaterial = createBarCapMaterial();
    this.capMesh = new THREE.InstancedMesh(capGeo, this.capMaterial, this.barCount);
    this.capMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.capMesh.frustumCulled = false;
    this.capMesh.renderOrder = 3;

    const ringGeo = new THREE.RingGeometry(RING_RADIUS - 0.1, RING_RADIUS + 0.06, 80);
    this.baseRing = new THREE.Mesh(ringGeo, createAccentGlowMaterial(this.theme.accent, 0.42));
    this.baseRing.rotation.x = -Math.PI / 2;
    this.baseRing.position.y = 0.02;

    const innerGeo = new THREE.RingGeometry(1.0, 2.2, 48);
    this.innerGlow = new THREE.Mesh(innerGeo, createAccentGlowMaterial(this.theme.accent, 0.2));
    this.innerGlow.rotation.x = -Math.PI / 2;
    this.innerGlow.position.y = 0.01;

    const floorGeo = new THREE.CircleGeometry(RING_RADIUS + 0.6, 64);
    this.floorGlow = new THREE.Mesh(floorGeo, createAccentGlowMaterial(this.theme.accent, 0.14));
    this.floorGlow.rotation.x = -Math.PI / 2;
    this.floorGlow.position.y = 0.005;

    for (let i = 0; i < this.barCount; i++) {
      this.heights[i] = MIN_BAR_SCALE + Math.sin(i * 0.3) * 0.08;
      this.targets[i] = this.heights[i];
    }

    this.refreshThemeColors();
    this.layoutBars();
    this.root.add(this.floorGlow, this.innerGlow, this.baseRing, this.mesh, this.capMesh);
  }

  private refreshThemeColors(): void {
    this.accentColor.setHex(this.theme.accent);
    for (let i = 0; i < this.barCount; i++) {
      const t = i / this.barCount;
      const lightness = 0.88 + Math.sin(t * Math.PI * 2) * 0.08;
      const [r, g, b] = hslToRgb(
        this.theme.hueStart + t * this.theme.hueRange,
        this.theme.saturation,
        lightness,
      );
      this.baseColors[i * 3] = r;
      this.baseColors[i * 3 + 1] = g;
      this.baseColors[i * 3 + 2] = b;
    }
    this.applyInstanceColors(0, 0);
  }

  private applyInstanceColors(bass: number, beat: number): void {
    const beatPulse = 1 + beat * 0.75;

    for (let i = 0; i < this.barCount; i++) {
      const h = this.heights[i];
      const norm = Math.min(1, (h - MIN_BAR_SCALE) / 2.8);
      const bright = (0.92 + norm * 0.42 + beat * 0.28) * beatPulse;
      const accentMix = 0.1 + beat * 0.15 * norm;

      const base = i * 3;
      const r = this.baseColors[base] * bright + this.accentColor.r * accentMix;
      const g = this.baseColors[base + 1] * bright + this.accentColor.g * accentMix;
      const b = this.baseColors[base + 2] * bright + this.accentColor.b * accentMix;

      this.colorHelper.setRGB(Math.min(1, r), Math.min(1, g), Math.min(1, b));
      this.mesh.setColorAt(i, this.colorHelper);

      this.colorHelper.multiplyScalar(1.3 + norm * 0.35);
      this.capMesh.setColorAt(i, this.colorHelper);
    }

    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (this.capMesh.instanceColor) this.capMesh.instanceColor.needsUpdate = true;

    (this.baseRing.material as THREE.MeshBasicMaterial).opacity =
      0.32 + bass * 0.28 + beat * 0.3;
    (this.innerGlow.material as THREE.MeshBasicMaterial).opacity =
      0.14 + bass * 0.22 + beat * 0.18;
    (this.floorGlow.material as THREE.MeshBasicMaterial).opacity =
      0.08 + bass * 0.14 + beat * 0.1;
  }

  private layoutBars(): void {
    for (let i = 0; i < this.barCount; i++) {
      const angle = (i / this.barCount) * Math.PI * 2;
      const h = Math.max(MIN_BAR_SCALE, this.heights[i]);
      const x = Math.cos(angle) * RING_RADIUS;
      const z = Math.sin(angle) * RING_RADIUS;

      this.dummy.position.set(x, h * 0.5, z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, h, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.set(x, h + 0.06, z);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.capMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.capMesh.instanceMatrix.needsUpdate = true;
  }

  protected onThemeChanged(): void {
    this.accentColor.setHex(this.theme.accent);
    (this.baseRing.material as THREE.MeshBasicMaterial).color.setHex(this.theme.accent);
    (this.innerGlow.material as THREE.MeshBasicMaterial).color.setHex(this.theme.accent);
    (this.floorGlow.material as THREE.MeshBasicMaterial).color.setHex(this.theme.accent);
    this.refreshThemeColors();
  }

  update(data: AudioData, delta: number, envelope: number, beat: number): void {
    const freq = data.frequency;
    const displayEnvelope = Math.max(envelope, motion.displayEnvelopeMin);

    if (!freq.length) {
      this.idlePhase += delta * 2.2;
      this.lastBass = smoothToward(this.lastBass, 0.2, 0.2, 0.08);
      for (let i = 0; i < this.barCount; i++) {
        this.targets[i] =
          MIN_BAR_SCALE +
          0.28 +
          Math.sin(this.idlePhase + i * 0.28) * motion.idleAmplitude;
      }
    } else {
      const end = Math.floor(freq.length * 0.1);
      let bassSum = 0;
      for (let i = 0; i < end; i++) bassSum += freq[i];
      const bass = bassSum / end / 255;
      this.lastBass = smoothToward(this.lastBass, bass, 0.45, 0.12);

      for (let i = 0; i < this.barCount; i++) {
        const idx = freqIndexForBar(i, this.barCount, freq.length);
        const raw = freq[idx] / 255;
        const value = Math.pow(raw, 0.85) * displayEnvelope;
        this.targets[i] =
          MIN_BAR_SCALE +
          value * this.sensitivity * motion.audioGain * (1 + beat * motion.beatGain);
      }
    }

    for (let i = 0; i < this.barCount; i++) {
      this.heights[i] = smoothToward(
        this.heights[i],
        this.targets[i],
        motion.attack,
        motion.release,
      );
    }

    this.root.rotation.y += delta * (0.04 + this.lastBass * 0.08 + beat * 0.06);
    this.layoutBars();
    this.applyInstanceColors(this.lastBass, beat);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.capMesh.geometry.dispose();
    this.capMaterial.dispose();
    this.baseRing.geometry.dispose();
    (this.baseRing.material as THREE.Material).dispose();
    this.innerGlow.geometry.dispose();
    (this.innerGlow.material as THREE.Material).dispose();
    this.floorGlow.geometry.dispose();
    (this.floorGlow.material as THREE.Material).dispose();
    this.scene.remove(this.root);
  }
}
