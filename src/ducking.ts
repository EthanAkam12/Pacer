import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/**
 * Lowers other apps' audio (music, podcasts) while the coach talks, then brings it back.
 *
 * Text-to-speech doesn't ask the phone to duck other audio by itself, so while the coach speaks
 * we play a silent sound through expo-audio with interruption mode 'duckOthers'. That asks the
 * phone for "transient focus, others may duck" (Android) or activates a ducking audio session (iOS).
 * Pausing it hands the volume back.
 */
let player: AudioPlayer | null = null;
let ready: Promise<void> | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
let ducked = false;

function setup() {
  ready ??= (async () => {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers', shouldPlayInBackground: true });
    player = createAudioPlayer(require('../assets/sounds/silence.wav'));
    player.loop = true;
    player.volume = 0;
  })().catch(() => { ready = null; });
  return ready;
}

/** Call when a line starts. */
export async function duck() {
  if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; }
  if (ducked) return;
  ducked = true;
  await setup();
  try { player?.play(); } catch { /* ducking is best effort */ }
}

/** Call when the coach has finished talking. Waits a moment in case another line follows straight away. */
export function unduck() {
  if (releaseTimer) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    releaseTimer = null;
    ducked = false;
    try { player?.pause(); } catch { /* already stopped */ }
  }, 600);
}
