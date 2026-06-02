export class CanvasRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  static isSupported(): boolean {
    return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }

  start(stream: MediaStream, _fps = 30): void {
    if (!CanvasRecorder.isSupported()) {
      throw new Error('当前浏览器不支持视频录制');
    }

    this.chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    this.recorder = new MediaRecorder(stream, { mimeType });
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder.start(200);
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) {
        reject(new Error('未在录制中'));
        return;
      }
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.recorder = null;
        this.chunks = [];
        if (blob.size < 100) {
          reject(new Error('录制内容为空，请确认可视化正在播放后重试'));
          return;
        }
        resolve(blob);
      };
      this.recorder.onerror = () => reject(new Error('录制失败'));
      this.recorder.stop();
    });
  }

  isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }
}
