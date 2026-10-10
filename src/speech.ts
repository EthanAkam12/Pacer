import * as Speech from 'expo-speech';

let busy = false;
const done = () => { busy = false; };
let voice: string | undefined;
let rate = 1;

export function configureSpeech(opts: { voiceId: string | null; rate: number }) {
  voice = opts.voiceId ?? undefined;
  rate = opts.rate;
}

function options(onDone?: () => void): Speech.SpeechOptions {
  const end = () => { done(); onDone?.(); };
  return { language: voice ? undefined : 'en-GB', voice, rate, onDone: end, onStopped: end, onError: end };
}

/** Important lines always queue. Encouragement is skipped if the coach is already talking. */
export function speak(text: string, important: boolean) {
  if (!text.trim()) return;
  if (busy && !important) return;
  busy = true;
  Speech.speak(text, options());
}

/** Plays a sample line straight away, cutting off anything already playing. */
export function previewSpeech(text: string, opts: { voiceId: string | null; rate: number }) {
  Speech.stop();
  Speech.speak(text, { language: opts.voiceId ? undefined : 'en-GB', voice: opts.voiceId ?? undefined, rate: opts.rate });
}

export interface VoiceOption { id: string; name: string; language: string; enhanced: boolean }

/** English voices on this phone, best quality first. Android can take a moment to list them. */
export async function englishVoices(): Promise<VoiceOption[]> {
  let list = await Speech.getAvailableVoicesAsync().catch(() => []);
  if (!list.length) {
    await new Promise((r) => setTimeout(r, 800));
    list = await Speech.getAvailableVoicesAsync().catch(() => []);
  }
  return list
    .filter((v) => v.language?.toLowerCase().startsWith('en'))
    .map((v) => ({ id: v.identifier, name: v.name || v.identifier, language: v.language, enhanced: v.quality === Speech.VoiceQuality.Enhanced }))
    .sort((a, b) => Number(b.enhanced) - Number(a.enhanced) || a.language.localeCompare(b.language) || a.name.localeCompare(b.name));
}
