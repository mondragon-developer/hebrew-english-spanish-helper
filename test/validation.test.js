import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBatchTranslationInput, validateTranslationInput } from '../api/_lib/validation.js';

const valid = { source: 'en', target: 'he', text: 'Hello' };
for (const [name, body, pattern] of [
  ['unsupported source', { ...valid, source: 'fr' }, /source/],
  ['unsupported target', { ...valid, target: 'fr' }, /target/],
  ['identical languages', { ...valid, target: 'en' }, /different/],
  ['empty text', { ...valid, text: '  ' }, /Enter text/],
  ['over-limit text', { ...valid, text: 'x'.repeat(501) }, /500/]
]) test(`rejects ${name}`, () => assert.throws(() => validateTranslationInput(body), pattern));

test('preserves valid text including whitespace and line breaks', () => {
  assert.equal(validateTranslationInput({ ...valid, text: 'Hello\nworld' }).text, 'Hello\nworld');
});

test('accepts one or both remaining batch targets', () => {
  assert.deepEqual(validateBatchTranslationInput({ source: 'en', targets: ['he', 'es'], text: 'Hello' }).targets, ['he', 'es']);
  assert.deepEqual(validateBatchTranslationInput({ source: 'en', targets: ['he'], text: 'Hello' }).targets, ['he']);
});

for (const [name, targets, pattern] of [
  ['no targets', [], /one or two/],
  ['too many targets', ['he', 'es', 'en'], /one or two/],
  ['duplicate targets', ['he', 'he'], /unique/],
  ['source repeated as target', ['en'], /different/],
  ['unsupported batch target', ['fr'], /Unsupported target/]
]) test(`rejects batch input with ${name}`, () => assert.throws(() => validateBatchTranslationInput({ source: 'en', targets, text: 'Hello' }), pattern));
