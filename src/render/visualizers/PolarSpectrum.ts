import * as THREE from 'three';
import { BaseVisualizer, type VisualizerOptions } from './BaseVisualizer';
import type { AudioData } from '../../audio/AudioEngine';
import { hslToRgb } from '../themes';
import { getMotionProfile, smoothToward } from '../modeProfiles';
import { freqIndexForBar } from './freqMapping';
import {
  createAccentGlowMaterial,
  createAccentSolidMaterial,
  createBarBodyMaterial,
  createBarCapMaterial,
} from './visualMaterials';

const MIN_BAR_SCALE = 0.2;
const INNER_RADIUS = 0.5;
const motion = getMotionProfile('polar');

export class PolarSpectrum extends BaseVisualizer {
  private mesh!: THREE.InstancedMesh;
  private capMesh!: THREE.InstancedMesh;
  private material!: THREE.MeshPhongMaterial;
  private capMaterial!: THREE.MeshPhongMaterial;
  private centerHub!: THREE.Mesh;
  private rippleRing!: THREE.Mesh;
  private dummy = new THREE.Object3D();
  private colorHelper = new THREE.Color();
  private accentColor = new THREE.Color();
  private barCount: number;
  private lengths!: Float32Array;
  private targets!: Float32Array;
  private baseColors!: Float32Array;
  private idlePhase = 0;

  constructor(scene: THREE.Scene, options: VisualizerOptions = {}) {
    super(scene, options);
    this.barCount = options.barCount ?? 128;
    this.lengths = new Float32Array(this.barCount);
    this.targets = new Float32Array(this.barCount);
    this.baseColors = new Float32Array(this.barCount * 3);
    this.accentColor.setHex(this.theme.accent);
    this.init();
  }

  protected init(): void {
    const geometry = new THREE.BoxGeometry(1, 0.24, 0.18);
    this.material = createBarBodyMaterial();

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.barCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;

    const capGeo = new THREE.BoxGeometry(0.22, 0.28, 0.22);
    this.capMaterial = createBarCapMaterial();
    this.capMesh = new THREE.InstancedMesh(capGeo, this.capMaterial, this.barCount);
    this.capMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.capMesh.frustumCulled = false;
    this.capMesh.renderOrder = 3;

    const hubGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.2, 32);
    this.centerHub = new THREE.Mesh(hubGeo, createAccentSolidMaterial(this.theme.accent));
    this.centerHub.position.y = 0.1;
    this.centerHub.renderOrder = 1;

    const rippleGeo = new THREE.RingGeometry(INNER_RADIUS + 0.2, INNER_RADIUS + 0.45, 64);
    this.rippleRing = new THREE.Mesh(
      rippleGeo,
      createAccentGlowMaterial(this.theme.accent, 0.28),
    );
    this.rippleRing.rotation.x = -Math.PI / 2;
    this.rippleRing.position.y = 0.08;
    this.rippleRing.renderOrder = 1;

    for (let i = 0; i < this.barCount; i++) {
      this.lengths[i] = MIN_BAR_SCALE + Math.sin(i * 0.35) * 0.1;
      this.targets[i] = this.lengths[i];
    }

    this.refreshThemeColors();
    this.layoutBars();
    this.root.add(this.rippleRing, this.centerHub, this.mesh, this.capMesh);
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
    this.applyInstanceColors(0);
  }

  private applyInstanceColors(beat: number): void {
    const beatPulse = 1 + beat * 0.85;

    for (let i = 0; i < this.barCount; i++) {
      const len = this.lengths[i];
      const norm = Math.min(1, (len - MIN_BAR_SCALE) / 2.5);
      const bright = (0.92 + norm * 0.42 + beat * 0.3) * beatPulse;
      const accentMix = 0.15 + beat * 0.22 * norm;

      const base = i * 3;
      const r = this.baseColors[base] * bright + this.accentColor.r * accentMix;
      const g = this.baseColors[base + 1] * bright + this.accentColor.g * accentMix;
      const b = this.baseColors[base + 2] * bright + this.accentColor.b * accentMix;

      this.colorHelper.setRGB(Math.min(1, r), Math.min(1, g), Math.min(1, b));
      this.mesh.setColorAt(i, this.colorHelper);
      this.colorHelper.multiplyScalar(1.35 + norm * 0.3);
      this.capMesh.setColorAt(i, this.colorHelper);
    }

    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (this.capMesh.instanceColor) this.capMesh.instanceColor.needsUpdate = true;
  }

  private layoutBars(): void {
    for (let i = 0; i < this.barCount; i++) {
      const angle = (i / this.barCount) * Math.PI * 2;
      const len = Math.max(MIN_BAR_SCALE, this.lengths[i]);
      const midR = INNER_RADIUS + len * 0.5;

      this.dummy.position.set(Math.cos(angle) * midR, 0.12, Math.sin(angle) * midR);
      this.dummy.rotation.set(0, -angle, 0);
      this.dummy.scale.set(len, 1, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      const tipR = INNER_RADIUS + len + 0.08;
      this.dummy.position.set(Math.cos(angle) * tipR, 0.12, Math.sin(angle) * tipR);
      this.dummy.rotation.set(0, -angle, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.capMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.capMesh.instanceMatrix.needsUpdate = true;
  }

  protected onThemeChanged(): void {
    this.accentColor.setHex(this.theme.accent);
    (this.centerHub.material as THREE.MeshPhongMaterial).color.setHex(this.theme.accent);
    (this.centerHub.material as THREE.MeshPhongMaterial).emissive.setHex(this.theme.accent);
    (this.rippleRing.material as THREE.MeshBasicMaterial).color.setHex(this.theme.accent);
    this.refreshThemeColors();
  }

  update(data: AudioData, delta: number, envelope: number, beat: number): void {
    const freq = data.frequency;
    const displayEnvelope = Math.max(envelope, motion.displayEnvelopeMin);

    let bass = 0;
    if (freq.length) {
      const end = Math.floor(freq.length * 0.08);
      for (let i = 0; i < end; i++) bass += freq[i];
      bass = bass / end / 255;
    }

    if (!freq.length) {
      this.idlePhase += delta * 2.2;
      for (let i = 0; i < this.barCount; i++) {
        this.targets[i] =
          MIN_BAR_SCALE +
          0.28 +
          Math.sin(this.idlePhase + i * 0.3) * motion.idleAmplitude;
      }
    } else {
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
      this.lengths[i] = smoothToward(
        this.lengths[i],
        this.targets[i],
        motion.attack,
        motion.release,
      );
    }

    const hubScale = 1 + bass * 0.55 * displayEnvelope + beat * 0.38;
    this.centerHub.scale.set(hubScale, 1, hubScale);
    (this.centerHub.material as THREE.MeshPhongMaterial).emissiveIntensity =
      0.45 + bass * 0.35 + beat * 0.4;

    const rippleScale = 1 + bass * 0.95 + beat * 0.45;
    this.rippleRing.scale.set(rippleScale, rippleScale, 1);
    (this.rippleRing.material as THREE.MeshBasicMaterial).opacity =
      0.12 + bass * 0.35 + beat * 0.22;

    this.root.rotation.y += delta * (0.06 + beat * 0.1);
    this.layoutBars();
    this.applyInstanceColors(beat);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.capMesh.geometry.dispose();
    this.capMaterial.dispose();
    this.centerHub.geometry.dispose();
    (this.centerHub.material as THREE.Material).dispose();
    this.rippleRing.geometry.dispose();
    (this.rippleRing.material as THREE.Material).dispose();
    this.scene.remove(this.root);
  }
}
