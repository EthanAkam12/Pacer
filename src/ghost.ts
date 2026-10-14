import { RunRecord } from './types';
import { fmtShortDate } from './format';

/**
 * Ghost runner (Pacer Plus): race a past run. A run's distance-over-time comes from its saved
 * track, or (older runs) is rebuilt from its splits.
 */
export function ghostTrack(r: RunRecord): { t: number; d: number }[] | null {
  if (r.track && r.track.length > 1) return r.track;
  if (r.splits.length < 2) return null;
  let t = 0;
  return [{ t: 0, d: 0 }, ...r.splits.map((s) => ({ t: (t += s.time), d: s.distance }))];
}

/** Runs that can be a ghost for a run of `meters`: real GPS runs that covered the distance, fastest first. */
export function ghostCandidates(runs: RunRecord[], meters: number): RunRecord[] {
  const timeAt = (r: RunRecord) => {
    const g = ghostTrack(r);
    const i = g ? g.findIndex((x) => x.d >= meters) : -1;
    return g && i > 0 ? g[i - 1].t + ((meters - g[i - 1].d) / Math.max(1, g[i].d - g[i - 1].d)) * (g[i].t - g[i - 1].t) : Infinity;
  };
  return runs
    .filter((r) => !r.simulated && !r.treadmill && r.distance >= meters * 0.98 && ghostTrack(r))
    .map((r) => ({ r, time: timeAt(r) }))
    .filter((x) => isFinite(x.time))
    .sort((a, b) => a.time - b.time)
    .map((x) => x.r);
}

/** The ghost for a run from the "ghost" setting: 'off', 'best' or a run id. */
export function pickGhost(choice: string, runs: RunRecord[], meters: number): { label: string; track: { t: number; d: number }[] } | null {
  if (choice === 'off') return null;
  const list = ghostCandidates(runs, meters);
  const run = choice === 'best' ? list[0] : list.find((r) => r.id === choice);
  const track = run ? ghostTrack(run) : null;
  if (!run || !track) return null;
  return { label: choice === 'best' ? 'your best' : `your ${fmtShortDate(run.startedAt)} run`, track };
}
