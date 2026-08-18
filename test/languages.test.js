import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, SUPPORTED_LANGUAGE_CODES, getTargetLanguages } from '../api/_lib/languages.js';

test('supported language configuration includes only Hebrew, English, and Spanish', () => {
  assert.deepEqual(SUPPORTED_LANGUAGE_CODES, ['he', 'en', 'es']);
  assert.equal(LANGUAGES.he.dir, 'rtl');
  assert.equal(LANGUAGES.en.dir, 'ltr');
  assert.equal(LANGUAGES.es.dir, 'ltr');
});

test('each source language calculates the two remaining targets', () => {
  assert.deepEqual(getTargetLanguages('he'), ['en', 'es']);
  assert.deepEqual(getTargetLanguages('en'), ['he', 'es']);
  assert.deepEqual(getTargetLanguages('es'), ['he', 'en']);
});
