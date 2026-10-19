import { useEffect, useState } from 'react';

/**
 * Pacely Plus: the paid extras. Everything that was free stays free; Plus adds depth on top.
 * Until payments are set up (Google Play Billing, needs the app on the Play Store), Plus is
 * switched on from the Pacely Plus screen for testing. The flag lives in Settings and is mirrored
 * here so any screen can check it synchronously.
 */
export const PLUS_PRICE = { month: '£3.99', year: '£29.99', trialDays: 7 };

export const PLUS_BENEFITS: { icon: string; title: string; text: string }[] = [
  { icon: 'book', title: 'Story runs', text: 'Run through an adventure: escape a zombie city, pull off a heist, rescue a crew on Mars. The sprints are part of the story.' },
  { icon: 'flag', title: 'Race mode', text: 'Set a goal finish time and your coach paces you live to hit it, with even or negative-split pacing and a projected finish.' },
  { icon: 'chatbubbles', title: 'Coach reviews', text: 'A written review after every run (what went well, what to work on, what next) and a weekly coach report.' },
  { icon: 'sparkles', title: 'Personal adaptive plans', text: 'Tell Pacely your goal and race date. It builds a plan around your fitness and free days, then adjusts your paces as you go.' },
  { icon: 'location', title: 'Local leaderboard', text: 'See who the best runners are in your area.' },
  { icon: 'people', title: 'Ghost runner', text: 'Race your best run live. The coach tells you how far ahead or behind your ghost you are.' },
  { icon: 'analytics', title: 'Advanced stats', text: 'Training load, a fitness score (VO2 max estimate), heart-rate zones and your year in review.' },
  { icon: 'library', title: 'More training plans', text: 'Marathon, sub-25 and sub-20 5K, 10K personal best, and an easy return after injury.' },
  { icon: 'color-palette', title: 'Extras', text: 'Bonus colour themes, two extra coaches and more share-card designs.' },
];

let plus = false;
const listeners = new Set<() => void>();
export function setPlusFlag(on: boolean) { plus = on; listeners.forEach((l) => l()); }
export const hasPlus = () => plus;

export function usePlus(): boolean {
  const [, force] = useState(0);
  useEffect(() => { const l = () => force((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return plus;
}
