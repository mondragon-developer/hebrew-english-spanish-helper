import { MAX_TEXT_LENGTH, SUPPORTED_LANGUAGE_CODES } from './languages.js';

export class ValidationError extends Error {
  constructor(message, status = 400, code = 'INVALID_REQUEST') {
    super(message);
    this.name = 'ValidationError';
    this.status = status;
    this.code = code;
  }
}

export function validateTranslationInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('A JSON request body is required.');
  }
  const { source, target, text } = body;
  if (!SUPPORTED_LANGUAGE_CODES.includes(source)) {
    throw new ValidationError('Unsupported source language.');
  }
  if (!SUPPORTED_LANGUAGE_CODES.includes(target)) {
    throw new ValidationError('Unsupported target language.');
  }
  if (source === target) {
    throw new ValidationError('Source and target languages must be different.');
  }
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new ValidationError('Enter text to translate.');
  }
  if ([...text].length > MAX_TEXT_LENGTH) {
    throw new ValidationError(`Text must be ${MAX_TEXT_LENGTH} characters or fewer.`, 413, 'TEXT_TOO_LONG');
  }
  return { source, target, text };
}

export function validateBatchTranslationInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('A JSON request body is required.');
  }
  const { source, targets, text } = body;
  if (!SUPPORTED_LANGUAGE_CODES.includes(source)) throw new ValidationError('Unsupported source language.');
  if (!Array.isArray(targets) || targets.length < 1 || targets.length > 2) {
    throw new ValidationError('Provide one or two target languages.', 400, 'INVALID_TARGETS');
  }
  if (new Set(targets).size !== targets.length) throw new ValidationError('Target languages must be unique.', 400, 'INVALID_TARGETS');
  for (const target of targets) {
    if (!SUPPORTED_LANGUAGE_CODES.includes(target)) throw new ValidationError('Unsupported target language.');
    if (target === source) throw new ValidationError('Source and target languages must be different.');
  }
  if (typeof text !== 'string' || text.trim().length === 0) throw new ValidationError('Enter text to translate.');
  if ([...text].length > MAX_TEXT_LENGTH) {
    throw new ValidationError(`Text must be ${MAX_TEXT_LENGTH} characters or fewer.`, 413, 'TEXT_TOO_LONG');
  }
  return { source, targets, text };
}
