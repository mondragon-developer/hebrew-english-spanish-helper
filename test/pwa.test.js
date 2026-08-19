import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

test('manifest is valid and declares installable app properties', async () => {
  const manifest = JSON.parse(await readFile('public/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.name, 'Lingua Live');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);
});
test('required PWA icon files exist', async () => Promise.all(['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icon.svg'].map((name) => access(`public/icons/${name}`))));
test('service worker explicitly excludes translation API requests', async () => {
  const worker = await readFile('public/sw.js', 'utf8');
  assert.match(worker, /pathname\.startsWith\('\/api\/'\)/);
  assert.doesNotMatch(worker.match(/APP_SHELL\s*=\s*\[[^\]]+\]/s)?.[0] ?? '', /\/api\//);
  assert.match(worker, /\/audio\.js/);
});
