import test from 'node:test';
import assert from 'node:assert/strict';
import { translateWithMyMemory } from '../api/_lib/provider.js';

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
