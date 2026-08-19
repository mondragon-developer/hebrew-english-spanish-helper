import { LANGUAGES, createRequestGate, deriveControlState, getTargetLanguages } from './lib.js';

const input = document.querySelector('#source-text');
const clearButton = document.querySelector('#clear-button');
const sourceListen = document.querySelector('#source-listen');
const counter = document.querySelector('#character-count');
const results = document.querySelector('#results');
const globalStatus = document.querySelector('#global-status');
const networkStatus = document.querySelector('#network-status');
const toast = document.querySelector('#toast');
const installButton = document.querySelector('#install-button');
const languageButtons = [...document.querySelectorAll('[data-language]')];

let sourceLanguage = 'en';
let debounceTimer;
let controller;
let deferredInstallPrompt;
let toastTimer;
const requestGate = createRequestGate();
const resultState = new Map();

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
}

function updateSourceControls() {
  const state = deriveControlState(input.value);
  clearButton.disabled = !state.canCopy;
  sourceListen.disabled = !state.canListen;
  const count = [...input.value].length;
  counter.textContent = `${count} / 500`;
  counter.classList.toggle('near-limit', count >= 450);
}

function resultCard(code) {
  const language = LANGUAGES[code];
  const state = resultState.get(code) ?? { status: 'empty', text: '', message: 'Your translation will appear here.' };
  const controls = deriveControlState(state.text);
  const content = state.status === 'loading'
    ? '<div class="skeleton" aria-label="Translating"><span></span><span></span><span></span></div>'
    : `<p class="result-text ${state.text ? '' : 'placeholder'}" lang="${code}" dir="${language.dir}">${escapeText(state.text || state.message)}</p>`;
  return `<article class="panel result-panel" data-result="${code}" aria-busy="${state.status === 'loading'}">
    <div class="result-language"><h3 lang="${code}" dir="${language.dir}">${language.nativeLabel}</h3><span>${language.label}</span></div>
    ${content}
    <div class="result-actions">
      <button class="icon-button" type="button" data-action="listen" data-code="${code}" ${controls.canListen ? '' : 'disabled'} aria-label="Listen to ${language.label} translation"><span aria-hidden="true">▶</span><span>Listen</span></button>
      <button class="icon-button" type="button" data-action="copy" data-code="${code}" ${controls.canCopy ? '' : 'disabled'} aria-label="Copy ${language.label} translation"><span aria-hidden="true">⧉</span><span>Copy</span></button>
    </div>
  </article>`;
}

function escapeText(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function renderResults() {
  results.innerHTML = getTargetLanguages(sourceLanguage).map(resultCard).join('');
}

function resetResults(message = 'Your translation will appear here.') {
  resultState.clear();
  getTargetLanguages(sourceLanguage).forEach((code) => resultState.set(code, { status: 'empty', text: '', message }));
  renderResults();
}

function cancelPending() {
  clearTimeout(debounceTimer);
  controller?.abort();
  controller = undefined;
  requestGate.invalidate();
}

async function requestTranslation(text, target, signal) {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source: sourceLanguage, target }),
    signal
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    const error = new Error(payload?.error?.message || 'Translation failed. Please try again.');
    error.code = payload?.error?.code;
    throw error;
  }
  return payload.data.translation;
}

