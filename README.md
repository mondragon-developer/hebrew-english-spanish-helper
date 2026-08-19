# Lingua Live

Lingua Live is a fast, accessible translator for Hebrew, English, and Spanish. Select a source language, type or record a short phrase, and receive translations in both remaining languages.

The application is designed for phones, iPads, tablets, desktop browsers, and installation as a Progressive Web App (PWA).

## Features

- Translates every direction between Hebrew, English, and Spanish
- Displays both target-language translations together
- Supports typed input and Azure-powered speech transcription
- Translates after a 500 ms pause without sending empty requests
- Cancels obsolete requests and prevents stale results
- Enforces a 500-character text limit
- Records one phrase for up to 30 seconds
- Stops recording after approximately 1.75 seconds of silence
- Enforces a 3 MB audio limit in both browser and API
- Allows only one selected recording language and one active recording
- Provides copy and device text-to-speech controls
- Applies Hebrew right-to-left direction automatically
- Handles empty, loading, success, offline, quota, timeout, and error states
- Installs as a PWA with an offline application shell
- Does not include accounts, analytics, cookies, or advertising trackers

## Supported languages

| Language | Translation code | Speech locale | Direction |
| --- | --- | --- | --- |
| Hebrew | `he` | `he-IL` | Right to left |
| English | `en` | `en-US` | Left to right |
| Spanish | `es` | `es-ES` | Left to right |

## Using Lingua Live

### Translate typed text

1. Select Hebrew, English, or Spanish as the source language.
2. Enter up to 500 characters.
3. Pause briefly while Lingua Live requests both translations.
4. Use **Copy** to copy a result or **Listen** to hear it with a compatible system voice.
5. Use **Clear** to reset the source and results.

### Translate speech

1. Select the language you intend to speak.
2. Select **Record** and allow microphone access when prompted.
3. Speak one short phrase clearly.
4. Select **Stop**, remain quiet for approximately 1.75 seconds, or wait for the 30-second limit.
5. Review the transcript in the source field. Lingua Live then translates it into both remaining languages.

Record one speaker at a time. Speech transcription requires an internet connection and configured Azure credentials.

### Improve voice playback on iPad

Lingua Live currently uses voices installed on the device for its **Listen** controls. Installing a higher-quality iPad voice can make playback sound more natural.

On supported iPadOS versions, open:

```text
Settings → Accessibility → Read & Speak → Voices → Language → Voice preference
```

Choose Hebrew, English, or Spanish, then download and select an enhanced or preferred voice when available. Menu wording can vary slightly by iPadOS version, language, or region. Voice downloads require storage space and may require Wi-Fi.

Changing the iPad voice improves playback on that device; it does not change translation or Azure speech-to-text accuracy.

## Progressive Web App

Installing Lingua Live provides:

- A dedicated application window without normal browser tabs
- An application icon on the home screen, Dock, Start menu, or app launcher
- Faster repeat loading of static interface files
- An interface that can open without a network connection
- A standalone layout with more usable screen space

New translations and speech transcription still require internet access. The service worker caches only the application shell and static assets; it does not cache translation requests, recorded audio, transcripts, or user-entered text.

### Installation

- **Android and supported desktop browsers:** select the browser install control or Lingua Live's **Install app** button when available.
- **iPhone and iPad:** open Lingua Live in Safari, select **Share**, then **Add to Home Screen**.

## Architecture

```text
Browser / installed PWA
  ├─ typed text ────────→ /api/translate ──→ MyMemory
  ├─ 16 kHz mono WAV ───→ /api/transcribe ─→ Azure AI Speech
  └─ Listen controls ───→ installed system voices
```

The frontend is dependency-free HTML, CSS, and JavaScript under `public/`. Vercel serves the production build from `dist/` and runs the same-origin Node serverless functions under `api/`.

Provider-specific logic is isolated in server-side adapters:

- `api/_lib/provider.js` — MyMemory translation
- `api/_lib/speech-provider.js` — Azure AI Speech transcription

This keeps credentials out of browser code and allows either provider to be replaced without redesigning the interface.

## Usage limits

### MyMemory translation

MyMemory measures free usage by submitted characters:

- Anonymous: approximately 5,000 characters per day
- With a valid `MYMEMORY_EMAIL`: approximately 50,000 characters per day

Lingua Live requests two translations for each source entry, so a 100-character source phrase consumes roughly 200 submitted characters. At that average size, the theoretical capacity is approximately 25 translation actions per day without an email or 250 per day with an email.

Actual usage can be lower because every pause during typing can initiate another pair of translations. Quotas may also be shared by traffic leaving the same server infrastructure. Public API limits and policies can change; consult the provider documentation before relying on these estimates.

### Azure AI Speech F0

The Azure F0 tier currently provides approximately five audio hours of speech-to-text per month with one concurrent request. That is theoretically:

- 600 recordings at 30 seconds each
- 1,200 recordings at 15 seconds each

Unused allowance does not guarantee availability, accuracy, or future pricing. When the quota is unavailable, Lingua Live returns a user-friendly quota message rather than retrying continuously.

## Privacy and security

- Translation text is sent to the same-origin API and then to MyMemory.
- Recorded audio is sent to the same-origin API and then to Azure AI Speech.
- Lingua Live does not intentionally store or log translation text, transcripts, or recorded audio.
- Translation and transcription responses use `Cache-Control: no-store`.
- The service worker excludes every `/api/` request.
- Azure credentials are read only on the server.
- Microphone access requires an explicit browser permission.
- Security headers restrict framing, unnecessary device permissions, and external scripts.
- Machine translation and speech recognition may be inaccurate; review important content with a fluent speaker.

