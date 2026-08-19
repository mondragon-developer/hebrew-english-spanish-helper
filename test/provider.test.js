import test from 'node:test';
import assert from 'node:assert/strict';
import { resetTranslationStateForTests, translateTargets, translateText, translateWithMyMemory } from '../api/_lib/provider.js';

test.beforeEach(resetTranslationStateForTests);

test('returns and safely decodes a successful provider translation', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ responseData: { translatedText: 'Hola &amp; adiós' }, responseStatus: 200 }) });
  assert.equal(await translateWithMyMemory({ text: 'Hello', source: 'en', target: 'es' }, { fetchImpl }), 'Hola & adiós');
});

test('maps provider failure to a stable error', async () => {
  const fetchImpl = async () => ({ ok: false, status: 503, json: async () => ({}) });
  await assert.rejects(() => translateWithMyMemory({ text: 'Hello', source: 'en', target: 'es' }, { fetchImpl }), { code: 'PROVIDER_ERROR', status: 502 });
});

test('maps an aborted timeout to TIMEOUT', async () => {
  const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  await assert.rejects(() => translateWithMyMemory({ text: 'Hello', source: 'en', target: 'es' }, { fetchImpl, timeoutMs: 5 }), { code: 'TIMEOUT', status: 504 });
});

test('caches successful translations without repeating provider calls', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => ({ responseData: { translatedText: 'Hola' }, responseStatus: 200 }) };
  };
  const input = { text: 'Hello', source: 'en', target: 'es' };
  assert.equal(await translateText(input, { fetchImpl }), 'Hola');
  assert.equal(await translateText(input, { fetchImpl }), 'Hola');
  assert.equal(calls, 1);
});

test('deduplicates identical translations already in flight', async () => {
  let calls = 0;
  let release;
  const fetchImpl = async () => {
    calls += 1;
    await new Promise((resolve) => { release = resolve; });
    return { ok: true, status: 200, json: async () => ({ responseData: { translatedText: 'Hola' }, responseStatus: 200 }) };
  };
  const input = { text: 'Hello', source: 'en', target: 'es' };
  const first = translateText(input, { fetchImpl });
  const second = translateText(input, { fetchImpl });
  await new Promise((resolve) => setImmediate(resolve));
  release();
  assert.deepEqual(await Promise.all([first, second]), ['Hola', 'Hola']);
  assert.equal(calls, 1);
});

test('does not cache provider failures', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: false, status: 503, json: async () => ({}) };
  };
  const input = { text: 'Hello', source: 'en', target: 'es' };
  await assert.rejects(() => translateText(input, { fetchImpl }));
  await assert.rejects(() => translateText(input, { fetchImpl }));
  assert.equal(calls, 2);
});

test('returns independent success and failure outcomes for batch targets', async () => {
  const fetchImpl = async (url) => url.searchParams.get('langpair') === 'en|he'
    ? { ok: true, status: 200, json: async () => ({ responseData: { translatedText: 'שלום' }, responseStatus: 200 }) }
    : { ok: false, status: 429, json: async () => ({}) };
  const result = await translateTargets({ text: 'Hello', source: 'en', targets: ['he', 'es'] }, { fetchImpl });
  assert.equal(result.translations.he, 'שלום');
  assert.equal(result.errors.es.code, 'RATE_LIMITED');
});
