import { PlanProgress, RunRecord } from './types';
import { PlanSession, TrainingPlan } from './plans';

/**
 * Running schedule: the days of the week the runner can run (JS day numbers, 0 = Sunday).
 * Training plan sessions are placed on a spread-out subset of those days, and missed
 * sessions simply move to the next free day.
 */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** "Mon, Thu and Sat" (Monday first). */
export function dayList(days: number[], long = false): string {
  const names = WEEK_ORDER.filter((d) => days.includes(d)).map((d) => (long ? DAY_LONG : DAY_SHORT)[d]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? '';
}

/**
 * Picks `perWeek` of the free days for plan sessions, as evenly spread through the week as
 * possible so there's a rest day between runs where it fits.
 */
export function planDays(runDays: number[], perWeek: number): number[] {
  const free = WEEK_ORDER.filter((d) => runDays.includes(d));
  if (free.length <= perWeek) return free;
  const pos = (d: number) => WEEK_ORDER.indexOf(d);
  let best: number[] = [], bestScore = -1;
  const pick = (from: number, chosen: number[]) => {
    if (chosen.length === perWeek) {
      // Smallest gap between runs (wrapping round the week) matters most, then the next smallest.
      const p = chosen.map(pos);
      const gaps = p.map((x, i) => (i + 1 < p.length ? p[i + 1] - x : p[0] + 7 - x)).sort((a, b) => a - b);
      const score = gaps[0] * 100 + (gaps[1] ?? 0);
      if (score > bestScore) { bestScore = score; best = chosen; }
      return;
    }
    for (let i = from; i < free.length; i++) pick(i + 1, [...chosen, free[i]]);
  };
  pick(0, []);
  return best;
}

const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const sameDay = (a: Date, b: Date) => dayStart(a).getTime() === dayStart(b).getTime();

/** Dates for the plan's unfinished sessions, in order, from today onwards. */
export function scheduleSessions(plan: TrainingPlan, progress: PlanProgress, runDays: number[], runs: RunRecord[], now = new Date()): { session: PlanSession; date: Date }[] {
  const days = planDays(runDays, plan.perWeek);
  const left = plan.sessions.filter((s) => !progress.done[s.id]);
  if (!days.length) return [];
  // One plan session a day: if one was already finished today, the next starts tomorrow.
  const doneToday = runs.some((r) => r.planSession?.startsWith(`${plan.id}:`) && !r.simulated && sameDay(new Date(r.startedAt), now));
  const d = dayStart(now);
  if (doneToday) d.setDate(d.getDate() + 1);
  const out: { session: PlanSession; date: Date }[] = [];
  for (const s of left) {
    while (!days.includes(d.getDay())) d.setDate(d.getDate() + 1);
    out.push({ session: s, date: new Date(d) });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** "today", "tomorrow", "on Thursday" (this week or next) or "on 24 Oct". */
export function whenText(date: Date, now = new Date()): string {
  const days = Math.round((dayStart(date).getTime() - dayStart(now).getTime()) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 7) return `on ${DAY_LONG[date.getDay()]}`;
  return `on ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}

export interface WeekDay { day: number; date: Date; isToday: boolean; past: boolean; free: boolean; ran: boolean; planned: boolean }

/** This week, Monday to Sunday: which days are free, which had a run, and which have a plan session. */
export function weekDays(runDays: number[], runs: RunRecord[], planned: Date[], now = new Date()): WeekDay[] {
  const today = dayStart(now);
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return WEEK_ORDER.map((day, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      day, date,
      isToday: sameDay(date, today),
      past: date < today,
      free: runDays.includes(day),
      ran: runs.some((r) => !r.simulated && sameDay(new Date(r.startedAt), date)),
      planned: planned.some((p) => sameDay(p, date)),
    };
  });
}
