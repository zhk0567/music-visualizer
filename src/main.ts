import { AudioEngine } from './audio/AudioEngine';
import { Renderer } from './render/Renderer';
import { Controls } from './ui/Controls';

function showError(message: string): void {
  const overlay = document.getElementById('error-overlay');
  const msg = document.getElementById('error-message');
  if (overlay && msg) {
    msg.textContent = message;
    overlay.classList.remove('hidden');
  }
}

function setLoading(loading: boolean): void {
  const overlay = document.getElementById('loading-overlay');
  overlay?.classList.toggle('hidden', !loading);
}

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function main(): void {
  if (!checkWebGL()) {
    showError('您的浏览器不支持 WebGL，无法运行可视化效果。请使用 Chrome、Edge 或 Firefox 最新版。');
    return;
  }

  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  const controlsRoot = document.getElementById('controls-root');

  if (!canvas || !controlsRoot) {
    showError('页面初始化失败');
    return;
  }

  const engine = new AudioEngine();
  const renderer = new Renderer(canvas);
  renderer.setAudioEngine(engine);
  renderer.setVisualizer('spectrum');
  renderer.start();

  new Controls(controlsRoot, engine, renderer, {
    onLoadingChange: setLoading,
    onError: showError,
  });
}

main();
