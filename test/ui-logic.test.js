import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, createRequestGate, deriveControlState, getRadioNavigationTarget, getTargetLanguages } from '../public/lib.js';

test('copy and listen buttons enable only for usable text', () => {
  assert.deepEqual(deriveControlState(''), { canCopy: false, canListen: false });
  assert.deepEqual(deriveControlState('  '), { canCopy: false, canListen: false });
  assert.deepEqual(deriveControlState('שלום'), { canCopy: true, canListen: true });
});
test('Hebrew output is right-to-left', () => assert.equal(LANGUAGES.he.dir, 'rtl'));
test('language switching produces the correct panels', () => assert.deepEqual(getTargetLanguages('es'), ['he', 'en']));
test('stale request ids cannot replace newer results', () => {
  const gate = createRequestGate();
  const oldRequest = gate.next();
  const newRequest = gate.next();
  assert.equal(gate.isCurrent(oldRequest), false);
  assert.equal(gate.isCurrent(newRequest), true);
  gate.invalidate();
  assert.equal(gate.isCurrent(newRequest), false);
});

test('radio navigation supports arrows, wrapping, Home, and End', () => {
  const codes = ['he', 'en', 'es'];
  assert.equal(getRadioNavigationTarget(codes, 'en', 'ArrowRight'), 'es');
  assert.equal(getRadioNavigationTarget(codes, 'es', 'ArrowDown'), 'he');
  assert.equal(getRadioNavigationTarget(codes, 'he', 'ArrowLeft'), 'es');
  assert.equal(getRadioNavigationTarget(codes, 'en', 'ArrowUp'), 'he');
  assert.equal(getRadioNavigationTarget(codes, 'es', 'Home'), 'he');
  assert.equal(getRadioNavigationTarget(codes, 'he', 'End'), 'es');
  assert.equal(getRadioNavigationTarget(codes, 'en', 'Enter'), null);
});
