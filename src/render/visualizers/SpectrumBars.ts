import * as THREE from 'three';
import { BaseVisualizer, type VisualizerOptions } from './BaseVisualizer';
import type { AudioData } from '../../audio/AudioEngine';
import { hslToRgb } from '../themes';

const vertexShader = `
attribute vec3 instanceColor;
varying vec3 vColor;
#include <common>
#include <instancematrix_pars_vertex>

void main() {
  #include <instancematrix_vertex>
  vColor = instanceColor;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform float uBeat;
uniform float uEnvelope;
uniform vec3 uAccent;
varying vec3 vColor;

void main() {
  vec3 base = vColor * (0.55 + uEnvelope * 0.35);
  vec3 emissive = vColor * uBeat * 0.6 * uEnvelope + uAccent * uBeat * 0.25;
  gl_FragColor = vec4(base + emissive, 1.0);
}
`;

export class SpectrumBars extends BaseVisualizer {
  private mesh!: THREE.InstancedMesh;
  private material!: THREE.ShaderMaterial;
  private dummy = new THREE.Object3D();
  private barCount: number;
  private heights!: Float32Array;
  private colors!: Float32Array;
  private baseColors!: Float32Array;

  constructor(scene: THREE.Scene, options: VisualizerOptions = {}) {
    super(scene, options);
    this.barCount = options.barCount ?? 128;
    this.heights = new Float32Array(this.barCount);
    this.colors = new Float32Array(this.barCount * 3);
    this.baseColors = new Float32Array(this.barCount * 3);
    this.init();
  }

  protected init(): void {
    const geometry = new THREE.BoxGeometry(0.08, 1, 0.08);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uBeat: { value: 0 },
        uEnvelope: { value: 1 },
        uAccent: { value: new THREE.Color(this.theme.accent) },
      },
      vertexShader,
      fragmentShader,
    });

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.barCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);

    this.refreshThemeColors();
    this.layoutBars(1, 0);
    this.root.add(this.mesh);
  }

  private refreshThemeColors(): void {
    for (let i = 0; i < this.barCount; i++) {
      const t = i / this.barCount;
      const [r, g, b] = hslToRgb(
        this.theme.hueStart + t * this.theme.hueRange,
        this.theme.saturation,
        0.55,
      );
      this.baseColors[i * 3] = r;
      this.baseColors[i * 3 + 1] = g;
      this.baseColors[i * 3 + 2] = b;
      this.colors[i * 3] = r;
      this.colors[i * 3 + 1] = g;
      this.colors[i * 3 + 2] = b;
    }
    if (this.mesh?.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  private layoutBars(envelope: number, beat: number): void {
    const radius = 3;
    for (let i = 0; i < this.barCount; i++) {
      const angle = (i / this.barCount) * Math.PI * 2;
      const h = this.heights[i];
      this.dummy.position.set(Math.cos(angle) * radius, h / 2, Math.sin(angle) * radius);
      this.dummy.lookAt(0, h / 2, 0);
      this.dummy.scale.set(1, Math.max(0.01, h), 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      const intensity = Math.min(1, (h / 3) * envelope);
      const brightness = 0.4 + intensity * 0.3 + beat * 0.15;
      const base = i * 3;
      this.colors[base] = this.baseColors[base] * brightness;
      this.colors[base + 1] = this.baseColors[base + 1] * brightness;
      this.colors[base + 2] = this.baseColors[base + 2] * brightness;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  protected onThemeChanged(): void {
    this.material.uniforms.uAccent.value.setHex(this.theme.accent);
    this.refreshThemeColors();
  }

  update(data: AudioData, _delta: number, envelope: number, beat: number): void {
    const freq = data.frequency;
    const step = freq.length ? Math.max(1, Math.floor(freq.length / this.barCount)) : 1;

    for (let i = 0; i < this.barCount; i++) {
      const raw = freq.length ? freq[i * step] / 255 : 0;
      const value = raw * envelope;
      const target = 0.05 + value * this.sensitivity * 3 * (1 + beat * 0.3);
      this.heights[i] += (target - this.heights[i]) * 0.25;
      if (!freq.length) this.heights[i] *= 0.92;
    }

    this.layoutBars(envelope, beat);
    this.material.uniforms.uBeat.value = beat;
    this.material.uniforms.uEnvelope.value = envelope;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.root);
  }
}
