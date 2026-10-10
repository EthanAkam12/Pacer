import * as Speech from 'expo-speech';

let busy = false;
const done = () => { busy = false; };

/** Important lines always queue. Encouragement is skipped if the coach is already talking. */
export function speak(text: string, important: boolean) {
  if (busy && !important) return;
  busy = true;
  Speech.speak(text, { language: 'en-GB', rate: 1.0, onDone: done, onStopped: done, onError: done });
}
