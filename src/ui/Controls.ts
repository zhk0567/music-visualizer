import type { AudioEngine } from '../audio/AudioEngine';
import type { Renderer, VisualizerName } from '../render/Renderer';
import type { ThemeName } from '../render/themes';
import { THEMES, THEME_LIST } from '../render/themes';
import type { AnalyserPreset, AppSettings } from '../utils/settings';
import { saveSettings, loadSettings, buildShareUrl } from '../utils/settings';
import type { QualityLevel } from '../utils/quality';
import { QUALITY_LABELS, QUALITY_LIST } from '../utils/quality';
import { CanvasRecorder } from '../utils/recorder';
import { loadPresets, addPreset, deletePreset, type NamedPreset } from '../utils/presets';

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
  onToast?: (message: string) => void;
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
  private analyserBtn: HTMLButtonElement;
  private recordBtn: HTMLButtonElement;
  private presetSelect: HTMLSelectElement;
  private presetSaveBtn: HTMLButtonElement;
  private presetDeleteBtn: HTMLButtonElement;
  private copyLinkBtn: HTMLButtonElement;
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
  private onToast?: (message: string) => void;
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
  private helpDismissBtn: HTMLButtonElement | null;
  private helpBtn: HTMLButtonElement;
  private moreDetails: HTMLDetailsElement;
  private recorder = new CanvasRecorder();
  private presets: NamedPreset[] = [];

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
    this.onToast = callbacks?.onToast;
    this.emptyState = document.getElementById('empty-state');
    this.demoBtn = document.getElementById('demo-btn') as HTMLButtonElement | null;
    this.helpOverlay = document.getElementById('help-overlay');
    this.helpDismissBtn = document.getElementById('help-dismiss') as HTMLButtonElement | null;

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
    this.loopBtn.setAttribute('aria-pressed', 'true');
    this.muteBtn = this.createButton('静音', () => this.toggleMute());
    this.muteBtn.setAttribute('aria-pressed', 'false');

    this.playBtn = document.createElement('button');
    this.playBtn.className = 'btn btn-primary';
    this.playBtn.textContent = '▶';
    this.playBtn.setAttribute('aria-label', '播放或暂停');
    this.playBtn.addEventListener('click', () => void this.togglePlay());

    const fullscreenBtn = this.createButton('全屏', () => this.toggleFullscreen());
    const screenshotBtn = this.createButton('截图', () => this.takeScreenshot());
    this.recordBtn = this.createButton('录制', () => void this.toggleRecording());
    this.copyLinkBtn = this.createButton('复制链接', () => this.copyShareLink());
    const changeBtn = this.createButton('更换', () => this.changeAudio());
    changeBtn.classList.add('btn-ghost');

    this.helpBtn = this.createButton('?', () => this.toggleHelp());
    this.helpBtn.classList.add('btn-icon');
    this.helpBtn.setAttribute('aria-label', '快捷键帮助');

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
      saveSettings({ quality });
    });

    this.analyserBtn = this.createButton('分析: 平滑', () => this.toggleAnalyserPreset());

    this.presetSelect = document.createElement('select');
    this.presetSelect.className = 'btn preset-select';
    this.presetSelect.setAttribute('aria-label', '预设');
    this.presetSelect.addEventListener('change', () => void this.applySelectedPreset());
    this.presetSaveBtn = this.createButton('保存预设', () => this.saveCurrentPreset());
    this.presetDeleteBtn = this.createButton('删除预设', () => this.removeSelectedPreset());

    const header = document.createElement('div');
    header.className = 'controls-header';
    header.append(this.sourceLabel, changeBtn, this.helpBtn);

    const transportActions = document.createElement('div');
    transportActions.className = 'transport-actions';
    transportActions.append(this.fileBtn, this.micBtn, this.playBtn, this.loopBtn, this.muteBtn);

    const transportProgress = document.createElement('div');
    transportProgress.className = 'transport-progress';
    transportProgress.append(this.progressBar, this.timeDisplay);

    const transport = document.createElement('div');
    transport.className = 'controls-transport';
    transport.append(transportActions, transportProgress);

    const modeGroup = document.createElement('div');
    modeGroup.className = 'segment-group';
    modeGroup.setAttribute('role', 'group');
    modeGroup.setAttribute('aria-label', '可视化模式');
    for (const mode of [
      { name: 'spectrum' as const, label: '频谱' },
      { name: 'waveform' as const, label: '波形' },
      { name: 'particles' as const, label: '粒子' },
    ]) {
      const btn = this.createButton(mode.label, () => void this.setMode(mode.name));
      btn.classList.add('segment-btn');
      btn.setAttribute('aria-pressed', 'false');
      this.modeButtons.set(mode.name, btn);
      modeGroup.appendChild(btn);
    }

    const themeGroup = document.createElement('div');
    themeGroup.className = 'segment-group';
    themeGroup.setAttribute('role', 'group');
    themeGroup.setAttribute('aria-label', '主题');
    for (const themeName of THEME_LIST) {
      const btn = this.createButton(THEMES[themeName].label, () => this.setTheme(themeName));
      btn.classList.add('segment-btn');
      btn.setAttribute('aria-pressed', 'false');
      this.themeButtons.set(themeName, btn);
      themeGroup.appendChild(btn);
    }

    const visual = document.createElement('div');
    visual.className = 'controls-visual';
    visual.append(modeGroup, themeGroup);

    this.moreDetails = document.createElement('details');
    this.moreDetails.className = 'controls-more';
    const moreSummary = document.createElement('summary');
    moreSummary.textContent = '更多设置';
    const moreBody = document.createElement('div');
    moreBody.className = 'controls-more-body';
    moreBody.append(
      this.createSliderGroup('音量', this.volumeSlider),
      this.createSliderGroup('灵敏度', this.sensitivitySlider),
      this.qualitySelect,
      this.analyserBtn,
      screenshotBtn,
      this.recordBtn,
      fullscreenBtn,
      this.copyLinkBtn,
      this.presetSelect,
      this.presetSaveBtn,
      this.presetDeleteBtn,
    );
    this.moreDetails.append(moreSummary, moreBody);
    this.moreDetails.addEventListener('toggle', () => {
      if (this.moreDetails.open) {
        if (this.hideTimer !== null) clearTimeout(this.hideTimer);
      } else {
        this.resetHideTimer();
      }
    });

    this.panel.append(header, transport, visual, this.moreDetails);
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
      if (event === 'ended') {
        this.onToast?.('播放完毕');
      }
    });

    this.helpDismissBtn?.addEventListener('click', () => this.closeHelp());
    this.helpOverlay?.addEventListener('click', (e) => {
      if (e.target === this.helpOverlay) this.closeHelp();
    });

    this.refreshPresetSelect();
    this.resetHideTimer();
  }

  applySettings(settings: AppSettings): void {
    this.volumeSlider.value = String(Math.round(settings.volume * 100));
    this.engine.setVolume(settings.volume);
    this.sensitivitySlider.value = String(settings.sensitivity);
    this.renderer.setSensitivity(settings.sensitivity);
    this.engine.setLoop(settings.loop);
    this.loopBtn.classList.toggle('active', settings.loop);
    this.loopBtn.setAttribute('aria-pressed', String(settings.loop));
    this.engine.setAnalyserPreset(settings.analyserPreset);
    this.updateAnalyserBtn(settings.analyserPreset);
    this.qualitySelect.value = settings.quality;
    this.renderer.setQuality(settings.quality);
    void this.setMode(settings.visualizer, false);
    this.setTheme(settings.theme, false);
    if (settings.muted) {
      this.engine.setMuted(true);
      this.muteBtn.classList.add('active');
      this.muteBtn.textContent = '取消静音';
      this.muteBtn.setAttribute('aria-pressed', 'true');
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
        this.onToast?.('已加载示例曲目');
      } catch {
        await this.engine.loadDemoTone();
        this.onToast?.('已加载内置合成示例');
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
    this.loopBtn.disabled = source === 'mic';
    this.loopBtn.style.opacity = source === 'mic' ? '0.45' : '1';
    this.updateSourceLabel();
    this.hideEmptyState();
    this.renderer.wakeUp();
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
        this.renderer.wakeUp();
      }
    } catch (err) {
      this.onError?.(err instanceof Error ? err.message : '播放失败');
    }
  }

  private toggleLoop(): void {
    const next = !this.engine.getLoop();
    this.engine.setLoop(next);
    this.loopBtn.classList.toggle('active', next);
    this.loopBtn.setAttribute('aria-pressed', String(next));
    saveSettings({ loop: next });
  }

  private toggleMute(): void {
    const muted = this.engine.toggleMute();
    this.muteBtn.classList.toggle('active', muted);
    this.muteBtn.textContent = muted ? '取消静音' : '静音';
    this.muteBtn.setAttribute('aria-pressed', String(muted));
    saveSettings({ muted });
  }

  private toggleAnalyserPreset(): void {
    const next: AnalyserPreset = this.engine.getAnalyserPreset() === 'smooth' ? 'responsive' : 'smooth';
    this.engine.setAnalyserPreset(next);
    this.updateAnalyserBtn(next);
    saveSettings({ analyserPreset: next });
  }

  private updateAnalyserBtn(preset: AnalyserPreset): void {
    this.analyserBtn.textContent = preset === 'smooth' ? '分析: 平滑' : '分析: 灵敏';
    this.analyserBtn.classList.toggle('active', preset === 'responsive');
    this.analyserBtn.setAttribute('aria-pressed', String(preset === 'responsive'));
  }

  private changeAudio(): void {
    this.engine.reset();
    this.playBtn.textContent = '▶';
    this.fileBtn.classList.remove('active');
    this.micBtn.classList.remove('active');
    this.sourceLabel.textContent = '未选择音频';
    this.progressBar.value = '0';
    this.progressBar.disabled = true;
    this.loopBtn.disabled = false;
    this.loopBtn.style.opacity = '1';
    this.emptyState?.classList.remove('hidden');
  }

  private handleSeek(): void {
    if (this.engine.getSourceType() !== 'file') return;
    const duration = this.engine.getDuration();
    if (duration <= 0) return;
    const time = (Number(this.progressBar.value) / 100) * duration;
    this.engine.seek(time);
    this.renderer.wakeUp();
  }

  private async setMode(name: VisualizerName, persist = true): Promise<void> {
    await this.renderer.setVisualizer(name);
    this.modeButtons.forEach((btn, key) => {
      const active = key === name;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    if (persist) saveSettings({ visualizer: name });
  }

  private setTheme(name: ThemeName, persist = true): void {
    this.renderer.setTheme(name);
    this.themeButtons.forEach((btn, key) => {
      const active = key === name;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
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
      this.onToast?.('截图已保存');
    });
  }

  private async toggleRecording(): Promise<void> {
    if (this.recorder.isRecording()) {
      try {
        const blob = await this.recorder.stop();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `music-visualizer-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        this.recordBtn.textContent = '录制';
        this.recordBtn.classList.remove('active');
        this.onToast?.('录制已保存');
      } catch (err) {
        this.onError?.(err instanceof Error ? err.message : '停止录制失败');
      }
      return;
    }

    if (!CanvasRecorder.isSupported()) {
      this.onError?.('当前浏览器不支持视频录制');
      return;
    }

    try {
      const stream = this.renderer.getCaptureStream(30);
      this.recorder.start(stream, 30);
      this.recordBtn.textContent = '停止';
      this.recordBtn.classList.add('active');
      this.onToast?.('开始录制…');
    } catch (err) {
      this.onError?.(err instanceof Error ? err.message : '开始录制失败');
    }
  }

  private copyShareLink(): void {
    const url = buildShareUrl(loadSettings());
    void navigator.clipboard.writeText(url).then(
      () => this.onToast?.('链接已复制'),
      () => this.onError?.('复制失败，请手动复制地址栏链接'),
    );
  }

  private refreshPresetSelect(): void {
    this.presets = loadPresets();
    this.presetSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '选择预设…';
    this.presetSelect.appendChild(placeholder);
    for (const preset of this.presets) {
      const opt = document.createElement('option');
      opt.value = preset.name;
      opt.textContent = preset.name;
      this.presetSelect.appendChild(opt);
    }
  }

  private saveCurrentPreset(): void {
    const name = window.prompt('预设名称');
    if (!name?.trim()) return;
    const settings = loadSettings();
    this.presets = addPreset(name.trim(), settings);
    this.refreshPresetSelect();
    this.presetSelect.value = name.trim();
    this.onToast?.(`预设「${name.trim()}」已保存`);
  }

  private removeSelectedPreset(): void {
    const name = this.presetSelect.value;
    if (!name) {
      this.onError?.('请先选择要删除的预设');
      return;
    }
    this.presets = deletePreset(name);
    this.refreshPresetSelect();
    this.onToast?.(`预设「${name}」已删除`);
  }

  private async applySelectedPreset(): Promise<void> {
    const name = this.presetSelect.value;
    if (!name) return;
    const preset = this.presets.find((p) => p.name === name);
    if (!preset) return;

    this.sensitivitySlider.value = String(preset.sensitivity);
    this.renderer.setSensitivity(preset.sensitivity);
    this.qualitySelect.value = preset.quality;
    this.renderer.setQuality(preset.quality);
    await this.setMode(preset.visualizer, false);
    this.setTheme(preset.theme, false);
    saveSettings({
      visualizer: preset.visualizer,
      theme: preset.theme,
      quality: preset.quality,
      sensitivity: preset.sensitivity,
    });
    this.onToast?.(`已应用预设「${name}」`);
  }

  private isHelpOpen(): boolean {
    return !!this.helpOverlay && !this.helpOverlay.classList.contains('hidden');
  }

  private openHelp(): void {
    this.helpOverlay?.classList.remove('hidden');
    this.helpDismissBtn?.focus();
  }

  private closeHelp(): void {
    this.helpOverlay?.classList.add('hidden');
  }

  private toggleHelp(): void {
    if (this.isHelpOpen()) {
      this.closeHelp();
    } else {
      this.openHelp();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

    if (e.key === 'Escape' && this.isHelpOpen()) {
      e.preventDefault();
      this.closeHelp();
      return;
    }

    if (this.isHelpOpen()) return;

    if (e.key === '?' || (e.code === 'Slash' && e.shiftKey)) {
      e.preventDefault();
      this.toggleHelp();
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        void this.togglePlay();
        break;
      case 'Digit1':
        void this.setMode('spectrum');
        break;
      case 'Digit2':
        void this.setMode('waveform');
        break;
      case 'Digit3':
        void this.setMode('particles');
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
    if (this.moreDetails.open) return;
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
