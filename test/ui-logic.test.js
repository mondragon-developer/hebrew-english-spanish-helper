import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, createBoundedCache, createRequestGate, deriveControlState, getPlaybackControlState, getRadioNavigationTarget, getTargetLanguages } from '../public/lib.js';

test('copy and listen buttons enable only for usable text', () => {
  assert.deepEqual(deriveControlState(''), { canCopy: false, canListen: false });
  assert.deepEqual(deriveControlState('  '), { canCopy: false, canListen: false });
  assert.deepEqual(deriveControlState('שלום'), { canCopy: true, canListen: true });
});

test('listen control exposes deterministic play, pause, and resume states', () => {
  assert.deepEqual(getPlaybackControlState('idle'), { icon: '▶', label: 'Listen', pressed: false });
  assert.deepEqual(getPlaybackControlState('playing'), { icon: '❚❚', label: 'Pause', pressed: true });
  assert.deepEqual(getPlaybackControlState('paused'), { icon: '▶', label: 'Resume', pressed: true });
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

test('browser session cache is bounded and refreshes recently used entries', () => {
  const cache = createBoundedCache(2);
  cache.set('first', 'one');
  cache.set('second', 'two');
  assert.equal(cache.get('first'), 'one');
  cache.set('third', 'three');
  assert.equal(cache.get('second'), undefined);
  assert.equal(cache.get('first'), 'one');
  assert.equal(cache.get('third'), 'three');
  assert.equal(cache.size, 2);
});
