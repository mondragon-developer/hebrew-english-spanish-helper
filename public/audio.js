export const MAX_RECORDING_SECONDS = 45;
export const SILENCE_SECONDS = 1.75;
export const SILENCE_THRESHOLD = 0.018;
export const OUTPUT_SAMPLE_RATE = 16000;

export function calculateRms(samples) {
  if (!samples.length) return 0;
  return Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
}

export function downsampleAudio(chunks, inputRate, outputRate = OUTPUT_SAMPLE_RATE) {
  const input = Float32Array.from(chunks.flatMap((chunk) => Array.from(chunk)));
  if (inputRate === outputRate) return input;
  if (inputRate < outputRate) throw new Error('Input sample rate must be at least 16 kHz.');
  const ratio = inputRate / outputRate;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let index = 0; index < output.length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(Math.floor((index + 1) * ratio), input.length);
    let total = 0;
    for (let source = start; source < end; source += 1) total += input[source];
    output[index] = total / Math.max(1, end - start);
  }
  return output;
}

export function encodeWav(samples, sampleRate = OUTPUT_SAMPLE_RATE) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset, text) => [...text].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  return new Blob([buffer], { type: 'audio/wav' });
}

export async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const batch = 0x8000;
  for (let index = 0; index < bytes.length; index += batch) binary += String.fromCharCode(...bytes.subarray(index, index + batch));
  return btoa(binary);
}
