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

export function getRadioNavigationTarget(codes, current, key) {
  if (!codes.length) return null;
  if (key === 'Home') return codes[0];
  if (key === 'End') return codes[codes.length - 1];
  const direction = ['ArrowRight', 'ArrowDown'].includes(key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(key) ? -1 : 0;
  if (!direction) return null;
  const index = Math.max(0, codes.indexOf(current));
  return codes[(index + direction + codes.length) % codes.length];
}
