import { SpeechProviderError, transcribeWithAzure } from './_lib/speech-provider.js';
import { SpeechValidationError, parseSpeechInput } from './_lib/speech.js';

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
