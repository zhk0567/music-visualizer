import { describe, it, expect } from 'vitest';
import { freqIndexForBar } from '../src/render/visualizers/freqMapping';

describe('freqIndexForBar', () => {
  const freqLength = 256;
  const barCount = 128;

  it('maps first bar to lowest bin', () => {
    expect(freqIndexForBar(0, barCount, freqLength)).toBe(0);
  });

  it('maps last bar within range', () => {
    const idx = freqIndexForBar(barCount - 1, barCount, freqLength);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThanOrEqual(freqLength - 1);
  });

  it('emphasizes bass: early bars use lower bins than late bars', () => {
    const lowBar = freqIndexForBar(8, barCount, freqLength);
    const highBar = freqIndexForBar(100, barCount, freqLength);
    expect(lowBar).toBeLessThan(highBar);
  });

  it('is monotonic non-decreasing across bar indices', () => {
    let prev = -1;
    for (let i = 0; i < barCount; i++) {
      const idx = freqIndexForBar(i, barCount, freqLength);
      expect(idx).toBeGreaterThanOrEqual(prev);
      prev = idx;
    }
  });
});
