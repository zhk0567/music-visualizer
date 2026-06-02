import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'public', 'demo.wav');

const sampleRate = 44100;
const durationSec = 4;
const numSamples = sampleRate * durationSec;
const numChannels = 1;
const bitsPerSample = 16;

const data = Buffer.alloc(numSamples * 2);
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const f1 = 220 * (1 + 0.1 * Math.sin(t * 2));
  const f2 = 330 * (1 + 0.08 * Math.sin(t * 3.1));
  const sample =
    (Math.sin(2 * Math.PI * f1 * t) * 0.35 + Math.sin(2 * Math.PI * f2 * t) * 0.25) *
    (0.5 + 0.5 * Math.sin(t * 0.5));
  const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767 * 0.6)));
  data.writeInt16LE(intSample, i * 2);
}

const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
const blockAlign = (numChannels * bitsPerSample) / 8;
const dataSize = data.length;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(bitsPerSample, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);
data.copy(buffer, 44);

writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath} (${durationSec}s)`);
