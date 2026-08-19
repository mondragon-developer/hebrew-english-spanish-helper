import { createHash } from 'node:crypto';
import { createExpiringCache } from './cache.js';

const PROVIDER_URL = 'https://api.mymemory.translated.net/get';
const DEFAULT_TIMEOUT_MS = 8000;
const translationCache = createExpiringCache();
const inFlightTranslations = new Map();

export class ProviderError extends Error {
  constructor(message, status = 502, code = 'PROVIDER_ERROR') {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.code = code;
  }
}

function decodeEntities(value) {
  const named = { amp: '&', apos: "'", quot: '"', lt: '<', gt: '>' };
  return value.replace(/&(#x?[0-9a-f]+|amp|apos|quot|lt|gt);/gi, (match, entity) => {
    if (entity[0] !== '#') return named[entity.toLowerCase()] ?? match;
    const hex = entity[1].toLowerCase() === 'x';
    const point = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return Number.isFinite(point) ? String.fromCodePoint(point) : match;
  });
}

export async function translateWithMyMemory({ text, source, target }, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = new URL(PROVIDER_URL);
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `${source}|${target}`);
  const email = options.email ?? process.env.MYMEMORY_EMAIL;
  if (email) url.searchParams.set('de', email);

  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (response.status === 429) throw new ProviderError('Translation usage limit reached. Please try again later.', 429, 'RATE_LIMITED');
    if (!response.ok) throw new ProviderError('The translation service is temporarily unavailable.');
    const data = await response.json();
    const translatedText = data?.responseData?.translatedText;
    if (typeof translatedText !== 'string' || !translatedText.trim()) {
      throw new ProviderError('The translation service returned an invalid response.');
    }
    if (Number(data.responseStatus) === 429 || /quota|limit/i.test(data.responseDetails ?? '')) {
      throw new ProviderError('Translation usage limit reached. Please try again later.', 429, 'RATE_LIMITED');
    }
    return decodeEntities(translatedText);
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error?.name === 'AbortError') throw new ProviderError('The translation request timed out. Please try again.', 504, 'TIMEOUT');
    throw new ProviderError('Could not reach the translation service. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

export async function translateText(input, options = {}) {
  const provider = options.provider ?? process.env.TRANSLATION_PROVIDER ?? 'mymemory';
  if (provider !== 'mymemory') throw new ProviderError('The configured translation provider is unavailable.', 500, 'PROVIDER_CONFIG');
  if (options.cache === false) return translateWithMyMemory(input, options);

  const textHash = createHash('sha256').update(input.text).digest('hex');
  const key = `${provider}:${input.source}:${input.target}:${textHash}`;
  const cached = translationCache.get(key);
  if (cached !== undefined) return cached;
  if (inFlightTranslations.has(key)) return inFlightTranslations.get(key);

  const request = translateWithMyMemory(input, options)
    .then((translation) => {
      translationCache.set(key, translation);
      return translation;
    })
    .finally(() => inFlightTranslations.delete(key));
  inFlightTranslations.set(key, request);
  return request;
}

export async function translateTargets({ text, source, targets }, options = {}) {
  const outcomes = await Promise.allSettled(targets.map((target) => translateText({ text, source, target }, options)));
  const translations = {};
  const errors = {};
  outcomes.forEach((outcome, index) => {
    const target = targets[index];
    if (outcome.status === 'fulfilled') translations[target] = outcome.value;
    else {
      const error = outcome.reason instanceof ProviderError ? outcome.reason : new ProviderError('Translation could not be completed.');
      errors[target] = { code: error.code, message: error.message };
    }
  });
  return { translations, errors };
}

export function resetTranslationStateForTests() {
  translationCache.clear();
  inFlightTranslations.clear();
}
