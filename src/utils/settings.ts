import type { VisualizerName } from '../render/Renderer';
import type { ThemeName } from '../render/themes';
import { THEME_LIST } from '../render/themes';
import type { QualityLevel } from './quality';

export type AnalyserPreset = 'responsive' | 'smooth';

export interface AppSettings {
  volume: number;
  sensitivity: number;
  visualizer: VisualizerName;
  theme: ThemeName;
  muted: boolean;
  loop: boolean;
  quality: QualityLevel;
  analyserPreset: AnalyserPreset;
}

const STORAGE_KEY = 'music-visualizer-settings';

const VISUALIZERS: VisualizerName[] = ['spectrum', 'waveform', 'particles'];
const PRESETS: AnalyserPreset[] = ['responsive', 'smooth'];
const QUALITIES: QualityLevel[] = ['low', 'medium', 'high'];

const DEFAULTS: AppSettings = {
  volume: 0.8,
  sensitivity: 1.5,
  visualizer: 'spectrum',
  theme: 'neon',
  muted: false,
  loop: true,
  quality: 'medium',
  analyserPreset: 'smooth',
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function pickEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === 'string' && (allowed as string[]).includes(value) ? (value as T) : fallback;
}

export function normalizeSettings(raw: unknown): AppSettings {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    volume: clamp(obj.volume, 0, 1, DEFAULTS.volume),
    sensitivity: clamp(obj.sensitivity, 0.5, 3, DEFAULTS.sensitivity),
    visualizer: pickEnum(obj.visualizer, VISUALIZERS, DEFAULTS.visualizer),
    theme: pickEnum(obj.theme, THEME_LIST, DEFAULTS.theme),
    muted: typeof obj.muted === 'boolean' ? obj.muted : DEFAULTS.muted,
    loop: typeof obj.loop === 'boolean' ? obj.loop : DEFAULTS.loop,
    quality: pickEnum(obj.quality, QUALITIES, DEFAULTS.quality),
    analyserPreset: pickEnum(obj.analyserPreset, PRESETS, DEFAULTS.analyserPreset),
  };
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const fromUrl = readSettingsFromUrl();
    if (!raw) return normalizeSettings(fromUrl ?? DEFAULTS);
    return normalizeSettings({ ...JSON.parse(raw), ...fromUrl });
  } catch {
    return normalizeSettings(readSettingsFromUrl() ?? DEFAULTS);
  }
}

export function saveSettings(settings: Partial<AppSettings>): void {
  const current = loadSettings();
  const merged = normalizeSettings({ ...current, ...settings });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      syncSettingsToUrl(merged);
    } catch {
      // ignore quota errors
    }
  }, 300);
}

export function readSettingsFromUrl(): Partial<AppSettings> | null {
  const params = new URLSearchParams(window.location.search);
  if ([...params.keys()].length === 0) return null;

  const partial: Partial<AppSettings> = {};
  const mode = params.get('mode');
  const theme = params.get('theme');
  const quality = params.get('quality');

  if (mode) partial.visualizer = mode as VisualizerName;
  if (theme) partial.theme = theme as ThemeName;
  if (quality) partial.quality = quality as QualityLevel;

  return partial;
}

export function syncSettingsToUrl(settings: AppSettings): void {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', settings.visualizer);
  url.searchParams.set('theme', settings.theme);
  url.searchParams.set('quality', settings.quality);
  window.history.replaceState({}, '', url);
}
