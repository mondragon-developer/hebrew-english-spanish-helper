import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRms, downsampleAudio, encodeWav } from '../public/audio.js';

test('silence detection uses RMS audio energy', () => {
  assert.equal(calculateRms(new Float32Array(10)), 0);
  assert.ok(calculateRms(new Float32Array([0.1, -0.1])) > 0.09);
});

test('downsampling produces 16 kHz mono samples', () => {
  const input = new Float32Array(48000).fill(0.25);
  const output = downsampleAudio([input], 48000);
  assert.equal(output.length, 16000);
  assert.ok(Math.abs(output[100] - 0.25) < 0.001);
});

test('WAV encoder writes valid 16 kHz, 16-bit mono headers', async () => {
  const wav = Buffer.from(await encodeWav(new Float32Array(16000)).arrayBuffer());
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt32LE(24), 16000);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.length, 32044);
});
