import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function luminance(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('core text and control colors meet WCAG AA contrast thresholds', () => {
  assert.ok(contrast('#2f2926', '#ffffff') >= 4.5, 'primary text');
  assert.ok(contrast('#746762', '#ffffff') >= 4.5, 'muted and placeholder text');
  assert.ok(contrast('#ffffff', '#b4533c') >= 4.5, 'selected language text');
  assert.ok(contrast('#9a8177', '#ffffff') >= 3, 'control boundaries');
  assert.ok(contrast('#3876b5', '#ffffff') >= 3, 'focus indicator');
});

test('language radio group exposes one tab stop and instructions', async () => {
  const html = await readFile('public/index.html', 'utf8');
  const group = html.match(/<div class="language-tabs"[\s\S]*?<\/div>/)?.[0] ?? '';
  assert.match(group, /role="radiogroup"/);
  assert.match(group, /aria-describedby="language-help"/);
  assert.equal((group.match(/tabindex="0"/g) ?? []).length, 1);
  assert.equal((group.match(/tabindex="-1"/g) ?? []).length, 2);
});

test('dynamic status regions are polite and atomic', async () => {
  const html = await readFile('public/index.html', 'utf8');
  for (const id of ['network-status', 'recording-status', 'global-status']) {
    const element = html.match(new RegExp(`<[^>]+id="${id}"[^>]*>`))?.[0] ?? '';
    assert.match(element, /role="status"/);
    assert.match(element, /aria-live="polite"/);
    assert.match(element, /aria-atomic="true"/);
  }
});

test('record button has stable keyboard and recording instructions', async () => {
  const html = await readFile('public/index.html', 'utf8');
  const button = html.match(/<button id="record-button"[^>]*>/)?.[0] ?? '';
  const help = html.match(/<p id="recording-help"[^>]*>[\s\S]*?<\/p>/)?.[0] ?? '';
  assert.match(button, /aria-describedby="recording-help"/);
  assert.match(help, /Press Space or Enter to start or stop recording/);
  assert.match(help, /30 seconds or a short silence/);
});

test('visible button labels are included directly in accessible names', async () => {
  const html = await readFile('public/index.html', 'utf8');
  const app = await readFile('public/app.js', 'utf8');
  assert.doesNotMatch(html, /id="clear-button"[^>]*aria-label/);
  assert.doesNotMatch(html, /id="source-listen"[^>]*aria-label/);
  assert.doesNotMatch(app, /aria-label="(?:Listen|Copy) to? \$\{language\.label\}/);
  assert.match(html, /<span>Clear<\/span><span class="sr-only"> source text<\/span>/);
  assert.match(app, /<span>Copy<\/span><span class="sr-only"> \$\{language\.label\} translation<\/span>/);
});

test('ARIA labels are used only with supported recorder and counter semantics', async () => {
  const html = await readFile('public/index.html', 'utf8');
  assert.match(html, /class="recorder" role="group" aria-labelledby="recorder-title"/);
  const counter = html.match(/<span id="character-count"[^>]*>/)?.[0] ?? '';
  assert.doesNotMatch(counter, /aria-label/);
  assert.match(html, /id="character-count" class="counter">0 of 500 characters/);
});
