export type ThemeName = 'neon' | 'sunset' | 'mono';

export interface ThemeColors {
  name: ThemeName;
  label: string;
  accent: number;
  ambient: number;
  pointLight: number;
  fog: number;
  hueStart: number;
  hueRange: number;
  saturation: number;
  background: number;
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  neon: {
    name: 'neon',
    label: '霓虹',
    accent: 0x7aa8ff,
    ambient: 0x404060,
    pointLight: 0x648cff,
    fog: 0x1a1a38,
    hueStart: 0.52,
    hueRange: 0.75,
    saturation: 0.95,
    background: 0x12122a,
  },
  sunset: {
    name: 'sunset',
    label: '日落',
    accent: 0xff7a45,
    ambient: 0x402020,
    pointLight: 0xff8844,
    fog: 0x2a1410,
    hueStart: 0.02,
    hueRange: 0.14,
    saturation: 0.9,
    background: 0x1a0c08,
  },
  mono: {
    name: 'mono',
    label: '极简',
    accent: 0xe8e8ff,
    ambient: 0x303030,
    pointLight: 0xffffff,
    fog: 0x1a1a22,
    hueStart: 0.58,
    hueRange: 0.2,
    saturation: 0.35,
    background: 0x101018,
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
