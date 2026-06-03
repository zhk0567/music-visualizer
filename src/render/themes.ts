export type ThemeName = 'neon' | 'sunset' | 'mono';

export interface ThemeColors {
  name: ThemeName;
  label: string;
  accent: number;
  ambient: number;
  pointLight: number;
  skyLight: number;
  groundLight: number;
  fog: number;
  hueStart: number;
  hueRange: number;
  saturation: number;
  background: number;
  /** 渐变背景顶色（比 background 更亮） */
  skyGradient: number;
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  neon: {
    name: 'neon',
    label: '霓虹',
    accent: 0xa8d4ff,
    ambient: 0x9090c8,
    pointLight: 0xc8e0ff,
    skyLight: 0xb8d0ff,
    groundLight: 0x6868b0,
    fog: 0x5858a8,
    hueStart: 0.5,
    hueRange: 0.78,
    saturation: 0.88,
    background: 0x5858a8,
    skyGradient: 0x8898e8,
  },
  sunset: {
    name: 'sunset',
    label: '日落',
    accent: 0xffb080,
    ambient: 0xc08060,
    pointLight: 0xffcc99,
    skyLight: 0xffaa88,
    groundLight: 0xa05840,
    fog: 0x905040,
    hueStart: 0.04,
    hueRange: 0.12,
    saturation: 0.85,
    background: 0x905040,
    skyGradient: 0xd87858,
  },
  mono: {
    name: 'mono',
    label: '极简',
    accent: 0xf8f8ff,
    ambient: 0x9898b8,
    pointLight: 0xffffff,
    skyLight: 0xc8c8e0,
    groundLight: 0x787890,
    fog: 0x686880,
    hueStart: 0.58,
    hueRange: 0.18,
    saturation: 0.35,
    background: 0x686880,
    skyGradient: 0x9898b0,
  },
};

export const THEME_LIST: ThemeName[] = ['neon', 'sunset', 'mono'];

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}
