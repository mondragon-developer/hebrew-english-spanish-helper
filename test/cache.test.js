import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpiringCache } from '../api/_lib/cache.js';

test('server cache expires entries and remains bounded', () => {
  let time = 0;
  const cache = createExpiringCache({ maxEntries: 2, ttlMs: 100, now: () => time });
  cache.set('first', 'one');
  cache.set('second', 'two');
  assert.equal(cache.get('first'), 'one');
  cache.set('third', 'three');
  assert.equal(cache.get('second'), undefined);
  assert.equal(cache.size, 2);
  time = 101;
  assert.equal(cache.get('first'), undefined);
  assert.equal(cache.get('third'), undefined);
});
