import * as THREE from 'three';
import { BaseVisualizer, type VisualizerOptions } from './BaseVisualizer';
import type { AudioData } from '../../audio/AudioEngine';
import { hslToRgb } from '../themes';

const MIN_BAR_SCALE = 0.2;
const RING_RADIUS = 3;

/** Map bar index to FFT bin with log emphasis on bass (lower bins). */
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
  private dummy = new THREE.Object3D();
  private colorHelper = new THREE.Color();
  private barCount: number;
  private heights!: Float32Array;
  private baseColors!: Float32Array;
  private idlePhase = 0;

  constructor(scene: THREE.Scene, options: VisualizerOptions = {}) {
    super(scene, options);
    this.barCount = options.barCount ?? 128;
    this.heights = new Float32Array(this.barCount);
    this.baseColors = new Float32Array(this.barCount * 3);
    this.init();
  }

  protected init(): void {
    const geometry = new THREE.BoxGeometry(0.12, 1, 0.12);
    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      fog: false,
      toneMapped: false,
    });

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.barCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    const capGeo = new THREE.BoxGeometry(0.14, 0.08, 0.14);
    this.capMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      fog: false,
      toneMapped: false,
    });
    this.capMesh = new THREE.InstancedMesh(capGeo, this.capMaterial, this.barCount);
    this.capMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.capMesh.frustumCulled = false;

    const ringGeo = new THREE.RingGeometry(RING_RADIUS - 0.15, RING_RADIUS + 0.05, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.theme.accent,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
    });
    this.baseRing = new THREE.Mesh(ringGeo, ringMat);
    this.baseRing.rotation.x = -Math.PI / 2;
    this.baseRing.position.y = 0.02;
    this.baseRing.frustumCulled = false;

    for (let i = 0; i < this.barCount; i++) {
      this.heights[i] = MIN_BAR_SCALE + Math.sin(i * 0.3) * 0.05;
    }

    this.refreshThemeColors();
    this.layoutBars();
    this.root.add(this.baseRing, this.mesh, this.capMesh);
  }

  private refreshThemeColors(): void {
    for (let i = 0; i < this.barCount; i++) {
      const t = i / this.barCount;
      const [r, g, b] = hslToRgb(
        this.theme.hueStart + t * this.theme.hueRange,
        this.theme.saturation,
        0.62,
      );
      this.baseColors[i * 3] = r;
      this.baseColors[i * 3 + 1] = g;
      this.baseColors[i * 3 + 2] = b;
    }
    this.applyInstanceColors(1, 0);
  }

  private applyInstanceColors(envelope: number, beat: number): void {
    const displayEnvelope = Math.max(0.5, envelope);
    const beatPulse = 1 + beat * 0.45;

    for (let i = 0; i < this.barCount; i++) {
      const intensity = Math.min(1, (this.heights[i] / 3) * displayEnvelope);
      const peakBoost = this.heights[i] > 1.2 ? 0.15 : 0;
      const brightness = (0.55 + intensity * 0.35 + beat * 0.25 + peakBoost) * beatPulse;
      const b = Math.min(1, brightness);
      const base = i * 3;
      this.colorHelper.setRGB(
        this.baseColors[base] * b,
        this.baseColors[base + 1] * b,
        this.baseColors[base + 2] * b,
      );
      this.mesh.setColorAt(i, this.colorHelper);
      this.capMesh.setColorAt(i, this.colorHelper);
    }

    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (this.capMesh.instanceColor) this.capMesh.instanceColor.needsUpdate = true;
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

      this.dummy.position.set(x, h + 0.04, z);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.capMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.capMesh.instanceMatrix.needsUpdate = true;
  }

  protected onThemeChanged(): void {
    (this.baseRing.material as THREE.MeshBasicMaterial).color.setHex(this.theme.accent);
    this.refreshThemeColors();
  }

  update(data: AudioData, delta: number, envelope: number, beat: number): void {
    const freq = data.frequency;
    const displayEnvelope = Math.max(0.5, envelope);

    if (!freq.length) {
      this.idlePhase += delta * 2.5;
      for (let i = 0; i < this.barCount; i++) {
        const wave = MIN_BAR_SCALE + 0.15 + Math.sin(this.idlePhase + i * 0.25) * 0.12;
        this.heights[i] += (wave - this.heights[i]) * 0.12;
      }
    } else {
      for (let i = 0; i < this.barCount; i++) {
        const idx = freqIndexForBar(i, this.barCount, freq.length);
        const raw = freq[idx] / 255;
        const value = raw * displayEnvelope;
        const target = MIN_BAR_SCALE + value * this.sensitivity * 3.8 * (1 + beat * 0.4);
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
    this.scene.remove(this.root);
  }
}
