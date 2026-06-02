import * as THREE from 'three';
import { BaseVisualizer } from './BaseVisualizer';
import type { AudioData } from '../../audio/AudioEngine';

const PARTICLE_COUNT = 5000;

export class ParticleField extends BaseVisualizer {
  private points!: THREE.Points;
  private velocities: Float32Array = new Float32Array(PARTICLE_COUNT * 3);
  private basePositions: Float32Array = new Float32Array(PARTICLE_COUNT * 3);
  private material!: THREE.PointsMaterial;

  constructor(scene: THREE.Scene, options: { sensitivity?: number } = {}) {
    super(scene, options);
    this.init();
  }

  protected init(): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
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
    this.scene.add(this.points);
  }

  update(data: AudioData, delta: number): void {
    const freq = data.frequency;
    const len = freq.length;
    if (!len) return;

    const bass = this.avgRange(freq, 0, Math.floor(len * 0.1));
    const mid = this.avgRange(freq, Math.floor(len * 0.1), Math.floor(len * 0.5));
    const treble = this.avgRange(freq, Math.floor(len * 0.5), len);

    const positions = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const band = i % 3;
      const energy = band === 0 ? bass : band === 1 ? mid : treble;
      const force = (energy / 255) * this.sensitivity;

      this.velocities[i3] += (Math.random() - 0.5) * force * 0.05;
      this.velocities[i3 + 1] += force * 0.03;
      this.velocities[i3 + 2] += (Math.random() - 0.5) * force * 0.05;

      const damp = 0.96;
      this.velocities[i3] *= damp;
      this.velocities[i3 + 1] *= damp;
      this.velocities[i3 + 2] *= damp;

      let px = positions.getX(i) + this.velocities[i3];
      let py = positions.getY(i) + this.velocities[i3 + 1];
      let pz = positions.getZ(i) + this.velocities[i3 + 2];

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

      positions.setXYZ(i, px, py, pz);

      const hue = 0.55 + band * 0.12 + force * 0.2;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.5 + force * 0.3);
      colors.setXYZ(i, color.r, color.g, color.b);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;

    this.material.size = 0.04 + (bass / 255) * 0.08 * this.sensitivity;
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
    this.scene.remove(this.points);
  }
}
