import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addPreset, deletePreset, loadPresets } from '../src/utils/presets';
import type { AppSettings } from '../src/utils/settings';

const STORAGE_KEY = 'music-visualizer-presets';

const sampleSettings: AppSettings = {
  volume: 0.8,
  sensitivity: 1.5,
  beatSensitivity: 1.6,
  visualizer: 'polar',
  theme: 'sunset',
  muted: false,
  loop: false,
  quality: 'high',
  analyserPreset: 'responsive',
};

describe('presets', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
    });
    localStorage.setItem(STORAGE_KEY, '[]');
  });

  it('addPreset stores beatSensitivity', () => {
    addPreset('Test', sampleSettings);
    const presets = loadPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe('Test');
    expect(presets[0].visualizer).toBe('polar');
    expect(presets[0].beatSensitivity).toBe(1.6);
    expect(presets[0].analyserPreset).toBe('responsive');
  });

  it('deletePreset removes by name', () => {
    addPreset('Keep', sampleSettings);
    addPreset('Remove', { ...sampleSettings, visualizer: 'waveform' });
    deletePreset('Remove');
    const names = loadPresets().map((p) => p.name);
    expect(names).toEqual(['Keep']);
  });

  it('addPreset replaces same name', () => {
    addPreset('Dup', sampleSettings);
    addPreset('Dup', { ...sampleSettings, beatSensitivity: 0.9 });
    const presets = loadPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].beatSensitivity).toBe(0.9);
  });
});
