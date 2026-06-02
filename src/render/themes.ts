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
    accent: 0x648cff,
    ambient: 0x404060,
    pointLight: 0x648cff,
    fog: 0x0a0a0f,
    hueStart: 0.55,
    hueRange: 0.7,
    saturation: 0.9,
    background: 0x0a0a0f,
  },
  sunset: {
    name: 'sunset',
    label: '日落',
    accent: 0xff6b35,
    ambient: 0x402020,
    pointLight: 0xff8844,
    fog: 0x0f0808,
    hueStart: 0.02,
    hueRange: 0.12,
    saturation: 0.85,
    background: 0x0f0808,
  },
  mono: {
    name: 'mono',
    label: '极简',
    accent: 0xcccccc,
    ambient: 0x303030,
    pointLight: 0xffffff,
    fog: 0x080808,
    hueStart: 0,
    hueRange: 0,
    saturation: 0,
    background: 0x080808,
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
