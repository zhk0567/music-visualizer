import * as THREE from 'three';
import { BaseVisualizer, type VisualizerOptions } from './BaseVisualizer';
import type { AudioData } from '../../audio/AudioEngine';
import { hslToRgb } from '../themes';

const MIN_BAR_SCALE = 0.2;
const RING_RADIUS = 3;

function freqIndexForBar(barIndex: number, barCount: number, freqLength: number): number {
  const t = barIndex / barCount;
  const logT = Math.pow(t, 0.55);
  return Math.min(freqLength - 1, Math.floor(logT * (freqLength - 1)));
}

export class SpectrumBars extends BaseVisualizer {
  private mesh!: THREE.InstancedMesh;
  private capMesh!: THREE.InstancedMesh;
  private material!: THREE.MeshBasicMaterial;
  private capMaterial!: THREE.MeshBasicMaterial;
  private baseRing!: THREE.Mesh;
  private innerGlow!: THREE.Mesh;
  private floorGlow!: THREE.Mesh;
  private dummy = new THREE.Object3D();
  private colorHelper = new THREE.Color();
  private accentColor = new THREE.Color();
  private barCount: number;
  private heights!: Float32Array;
  private baseColors!: Float32Array;
  private idlePhase = 0;

  constructor(scene: THREE.Scene, options: VisualizerOptions = {}) {
    super(scene, options);
    this.barCount = options.barCount ?? 128;
    this.heights = new Float32Array(this.barCount);
    this.baseColors = new Float32Array(this.barCount * 3);
    this.accentColor.setHex(this.theme.accent);
    this.init();
  }

  protected init(): void {
    const geometry = new THREE.BoxGeometry(0.11, 1, 0.11);
    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      fog: false,
      toneMapped: false,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.barCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;

    const capGeo = new THREE.BoxGeometry(0.15, 0.06, 0.15);
    this.capMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      fog: false,
      toneMapped: false,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.capMesh = new THREE.InstancedMesh(capGeo, this.capMaterial, this.barCount);
    this.capMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.capMesh.frustumCulled = false;
    this.capMesh.renderOrder = 3;

    const ringGeo = new THREE.RingGeometry(RING_RADIUS - 0.12, RING_RADIUS + 0.08, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.theme.accent,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.baseRing = new THREE.Mesh(ringGeo, ringMat);
    this.baseRing.rotation.x = -Math.PI / 2;
    this.baseRing.position.y = 0.03;
    this.baseRing.renderOrder = 0;

    const innerGeo = new THREE.RingGeometry(1.2, 2.6, 48);
    const innerMat = new THREE.MeshBasicMaterial({
      color: this.theme.accent,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      fog: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.innerGlow = new THREE.Mesh(innerGeo, innerMat);
    this.innerGlow.rotation.x = -Math.PI / 2;
    this.innerGlow.position.y = 0.01;
    this.innerGlow.renderOrder = 0;

    const floorGeo = new THREE.CircleGeometry(RING_RADIUS + 0.8, 64);
    const floorMat = new THREE.MeshBasicMaterial({
      color: this.theme.accent,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      fog: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.floorGlow = new THREE.Mesh(floorGeo, floorMat);
    this.floorGlow.rotation.x = -Math.PI / 2;
    this.floorGlow.position.y = 0.005;
    this.floorGlow.renderOrder = 0;

    for (let i = 0; i < this.barCount; i++) {
      this.heights[i] = MIN_BAR_SCALE + Math.sin(i * 0.3) * 0.06;
    }

    this.refreshThemeColors();
    this.layoutBars();
    this.root.add(this.floorGlow, this.innerGlow, this.baseRing, this.mesh, this.capMesh);
  }

  private refreshThemeColors(): void {
    this.accentColor.setHex(this.theme.accent);
    for (let i = 0; i < this.barCount; i++) {
      const t = i / this.barCount;
      const lightness = 0.72 + Math.sin(t * Math.PI * 2) * 0.08;
      const [r, g, b] = hslToRgb(
        this.theme.hueStart + t * this.theme.hueRange,
        Math.min(1, this.theme.saturation + 0.05),
        lightness,
      );
      this.baseColors[i * 3] = r;
      this.baseColors[i * 3 + 1] = g;
      this.baseColors[i * 3 + 2] = b;
    }
    this.applyInstanceColors(1, 0);
  }

  private applyInstanceColors(envelope: number, beat: number): void {
    const displayEnvelope = Math.max(0.55, envelope);
    const beatPulse = 1 + beat * 0.55;
    const accentMix = 0.22 + beat * 0.18;

    for (let i = 0; i < this.barCount; i++) {
      const h = this.heights[i];
      const intensity = Math.min(1, (h / 2.8) * displayEnvelope);
      const heightGlow = 0.85 + Math.min(0.35, (h - MIN_BAR_SCALE) * 0.4);
      const bright =
        (0.72 + intensity * 0.5 + beat * 0.28) * beatPulse * heightGlow;

      const base = i * 3;
      const r = this.baseColors[base] * bright + this.accentColor.r * accentMix;
      const g = this.baseColors[base + 1] * bright + this.accentColor.g * accentMix;
      const b = this.baseColors[base + 2] * bright + this.accentColor.b * accentMix;

      this.colorHelper.setRGB(
        Math.min(1, r),
        Math.min(1, g),
        Math.min(1, b),
      );
      this.mesh.setColorAt(i, this.colorHelper);

      this.colorHelper.multiplyScalar(1.35);
      this.capMesh.setColorAt(i, this.colorHelper);
    }

    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (this.capMesh.instanceColor) this.capMesh.instanceColor.needsUpdate = true;

    const ringPulse = 0.38 + beat * 0.25;
    (this.baseRing.material as THREE.MeshBasicMaterial).opacity = ringPulse;
    (this.innerGlow.material as THREE.MeshBasicMaterial).opacity = 0.1 + beat * 0.12;
    (this.floorGlow.material as THREE.MeshBasicMaterial).opacity = 0.06 + beat * 0.06;
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

      this.dummy.position.set(x, h + 0.05, z);
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
    const displayEnvelope = Math.max(0.55, envelope);

    if (!freq.length) {
      this.idlePhase += delta * 2.5;
      for (let i = 0; i < this.barCount; i++) {
        const wave = MIN_BAR_SCALE + 0.18 + Math.sin(this.idlePhase + i * 0.25) * 0.14;
        this.heights[i] += (wave - this.heights[i]) * 0.12;
      }
    } else {
      for (let i = 0; i < this.barCount; i++) {
        const idx = freqIndexForBar(i, this.barCount, freq.length);
        const raw = freq[idx] / 255;
        const value = raw * displayEnvelope;
        const target = MIN_BAR_SCALE + value * this.sensitivity * 4 * (1 + beat * 0.45);
        this.heights[i] += (target - this.heights[i]) * 0.28;
      }
    }

    this.layoutBars();
    this.applyInstanceColors(displayEnvelope, beat);
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
