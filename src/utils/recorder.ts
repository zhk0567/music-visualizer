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
        resolve(new Blob(this.chunks, { type: 'video/webm' }));
        this.recorder = null;
        this.chunks = [];
      };
      this.recorder.onerror = () => reject(new Error('录制失败'));
      this.recorder.stop();
    });
  }

  isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }
}
