import * as THREE from 'three';
import { BaseVisualizer } from './BaseVisualizer';
import type { AudioData } from '../../audio/AudioEngine';

const SEGMENTS = 256;
const RADIUS = 2.5;

const vertexShader = `
  uniform float uTime;
  attribute float aDisplacement;
  varying float vIntensity;
  varying vec3 vNormal;

  void main() {
    vIntensity = aDisplacement;
    vec3 pos = position;
    float angle = atan(pos.z, pos.x);
    float radialOffset = aDisplacement * 1.5;
    float r = length(vec2(pos.x, pos.z)) + radialOffset;
    pos.x = cos(angle) * r;
    pos.z = sin(angle) * r;
    pos.y += sin(angle * 8.0 + uTime * 2.0) * aDisplacement * 0.3;

    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying float vIntensity;
  varying vec3 vNormal;

  void main() {
    float hue = 0.6 + vIntensity * 0.3;
    vec3 color = vec3(
      0.5 + 0.5 * cos(6.28318 * (hue + uTime * 0.05)),
      0.5 + 0.5 * cos(6.28318 * (hue + 0.33 + uTime * 0.05)),
      0.5 + 0.5 * cos(6.28318 * (hue + 0.66 + uTime * 0.05))
    );
    color *= 0.5 + vIntensity * 1.5;
    float glow = pow(vIntensity, 2.0) * 2.0;
    gl_FragColor = vec4(color + glow * 0.3, 0.85 + vIntensity * 0.15);
  }
`;

export class Waveform extends BaseVisualizer {
  private mesh!: THREE.Mesh;
  private material!: THREE.ShaderMaterial;
  private displacements: Float32Array = new Float32Array(SEGMENTS);
  private innerRing!: THREE.Line;

  constructor(scene: THREE.Scene, options: { sensitivity?: number } = {}) {
    super(scene, options);
    this.init();
  }

  protected init(): void {
    const positions: number[] = [];
    const displacements: number[] = [];

    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2;
      positions.push(Math.cos(angle) * RADIUS, 0, Math.sin(angle) * RADIUS);
      displacements.push(0);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aDisplacement', new THREE.Float32BufferAttribute(displacements, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: true,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);

    const innerPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2;
      innerPoints.push(new THREE.Vector3(Math.cos(angle) * (RADIUS * 0.6), 0, Math.sin(angle) * (RADIUS * 0.6)));
    }
    const innerGeo = new THREE.BufferGeometry().setFromPoints(innerPoints);
    const innerMat = new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.4 });
    this.innerRing = new THREE.Line(innerGeo, innerMat);
    this.scene.add(this.innerRing);

    const ambient = new THREE.AmbientLight(0x202040, 0.3);
    this.scene.add(ambient);
  }

  update(data: AudioData, delta: number): void {
    const time = data.timeDomain;
    if (!time.length) return;
    const attr = this.mesh.geometry.getAttribute('aDisplacement') as THREE.BufferAttribute;

    for (let i = 0; i < SEGMENTS; i++) {
      const idx = Math.floor((i / SEGMENTS) * time.length);
      const value = Math.abs(time[idx] - 128) / 128;
      const target = value * this.sensitivity;
      this.displacements[i] += (target - this.displacements[i]) * 0.3;
      attr.setX(i, this.displacements[i]);
    }
    attr.setX(SEGMENTS, this.displacements[0]);
    attr.needsUpdate = true;

    this.material.uniforms.uTime.value += delta;
    this.mesh.rotation.y += delta * 0.15;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.innerRing.geometry.dispose();
    (this.innerRing.material as THREE.Material).dispose();
    this.scene.remove(this.mesh, this.innerRing);
  }
}
