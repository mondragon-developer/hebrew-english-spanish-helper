# Lingua Live Project Tracker

Last updated: August 18, 2026

This file is intentionally local-only. It has not been committed or pushed to GitHub.

## Current status

- Status: Implementation complete; awaiting PR review, Vercel preview verification, and merge
- Repository: https://github.com/mondragon-developer/hebrew-english-spanish-helper
- Feature branch: `agent/lingua-live`
- Commit: `3fd7fd319f80702bc6f4459862b28bc970c9d50d`
- Pull request: https://github.com/mondragon-developer/hebrew-english-spanish-helper/pull/1
- Pull request state at last check: Open, draft, and mergeable
- Production deployment: Not yet verified

## Completed work

- [x] Responsive translator for Hebrew, English, and Spanish
- [x] All six translation directions
- [x] Two simultaneous target-language results
- [x] 500 ms live-translation debounce
- [x] Cancellation and stale-response protection
- [x] 500-character client and server limit
- [x] Empty, loading, success, offline, rate-limit, and error states
- [x] Clear, copy, and text-to-speech controls
- [x] Copy confirmation and missing-speech/voice messages
- [x] Hebrew RTL and English/Spanish LTR presentation
- [x] Accessible language and direction attributes
- [x] Mobile, iPad, landscape, and desktop responsive styling
- [x] Safe-area, dynamic viewport, focus, touch-target, and reduced-motion support
- [x] Same-origin Vercel `/api/translate` endpoint
- [x] Server-side request validation and provider timeout
- [x] Replaceable MyMemory provider adapter
- [x] Security and no-store response headers
- [x] Installable PWA manifest and application icons
- [x] Versioned service worker and offline app-shell fallback
- [x] Translation API excluded from service-worker caching
- [x] Online/offline and installation status messaging
- [x] CI workflow and zero-dependency lockfile
- [x] README with development, deployment, PWA, troubleshooting, and verification instructions
- [x] Feature branch, commit, GitHub upstream, and draft pull request

## Validation results

- [x] `npm install` — passed; 0 vulnerabilities
- [x] `npm run lint` — passed
- [x] `npm run typecheck` — passed
- [x] `npm test` — 18/18 tests passed
- [x] `npm run build` — passed
- [x] Manifest and JSON validation — passed
- [x] PWA icons — verified at 192×192, 512×512, and 180×180
- [x] Local HTTP app-shell smoke test — HTTP 200
- [ ] Browser automation — unavailable in the implementation environment
- [ ] Automated phone, iPad, and desktop screenshots — unavailable in the implementation environment
- [ ] Live MyMemory translation smoke test through Vercel — pending deployment preview

## Next actions

### GitHub and Vercel

- [ ] Open PR #1 and review the complete diff
- [ ] Confirm Vercel created a preview deployment for `agent/lingua-live`
- [ ] Open the preview URL and test live `/api/translate` requests
- [ ] Optionally configure `TRANSLATION_PROVIDER=mymemory`
- [ ] Optionally configure `MYMEMORY_EMAIL` for public API quota attribution
- [ ] Complete the manual verification checklist below
- [ ] Mark the PR ready for review when satisfied
- [ ] Merge PR #1 into `main`
- [ ] Confirm Vercel deploys `main` to production
- [ ] Record the final production URL in this tracker

Production URL: _pending_

### Manual verification checklist

- [ ] Hebrew → English and Spanish
- [ ] English → Hebrew and Spanish
- [ ] Spanish → Hebrew and English
- [ ] Paragraphs, punctuation, and line breaks remain usable
- [ ] Rapid typing never shows a stale translation
- [ ] Changing source language cancels the previous request
- [ ] Empty text sends no API request
- [ ] 500-character counter and limit work
- [ ] Clear button resets results
- [ ] Copy buttons and confirmations work
- [ ] Source and translation speech controls work
- [ ] Missing voice and unavailable speech messages are useful
- [ ] Offline shell loads and clearly blocks new translations
- [ ] Reconnecting resumes translation
- [ ] Translation requests are absent from Cache Storage
- [ ] PWA installs on Android or a supported desktop browser
- [ ] PWA installs on iPhone/iPad through Share → Add to Home Screen
- [ ] Phone portrait around 390×844
- [ ] Phone landscape
- [ ] iPad portrait around 768×1024
- [ ] iPad landscape around 1024×768
- [ ] Desktop around 1440×900
- [ ] Keyboard navigation and visible focus states
- [ ] Screen-reader names and status announcements

## Future improvements

- [ ] Evaluate a provider with authenticated quotas and service guarantees
- [ ] Add provider health monitoring without logging translation text
- [ ] Add browser-based end-to-end tests for debounce, cancellation, copy, and RTL
- [ ] Add automated accessibility checks
- [ ] Add screenshot regression tests for phone, iPad, and desktop layouts
- [ ] Consider language auto-detection while retaining explicit user control
- [ ] Consider translation history stored only on-device and only with explicit consent
- [ ] Review service-worker cache version during every release
- [ ] Review supported browser and system-voice behavior periodically

## Local testing notes

The laptop does not have a system Node installation. A temporary portable Node runtime was used at:

```text
/private/tmp/lingua-node/bin
```

If it still exists, run:

```bash
cd ~/Documents/jla-translator
export PATH="/private/tmp/lingua-node/bin:$PATH"
npm run check
npm run build
npm run preview
```

The static preview is normally available at `http://127.0.0.1:4173`. It does not execute the Vercel API function. Use `npx vercel dev` or a Vercel preview deployment to test live translation.

## Important constraints

- MyMemory requires an internet connection and has public usage limits.
- Machine translation is not guaranteed to be exact.
- New translations do not work offline.
- Translation text must not be logged or cached.
- Secrets and `.env` files must never be committed.
- Do not claim a successful production deployment until the Vercel URL has been opened and tested.
