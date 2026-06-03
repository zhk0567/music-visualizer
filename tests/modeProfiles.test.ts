import { describe, it, expect } from 'vitest';
import {
  MOTION_PROFILES,
  smoothToward,
  type VisualizerName,
} from '../src/render/modeProfiles';

const MODES: VisualizerName[] = ['spectrum', 'waveform', 'particles', 'polar'];

describe('smoothToward', () => {
  it('moves toward target using attack when rising', () => {
    const next = smoothToward(0, 1, 0.5, 0.1);
    expect(next).toBe(0.5);
  });

  it('moves toward target using release when falling', () => {
    const next = smoothToward(1, 0, 0.5, 0.2);
    expect(next).toBeCloseTo(0.8);
  });

  it('reaches target when rates are 1', () => {
    expect(smoothToward(0.2, 0.9, 1, 1)).toBeCloseTo(0.9);
  });
});

describe('MOTION_PROFILES', () => {
  it('defines required fields for every mode', () => {
    for (const mode of MODES) {
      const profile = MOTION_PROFILES[mode];
      expect(profile.displayEnvelopeMin).toBeGreaterThan(0);
      expect(profile.attack).toBeGreaterThan(0);
      expect(profile.release).toBeGreaterThan(0);
      expect(profile.audioGain).toBeGreaterThan(0);
      expect(profile.beatGain).toBeGreaterThanOrEqual(0);
      expect(profile.idleAmplitude).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives waveform radial multipliers', () => {
    expect(MOTION_PROFILES.waveform.radialMul).toBeDefined();
    expect(MOTION_PROFILES.waveform.glowRadialMul).toBeDefined();
  });

  it('gives particles burst and idle opacity', () => {
    expect(MOTION_PROFILES.particles.beatBurstKick).toBeDefined();
    expect(MOTION_PROFILES.particles.idleOpacity).toBeDefined();
  });
});
