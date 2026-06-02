export type QualityLevel = 'low' | 'medium' | 'high';

export const PARTICLE_COUNTS: Record<QualityLevel, number> = {
  low: 2000,
  medium: 3500,
  high: 5000,
};

export const BAR_COUNTS: Record<QualityLevel, number> = {
  low: 64,
  medium: 96,
  high: 128,
};

export const SEGMENT_COUNTS: Record<QualityLevel, number> = {
  low: 128,
  medium: 192,
  high: 256,
};

export const MAX_DPR: Record<QualityLevel, number> = {
  low: 1,
  medium: 1.5,
  high: 2,
};

export const QUALITY_LABELS: Record<QualityLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export const QUALITY_LIST: QualityLevel[] = ['low', 'medium', 'high'];

export function detectQuality(): QualityLevel {
  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio ?? 1;
  if (cores <= 4 || dpr > 2) return 'low';
  if (cores >= 8 && dpr <= 1.5) return 'high';
  return 'medium';
}

export function getParticleCount(quality: QualityLevel): number {
  return PARTICLE_COUNTS[quality];
}

export function getBarCount(quality: QualityLevel): number {
  return BAR_COUNTS[quality];
}

export function getSegmentCount(quality: QualityLevel): number {
  return SEGMENT_COUNTS[quality];
}

export function getMaxDpr(quality: QualityLevel): number {
  return MAX_DPR[quality];
}

export function shouldUseBloom(quality: QualityLevel): boolean {
  return quality !== 'low';
}

export function shouldUseAntialias(quality: QualityLevel): boolean {
  return quality !== 'low';
}
