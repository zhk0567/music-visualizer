import type { VisualizerName } from '../render/modeProfiles';
import type { ThemeName } from '../render/themes';
import type { QualityLevel } from './quality';
import type { AnalyserPreset } from './settings';
import { normalizeSettings, type AppSettings } from './settings';

export interface NamedPreset {
  name: string;
  visualizer: VisualizerName;
  theme: ThemeName;
  quality: QualityLevel;
  sensitivity: number;
  beatSensitivity?: number;
  loop?: boolean;
  analyserPreset?: AnalyserPreset;
}

const STORAGE_KEY = 'music-visualizer-presets';

export function loadPresets(): NamedPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is NamedPreset => {
        if (typeof item !== 'object' || item === null) return false;
        const p = item as Record<string, unknown>;
        return typeof p.name === 'string' && p.name.length > 0;
      })
      .map((item) => {
        const normalized = normalizeSettings(item);
        const record = item as unknown as Record<string, unknown>;
        return {
          name: item.name,
          visualizer: normalized.visualizer,
          theme: normalized.theme,
          quality: normalized.quality,
          sensitivity: normalized.sensitivity,
          beatSensitivity: normalized.beatSensitivity,
          loop: typeof record.loop === 'boolean' ? record.loop : normalized.loop,
          analyserPreset:
            typeof record.analyserPreset === 'string'
              ? normalized.analyserPreset
              : normalized.analyserPreset,
        };
      });
  } catch {
    return [];
  }
}

export function savePresets(presets: NamedPreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function addPreset(name: string, settings: AppSettings): NamedPreset[] {
  const presets = loadPresets().filter((p) => p.name !== name);
  presets.push({
    name,
    visualizer: settings.visualizer,
    theme: settings.theme,
    quality: settings.quality,
    sensitivity: settings.sensitivity,
    beatSensitivity: settings.beatSensitivity,
    loop: settings.loop,
    analyserPreset: settings.analyserPreset,
  });
  savePresets(presets);
  return presets;
}

export function deletePreset(name: string): NamedPreset[] {
  const presets = loadPresets().filter((p) => p.name !== name);
  savePresets(presets);
  return presets;
}
