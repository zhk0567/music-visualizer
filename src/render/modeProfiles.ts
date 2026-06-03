import type { ThemeName } from './themes';

export type VisualizerName = 'spectrum' | 'waveform' | 'particles' | 'polar';

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

export const MODE_PROFILES: Record<VisualizerName, ModeVisualProfile> = {
  spectrum: {
    fogDensity: 0.028,
    camera: { baseY: 3, baseZ: 8, lookX: 0, lookY: 1, lookZ: 0, sway: 0.35, beatZoom: 0 },
    bloom: { neon: 1.05, sunset: 1.15, mono: 0.65 },
  },
  waveform: {
    fogDensity: 0.035,
    camera: { baseY: 2.5, baseZ: 7, lookX: 0, lookY: 0.5, lookZ: 0, sway: 0.4, beatZoom: 0.02 },
    bloom: { neon: 1.1, sunset: 1.2, mono: 0.7 },
  },
  particles: {
    fogDensity: 0.04,
    camera: { baseY: 3, baseZ: 10, lookX: 0, lookY: 1, lookZ: 0, sway: 0.5, beatZoom: 0.05 },
    bloom: { neon: 1.2, sunset: 1.25, mono: 0.75 },
  },
  polar: {
    fogDensity: 0.032,
    camera: {
      baseY: 9,
      baseZ: 0.01,
      lookX: 0,
      lookY: 0,
      lookZ: 0,
      sway: 0.25,
      beatZoom: 0.02,
      topDown: true,
    },
    bloom: { neon: 1.08, sunset: 1.15, mono: 0.68 },
  },
};

export function getBloomStrength(mode: VisualizerName, theme: ThemeName): number {
  return MODE_PROFILES[mode].bloom[theme];
}

export function getFogDensity(mode: VisualizerName): number {
  return MODE_PROFILES[mode].fogDensity;
}
