import { describe, it, expect } from 'vitest';
import { normalizeSettings } from '../src/utils/settings';

describe('normalizeSettings', () => {
  it('uses defaults for empty input', () => {
    const s = normalizeSettings({});
    expect(s.visualizer).toBe('spectrum');
    expect(s.theme).toBe('neon');
    expect(s.quality).toBe('medium');
    expect(s.loop).toBe(true);
  });

  it('rejects invalid visualizer', () => {
    expect(normalizeSettings({ visualizer: 'invalid' }).visualizer).toBe('spectrum');
  });

  it('rejects invalid theme', () => {
    expect(normalizeSettings({ theme: 'bad' }).theme).toBe('neon');
  });

  it('rejects invalid quality', () => {
    expect(normalizeSettings({ quality: 'ultra' }).quality).toBe('medium');
  });

  it('clamps volume and sensitivity', () => {
    const s = normalizeSettings({ volume: 2, sensitivity: 10 });
    expect(s.volume).toBe(1);
    expect(s.sensitivity).toBe(3);
  });

  it('accepts valid partial settings', () => {
    const s = normalizeSettings({
      visualizer: 'waveform',
      theme: 'sunset',
      quality: 'low',
      loop: false,
      analyserPreset: 'responsive',
    });
    expect(s.visualizer).toBe('waveform');
    expect(s.theme).toBe('sunset');
    expect(s.quality).toBe('low');
    expect(s.loop).toBe(false);
    expect(s.analyserPreset).toBe('responsive');
  });
});
