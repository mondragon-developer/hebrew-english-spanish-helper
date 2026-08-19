import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpeechInput } from '../api/_lib/speech.js';
import { transcribeWithAzure } from '../api/_lib/speech-provider.js';

function wav(seconds = 1) {
  const dataLength = 16000 * 2 * seconds;
  const audio = Buffer.alloc(44 + dataLength);
  audio.write('RIFF', 0);
  audio.writeUInt32LE(36 + dataLength, 4);
  audio.write('WAVE', 8);
  audio.write('fmt ', 12);
  audio.writeUInt32LE(16, 16);
  audio.writeUInt16LE(1, 20);
  audio.writeUInt16LE(1, 22);
  audio.writeUInt32LE(16000, 24);
  audio.writeUInt32LE(32000, 28);
  audio.writeUInt16LE(2, 32);
  audio.writeUInt16LE(16, 34);
  audio.write('data', 36);
  audio.writeUInt32LE(dataLength, 40);
  return audio;
}

test('accepts supported language and valid short WAV audio', () => {
  const input = parseSpeechInput({ language: 'he', mimeType: 'audio/wav', audio: wav().toString('base64') });
  assert.equal(input.locale, 'he-IL');
  assert.equal(input.audio.length, 32044);
});

test('rejects WAV headers that lie about byte rate or payload length', () => {
  const invalidRate = wav();
  invalidRate.writeUInt32LE(1, 28);
  assert.throws(() => parseSpeechInput({ language: 'en', mimeType: 'audio/wav', audio: invalidRate.toString('base64') }), { code: 'UNSUPPORTED_AUDIO' });

  const trailingData = Buffer.concat([wav(), Buffer.from([0])]);
  assert.throws(() => parseSpeechInput({ language: 'en', mimeType: 'audio/wav', audio: trailingData.toString('base64') }), /incomplete/);
});

for (const [name, body, code] of [
  ['unsupported language', { language: 'fr', mimeType: 'audio/wav', audio: wav().toString('base64') }, 'UNSUPPORTED_LANGUAGE'],
  ['unsupported format', { language: 'en', mimeType: 'audio/mp4', audio: wav().toString('base64') }, 'UNSUPPORTED_AUDIO'],
  ['invalid audio', { language: 'es', mimeType: 'audio/wav', audio: Buffer.from('not wav').toString('base64') }, 'UNSUPPORTED_AUDIO'],
  ['overlong audio', { language: 'en', mimeType: 'audio/wav', audio: wav(31).toString('base64') }, 'AUDIO_TOO_LONG']
]) test(`rejects ${name}`, () => assert.throws(() => parseSpeechInput(body), { code }));

test('returns successful Azure transcription', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ RecognitionStatus: 'Success', NBest: [{ Display: 'Hello there.' }] }) });
  const text = await transcribeWithAzure({ audio: wav(), locale: 'en-US' }, { key: 'test-key', region: 'eastus', fetchImpl });
  assert.equal(text, 'Hello there.');
});

test('maps Azure no-match and rate-limit responses', async () => {
  const noMatch = async () => ({ ok: true, status: 200, json: async () => ({ RecognitionStatus: 'NoMatch' }) });
  await assert.rejects(() => transcribeWithAzure({ audio: wav(), locale: 'en-US' }, { key: 'key', region: 'eastus', fetchImpl: noMatch }), { code: 'NO_SPEECH' });
  const limited = async () => ({ ok: false, status: 429, json: async () => ({}) });
  await assert.rejects(() => transcribeWithAzure({ audio: wav(), locale: 'en-US' }, { key: 'key', region: 'eastus', fetchImpl: limited }), { code: 'SPEECH_RATE_LIMITED' });
});

test('maps Azure timeout behavior', async () => {
  const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  await assert.rejects(() => transcribeWithAzure({ audio: wav(), locale: 'en-US' }, { key: 'key', region: 'eastus', fetchImpl, timeoutMs: 5 }), { code: 'SPEECH_TIMEOUT' });
});
