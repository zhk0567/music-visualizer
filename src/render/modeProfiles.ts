import type { ThemeName } from './themes';

export type VisualizerName = 'spectrum' | 'waveform' | 'particles' | 'polar';

export interface ModeMotionProfile {
  displayEnvelopeMin: number;
  attack: number;
  release: number;
  audioGain: number;
  beatGain: number;
  idleAmplitude: number;
  /** 波形：主层径向倍数 */
  radialMul?: number;
  /** 波形：光晕层径向倍数 */
  glowRadialMul?: number;
  /** 波形：位移平滑系数 */
  smoothing?: number;
  /** 粒子：力场倍率 */
  forceMultiplier?: number;
  /** 粒子：径向扩张倍率 */
  radialExpand?: number;
  /** 粒子：节拍爆发额外径向 kick */
  beatBurstKick?: number;
  /** 粒子：待机 opacity */
  idleOpacity?: number;
}

export interface ModeVisualProfile {
  fogDensity: number;
  camera: {
    baseY: number;
    baseZ: number;
    lookX: number;
    lookY: number;
    lookZ: number;
    sway: number;
    beatZoom: number;
    topDown?: boolean;
  };
  bloom: Record<ThemeName, number>;
}

export const MOTION_PROFILES: Record<VisualizerName, ModeMotionProfile> = {
  spectrum: {
    displayEnvelopeMin: 0.35,
    attack: 0.55,
    release: 0.12,
    audioGain: 7.5,
    beatGain: 0.65,
    idleAmplitude: 0.24,
  },
  waveform: {
    displayEnvelopeMin: 0.55,
    attack: 0.42,
    release: 0.42,
    audioGain: 1.35,
    beatGain: 0.35,
    idleAmplitude: 0.2,
    radialMul: 1.5,
    glowRadialMul: 2.2,
    smoothing: 0.42,
  },
  particles: {
    displayEnvelopeMin: 0.5,
    attack: 0.5,
    release: 0.2,
    audioGain: 1.35,
    beatGain: 0.75,
    idleAmplitude: 0,
    forceMultiplier: 1.5,
    radialExpand: 1.55,
    beatBurstKick: 0.42,
    idleOpacity: 0.12,
  },
  polar: {
    displayEnvelopeMin: 0.35,
    attack: 0.55,
    release: 0.12,
    audioGain: 7,
    beatGain: 0.65,
    idleAmplitude: 0.26,
  },
};

export const MODE_PROFILES: Record<VisualizerName, ModeVisualProfile> = {
  spectrum: {
    fogDensity: 0,
    camera: { baseY: 3, baseZ: 8, lookX: 0, lookY: 1, lookZ: 0, sway: 0.35, beatZoom: 0.02 },
    bloom: { neon: 1.0, sunset: 1.1, mono: 0.7 },
  },
  waveform: {
    fogDensity: 0,
    camera: { baseY: 2.5, baseZ: 7, lookX: 0, lookY: 0.5, lookZ: 0, sway: 0.4, beatZoom: 0.02 },
    bloom: { neon: 1.1, sunset: 1.2, mono: 0.7 },
  },
  particles: {
    fogDensity: 0,
    camera: { baseY: 3.5, baseZ: 9, lookX: 0, lookY: 0.5, lookZ: 0, sway: 0.25, beatZoom: 0.02 },
    bloom: { neon: 1.05, sunset: 1.15, mono: 0.75 },
  },
  polar: {
    fogDensity: 0,
    camera: {
      baseY: 6.5,
      baseZ: 5.5,
      lookX: 0,
      lookY: 0,
      lookZ: 0,
      sway: 0.3,
      beatZoom: 0.04,
    },
    bloom: { neon: 1.0, sunset: 1.1, mono: 0.72 },
  },
};

export function getMotionProfile(mode: VisualizerName): ModeMotionProfile {
  return MOTION_PROFILES[mode];
}

export function getBloomStrength(mode: VisualizerName, theme: ThemeName): number {
  return MODE_PROFILES[mode].bloom[theme];
}

export function getFogDensity(mode: VisualizerName): number {
  return MODE_PROFILES[mode].fogDensity;
}

export function smoothToward(
  current: number,
  target: number,
  attack: number,
  release: number,
): number {
  const rate = target > current ? attack : release;
  return current + (target - current) * rate;
}