async function translateNow() {
  const text = input.value;
  if (!text.trim()) {
    resetResults();
    globalStatus.textContent = 'Enter text to begin.';
    return;
  }
  if (!navigator.onLine) {
    resetResults('You’re offline. Reconnect to request new translations.');
    globalStatus.textContent = 'Offline — the app is available, but translation needs internet.';
    return;
  }
  controller?.abort();
  controller = new AbortController();
  const requestId = requestGate.next();
  const targets = getTargetLanguages(sourceLanguage);
  targets.forEach((code) => resultState.set(code, { status: 'loading', text: '', message: '' }));
  renderResults();
  globalStatus.textContent = 'Translating into both languages…';

  const outcomes = await Promise.allSettled(targets.map((code) => requestTranslation(text, code, controller.signal)));
  if (!requestGate.isCurrent(requestId)) return;
  let successCount = 0;
  outcomes.forEach((outcome, index) => {
    const code = targets[index];
    if (outcome.status === 'fulfilled') {
      successCount += 1;
      resultState.set(code, { status: 'success', text: outcome.value, message: '' });
    } else if (outcome.reason?.name !== 'AbortError') {
      const message = outcome.reason?.code === 'RATE_LIMITED'
        ? 'Public translation limit reached. Please wait and try again.'
        : outcome.reason?.message || 'Translation failed. Please try again.';
      resultState.set(code, { status: 'error', text: '', message });
    }
  });
  renderResults();
  globalStatus.textContent = successCount === 2 ? 'Translations ready.' : successCount === 1 ? 'One translation is ready; one could not be completed.' : 'Translations could not be completed.';
}

function queueTranslation() {
  cancelPending();
  updateSourceControls();
  if (!input.value.trim()) {
    resetResults();
    globalStatus.textContent = 'Enter text to begin.';
    return;
  }
  globalStatus.textContent = navigator.onLine ? 'Waiting for you to pause…' : 'Offline — translation needs internet.';
  debounceTimer = setTimeout(translateNow, 500);
}

function setLanguage(code) {
  if (!LANGUAGES[code] || code === sourceLanguage) return;
  cancelPending();
  sourceLanguage = code;
  const language = LANGUAGES[code];
  input.lang = code;
  input.dir = language.dir;
  input.placeholder = `Start typing in ${language.label}…`;
  languageButtons.forEach((button) => button.setAttribute('aria-checked', String(button.dataset.language === code)));
  resetResults();
  queueTranslation();
  input.focus();
}

function speak(text, code) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    showToast('Speech playback is unavailable in this browser.');
    return;
  }
  const language = LANGUAGES[code];
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((item) => item.lang.toLowerCase().startsWith(code));
  if (voices.length && !voice) {
    showToast(`No ${language.label} system voice is installed on this device.`);
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language.locale;
  if (voice) utterance.voice = voice;
  utterance.onerror = () => showToast('Speech playback could not be completed.');
  window.speechSynthesis.speak(utterance);
}

async function copyResult(code) {
  const text = resultState.get(code)?.text;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${LANGUAGES[code].label} translation copied.`);
  } catch {
    showToast('Copy is unavailable. Select the translation and copy it manually.');
  }
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  networkStatus.classList.toggle('offline', !online);
  networkStatus.lastElementChild.textContent = online ? 'Online' : 'Offline';
  if (!online) {
    cancelPending();
    if (input.value.trim()) {
      resetResults('You’re offline. Reconnect to request new translations.');
      globalStatus.textContent = 'Offline — the app shell still works.';
    }
  } else if (input.value.trim()) {
    queueTranslation();
  }
}

languageButtons.forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.language)));
input.addEventListener('input', queueTranslation);
clearButton.addEventListener('click', () => { input.value = ''; cancelPending(); updateSourceControls(); resetResults(); globalStatus.textContent = 'Text cleared. Enter text to begin.'; input.focus(); });
sourceListen.addEventListener('click', () => speak(input.value, sourceLanguage));
results.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  const code = button.dataset.code;
  if (button.dataset.action === 'copy') copyResult(code);
  else speak(resultState.get(code)?.text ?? '', code);
});
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferredInstallPrompt = event; installButton.hidden = false; });
window.addEventListener('appinstalled', () => { deferredInstallPrompt = undefined; installButton.hidden = true; showToast('Lingua Live installed successfully.'); });
installButton.addEventListener('click', async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = undefined; installButton.hidden = true; });

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => showToast('Offline support could not be enabled.')));
resetResults();
updateSourceControls();
updateNetworkStatus();
