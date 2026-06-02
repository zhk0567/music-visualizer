import * as THREE from 'three';
import { BaseVisualizer } from './BaseVisualizer';
import type { AudioData } from '../../audio/AudioEngine';

const BAR_COUNT = 128;

export class SpectrumBars extends BaseVisualizer {
  private mesh!: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private heights: Float32Array = new Float32Array(BAR_COUNT);
  private colors: Float32Array = new Float32Array(BAR_COUNT * 3);

  constructor(scene: THREE.Scene, options: { sensitivity?: number } = {}) {
    super(scene, options);
    this.init();
  }

  protected init(): void {
    const geometry = new THREE.BoxGeometry(0.08, 1, 0.08);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x222244,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.4,
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, BAR_COUNT);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
    material.vertexColors = true;

    const radius = 3;
    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = (i / BAR_COUNT) * Math.PI * 2;
      this.dummy.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      this.dummy.lookAt(0, 0, 0);
      this.dummy.scale.set(1, 0.01, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      const hue = i / BAR_COUNT;
      const color = new THREE.Color().setHSL(hue * 0.7 + 0.55, 0.9, 0.55);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
    this.scene.add(this.mesh);

    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    const point = new THREE.PointLight(0x648cff, 2, 20);
    point.position.set(0, 5, 0);
    this.scene.add(ambient, point);
  }

  update(data: AudioData, _delta: number): void {
    const freq = data.frequency;
    if (!freq.length) return;
    const step = Math.floor(freq.length / BAR_COUNT);

    for (let i = 0; i < BAR_COUNT; i++) {
      const value = freq[i * step] / 255;
      const target = 0.05 + value * this.sensitivity * 3;
      this.heights[i] += (target - this.heights[i]) * 0.25;

      const angle = (i / BAR_COUNT) * Math.PI * 2;
      const radius = 3;
      this.dummy.position.set(Math.cos(angle) * radius, this.heights[i] / 2, Math.sin(angle) * radius);
      this.dummy.lookAt(0, this.heights[i] / 2, 0);
      this.dummy.scale.set(1, Math.max(0.01, this.heights[i]), 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      const intensity = Math.min(1, value * this.sensitivity);
      const hue = (i / BAR_COUNT) * 0.7 + 0.55;
      const color = new THREE.Color().setHSL(hue, 0.9, 0.4 + intensity * 0.3);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.scene.remove(this.mesh);
  }
}
