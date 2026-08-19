import { ProviderError, translateText } from './_lib/provider.js';
import { ValidationError, validateTranslationInput } from './_lib/validation.js';

function send(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  return response.status(status).json(payload);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return send(response, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for translation requests.' } });
  }
  try {
    const input = validateTranslationInput(request.body);
    const translation = await translateText(input);
    return send(response, 200, { ok: true, data: { translation, source: input.source, target: input.target } });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ProviderError) {
      return send(response, error.status, { ok: false, error: { code: error.code, message: error.message } });
    }
    return send(response, 500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Translation could not be completed.' } });
  }
}
