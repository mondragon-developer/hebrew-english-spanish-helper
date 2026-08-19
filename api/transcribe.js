import { SpeechProviderError, transcribeWithAzure } from './_lib/speech-provider.js';
import { SpeechValidationError, parseSpeechInput } from './_lib/speech.js';
import { checkRateLimit, isJsonRequest } from './_lib/security.js';

function send(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  return response.status(status).json(payload);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return send(response, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for transcription requests.' } });
  }
  if (!isJsonRequest(request)) {
    return send(response, 415, { ok: false, error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send transcription requests as JSON.' } });
  }
  const rate = checkRateLimit('transcribe', request, { limit: 10, windowMs: 60_000 });
  response.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  if (!rate.allowed) {
    response.setHeader('Retry-After', String(rate.retryAfter));
    return send(response, 429, { ok: false, error: { code: 'SPEECH_RATE_LIMITED', message: 'Too many transcription requests. Please wait and try again.' } });
  }
  try {
    const input = parseSpeechInput(request.body);
    const transcript = await transcribeWithAzure(input);
    return send(response, 200, { ok: true, data: { transcript, language: input.language } });
  } catch (error) {
    if (error instanceof SpeechValidationError || error instanceof SpeechProviderError) {
      return send(response, error.status, { ok: false, error: { code: error.code, message: error.message } });
    }
    return send(response, 500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Speech transcription could not be completed.' } });
  }
}
