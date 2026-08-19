import { LANGUAGES, createBoundedCache, createRequestGate, deriveControlState, getRadioNavigationTarget, getTargetLanguages } from './lib.js';
import { MAX_RECORDING_SECONDS, SILENCE_SECONDS, SILENCE_THRESHOLD, blobToBase64, calculateRms, downsampleAudio, encodeWav } from './audio.js';

const input = document.querySelector('#source-text');
const clearButton = document.querySelector('#clear-button');
const sourceListen = document.querySelector('#source-listen');
const counter = document.querySelector('#character-count');
const results = document.querySelector('#results');
const globalStatus = document.querySelector('#global-status');
const networkStatus = document.querySelector('#network-status');
const toast = document.querySelector('#toast');
const installButton = document.querySelector('#install-button');
const recordButton = document.querySelector('#record-button');
const recordingHelp = document.querySelector('#recording-help');
const recordingStatus = document.querySelector('#recording-status');
const recordingTimer = document.querySelector('#recording-timer');
const languageButtons = [...document.querySelectorAll('[data-language]')];

let sourceLanguage = 'en';
let debounceTimer;
let controller;
let deferredInstallPrompt;
let toastTimer;
const requestGate = createRequestGate();
const translationCache = createBoundedCache(50);
const resultState = new Map();
let recording;

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
  counter.textContent = `${count} of 500 characters`;
  counter.classList.toggle('near-limit', count >= 450);
}

