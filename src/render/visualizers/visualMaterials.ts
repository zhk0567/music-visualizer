import * as THREE from 'three';

/** 柱体主体 — 珠光 Phong，配合顶点色呈现糖果质感 */
export function createBarBodyMaterial(): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color: 0xffffff,
    vertexColors: true,
    specular: new THREE.Color(0xffffff),
    shininess: 90,
    emissive: new THREE.Color(0x334466),
    emissiveIntensity: 0.55,
    fog: false,
    flatShading: false,
  });
}

/** 柱体顶帽 — 更高 emissive，节拍时更亮 */
export function createBarCapMaterial(): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color: 0xffffff,
    vertexColors: true,
    specular: new THREE.Color(0xffffff),
    shininess: 120,
    emissive: new THREE.Color(0x445588),
    emissiveIntensity: 0.75,
    fog: false,
  });
}

/** 装饰环 / 光晕 */
export function createAccentGlowMaterial(accent: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/** 中心 hub 等实体装饰 */
export function createAccentSolidMaterial(accent: number): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.45,
    specular: 0xffffff,
    shininess: 60,
    fog: false,
  });
}

const gradientCache = new Map<string, THREE.CanvasTexture>();

export function createThemeGradientBackground(skyHex: number, groundHex: number): THREE.CanvasTexture {
  const key = `${skyHex}-${groundHex}`;
  const cached = gradientCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const sky = `#${skyHex.toString(16).padStart(6, '0')}`;
  const ground = `#${groundHex.toString(16).padStart(6, '0')}`;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, sky);
  grad.addColorStop(0.55, ground);
  grad.addColorStop(1, ground);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  gradientCache.set(key, tex);
  return tex;
}
