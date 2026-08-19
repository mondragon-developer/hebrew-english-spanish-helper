import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTranslationInput } from '../api/_lib/validation.js';

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