function resultCard(code) {
  const language = LANGUAGES[code];
  const state = resultState.get(code) ?? { status: 'empty', text: '', message: 'Your translation will appear here.' };
  const controls = deriveControlState(state.text);
  const content = state.status === 'loading'
    ? `<div id="result-${code}-content" class="skeleton" aria-label="Translating"><span></span><span></span><span></span></div>`
    : `<p id="result-${code}-content" class="result-text ${state.text ? '' : 'placeholder'}" ${state.status === 'error' ? 'role="status"' : ''} lang="${code}" dir="${language.dir}">${escapeText(state.text || state.message)}</p>`;
  return `<article class="panel result-panel" data-result="${code}" tabindex="0" aria-busy="${state.status === 'loading'}" aria-labelledby="result-${code}-title" aria-describedby="result-${code}-content">
    <div class="result-language"><h3 id="result-${code}-title" lang="${code}" dir="${language.dir}">${language.nativeLabel}</h3><span>${language.label}</span></div>
    ${content}
    <div class="result-actions">
      <button class="icon-button" type="button" data-action="listen" data-code="${code}" ${controls.canListen ? '' : 'disabled'}><span aria-hidden="true">▶</span><span>Listen</span><span class="sr-only"> to ${language.label} translation</span></button>
      <button class="icon-button" type="button" data-action="copy" data-code="${code}" ${controls.canCopy ? '' : 'disabled'}><span aria-hidden="true">⧉</span><span>Copy</span><span class="sr-only"> ${language.label} translation</span></button>
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

function setRecorderMessage(message) {
  recordingStatus.textContent = message;
}

function setRecordingUi(active, busy = false) {
  recordButton.disabled = busy || !navigator.onLine;
  recordButton.classList.toggle('recording', active);
  recordButton.setAttribute('aria-pressed', String(active));
  recordButton.lastElementChild.textContent = active ? 'Stop' : busy ? 'Transcribing…' : 'Record';
  languageButtons.forEach((button) => { button.disabled = active || busy; });
}

function resetRecordingTimer() {
  recordingTimer.textContent = '0:00 / 0:30';
  recordingTimer.setAttribute('aria-label', 'Recording time: 0 seconds of 30');
}

async function stopRecording(reason = 'manual') {
  if (!recording || recording.stopping) return;
  recording.stopping = true;
  const state = recording;
  recording = undefined;
  clearInterval(state.timer);
  state.processor.disconnect();
  state.source.disconnect();
  state.stream.getTracks().forEach((track) => track.stop());
  await state.context.close();
  setRecordingUi(false, true);
  if (reason === 'offline') {
    setRecordingUi(false);
    resetRecordingTimer();
    setRecorderMessage('Connection lost. The recording was discarded because transcription requires internet.');
    return;
  }
  if (!state.voiceDetected || state.chunks.length === 0) {
    setRecordingUi(false);
    resetRecordingTimer();
    setRecorderMessage('No speech was detected. Move closer to the microphone and try again.');
    return;
  }
  setRecorderMessage(reason === 'silence' ? 'Silence detected. Transcribing…' : reason === 'limit' ? '30-second limit reached. Transcribing…' : 'Transcribing your recording…');
  try {
    const samples = downsampleAudio(state.chunks, state.context.sampleRate);
    const wav = encodeWav(samples);
    if (wav.size > 3 * 1024 * 1024) throw new Error('The recording exceeds the 3 MB limit.');
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: await blobToBase64(wav), mimeType: 'audio/wav', language: sourceLanguage })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message || 'The recording could not be transcribed.');
    input.value = [...payload.data.transcript].slice(0, 500).join('');
    updateSourceControls();
    setRecorderMessage('Transcript ready. Translating into both languages…');
    queueTranslation();
  } catch (error) {
    setRecorderMessage(error.message || 'Speech transcription failed. Please try again.');
  } finally {
    setRecordingUi(false);
    resetRecordingTimer();
  }
}

async function startRecording() {
  if (recording) return stopRecording();
  if (!navigator.onLine) {
    setRecorderMessage('You’re offline. Speech transcription requires an internet connection.');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
    setRecorderMessage('Microphone recording is unavailable in this browser.');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false });
    const context = new window.AudioContext();
    await context.resume();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const silentGain = context.createGain();
    silentGain.gain.value = 0;
    const state = { context, stream, source, processor, chunks: [], startedAt: performance.now(), lastVoiceAt: 0, voiceDetected: false, stopping: false };
    recording = state;
    processor.onaudioprocess = (event) => {
      if (!recording || recording !== state) return;
      const chunk = new Float32Array(event.inputBuffer.getChannelData(0));
      state.chunks.push(chunk);
      const elapsed = (performance.now() - state.startedAt) / 1000;
      if (calculateRms(chunk) >= SILENCE_THRESHOLD) {
        state.voiceDetected = true;
        state.lastVoiceAt = elapsed;
      } else if (state.voiceDetected && elapsed - state.lastVoiceAt >= SILENCE_SECONDS) {
        stopRecording('silence');
      }
    };
    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(context.destination);
    state.timer = setInterval(() => {
      const elapsed = Math.min(MAX_RECORDING_SECONDS, (performance.now() - state.startedAt) / 1000);
      const seconds = Math.floor(elapsed);
      recordingTimer.textContent = `0:${String(seconds).padStart(2, '0')} / 0:30`;
      recordingTimer.setAttribute('aria-label', `Recording time: ${seconds} seconds of 30`);
      if (elapsed >= MAX_RECORDING_SECONDS) stopRecording('limit');
    }, 200);
    setRecordingUi(true);
    setRecorderMessage(`Listening in ${LANGUAGES[sourceLanguage].label}. Speak clearly; recording stops after a short silence.`);
  } catch (error) {
    setRecordingUi(false);
    setRecorderMessage(error?.name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in browser settings and try again.' : 'The microphone could not be started. Check browser and device settings.');
  }
}

function translationCacheKey(text, source, target) {
  return `${source}\u0000${target}\u0000${text}`;
}

async function requestTranslations(text, targets, signal) {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source: sourceLanguage, targets }),
    signal
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    const error = new Error(payload?.error?.message || 'Translation failed. Please try again.');
    error.code = payload?.error?.code;
    throw error;
  }
  return payload.data;
}

async function translateNow() {
  const text = input.value;
  if (!text.trim()) {
    resetResults();
    globalStatus.textContent = '';
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
  const missingTargets = [];
  targets.forEach((code) => {
    const cached = translationCache.get(translationCacheKey(text, sourceLanguage, code));
    if (cached === undefined) {
      missingTargets.push(code);
      resultState.set(code, { status: 'loading', text: '', message: '' });
    } else resultState.set(code, { status: 'success', text: cached, message: '' });
  });
  renderResults();
  if (!missingTargets.length) {
    globalStatus.textContent = 'Translations ready from this session.';
    return;
  }
  globalStatus.textContent = missingTargets.length === 2 ? 'Translating into both languages…' : 'Translating the remaining language…';

  let payload;
  try {
    payload = await requestTranslations(text, missingTargets, controller.signal);
  } catch (error) {
    if (!requestGate.isCurrent(requestId) || error?.name === 'AbortError') return;
    missingTargets.forEach((code) => resultState.set(code, { status: 'error', text: '', message: error?.message || 'Translation failed. Please try again.' }));
    renderResults();
    globalStatus.textContent = 'Translations could not be completed.';
    return;
  }
  if (!requestGate.isCurrent(requestId)) return;
  missingTargets.forEach((code) => {
    if (typeof payload.translations?.[code] === 'string') {
      const translation = payload.translations[code];
      translationCache.set(translationCacheKey(text, sourceLanguage, code), translation);
      resultState.set(code, { status: 'success', text: translation, message: '' });
    } else {
      const failure = payload.errors?.[code];
      const message = failure?.code === 'RATE_LIMITED'
        ? 'Public translation limit reached. Please wait and try again.'
        : failure?.message || 'Translation failed. Please try again.';
      resultState.set(code, { status: 'error', text: '', message });
    }
  });
  renderResults();
  const successCount = targets.filter((code) => resultState.get(code)?.status === 'success').length;
  globalStatus.textContent = successCount === 2 ? 'Translations ready.' : successCount === 1 ? 'One translation is ready; one could not be completed.' : 'Translations could not be completed.';
}

function queueTranslation() {
  cancelPending();
  updateSourceControls();
  if (!input.value.trim()) {
    resetResults();
    globalStatus.textContent = '';
    return;
  }
  globalStatus.textContent = navigator.onLine ? 'Waiting for you to pause…' : 'Offline — translation needs internet.';
  debounceTimer = setTimeout(translateNow, 500);
}

function setLanguage(code, { focusInput = true } = {}) {
  if (!LANGUAGES[code] || code === sourceLanguage) return;
  cancelPending();
  sourceLanguage = code;
  const language = LANGUAGES[code];
  input.lang = code;
  input.dir = language.dir;
  input.placeholder = `Start typing in ${language.label}…`;
  languageButtons.forEach((button) => {
    const selected = button.dataset.language === code;
    button.setAttribute('aria-checked', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  resetResults();
  queueTranslation();
  if (focusInput) input.focus();
  setRecorderMessage(`Record one phrase in ${language.label}. Stops after 30 seconds or a short silence.`);
  recordingHelp.textContent = `Record one phrase in ${language.label}. Press Space or Enter to start or stop recording. Recording stops after 30 seconds or a short silence.`;
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
  recordButton.disabled = !online;
  if (!online) {
    if (recording) stopRecording('offline');
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
document.querySelector('.language-tabs').addEventListener('keydown', (event) => {
  const target = getRadioNavigationTarget(languageButtons.map((button) => button.dataset.language), sourceLanguage, event.key);
  if (!target) return;
  event.preventDefault();
  setLanguage(target, { focusInput: false });
  languageButtons.find((button) => button.dataset.language === target)?.focus();
});
input.addEventListener('input', queueTranslation);
clearButton.addEventListener('click', () => { input.value = ''; cancelPending(); updateSourceControls(); resetResults(); globalStatus.textContent = 'Text cleared.'; input.focus(); });
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
recordButton.addEventListener('click', startRecording);

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => showToast('Offline support could not be enabled.')));
resetResults();
updateSourceControls();
updateNetworkStatus();
