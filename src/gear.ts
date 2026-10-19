import { Race, RunRecord, Shoe } from './types';

/** Shoes and race helpers. */

/** km on a pair of shoes: what they'd done before Pacely, plus every real run in them. */
export function shoeKm(shoe: Shoe, runs: RunRecord[]): number {
  return shoe.startKm + runs.filter((r) => r.shoeId === shoe.id && !r.simulated).reduce((a, r) => a + r.distance / 1000, 0);
}

/** Whole days from today until the race (0 = today, negative = it's been). */
export function daysUntil(race: Race, now = new Date()): number {
  const [y, m, d] = race.date.split('-').map(Number);
  const day = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((day - today) / 864e5);
}

/** "12/04/2027" or "12/4/27" → "2027-04-12"; null if it isn't a real date. */
export function parseDate(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  const date = new Date(y, mo - 1, d);
  if (date.getDate() !== d || date.getMonth() !== mo - 1) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
export const showDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

export const RACE_DISTANCES = [
  { label: '5K', km: 5 }, { label: '10K', km: 10 }, { label: 'Half marathon', km: 21.0975 }, { label: 'Marathon', km: 42.195 },
];
export const raceDistanceName = (km: number) => RACE_DISTANCES.find((r) => Math.abs(r.km - km) < 0.01)?.label ?? `${+km.toFixed(2)} km`;
