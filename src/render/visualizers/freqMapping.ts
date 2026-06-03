/** Map bar index to FFT bin with log emphasis on bass (lower bins). */
export function freqIndexForBar(barIndex: number, barCount: number, freqLength: number): number {
  const t = barIndex / barCount;
  const logT = Math.pow(t, 0.55);
  return Math.min(freqLength - 1, Math.floor(logT * (freqLength - 1)));
}
