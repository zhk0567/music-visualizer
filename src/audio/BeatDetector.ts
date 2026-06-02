export class BeatDetector {
  private lastEnergy = 0;
  private beatIntensity = 0;
  private lastBeatTime = 0;
  private thresholdRatio = 1.25;
  private energyThreshold = 80;
  private cooldownMs = 200;

  setSensitivity(value: number): void {
    const v = Math.max(0.5, Math.min(2, value));
    this.thresholdRatio = 1.1 + (v - 0.5) * 0.35;
    this.energyThreshold = 110 - v * 25;
    this.cooldownMs = Math.round(280 - v * 80);
  }

  getSensitivity(): number {
    return (this.thresholdRatio - 1.1) / 0.35 + 0.5;
  }

  update(frequency: Uint8Array, delta: number): number {
    if (!frequency.length) {
      this.beatIntensity = Math.max(0, this.beatIntensity - delta * 3);
      return this.beatIntensity;
    }

    const end = Math.max(1, Math.floor(frequency.length * 0.12));
    let bass = 0;
    for (let i = 0; i < end; i++) {
      bass += frequency[i];
    }
    bass /= end;

    const now = performance.now();
    if (
      bass > this.lastEnergy * this.thresholdRatio &&
      bass > this.energyThreshold &&
      now - this.lastBeatTime > this.cooldownMs
    ) {
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
