export class BeatDetector {
  private lastEnergy = 0;
  private beatIntensity = 0;
  private lastBeatTime = 0;
  private readonly cooldownMs = 200;

  update(frequency: Uint8Array, delta: number): number {
    if (!frequency.length) {
      this.beatIntensity = Math.max(0, this.beatIntensity - delta * 3);
      return this.beatIntensity;
    }

    const end = Math.max(1, Math.floor(frequency.length * 0.1));
    let bass = 0;
    for (let i = 0; i < end; i++) {
      bass += frequency[i];
    }
    bass /= end;

    const now = performance.now();
    if (bass > this.lastEnergy * 1.25 && bass > 80 && now - this.lastBeatTime > this.cooldownMs) {
      this.beatIntensity = 1;
      this.lastBeatTime = now;
    }

    this.lastEnergy = bass * 0.15 + this.lastEnergy * 0.85;
    this.beatIntensity = Math.max(0, this.beatIntensity - delta * 2.5);
    return this.beatIntensity;
  }

  getIntensity(): number {
    return this.beatIntensity;
  }
}
