import type { AudioEngine } from '../audio/AudioEngine';
import type { Renderer, VisualizerName } from '../render/Renderer';
import type { ThemeName } from '../render/themes';
import { THEMES, THEME_LIST } from '../render/themes';
import type { AnalyserPreset, AppSettings } from '../utils/settings';
import { saveSettings } from '../utils/settings';
import type { QualityLevel } from '../utils/quality';
import { QUALITY_LABELS, QUALITY_LIST } from '../utils/quality';

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.webm'];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true;
  const lower = file.name.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export interface ControlsCallbacks {
  onLoadingChange?: (loading: boolean) => void;
  onError?: (message: string) => void;
}

export class Controls {
  private root: HTMLElement;
  private app: HTMLElement;
  private engine: AudioEngine;
  private renderer: Renderer;
  private fileInput: HTMLInputElement;
  private fileBtn: HTMLButtonElement;
  private micBtn: HTMLButtonElement;
  private muteBtn: HTMLButtonElement;
  private loopBtn: HTMLButtonElement;
  private playBtn: HTMLButtonElement;
  private progressBar: HTMLInputElement;
  private volumeSlider: HTMLInputElement;
  private sensitivitySlider: HTMLInputElement;
  private qualitySelect: HTMLSelectElement;
  private timeDisplay: HTMLElement;
  private sourceLabel: HTMLElement;
  private emptyState: HTMLElement | null;
  private demoBtn: HTMLButtonElement | null;
  private panel: HTMLElement;
  private modeButtons: Map<VisualizerName, HTMLButtonElement> = new Map();
  private themeButtons: Map<ThemeName, HTMLButtonElement> = new Map();
  private hideTimer: number | null = null;
  private isSeeking = false;
  private onLoadingChange?: (loading: boolean) => void;
  private onError?: (message: string) => void;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onMouseMove: () => void;
  private onDragOver: (e: DragEvent) => void;
  private onDragLeave: () => void;
  private onDrop: (e: DragEvent) => void;
  private onProgressPointerDown: () => void;
  private onProgressPointerUp: () => void;
  private tickCallback: (delta: number) => void;
  private unsubscribePlayback: (() => void) | null = null;
  private helpOverlay: HTMLElement | null;

