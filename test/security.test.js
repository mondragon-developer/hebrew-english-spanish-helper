import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, getClientId, isJsonRequest, isSameOriginRequest, resetRateLimitsForTests } from '../api/_lib/security.js';

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

test('accepts same-origin fetch metadata and rejects cross-site metadata', () => {
  assert.equal(isSameOriginRequest({ headers: { 'sec-fetch-site': 'same-origin' } }), true);
  assert.equal(isSameOriginRequest({ headers: { 'sec-fetch-site': 'none' } }), true);
  assert.equal(isSameOriginRequest({ headers: { 'sec-fetch-site': 'cross-site' } }), false);
  assert.equal(isSameOriginRequest({ headers: { 'sec-fetch-site': 'same-site' } }), false);
});

test('normalizes header whitespace and case before comparing', () => {
  assert.equal(isSameOriginRequest({ headers: { 'sec-fetch-site': ' Same-Origin ' } }), true);
  assert.equal(isSameOriginRequest({ headers: { 'sec-fetch-site': ' CROSS-SITE ' } }), false);
  assert.equal(isSameOriginRequest({ headers: { origin: ' https://Lingua.example ', host: 'lingua.example' } }), true);
  assert.equal(isSameOriginRequest({ headers: { 'sec-fetch-site': '   ', origin: 'https://lingua.example', host: 'lingua.example' } }), true);
});

test('falls back to matching the Origin header against the request host', () => {
  assert.equal(isSameOriginRequest({ headers: { origin: 'https://lingua.example', host: 'lingua.example' } }), true);
  assert.equal(isSameOriginRequest({ headers: { origin: 'https://lingua.example', 'x-forwarded-host': 'lingua.example', host: 'internal.host' } }), true);
  assert.equal(isSameOriginRequest({ headers: { origin: 'http://localhost:3000', host: 'localhost:3000' } }), true);
  assert.equal(isSameOriginRequest({ headers: { origin: 'https://evil.example', host: 'lingua.example' } }), false);
});

test('rejects requests without same-origin proof or with malformed origins', () => {
  assert.equal(isSameOriginRequest({ headers: {} }), false);
  assert.equal(isSameOriginRequest({ headers: { origin: 'null', host: 'lingua.example' } }), false);
  assert.equal(isSameOriginRequest({ headers: { origin: 'not a url', host: 'lingua.example' } }), false);
  assert.equal(isSameOriginRequest({ headers: { origin: 'https://lingua.example' } }), false);
});
