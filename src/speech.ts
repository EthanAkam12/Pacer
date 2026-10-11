import * as Speech from 'expo-speech';
import type { Persona } from './coach';

let busy = false;
const done = () => { busy = false; };
let current = { voiceId: undefined as string | undefined, rate: 1, pitch: 1 };

export interface VoiceSettings { voiceId: string | null; rate: number; pitch: number }

export function configureSpeech(v: VoiceSettings) {
  current = { voiceId: v.voiceId ?? undefined, rate: v.rate, pitch: v.pitch };
}

const opts = (v: { voiceId?: string; rate: number; pitch: number }): Speech.SpeechOptions => ({
  language: v.voiceId ? undefined : 'en-GB', voice: v.voiceId, rate: v.rate, pitch: v.pitch,
});

/**
 * Important lines always queue. Others are skipped if the coach is already talking.
 * Returns false when the line was skipped.
 */
export function speak(text: string, important: boolean): boolean {
  if (!text.trim()) return true;
  if (busy && !important) return false;
  busy = true;
  Speech.speak(text, { ...opts(current), onDone: done, onStopped: done, onError: done });
  return true;
}

/** Plays a sample line straight away, cutting off anything already playing. */
export function previewSpeech(text: string, v: VoiceSettings) {
  Speech.stop();
  Speech.speak(text, opts({ voiceId: v.voiceId ?? undefined, rate: v.rate, pitch: v.pitch }));
}

// ----- choosing a natural voice -----

export interface VoiceOption {
  id: string;
  name: string;
  language: string; // e.g. en-GB
  quality: 'premium' | 'enhanced' | 'standard';
  gender: 'female' | 'male' | null;
}

/** Google voices on Android are named by a three-letter code, e.g. en-gb-x-gbb-local. */
const ANDROID_GENDER: Record<string, 'female' | 'male'> = {
  iob: 'female', iog: 'female', iol: 'male', iom: 'male', sfg: 'female', tpc: 'female', tpd: 'male', tpf: 'female',
  gba: 'female', gbb: 'male', gbc: 'female', gbd: 'male', gbg: 'female', rjs: 'male',
  aua: 'female', aub: 'male', auc: 'female', aud: 'male',
};
const IOS_FEMALE = ['samantha', 'karen', 'moira', 'tessa', 'kate', 'serena', 'martha', 'stephanie', 'catherine', 'nicky', 'allison', 'ava', 'susan', 'victoria', 'zoe', 'fiona', 'veena', 'isha', 'kathy'];
const IOS_MALE = ['daniel', 'arthur', 'oliver', 'malcolm', 'alex', 'aaron', 'tom', 'evan', 'nathan', 'lee', 'gordon', 'rishi', 'jamie', 'fred', 'ralph'];
/** Apple's joke and retro voices. They sound very robotic, so they're never offered. */
const NOVELTY = ['albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester', 'organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox', 'junior', 'ralph', 'fred', 'kathy',
  'eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley'];

function describe(v: Speech.Voice): VoiceOption | null {
  const id = v.identifier, lid = id.toLowerCase();
  const name = (v.name || id).replace(/\s*\(.*\)\s*$/, '');
  const first = name.toLowerCase().split(/[\s-]/)[0];
  if (lid.includes('speech.synthesis') || lid.includes('eloquence') || NOVELTY.includes(name.toLowerCase()) || NOVELTY.includes(first)) return null;
  const code = lid.match(/-x-([a-z]{3})-/)?.[1];
  const gender = code ? ANDROID_GENDER[code] ?? null : IOS_FEMALE.includes(first) ? 'female' : IOS_MALE.includes(first) ? 'male' : null;
  const quality = lid.includes('premium') ? 'premium' : lid.includes('enhanced') || v.quality === Speech.VoiceQuality.Enhanced ? 'enhanced' : 'standard';
  const language = v.language.replace('_', '-');
  const [lang, region = ''] = language.split('-');
  return { id, name: code ? androidName(region, gender, code) : name, language: `${lang}-${region.toUpperCase()}`, quality, gender };
}

const REGION: Record<string, string> = { GB: 'British', US: 'American', AU: 'Australian', IE: 'Irish', IN: 'Indian', ZA: 'South African', NZ: 'New Zealand', CA: 'Canadian' };
function androidName(region: string, gender: 'female' | 'male' | null, code: string) {
  return `${REGION[region.toUpperCase()] ?? 'English'} ${gender ?? 'voice'} (${code.toUpperCase()})`;
}
export const accentName = (language: string) => REGION[language.split('-')[1]] ?? 'English';

let cache: VoiceOption[] | null = null;

/** Natural-sounding English voices on this phone, best quality first. Android can take a moment to list them. */
export async function englishVoices(): Promise<VoiceOption[]> {
  if (cache?.length) return cache;
  let list = await Speech.getAvailableVoicesAsync().catch(() => []);
  if (!list.length) {
    await new Promise((r) => setTimeout(r, 800));
    list = await Speech.getAvailableVoicesAsync().catch(() => []);
  }
  const seen = new Set<string>();
  cache = list
    .filter((v) => v.language?.toLowerCase().startsWith('en'))
    .map(describe)
    .filter((v): v is VoiceOption => !!v && !seen.has(v.id) && !!seen.add(v.id))
    .sort((a, b) => QUALITY[b.quality] - QUALITY[a.quality] || a.language.localeCompare(b.language) || a.name.localeCompare(b.name));
  return cache;
}

const QUALITY = { premium: 30, enhanced: 20, standard: 0 };

/** The voice on this phone that best suits a coach: right gender, preferred accent, highest quality. */
export function bestVoiceFor(p: Persona, voices: VoiceOption[]): VoiceOption | null {
  let best: VoiceOption | null = null, top = -Infinity;
  for (const v of voices) {
    const accent = p.accents.indexOf(v.language);
    const score = QUALITY[v.quality]
      + (v.gender === p.gender ? 25 : v.gender ? -40 : 0)
      + (accent >= 0 ? 12 - accent * 3 : 0)
      + (v.id.toLowerCase().includes('network') ? -2 : 0); // network voices stall without signal
    if (score > top) { top = score; best = v; }
  }
  return best;
}

/** The voice, speed and pitch a coach speaks with, taking the person's own choices into account. */
export async function voiceFor(p: Persona, chosenVoiceId: string | null, speed: number): Promise<VoiceSettings> {
  const voiceId = chosenVoiceId ?? bestVoiceFor(p, await englishVoices().catch(() => []))?.id ?? null;
  return { voiceId, rate: p.rate * speed, pitch: p.pitch };
}
