const TIMEOUT_MS = 15000;
const REGION_PATTERN = /^[a-z0-9-]+$/;

export class SpeechProviderError extends Error {
  constructor(message, status = 502, code = 'SPEECH_PROVIDER_ERROR') {
    super(message);
    this.name = 'SpeechProviderError';
    this.status = status;
    this.code = code;
  }
}

export async function transcribeWithAzure({ audio, locale }, options = {}) {
  const key = options.key ?? process.env.AZURE_SPEECH_KEY;
  const region = options.region ?? process.env.AZURE_SPEECH_REGION;
  if (!key || !region || !REGION_PATTERN.test(region)) {
    throw new SpeechProviderError('Speech transcription is not configured.', 503, 'SPEECH_NOT_CONFIGURED');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? TIMEOUT_MS);
  const url = new URL(`https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`);
  url.searchParams.set('language', locale);
  url.searchParams.set('format', 'detailed');
  url.searchParams.set('profanity', 'raw');
  try {
    const response = await (options.fetchImpl ?? globalThis.fetch)(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        Accept: 'application/json'
      },
      body: audio,
      signal: controller.signal
    });
    if (response.status === 401 || response.status === 403) throw new SpeechProviderError('Speech service authentication failed.', 503, 'SPEECH_AUTH_ERROR');
    if (response.status === 429) throw new SpeechProviderError('The free speech transcription limit is currently unavailable. Please try again later.', 429, 'SPEECH_RATE_LIMITED');
    if (!response.ok) throw new SpeechProviderError('The speech service is temporarily unavailable.');
    const payload = await response.json();
    if (payload.RecognitionStatus === 'NoMatch') throw new SpeechProviderError('No clear speech was detected. Please try again.', 422, 'NO_SPEECH');
    if (payload.RecognitionStatus !== 'Success') throw new SpeechProviderError('The recording could not be transcribed.', 422, 'TRANSCRIPTION_FAILED');
    const text = payload.NBest?.[0]?.Display || payload.DisplayText;
    if (typeof text !== 'string' || !text.trim()) throw new SpeechProviderError('No clear speech was detected. Please try again.', 422, 'NO_SPEECH');
    return text.trim();
  } catch (error) {
    if (error instanceof SpeechProviderError) throw error;
    if (error?.name === 'AbortError') throw new SpeechProviderError('Speech transcription timed out. Please try again.', 504, 'SPEECH_TIMEOUT');
    throw new SpeechProviderError('Could not reach the speech service. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}
