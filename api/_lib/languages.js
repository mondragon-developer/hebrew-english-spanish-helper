export const LANGUAGES = Object.freeze({
  he: Object.freeze({ code: 'he', label: 'Hebrew', nativeLabel: 'עברית', locale: 'he-IL', dir: 'rtl' }),
  en: Object.freeze({ code: 'en', label: 'English', nativeLabel: 'English', locale: 'en-US', dir: 'ltr' }),
  es: Object.freeze({ code: 'es', label: 'Spanish', nativeLabel: 'Español', locale: 'es-ES', dir: 'ltr' })
});

export const SUPPORTED_LANGUAGE_CODES = Object.freeze(Object.keys(LANGUAGES));
export const MAX_TEXT_LENGTH = 500;

export function getTargetLanguages(source) {
  return SUPPORTED_LANGUAGE_CODES.filter((code) => code !== source);
}
