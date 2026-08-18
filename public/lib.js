export const LANGUAGES = Object.freeze({
  he: Object.freeze({ code: 'he', label: 'Hebrew', nativeLabel: 'עברית', locale: 'he-IL', dir: 'rtl' }),
  en: Object.freeze({ code: 'en', label: 'English', nativeLabel: 'English', locale: 'en-US', dir: 'ltr' }),
  es: Object.freeze({ code: 'es', label: 'Spanish', nativeLabel: 'Español', locale: 'es-ES', dir: 'ltr' })
});

export function getTargetLanguages(source) {
  return Object.keys(LANGUAGES).filter((code) => code !== source);
}

export function deriveControlState(text = '') {
  return { canCopy: text.trim().length > 0, canListen: text.trim().length > 0 };
}

export function createRequestGate() {
  let current = 0;
  return {
    next() { current += 1; return current; },
    isCurrent(id) { return id === current; },
    invalidate() { current += 1; }
  };
}
