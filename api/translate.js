import { ProviderError, translateTargets, translateText } from './_lib/provider.js';
import { ValidationError, validateBatchTranslationInput, validateTranslationInput } from './_lib/validation.js';
import { checkRateLimit, isJsonRequest } from './_lib/security.js';

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
  if (!isJsonRequest(request)) {
    return send(response, 415, { ok: false, error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send translation requests as JSON.' } });
  }
  const batchCost = Array.isArray(request.body?.targets) ? Math.min(2, Math.max(1, request.body.targets.length)) : 1;
  const rate = checkRateLimit('translate', request, { limit: 60, windowMs: 60_000, cost: batchCost });
  response.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  if (!rate.allowed) {
    response.setHeader('Retry-After', String(rate.retryAfter));
    return send(response, 429, { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many translation requests. Please wait and try again.' } });
  }
  try {
    if (Array.isArray(request.body?.targets)) {
      const input = validateBatchTranslationInput(request.body);
      const result = await translateTargets(input);
      return send(response, Object.keys(result.errors).length ? 207 : 200, { ok: true, data: { ...result, source: input.source, targets: input.targets } });
    }
    const input = validateTranslationInput(request.body);
    const translation = await translateText(input);
    return send(response, 200, { ok: true, data: { translation, source: input.source, target: input.target } });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ProviderError) {
      return send(response, error.status, { ok: false, error: { code: error.code, message: error.message } });
    }
    console.error('translate.unhandled', { name: error?.name, message: error?.message });
    return send(response, 500, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Translation could not be completed.' } });
  }
}
