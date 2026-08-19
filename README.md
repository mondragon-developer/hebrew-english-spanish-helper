# Lingua Live

Lingua Live is a fast, responsive translator for Hebrew, English, and Spanish. Select one source language, type up to 500 characters, and see translations in both remaining languages after a 500 ms pause.

## Features

- All six translation directions, with both target languages shown together
- Cancelled and stale-request protection, empty/loading/success/offline/rate-limit/error states
- Copy confirmation and system text-to-speech controls
- Push-to-talk speech transcription with a 30-second cap and automatic silence stop
- Correct Hebrew RTL plus `lang`/`dir` metadata
- Phone, tablet, landscape, desktop, keyboard, touch, and screen-reader support
- Installable PWA with versioned app-shell caching and offline fallback
- No accounts, analytics, cookies, or translation-text logging
- Same-origin serverless API with validation, timeout handling, and consistent errors

## Architecture

The dependency-light frontend is static HTML, CSS, and JavaScript in `public/`. Vercel serves the production build from `dist/`; `api/translate.js` and `api/transcribe.js` are same-origin Node serverless functions. Provider details live in isolated adapters, so the frontend can retain the same API contracts if providers change.

The initial adapter uses the public [MyMemory Translation API](https://mymemory.translated.net/doc/spec.php). It supports the required language pairs, but needs internet access and has public usage limits. No availability, accuracy, or pricing guarantee is implied. `MYMEMORY_EMAIL` is optional and can be used for quota attribution. Never commit real environment files.

Translation text is sent from the browser to this app's endpoint and then to MyMemory. Lingua Live does not persist or log it. Machine translation can be inaccurate; review important translations with a fluent speaker.

Speech transcription uses Azure AI Speech. The browser records 16 kHz, 16-bit mono WAV audio; recording stops after 30 seconds or approximately 1.75 seconds of silence after speech begins. Only one selected language and one recording are active at a time. Both browser and server enforce a 3 MB audio limit. The same-origin API validates the language, format, size, and duration before sending audio to Azure. Lingua Live does not store or log recorded audio.

## Local development

Requires Node.js 20 or later.

```bash
npm install
npm run dev # static UI preview; use npx vercel dev for API routes
```

Useful commands:

```bash
npm test          # meaningful Node test suite
npm run lint      # repository style checks
npm run typecheck # JavaScript syntax checks
npm run build     # production build in dist/
npm run preview   # dependency-free static production preview
npm run check     # all validation and build steps
```

The optional environment settings are:

| Variable | Purpose |
| --- | --- |
| `TRANSLATION_PROVIDER` | Provider selector; currently defaults to and accepts `mymemory` |
| `MYMEMORY_EMAIL` | Optional contact email passed to MyMemory for quota attribution |
| `AZURE_SPEECH_KEY` | Required for microphone transcription; Azure AI Speech resource key |
| `AZURE_SPEECH_REGION` | Required for microphone transcription; resource region such as `eastus` |

Translation works without environment variables. Microphone transcription remains disabled at the server until both Azure values are configured. Never expose the Azure key in frontend JavaScript or commit it to GitHub.

## Deploy to Vercel

1. In Vercel, choose **Add New → Project** and import `mondragon-developer/hebrew-english-spanish-helper` from GitHub.
2. Select `main` as the Production Branch (or the repository's current default branch).
3. Vercel reads `vercel.json`; keep the build command as `npm run build` and output directory as `dist`.
4. Optionally configure `MYMEMORY_EMAIL` and `TRANSLATION_PROVIDER=mymemory`. For speech transcription, configure `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` for Development, Preview, and Production. The Azure key is a secret.
5. Deploy, open the assigned HTTPS production URL, and confirm `/api/translate` responds to the app. Do not set a localhost or deployment-specific API URL.

GitHub-connected Vercel projects normally create a preview deployment for this pull request and a production deployment after merge to the production branch. Confirm these deployments in the Vercel dashboard rather than assuming success from the repository build alone.

## Install the PWA

- **Android / supported desktop browsers:** use the in-app **Install app** button when shown, or the browser's Install option.
- **iPhone / iPad:** open the production URL in Safari, tap **Share**, then **Add to Home Screen**.

The application shell opens offline, but new or refreshed translations always require an internet connection. Translation API responses and entered text are never cached by the service worker. The worker uses a versioned, network-first shell strategy so releases are not held indefinitely.

## Mobile and iPad support

The layout stacks on phones, becomes a two-column results layout on tablets, and uses a split workspace on desktop. It includes 44px touch targets, 16px-or-larger form text to avoid iOS focus zoom, safe-area padding, dynamic viewport units, visible focus indicators, flexible wrapping, landscape tuning, and reduced-motion support. No essential control is fixed over the virtual keyboard.

## Troubleshooting

- **Translation:** confirm you are online. A timeout or provider-limit message can be retried later. MyMemory is a public third-party service with finite capacity.
- **Speech:** browser speech synthesis and installed voices vary by OS. Install an appropriate Hebrew, English, or Spanish system voice if prompted. iOS may require a direct user tap before playback.
- **Microphone transcription:** requires HTTPS or localhost, explicit microphone permission, internet access, and configured Azure Speech variables. On iPhone/iPad, allow microphone access for Safari or the installed PWA. Record one speaker at a time. A 401/403 usually means the key and region do not match; 429 can mean the Azure F0 quota or concurrency limit was reached.
- **Clipboard:** HTTPS or localhost is normally required. If browser policy denies access, select and copy the displayed text manually.
- **Offline:** only the interface and static assets work offline. Reconnect before entering text that needs translation.
- **Old app shell:** reload once while online. If necessary, remove and reinstall the PWA to refresh browser-managed assets.

## Post-deployment checklist

- [ ] Hebrew → English and Spanish
- [ ] English → Hebrew and Spanish
- [ ] Spanish → Hebrew and English
- [ ] Copy controls and visible confirmation
- [ ] Source and result speech controls, including missing-voice messaging
- [ ] Microphone permission, manual stop, 30-second stop, and silence stop
- [ ] Hebrew, English, and Spanish recordings produce editable transcripts
- [ ] Phone portrait and landscape layout (representative 390×844 viewport)
- [ ] iPad portrait (768×1024) and landscape (1024×768)
- [ ] Desktop layout (representative 1440×900)
- [ ] Keyboard navigation, focus visibility, and screen-reader announcements
- [ ] Install on Android/desktop and via iOS/iPadOS Add to Home Screen
- [ ] Offline application shell loads and clearly blocks new translations
- [ ] Translation requests are absent from Cache Storage
