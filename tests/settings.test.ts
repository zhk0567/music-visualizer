import { describe, it, expect } from 'vitest';
import { normalizeSettings, readSettingsFromUrl } from '../src/utils/settings';

describe('normalizeSettings', () => {
  it('uses defaults for empty input', () => {
    const s = normalizeSettings({});
    expect(s.visualizer).toBe('spectrum');
    expect(s.theme).toBe('neon');
    expect(s.quality).toBe('medium');
    expect(s.loop).toBe(true);
    expect(s.beatSensitivity).toBe(1);
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

  it('clamps beatSensitivity', () => {
    expect(normalizeSettings({ beatSensitivity: 0.1 }).beatSensitivity).toBe(0.5);
    expect(normalizeSettings({ beatSensitivity: 3 }).beatSensitivity).toBe(2);
    expect(normalizeSettings({ beatSensitivity: 1.4 }).beatSensitivity).toBe(1.4);
  });

  it('accepts polar visualizer', () => {
    expect(normalizeSettings({ visualizer: 'polar' }).visualizer).toBe('polar');
  });

  it('accepts valid partial settings', () => {
    const s = normalizeSettings({
      visualizer: 'waveform',
      theme: 'sunset',
      quality: 'low',
      loop: false,
      analyserPreset: 'responsive',
      beatSensitivity: 1.8,
    });
    expect(s.visualizer).toBe('waveform');
    expect(s.theme).toBe('sunset');
    expect(s.quality).toBe('low');
    expect(s.loop).toBe(false);
    expect(s.analyserPreset).toBe('responsive');
    expect(s.beatSensitivity).toBe(1.8);
  });
});

describe('readSettingsFromUrl', () => {
  it('returns null for empty query', () => {
    expect(readSettingsFromUrl('')).toBeNull();
  });

  it('parses beat parameter', () => {
    const partial = readSettingsFromUrl('?mode=particles&beat=1.6');
    expect(partial?.visualizer).toBe('particles');
    expect(partial?.beatSensitivity).toBe(1.6);
  });

  it('clamps beat from URL', () => {
    expect(readSettingsFromUrl('?beat=5')?.beatSensitivity).toBe(2);
  });
});
