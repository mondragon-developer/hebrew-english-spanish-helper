import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, getClientId, isJsonRequest, resetRateLimitsForTests } from '../api/_lib/security.js';

test.beforeEach(resetRateLimitsForTests);

test('requires the application/json media type', () => {
  assert.equal(isJsonRequest({ headers: { 'content-type': 'application/json; charset=utf-8' } }), true);
  assert.equal(isJsonRequest({ headers: { 'content-type': 'text/plain' } }), false);
  assert.equal(isJsonRequest({ headers: {} }), false);
});

test('uses the first forwarded address without retaining an unbounded value', () => {
  assert.equal(getClientId({ headers: { 'x-forwarded-for': '203.0.113.8, 10.0.0.1' } }), '203.0.113.8');
  assert.equal(getClientId({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }), '127.0.0.1');
});

test('limits requests per policy and client until the window resets', () => {
  const request = { headers: { 'x-forwarded-for': '203.0.113.8' } };
  assert.equal(checkRateLimit('test', request, { limit: 2, windowMs: 1000 }, 100).allowed, true);
  assert.equal(checkRateLimit('test', request, { limit: 2, windowMs: 1000 }, 200).allowed, true);
  const limited = checkRateLimit('test', request, { limit: 2, windowMs: 1000 }, 300);
  assert.equal(limited.allowed, false);
  assert.equal(limited.retryAfter, 1);
  assert.equal(checkRateLimit('test', request, { limit: 2, windowMs: 1000 }, 1100).allowed, true);
});

test('charges batch request cost against the same rate budget', () => {
  const request = { headers: { 'x-forwarded-for': '203.0.113.9' } };
  assert.equal(checkRateLimit('batch', request, { limit: 3, windowMs: 1000, cost: 2 }, 0).remaining, 1);
  const limited = checkRateLimit('batch', request, { limit: 3, windowMs: 1000, cost: 2 }, 1);
  assert.equal(limited.allowed, false);
  assert.equal(limited.remaining, 0);
});
