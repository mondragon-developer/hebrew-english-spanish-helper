# Accessibility

Lingua Live targets conformance with the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA.

This is a conformance target, not yet a formal conformance claim. A formal claim requires manual evaluation of the complete deployed experience with assistive technologies in addition to automated tests.

## Supported accessibility features

- Complete keyboard operation, including arrow-key navigation within the source-language radio group
- Visible focus indicators and a skip link
- Semantic landmarks, headings, buttons, status regions, and accessible names
- Hebrew right-to-left presentation with programmatic language and direction metadata
- Polite announcements for network, recording, translation, and error states
- Controls sized for touch use and enhanced control-boundary contrast
- Responsive reflow, text wrapping, safe-area support, and no orientation lock
- Reduced-motion and forced-colors support
- Device text-to-speech controls with unavailable-voice feedback
- No CAPTCHA, account, authentication, advertising, or analytics flow

## Automated checks

The test suite verifies core text and non-text contrast ratios, language-selection keyboard behavior, radio-group tab stops, live-region semantics, RTL metadata, control availability, stale-request prevention, server validation, PWA behavior, and production build completion.

Run all checks with:

```bash
npm run check
```

## Manual verification required before a conformance claim

- Keyboard-only operation at 100%, 200%, and 400% zoom
- Text-spacing overrides and browser text enlargement
- VoiceOver with Safari on iPhone, iPad, and macOS
- NVDA with Chrome and Firefox on Windows
- TalkBack with Chrome on Android
- Voice Control or Voice Access label activation
- Forced-colors and high-contrast modes
- Portrait and landscape layouts for phone and iPad
- All empty, loading, success, offline, rate-limit, provider-error, microphone-denied, recording, and transcription states
- Translation and speech behavior in Hebrew, English, and Spanish

## Known external-content limitation

User-entered text and machine-generated translations can contain arbitrary language and complexity. Lingua Live preserves their language direction and renders them as text, but cannot guarantee the linguistic accuracy or readability of provider-generated content.

## Report an accessibility problem

Open an issue in the [GitHub repository](https://github.com/mondragon-developer/hebrew-english-spanish-helper/issues) with the affected page or control, browser, operating system, assistive technology, and steps to reproduce the problem. Do not include Azure credentials, recordings, or private translation text.