Review the current MyMemory and Microsoft privacy terms before using the application with confidential, regulated, or sensitive information.

## Environment variables

Text translation works without environment variables. Speech transcription requires the Azure variables below.

| Variable | Required | Description |
| --- | --- | --- |
| `TRANSLATION_PROVIDER` | No | Translation adapter; defaults to `mymemory` |
| `MYMEMORY_EMAIL` | No | Valid contact email used for MyMemory quota attribution |
| `AZURE_SPEECH_KEY` | For recording | Secret key from the Azure AI Speech resource |
| `AZURE_SPEECH_REGION` | For recording | Exact Azure resource region, such as `eastus` |

Never place real secrets in `.env.example`, `public/`, GitHub commits, issues, pull requests, screenshots, or logs.

## Local development

Requirements:

- Node.js 20 or newer
- A linked Vercel project for local serverless API testing

Install dependencies and run all checks:

```bash
npm install
npm run check
```

Run a static UI preview without API functions:

```bash
npm run dev
```

Run the complete application with Vercel functions:

```bash
vercel link
vercel env pull .env.local
npx vercel dev
```

`.env.local` is ignored by Git. The `.env.example` file is hidden by default on Unix-like systems; use `ls -la` to display it.

Available scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Build and serve a static local UI preview |
| `npm run build` | Create the production `dist/` directory |
| `npm run preview` | Serve the existing production build |
| `npm test` | Run behavioral tests with Node's test runner |
| `npm run lint` | Run repository style checks |
| `npm run typecheck` | Run JavaScript syntax checks |
| `npm run check` | Run lint, syntax checks, tests, and build |

## Vercel configuration and maintenance

The repository is already configured for Vercel with `npm run build`, the `dist/` output directory, and same-origin API routes.

For a new Vercel project, connect this repository and use `main` as the Production Branch. Under **Project → Settings → Environment Variables**, configure `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` for every environment that needs microphone transcription. `MYMEMORY_EMAIL` and `TRANSLATION_PROVIDER=mymemory` remain optional.

Redeploy whenever environment variables change, then verify the HTTPS deployment. Do not hard-code localhost or deployment-specific Vercel URLs.

## Testing

The automated suite covers:

- Supported languages and target calculation
- Translation validation, provider success, failure, and timeout behavior
- Copy/listen control state and Hebrew RTL
- Language switching and stale-response prevention
- Audio energy calculation and 16 kHz downsampling
- WAV encoding and speech input validation
- Azure success, no-speech, quota, and timeout behavior
- Manifest, icons, and service-worker API exclusions
- Production build completion

Run the complete pipeline:

```bash
npm run check
```

### Release smoke test

After a production deployment, verify:

- All three source languages produce both expected translations.
- All three microphone languages transcribe and the manual, silence, and 30-second stops work.
- Copy and Listen controls work on at least one phone or iPad and one desktop browser.
- Keyboard focus, Hebrew RTL, PWA installation, and offline shell loading remain usable.
- Translation and transcription requests are not present in Cache Storage.

## Troubleshooting

### Translation fails or reaches a limit

Confirm the device is online. Wait before retrying after a quota message. Adding a valid `MYMEMORY_EMAIL` increases the documented public character allowance but does not create a service guarantee.

### Microphone recording does not start

- Confirm the page uses HTTPS or localhost.
- Allow microphone access in the browser or operating-system settings.
- On iPad, check Safari or the installed PWA's microphone permission.
- Close other applications using the microphone and retry.

### Speech transcription is not configured

Confirm both `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` exist in the active Vercel environment, then redeploy. The region must be the resource identifier such as `eastus`, not a display label or endpoint URL.

### Azure returns 401, 403, or 429

- `401` or `403`: the key is invalid, expired, or does not match the configured region.
- `429`: the F0 quota or one-concurrent-request limit may have been reached.

Rotate the Azure key immediately if it is exposed.

### Listen sounds robotic or no voice is available

Lingua Live uses system voices. Install a higher-quality voice using the iPad path documented above or the equivalent speech/voice settings on the device. Voice availability varies by operating system, browser, language, and region.

### The interface opens offline but translation does not work

This is expected. Only the application shell is available offline. Translation and speech transcription require network services.

## Known limitations

- Translation and transcription require internet access.
- MyMemory and Azure F0 are usage-limited external services.
- Listen voice quality depends on the device's installed voices.
- Lingua Live does not currently provide Azure neural text-to-speech.
- Automatic language detection is intentionally not used; the speaker selects one language per turn.
- Overlapping speakers and noisy environments reduce transcription quality.

## Possible improvements

- Replace device-dependent Listen playback with Azure Neural Text-to-Speech for more consistent, natural voices across iPads, phones, and desktops.
- Add user-selectable voice, speaking-rate, and playback controls while keeping accessible defaults.
- Move from the public MyMemory allowance to a translation provider or paid plan with higher quotas, authenticated usage, monitoring, and service commitments.
- Reduce unnecessary translation usage with smarter debounce, explicit submit mode, or client-side request deduplication.
- Add browser automation, accessibility auditing, and screenshot regression tests for representative phone, iPad, and desktop viewports.
- Add privacy-conscious, opt-in on-device history and reusable favorite phrases.
- Add a two-person conversation view with clear alternating language controls.

## License

Lingua Live is available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). You may use, modify, and distribute the software for permitted noncommercial purposes under that license. Commercial use is not granted and requires separate permission from the copyright holder.

This is a source-available noncommercial license, not an OSI-approved open-source license.
