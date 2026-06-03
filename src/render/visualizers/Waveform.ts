import * as THREE from 'three';
import { BaseVisualizer, type VisualizerOptions } from './BaseVisualizer';
import type { AudioData } from '../../audio/AudioEngine';
import { getMotionProfile } from '../modeProfiles';

const RADIUS = 2.5;
const motion = getMotionProfile('waveform');

const vertexShader = `
  uniform float uTime;
  uniform float uRadialMul;
  attribute float aDisplacement;
  varying float vIntensity;

  void main() {
    vIntensity = aDisplacement;
    vec3 pos = position;
    float angle = atan(pos.z, pos.x);
    float radialOffset = aDisplacement * uRadialMul;
    float r = length(vec2(pos.x, pos.z)) + radialOffset;
    pos.x = cos(angle) * r;
    pos.z = sin(angle) * r;
    pos.y += sin(angle * 8.0 + uTime * 2.0) * aDisplacement * 0.32;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uAccent;
  uniform float uBeat;
  uniform float uGlowMix;
  varying float vIntensity;

  void main() {
    float beatPulse = 1.0 + uBeat * 0.55;
    vec3 color = uAccent * (0.78 + vIntensity * 2.4) * beatPulse;
    float glow = pow(vIntensity, 1.6) * 3.2 * uGlowMix;
    float alpha = (0.75 + vIntensity * 0.25 + uBeat * 0.15) * uGlowMix;
    gl_FragColor = vec4(color + glow * 0.35, alpha);
  }
`;

export class Waveform extends BaseVisualizer {
  private line!: THREE.Line;
  private glowLine!: THREE.Line;
  private material!: THREE.ShaderMaterial;
  private glowMaterial!: THREE.ShaderMaterial;
  private displacements!: Float32Array;
  private innerRing!: THREE.Line;
  private innerMaterial!: THREE.LineBasicMaterial;
  private innerBaseRadius = RADIUS * 0.6;
  private segments: number;
  private idlePhase = 0;

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
      displacements[i] = 0.12 + Math.sin(i * 0.25) * 0.06;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aDisplacement', new THREE.BufferAttribute(displacements, 1));

    const glowGeo = geometry.clone();
    const accent = new THREE.Color(this.theme.accent);
    const makeUniforms = () => ({
      uTime: { value: 0 },
      uAccent: { value: accent.clone() },
      uBeat: { value: 0 },
      uRadialMul: { value: motion.radialMul ?? 1.5 },
      uGlowMix: { value: 1 },
    });

    this.glowMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        ...makeUniforms(),
        uRadialMul: { value: motion.glowRadialMul ?? 2.2 },
        uGlowMix: { value: 0.65 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: makeUniforms(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    this.glowLine = new THREE.Line(glowGeo, this.glowMaterial);
    this.glowLine.renderOrder = 1;
    this.line = new THREE.Line(geometry, this.material);
    this.line.renderOrder = 2;
    this.root.add(this.glowLine, this.line);

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
      color: this.theme.accent,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.innerRing = new THREE.Line(innerGeo, this.innerMaterial);
    this.innerRing.renderOrder = 0;
    this.root.add(this.innerRing);
  }

  protected onThemeChanged(): void {
    (this.material.uniforms.uAccent.value as THREE.Color).setHex(this.theme.accent);
    (this.glowMaterial.uniforms.uAccent.value as THREE.Color).setHex(this.theme.accent);
    this.innerMaterial.color.setHex(this.theme.accent);
  }

  update(data: AudioData, delta: number, envelope: number, beat: number): void {
    const time = data.timeDomain;
    const attr = this.line.geometry.getAttribute('aDisplacement') as THREE.BufferAttribute;
    const glowAttr = this.glowLine.geometry.getAttribute('aDisplacement') as THREE.BufferAttribute;
    const displayEnvelope = Math.max(envelope, motion.displayEnvelopeMin);

    this.material.uniforms.uBeat.value = beat;
    this.glowMaterial.uniforms.uBeat.value = beat;
    const radialBoost = 1 + beat * motion.beatGain * 0.65;
    (this.material.uniforms.uRadialMul as THREE.IUniform).value =
      (motion.radialMul ?? 1.5) * radialBoost;
    (this.glowMaterial.uniforms.uRadialMul as THREE.IUniform).value =
      (motion.glowRadialMul ?? 2.2) * radialBoost;

    let bass = 0;
    if (time.length) {
      const end = Math.floor(time.length * 0.1);
      for (let i = 0; i < end; i++) {
        bass += Math.abs(time[i] - 128);
      }
      bass = bass / end / 128;
    } else {
      bass = 0.15 + Math.sin(this.idlePhase * 0.8) * 0.08;
    }

    if (!time.length) {
      this.idlePhase += delta * 2.5;
    }

    for (let i = 0; i <= this.segments; i++) {
      let target: number;
      if (time.length) {
        const idx = Math.floor((i / this.segments) * time.length);
        const raw = Math.abs(time[idx] - 128) / 128;
        const value = Math.pow(raw, 0.75) * displayEnvelope;
        target =
          value * this.sensitivity * motion.audioGain * (1 + beat * motion.beatGain);
      } else {
        target = 0.22 + Math.sin(this.idlePhase + i * 0.25) * motion.idleAmplitude;
      }
      const smooth = motion.smoothing ?? 0.42;
      this.displacements[i] += (target - this.displacements[i]) * smooth;
      attr.setX(i, this.displacements[i]);
      glowAttr.setX(i, this.displacements[i]);
    }
    attr.needsUpdate = true;
    glowAttr.needsUpdate = true;

    const innerScale = this.innerBaseRadius * (1 + bass * 0.4 * displayEnvelope + beat * 0.18);
    const innerPos = this.innerRing.geometry.getAttribute('position') as THREE.BufferAttribute;
    const innerArray = innerPos.array as Float32Array;
    for (let i = 0; i <= this.segments; i++) {
      const angle = (i / this.segments) * Math.PI * 2;
      innerArray[i * 3] = Math.cos(angle) * innerScale;
      innerArray[i * 3 + 2] = Math.sin(angle) * innerScale;
    }
    innerPos.needsUpdate = true;
    this.innerMaterial.opacity = 0.25 + bass * 0.35 + beat * 0.15;

    this.material.uniforms.uTime.value += delta;
    this.glowMaterial.uniforms.uTime.value += delta;
    this.line.rotation.y += delta * 0.12;
    this.glowLine.rotation.y = this.line.rotation.y;
  }

  dispose(): void {
    this.line.geometry.dispose();
    this.glowLine.geometry.dispose();
    this.material.dispose();
    this.glowMaterial.dispose();
    this.innerRing.geometry.dispose();
    this.innerMaterial.dispose();
    this.scene.remove(this.root);
  }
}
