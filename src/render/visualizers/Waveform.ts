import * as THREE from 'three';
import { BaseVisualizer, type VisualizerOptions } from './BaseVisualizer';
import type { AudioData } from '../../audio/AudioEngine';
import type { ThemeColors } from '../themes';

const RADIUS = 2.5;

const vertexShader = `
  uniform float uTime;
  attribute float aDisplacement;
  varying float vIntensity;

  void main() {
    vIntensity = aDisplacement;
    vec3 pos = position;
    float angle = atan(pos.z, pos.x);
    float radialOffset = aDisplacement * 1.5;
    float r = length(vec2(pos.x, pos.z)) + radialOffset;
    pos.x = cos(angle) * r;
    pos.z = sin(angle) * r;
    pos.y += sin(angle * 8.0 + uTime * 2.0) * aDisplacement * 0.3;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uAccent;
  varying float vIntensity;

  void main() {
    vec3 color = uAccent * (0.5 + vIntensity * 1.5);
    float glow = pow(vIntensity, 2.0) * 2.0;
    gl_FragColor = vec4(color + glow * 0.3, 0.85 + vIntensity * 0.15);
  }
`;

export class Waveform extends BaseVisualizer {
  private line!: THREE.Line;
  private material!: THREE.ShaderMaterial;
  private displacements!: Float32Array;
  private innerRing!: THREE.Line;
  private innerMaterial!: THREE.LineBasicMaterial;
  private innerBaseRadius = RADIUS * 0.6;
  private segments: number;

  constructor(scene: THREE.Scene, options: VisualizerOptions = {}) {
    super(scene, options);
    this.segments = options.segmentCount ?? 256;
    this.displacements = new Float32Array(this.segments + 1);
    this.init();
  }

  protected init(): void {
    const positions = new Float32Array((this.segments + 1) * 3);
    const displacements = new Float32Array(this.segments + 1);

    for (let i = 0; i <= this.segments; i++) {
      const angle = (i / this.segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * RADIUS;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * RADIUS;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aDisplacement', new THREE.BufferAttribute(displacements, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uAccent: { value: new THREE.Color(this.theme.accent) },
      },
      transparent: true,
    });

    this.line = new THREE.Line(geometry, this.material);
    this.root.add(this.line);

    const innerPositions = new Float32Array((this.segments + 1) * 3);
    for (let i = 0; i <= this.segments; i++) {
      const angle = (i / this.segments) * Math.PI * 2;
      innerPositions[i * 3] = Math.cos(angle) * this.innerBaseRadius;
      innerPositions[i * 3 + 1] = 0;
      innerPositions[i * 3 + 2] = Math.sin(angle) * this.innerBaseRadius;
    }
    const innerGeo = new THREE.BufferGeometry();
    innerGeo.setAttribute('position', new THREE.BufferAttribute(innerPositions, 3));
    this.innerMaterial = new THREE.LineBasicMaterial({
      color: this.theme.ambient,
      transparent: true,
      opacity: 0.4,
    });
    this.innerRing = new THREE.Line(innerGeo, this.innerMaterial);
    this.root.add(this.innerRing);
  }

  protected onThemeChanged(): void {
    (this.material.uniforms.uAccent.value as THREE.Color).setHex(this.theme.accent);
    this.innerMaterial.color.setHex(this.theme.ambient);
  }

  update(data: AudioData, delta: number, envelope: number, beat: number): void {
    const time = data.timeDomain;
    const attr = this.line.geometry.getAttribute('aDisplacement') as THREE.BufferAttribute;

    let bass = 0;
    if (time.length) {
      const end = Math.floor(time.length * 0.1);
      for (let i = 0; i < end; i++) {
        bass += Math.abs(time[i] - 128);
      }
      bass = bass / end / 128;
    }

    for (let i = 0; i <= this.segments; i++) {
      const idx = time.length ? Math.floor((i / this.segments) * time.length) : 0;
      const value = time.length ? (Math.abs(time[idx] - 128) / 128) * envelope : 0;
      const target = value * this.sensitivity * (1 + beat * 0.2);
      this.displacements[i] += (target - this.displacements[i]) * 0.3;
      if (!time.length) this.displacements[i] *= 0.9;
      attr.setX(i, this.displacements[i]);
    }
    attr.needsUpdate = true;

    const innerScale = this.innerBaseRadius * (1 + bass * 0.3 * envelope + beat * 0.1);
    const innerPos = this.innerRing.geometry.getAttribute('position') as THREE.BufferAttribute;
    const innerArray = innerPos.array as Float32Array;
    for (let i = 0; i <= this.segments; i++) {
      const angle = (i / this.segments) * Math.PI * 2;
      innerArray[i * 3] = Math.cos(angle) * innerScale;
      innerArray[i * 3 + 2] = Math.sin(angle) * innerScale;
    }
    innerPos.needsUpdate = true;

    this.material.uniforms.uTime.value += delta;
    this.line.rotation.y += delta * 0.15;
  }

  setTheme(theme: ThemeColors): void {
    super.setTheme(theme);
  }

  dispose(): void {
    this.line.geometry.dispose();
    this.material.dispose();
    this.innerRing.geometry.dispose();
    this.innerMaterial.dispose();
    this.scene.remove(this.root);
  }
}