  constructor(
    root: HTMLElement,
    app: HTMLElement,
    engine: AudioEngine,
    renderer: Renderer,
    callbacks?: ControlsCallbacks,
  ) {
    this.root = root;
    this.app = app;
    this.engine = engine;
    this.renderer = renderer;
    this.onLoadingChange = callbacks?.onLoadingChange;
    this.onError = callbacks?.onError;
    this.emptyState = document.getElementById('empty-state');
    this.demoBtn = document.getElementById('demo-btn') as HTMLButtonElement | null;
    this.helpOverlay = document.getElementById('help-overlay');

    this.root.innerHTML = '';
    this.panel = document.createElement('div');
    this.panel.className = 'controls-panel';

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.id = 'file-input';
    this.fileInput.accept = 'audio/*';
    this.fileInput.className = 'file-input-hidden';
    this.fileInput.setAttribute('aria-label', '选择音频文件');

    this.fileBtn = this.createButton('选择文件', () => this.fileInput.click());
    this.micBtn = this.createButton('麦克风', () => void this.handleMic());
    this.loopBtn = this.createButton('循环', () => this.toggleLoop());
    this.muteBtn = this.createButton('静音', () => this.toggleMute());

    this.playBtn = document.createElement('button');
    this.playBtn.className = 'btn btn-primary';
    this.playBtn.textContent = '▶';
    this.playBtn.setAttribute('aria-label', '播放或暂停');
    this.playBtn.addEventListener('click', () => void this.togglePlay());

    const changeBtn = this.createButton('更换', () => this.changeAudio());
    const fullscreenBtn = this.createButton('全屏', () => this.toggleFullscreen());
    const screenshotBtn = this.createButton('截图', () => this.takeScreenshot());

    this.progressBar = document.createElement('input');
    this.progressBar.type = 'range';
    this.progressBar.className = 'progress-bar';
    this.progressBar.min = '0';
    this.progressBar.max = '100';
    this.progressBar.value = '0';
    this.progressBar.setAttribute('aria-label', '播放进度');
    this.progressBar.addEventListener('input', () => this.handleSeek());
    this.onProgressPointerDown = () => { this.isSeeking = true; };
    this.onProgressPointerUp = () => { this.isSeeking = false; };
    this.progressBar.addEventListener('pointerdown', this.onProgressPointerDown);
    this.progressBar.addEventListener('pointerup', this.onProgressPointerUp);

    this.timeDisplay = document.createElement('span');
    this.timeDisplay.className = 'time-display';
    this.timeDisplay.textContent = '0:00 / 0:00';

    this.sourceLabel = document.createElement('div');
    this.sourceLabel.className = 'source-label';
    this.sourceLabel.textContent = '未选择音频';

    this.volumeSlider = document.createElement('input');
    this.volumeSlider.type = 'range';
    this.volumeSlider.min = '0';
    this.volumeSlider.max = '100';
    this.volumeSlider.value = '80';
    this.volumeSlider.addEventListener('input', () => {
      const vol = Number(this.volumeSlider.value) / 100;
      this.engine.setVolume(vol);
      saveSettings({ volume: vol });
    });

    this.sensitivitySlider = document.createElement('input');
    this.sensitivitySlider.type = 'range';
    this.sensitivitySlider.min = '0.5';
    this.sensitivitySlider.max = '3';
    this.sensitivitySlider.step = '0.1';
    this.sensitivitySlider.value = '1.5';
    this.sensitivitySlider.addEventListener('input', () => {
      const sens = Number(this.sensitivitySlider.value);
      this.renderer.setSensitivity(sens);
      saveSettings({ sensitivity: sens });
    });

    this.qualitySelect = document.createElement('select');
    this.qualitySelect.className = 'btn quality-select';
    this.qualitySelect.setAttribute('aria-label', '画质档位');
    for (const q of QUALITY_LIST) {
      const opt = document.createElement('option');
      opt.value = q;
      opt.textContent = `画质: ${QUALITY_LABELS[q]}`;
      this.qualitySelect.appendChild(opt);
    }
    this.qualitySelect.addEventListener('change', () => {
      const quality = this.qualitySelect.value as QualityLevel;
      this.renderer.setQuality(quality);
      const preset: AnalyserPreset = quality === 'low' ? 'responsive' : 'smooth';
      this.engine.setAnalyserPreset(preset);
      saveSettings({ quality, analyserPreset: preset });
    });

    const row0 = document.createElement('div');
    row0.className = 'controls-row center';
    row0.appendChild(this.sourceLabel);

    const row1 = document.createElement('div');
    row1.className = 'controls-row center';
    row1.append(this.fileBtn, this.micBtn, this.playBtn, this.loopBtn, this.muteBtn, changeBtn);

    const row1b = document.createElement('div');
    row1b.className = 'controls-row center';
    row1b.append(fullscreenBtn, screenshotBtn, this.qualitySelect);

    const row2 = document.createElement('div');
    row2.className = 'controls-row';
    row2.append(this.timeDisplay, this.progressBar);

    const row3 = document.createElement('div');
    row3.className = 'controls-row';
    row3.append(
      this.createSliderGroup('音量', this.volumeSlider),
      this.createSliderGroup('灵敏度', this.sensitivitySlider),
    );

    const row4 = document.createElement('div');
    row4.className = 'controls-row center';
    const modeTabs = document.createElement('div');
    modeTabs.className = 'mode-tabs';
    for (const mode of [
      { name: 'spectrum' as const, label: '频谱' },
      { name: 'waveform' as const, label: '波形' },
      { name: 'particles' as const, label: '粒子' },
    ]) {
      const btn = this.createButton(mode.label, () => this.setMode(mode.name));
      this.modeButtons.set(mode.name, btn);
      modeTabs.appendChild(btn);
    }
    row4.appendChild(modeTabs);

    const row5 = document.createElement('div');
    row5.className = 'controls-row center';
    const themeTabs = document.createElement('div');
    themeTabs.className = 'mode-tabs';
    for (const themeName of THEME_LIST) {
      const btn = this.createButton(THEMES[themeName].label, () => this.setTheme(themeName));
      this.themeButtons.set(themeName, btn);
      themeTabs.appendChild(btn);
    }
    row5.appendChild(themeTabs);

    this.panel.append(row0, row1, row1b, row2, row3, row4, row5);
    this.root.append(this.fileInput, this.panel);

    this.fileInput.addEventListener('change', () => void this.handleFileSelect());

    this.onKeyDown = (e) => this.handleKeyDown(e);
    document.addEventListener('keydown', this.onKeyDown);
    this.onMouseMove = () => this.showControls();
    document.addEventListener('mousemove', this.onMouseMove);

    this.onDragOver = (e) => {
      e.preventDefault();
      this.app.classList.add('drag-over');
    };
    this.onDragLeave = () => this.app.classList.remove('drag-over');
    this.onDrop = (e) => {
      e.preventDefault();
      this.app.classList.remove('drag-over');
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      if (!isAudioFile(file)) {
        this.onError?.('请拖放音频文件（mp3、wav、ogg 等）');
        return;
      }
      void this.loadFile(file);
    };
    this.app.addEventListener('dragover', this.onDragOver);
    this.app.addEventListener('dragleave', this.onDragLeave);
    this.app.addEventListener('drop', this.onDrop);

    this.emptyState?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'demo-btn') return;
      this.fileInput.click();
    });
    this.demoBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      void this.loadDemo();
    });

    this.tickCallback = () => this.updateProgress();
    this.renderer.onTick(this.tickCallback);

    this.unsubscribePlayback = this.engine.onPlaybackStateChange((event) => {
      if (event === 'ended' || event === 'paused') {
        this.playBtn.textContent = '▶';
      } else if (event === 'playing') {
        this.playBtn.textContent = '⏸';
      }
    });

    document.getElementById('help-dismiss')?.addEventListener('click', () => {
      this.helpOverlay?.classList.add('hidden');
    });

    this.resetHideTimer();
  }

  applySettings(settings: AppSettings): void {
    this.volumeSlider.value = String(Math.round(settings.volume * 100));
    this.engine.setVolume(settings.volume);
    this.sensitivitySlider.value = String(settings.sensitivity);
    this.renderer.setSensitivity(settings.sensitivity);
    this.engine.setLoop(settings.loop);
    this.loopBtn.classList.toggle('active', settings.loop);
    this.engine.setAnalyserPreset(settings.analyserPreset);
    this.qualitySelect.value = settings.quality;
    this.renderer.setQuality(settings.quality);
    this.setMode(settings.visualizer, false);
    this.setTheme(settings.theme, false);
    if (settings.muted) {
      this.engine.setMuted(true);
      this.muteBtn.classList.add('active');
      this.muteBtn.textContent = '取消静音';
    }
  }

  private createButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private createSliderGroup(label: string, input: HTMLInputElement): HTMLElement {
    const group = document.createElement('div');
    group.className = 'slider-group';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    group.append(lbl, input);
    return group;
  }

  private async handleFileSelect(): Promise<void> {
    const file = this.fileInput.files?.[0];
    if (!file) return;
    if (!isAudioFile(file)) {
      this.onError?.('请选择有效的音频文件');
      return;
    }
    await this.loadFile(file);
  }

  private async loadFile(file: File): Promise<void> {
    this.onLoadingChange?.(true);
    try {
      await this.engine.ensureContext();
      await this.engine.loadFile(file);
      await this.engine.play();
      this.onSourceReady('file');
    } catch (err) {
      this.onError?.(err instanceof Error ? err.message : '加载音频失败');
    } finally {
      this.onLoadingChange?.(false);
    }
  }

  private async loadDemo(): Promise<void> {
    this.onLoadingChange?.(true);
    try {
      await this.engine.ensureContext();
      try {
        await this.engine.loadFromUrl('/demo.mp3', '示例曲目');
      } catch {
        await this.engine.loadDemoTone();
      }
      await this.engine.play();
      this.onSourceReady('file');
    } catch (err) {
      this.onError?.(err instanceof Error ? err.message : '加载示例失败');
    } finally {
      this.onLoadingChange?.(false);
    }
  }

  private onSourceReady(source: 'file' | 'mic'): void {
    this.playBtn.textContent = '⏸';
    this.fileBtn.classList.toggle('active', source === 'file');
    this.micBtn.classList.toggle('active', source === 'mic');
    this.progressBar.disabled = source === 'mic';
    this.updateSourceLabel();
    this.hideEmptyState();
  }

  private async handleMic(): Promise<void> {
    try {
      await this.engine.switchToMic();
      this.onSourceReady('mic');
    } catch (err) {
      this.onError?.(err instanceof Error ? err.message : '麦克风启动失败');
    }
  }

  private async togglePlay(): Promise<void> {
    try {
      await this.engine.ensureContext();
      if (this.engine.getIsPlaying()) {
        this.engine.pause();
        this.playBtn.textContent = '▶';
      } else {
        await this.engine.play();
        this.playBtn.textContent = '⏸';
      }
    } catch (err) {
      this.onError?.(err instanceof Error ? err.message : '播放失败');
    }
  }

  private toggleLoop(): void {
    const next = !this.engine.getLoop();
    this.engine.setLoop(next);
    this.loopBtn.classList.toggle('active', next);
    saveSettings({ loop: next });
  }

  private toggleMute(): void {
    const muted = this.engine.toggleMute();
    this.muteBtn.classList.toggle('active', muted);
    this.muteBtn.textContent = muted ? '取消静音' : '静音';
    saveSettings({ muted });
  }

  private changeAudio(): void {
    this.engine.reset();
    this.playBtn.textContent = '▶';
    this.fileBtn.classList.remove('active');
    this.micBtn.classList.remove('active');
    this.sourceLabel.textContent = '未选择音频';
    this.progressBar.value = '0';
    this.progressBar.disabled = true;
    this.emptyState?.classList.remove('hidden');
  }

  private handleSeek(): void {
    if (this.engine.getSourceType() !== 'file') return;
    const duration = this.engine.getDuration();
    if (duration <= 0) return;
    const time = (Number(this.progressBar.value) / 100) * duration;
    this.engine.seek(time);
  }

  private setMode(name: VisualizerName, persist = true): void {
    this.renderer.setVisualizer(name);
    this.modeButtons.forEach((btn, key) => btn.classList.toggle('active', key === name));
    if (persist) saveSettings({ visualizer: name });
  }

  private setTheme(name: ThemeName, persist = true): void {
    this.renderer.setTheme(name);
    this.themeButtons.forEach((btn, key) => btn.classList.toggle('active', key === name));
    if (persist) saveSettings({ theme: name });
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      void this.app.requestFullscreen().catch(() => {
        this.onError?.('当前浏览器不支持全屏或已被拒绝');
      });
    } else {
      void document.exitFullscreen();
    }
  }

  private takeScreenshot(): void {
    void this.renderer.captureScreenshot().then((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `music-visualizer-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  private toggleHelp(): void {
    this.helpOverlay?.classList.toggle('hidden');
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        void this.togglePlay();
        break;
      case 'Digit1':
        this.setMode('spectrum');
        break;
      case 'Digit2':
        this.setMode('waveform');
        break;
      case 'Digit3':
        this.setMode('particles');
        break;
      case 'Digit4':
        this.setTheme('neon');
        break;
      case 'Digit5':
        this.setTheme('sunset');
        break;
      case 'Digit6':
        this.setTheme('mono');
        break;
      case 'KeyF':
        this.toggleFullscreen();
        break;
      case 'KeyM':
        this.toggleMute();
        break;
      case 'Slash':
        if (e.shiftKey) {
          this.toggleHelp();
        }
        break;
    }
  }

  private updateProgress(): void {
    if (this.engine.getSourceType() === 'mic') {
      this.timeDisplay.textContent = '麦克风输入';
      return;
    }

    const current = this.engine.getCurrentTime();
    const duration = this.engine.getDuration();
    this.timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;

    if (duration > 0) {
      this.progressBar.disabled = false;
      if (!this.isSeeking) {
        this.progressBar.value = String((current / duration) * 100);
      }
    }
  }

  private updateSourceLabel(): void {
    if (this.engine.getSourceType() === 'mic') {
      this.sourceLabel.textContent = '输入源：麦克风';
    } else {
      const name = this.engine.getFileName();
      this.sourceLabel.textContent = name ? `输入源：${name}` : '未选择音频';
    }
  }

  private hideEmptyState(): void {
    this.emptyState?.classList.add('hidden');
  }

  private showControls(): void {
    this.panel.classList.remove('controls-hidden');
    this.resetHideTimer();
  }

  private resetHideTimer(): void {
    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    if (window.matchMedia('(pointer: coarse)').matches) return;
    this.hideTimer = window.setTimeout(() => {
      this.panel.classList.add('controls-hidden');
    }, 3000);
  }

  dispose(): void {
    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.app.removeEventListener('dragover', this.onDragOver);
    this.app.removeEventListener('dragleave', this.onDragLeave);
    this.app.removeEventListener('drop', this.onDrop);
    this.progressBar.removeEventListener('pointerdown', this.onProgressPointerDown);
    this.progressBar.removeEventListener('pointerup', this.onProgressPointerUp);
    this.renderer.offTick(this.tickCallback);
    this.unsubscribePlayback?.();
  }
}
