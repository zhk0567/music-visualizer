import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class PostProcessing {
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private renderer: THREE.WebGLRenderer;
  private enabled = true;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    const size = new THREE.Vector2();
    renderer.getSize(size);
    this.bloomPass = new UnrealBloomPass(size, 0.8, 0.4, 0.2);
    this.composer.addPass(this.bloomPass);
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  setBloomStrength(strength: number): void {
    this.bloomPass.strength = strength;
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  render(): void {
    if (this.enabled) {
      this.composer.render();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  captureToBlob(): Promise<Blob | null> {
    this.render();
    return new Promise((resolve) => {
      this.renderer.domElement.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  dispose(): void {
    this.composer.dispose();
  }
}
