import { SUPPORTED_LANGUAGE_CODES } from './languages.js';

export const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
export const MAX_BASE64_AUDIO_LENGTH = Math.ceil(MAX_AUDIO_BYTES / 3) * 4;
export const MAX_AUDIO_SECONDS = 45.5;
export const SPEECH_LOCALES = Object.freeze({ he: 'he-IL', en: 'en-US', es: 'es-ES' });

export class SpeechValidationError extends Error {
  constructor(message, status = 400, code = 'INVALID_AUDIO') {
    super(message);
    this.name = 'SpeechValidationError';
    this.status = status;
    this.code = code;
  }
}

export function parseSpeechInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new SpeechValidationError('A JSON request body is required.');
  }
  if (!SUPPORTED_LANGUAGE_CODES.includes(body.language)) {
    throw new SpeechValidationError('Select Hebrew, English, or Spanish before recording.', 400, 'UNSUPPORTED_LANGUAGE');
  }
  if (body.mimeType !== 'audio/wav') {
    throw new SpeechValidationError('The recording must be a WAV audio file.', 415, 'UNSUPPORTED_AUDIO');
  }
  if (typeof body.audio !== 'string' || body.audio.length > MAX_BASE64_AUDIO_LENGTH || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.audio)) {
    throw new SpeechValidationError('A valid base64 audio recording is required.');
  }
  const audio = Buffer.from(body.audio, 'base64');
  if (!audio.length) throw new SpeechValidationError('The recording is empty.', 400, 'EMPTY_AUDIO');
  if (audio.length > MAX_AUDIO_BYTES) {
    throw new SpeechValidationError('The recording exceeds the 3 MB limit.', 413, 'AUDIO_TOO_LARGE');
  }
  validateWav(audio);
  return { audio, language: body.language, locale: SPEECH_LOCALES[body.language] };
}

function validateWav(audio) {
  if (audio.length < 44 || audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE') {
    throw new SpeechValidationError('The recording is not a valid WAV file.', 415, 'UNSUPPORTED_AUDIO');
  }
  const channels = audio.readUInt16LE(22);
  const audioFormat = audio.readUInt16LE(20);
  const sampleRate = audio.readUInt32LE(24);
  const byteRate = audio.readUInt32LE(28);
  const blockAlign = audio.readUInt16LE(32);
  const bitsPerSample = audio.readUInt16LE(34);
  const dataLength = audio.readUInt32LE(40);
  const expectedByteRate = sampleRate * channels * (bitsPerSample / 8);
  const expectedBlockAlign = channels * (bitsPerSample / 8);
  if (audioFormat !== 1 || channels !== 1 || sampleRate !== 16000 || bitsPerSample !== 16 || byteRate !== expectedByteRate || blockAlign !== expectedBlockAlign) {
    throw new SpeechValidationError('Audio must be 16 kHz, 16-bit, mono WAV.', 415, 'UNSUPPORTED_AUDIO');
  }
  if (audio.readUInt32LE(4) !== audio.length - 8 || dataLength !== audio.length - 44) {
    throw new SpeechValidationError('The WAV recording is incomplete.');
  }
  if (dataLength / byteRate > MAX_AUDIO_SECONDS) {
    throw new SpeechValidationError('Recordings must be 45 seconds or shorter.', 413, 'AUDIO_TOO_LONG');
  }
}
