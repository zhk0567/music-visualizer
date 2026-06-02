import type { AudioEngine } from '../audio/AudioEngine';
import type { Renderer, VisualizerName } from '../render/Renderer';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export class Controls {
  private root: HTMLElement;
  private engine: AudioEngine;
  private renderer: Renderer;
  private fileInput: HTMLInputElement;
  private playBtn: HTMLButtonElement;
  private progressBar: HTMLInputElement;
  private volumeSlider: HTMLInputElement;
  private sensitivitySlider: HTMLInputElement;
  private timeDisplay: HTMLElement;
  private modeButtons: Map<VisualizerName, HTMLButtonElement> = new Map();
  private updateInterval: number | null = null;
  private onLoadingChange?: (loading: boolean) => void;
  private onError?: (message: string) => void;

  constructor(
    root: HTMLElement,
    engine: AudioEngine,
    renderer: Renderer,
    callbacks?: {
      onLoadingChange?: (loading: boolean) => void;
      onError?: (message: string) => void;
    },
  ) {
    this.root = root;
    this.engine = engine;
    this.renderer = renderer;
    this.onLoadingChange = callbacks?.onLoadingChange;
    this.onError = callbacks?.onError;

    this.root.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'controls-panel';

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'audio/*';
    this.fileInput.className = 'file-input-hidden';

    const fileBtn = this.createButton('选择文件', () => this.fileInput.click());
    const micBtn = this.createButton('麦克风', () => void this.handleMic());

    this.playBtn = document.createElement('button');
    this.playBtn.className = 'btn btn-primary';
    this.playBtn.textContent = '▶';
    this.playBtn.title = '播放/暂停';
    this.playBtn.addEventListener('click', () => void this.togglePlay());

    this.progressBar = document.createElement('input');
    this.progressBar.type = 'range';
    this.progressBar.className = 'progress-bar';
    this.progressBar.min = '0';
    this.progressBar.max = '100';
    this.progressBar.value = '0';
    this.progressBar.addEventListener('input', () => this.handleSeek());

    this.timeDisplay = document.createElement('span');
    this.timeDisplay.className = 'time-display';
    this.timeDisplay.textContent = '0:00 / 0:00';

    this.volumeSlider = document.createElement('input');
    this.volumeSlider.type = 'range';
    this.volumeSlider.min = '0';
    this.volumeSlider.max = '100';
    this.volumeSlider.value = '80';
    this.volumeSlider.addEventListener('input', () => {
      this.engine.setVolume(Number(this.volumeSlider.value) / 100);
    });

    this.sensitivitySlider = document.createElement('input');
    this.sensitivitySlider.type = 'range';
    this.sensitivitySlider.min = '0.5';
    this.sensitivitySlider.max = '3';
    this.sensitivitySlider.step = '0.1';
    this.sensitivitySlider.value = '1.5';
    this.sensitivitySlider.addEventListener('input', () => {
      this.renderer.setSensitivity(Number(this.sensitivitySlider.value));
    });

    const row1 = document.createElement('div');
    row1.className = 'controls-row center';
    row1.append(fileBtn, micBtn, this.playBtn);

    const row2 = document.createElement('div');
    row2.className = 'controls-row';
    row2.append(this.timeDisplay, this.progressBar);

    const row3 = document.createElement('div');
    row3.className = 'controls-row';
    const volumeGroup = this.createSliderGroup('音量', this.volumeSlider);
    const sensGroup = this.createSliderGroup('灵敏度', this.sensitivitySlider);
    sensGroup.classList.add('sensitivity-control');
    row3.append(volumeGroup, sensGroup);

    const row4 = document.createElement('div');
    row4.className = 'controls-row center';
    const modeTabs = document.createElement('div');
    modeTabs.className = 'mode-tabs';

    const modes: { name: VisualizerName; label: string }[] = [
      { name: 'spectrum', label: '频谱' },
      { name: 'waveform', label: '波形' },
      { name: 'particles', label: '粒子' },
    ];

    for (const mode of modes) {
      const btn = this.createButton(mode.label, () => this.setMode(mode.name));
      if (mode.name === 'spectrum') btn.classList.add('active');
      this.modeButtons.set(mode.name, btn);
      modeTabs.appendChild(btn);
    }
    row4.appendChild(modeTabs);

    panel.append(row1, row2, row3, row4);
    this.root.append(this.fileInput, panel);

    this.fileInput.addEventListener('change', () => void this.handleFileSelect());
    this.startProgressUpdate();
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

    this.onLoadingChange?.(true);
    try {
      await this.engine.ensureContext();
      await this.engine.loadFile(file);
      await this.engine.play();
      this.playBtn.textContent = '⏸';
    } catch (err) {
      this.onError?.(err instanceof Error ? err.message : '加载音频失败');
    } finally {
      this.onLoadingChange?.(false);
    }
  }

  private async handleMic(): Promise<void> {
    try {
      await this.engine.switchToMic();
      this.playBtn.textContent = '⏸';
      this.progressBar.disabled = true;
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

  private handleSeek(): void {
    if (this.engine.getSourceType() !== 'file') return;
    const duration = this.engine.getDuration();
    if (duration <= 0) return;
    const time = (Number(this.progressBar.value) / 100) * duration;
    this.engine.seek(time);
  }

  private setMode(name: VisualizerName): void {
    this.renderer.setVisualizer(name);
    this.modeButtons.forEach((btn, key) => {
      btn.classList.toggle('active', key === name);
    });
  }

  private startProgressUpdate(): void {
    this.updateInterval = window.setInterval(() => {
      if (this.engine.getSourceType() === 'mic') {
        this.timeDisplay.textContent = '麦克风输入';
        return;
      }

      const current = this.engine.getCurrentTime();
      const duration = this.engine.getDuration();
      this.timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;

      if (duration > 0) {
        this.progressBar.disabled = false;
        this.progressBar.value = String((current / duration) * 100);
      }
    }, 200);
  }

  dispose(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
    }
  }
}
