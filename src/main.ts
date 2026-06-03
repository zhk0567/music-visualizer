import { AudioEngine } from './audio/AudioEngine';
import { Renderer } from './render/Renderer';
import { Controls } from './ui/Controls';
import { loadSettings, syncSettingsToUrl } from './utils/settings';
import { detectQuality } from './utils/quality';

function showError(message: string): void {
  const overlay = document.getElementById('error-overlay');
  const msg = document.getElementById('error-message');
  if (overlay && msg) {
    msg.textContent = message;
    overlay.classList.remove('hidden');
  }
}

function hideError(): void {
  document.getElementById('error-overlay')?.classList.add('hidden');
}

function setLoading(loading: boolean): void {
  const overlay = document.getElementById('loading-overlay');
  overlay?.classList.toggle('hidden', !loading);
}

function showToast(message: string): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  window.setTimeout(() => toast.classList.add('hidden'), 2800);
}

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (!checkWebGL()) {
    showError('您的浏览器不支持 WebGL，无法运行可视化效果。请使用 Chrome、Edge 或 Firefox 最新版。');
    return;
  }

  const app = document.getElementById('app');
  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  const controlsRoot = document.getElementById('controls-root');

  if (!app || !canvas || !controlsRoot) {
    showError('页面初始化失败');
    return;
  }

  document.getElementById('error-dismiss')?.addEventListener('click', hideError);

  const settings = loadSettings();
  if (!localStorage.getItem('music-visualizer-settings')) {
    settings.quality = detectQuality();
  }

  const engine = new AudioEngine();
  engine.setLoop(settings.loop);
  engine.setAnalyserPreset(settings.analyserPreset);

  const renderer = new Renderer(canvas);
  renderer.setAudioEngine(engine);
  renderer.setQuality(settings.quality);
  renderer.setSensitivity(settings.sensitivity);
  renderer.setBeatSensitivity(settings.beatSensitivity);
  renderer.setTheme(settings.theme);
  await renderer.setVisualizer(settings.visualizer);
  renderer.start();

  const controls = new Controls(controlsRoot, app, engine, renderer, {
    onLoadingChange: setLoading,
    onError: showError,
    onToast: showToast,
  });
  controls.applySettings(settings);
  syncSettingsToUrl(settings);

  const cleanup = (): void => {
    controls.dispose();
    renderer.dispose();
    engine.dispose();
  };

  window.addEventListener('pagehide', cleanup);
  window.addEventListener('beforeunload', cleanup);
}

void main();
