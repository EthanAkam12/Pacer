import type { LocationObject } from 'expo-location';
import { IntervalResult, IntervalStep, LiveSnapshot, Phase, Plan, RunRecord, Split } from './types';
import { cap, haversine, sayDist, sayPace, sayTime, uid } from './format';
import { expandWorkout, KIND_NAME, stepLabel, stepSpoken } from './intervals';
import { configureSpeech, speak } from './speech';
import { hrStore } from './heartRate';
import { loadRuns, saveRun } from './storage';
import { recordAttempt } from './planAdapt';
import { COACHES, CoachLines } from './coach';
import { bestEfforts, newPbs, PB_DISTANCES } from './records';
import { allRanks, RANKED, rankFor } from './ranks';
import { ACHIEVEMENTS, earned } from './progress';
import { startTracking, stopTracking } from './tracking';

/** Practice mode runs the clock this many times faster than real time. */
export const SIM_SPEED = 5;

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
/** Picks a version of a line, avoiding the one used last time for the same cue where possible. */
const lastPick = new Map<string[], string>();
const vary = (options: string[]) => {
  const fresh = options.length > 1 ? options.filter((o) => o !== lastPick.get(options)) : options;
  const o = pick(fresh.length ? fresh : options);
  lastPick.set(options, o);
  return o;
};
/** Joins sentences, dropping any a coach leaves empty. */
const join = (...parts: string[]) => parts.filter((x) => x.trim()).join(' ');
const mean = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);

type Listener = (s: LiveSnapshot) => void;

class RunSession {
  private plan: Plan | null = null;
  private lines: CoachLines = COACHES.friendly;
  private phase: Phase = 'idle';
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  // clock (ms)
  private acc = 0;
  private segStart = 0;
  private sim = 0;
  private startedAt = 0;

  // distance
  private dist = 0;
  private samples: { t: number; d: number }[] = [];
  private lastPos: { lat: number; lon: number; t: number } | null = null;
  private route: { lat: number; lon: number; t?: number }[] = [];
  // auto-pause, treadmill and ghost
  private autoPaused = false;
  private lastMoveT = 0;
  private anchor: { lat: number; lon: number } | null = null;
  private lastTreadT = 0;
  private ghostNextD = 500;
  private ghostGap: number | null = null;
  private track: { t: number; d: number }[] = []; // whole run, one point a tick, for best efforts

  // km splits
  private splits: Split[] = [];
  private nextSplit = 1000;
  private lastSplitT = 0;
  private lastSplitD = 0;
  private splitHr: number[] = [];

  // intervals
  private steps: IntervalStep[] = [];
  private stepIdx = 0;
  private stepStartT = 0;
  private stepStartD = 0;
  private stepHr: number[] = [];
  private repRef: number | null = null;
  private intervals: IntervalResult[] = [];

  // coaching memory
  private flags = new Set<string>();
  private slowSince: number | null = null;
  private slowNow = false;
  private lastSlowWarn = -999;
  private warnedAt = -999;
  private lastHrWarn = -999;
  private nextHrT = 0;
  private nextHrD = 0;
  private lastSpoke = 0;
  private lastMotivate = 0;
  private coachLine = '';
  private gpsStatus = '';
  private notice: string | null = null;

  // heart rate
  private hrSum = 0;
  private hrN = 0;
  private hrMax = 0;
  private simHr = 105;

  private recordId: string | null = null;

  private fresh() {
    this.acc = 0; this.segStart = 0; this.sim = 0; this.startedAt = 0;
    this.dist = 0; this.samples = []; this.lastPos = null; this.route = []; this.track = [{ t: 0, d: 0 }];
    this.splits = []; this.nextSplit = 1000; this.lastSplitT = 0; this.lastSplitD = 0; this.splitHr = [];
    this.steps = []; this.stepIdx = 0; this.stepStartT = 0; this.stepStartD = 0; this.stepHr = []; this.repRef = null; this.intervals = [];
    this.flags = new Set(); this.slowSince = null; this.slowNow = false; this.lastSlowWarn = -999; this.warnedAt = -999;
    this.lastHrWarn = -999; this.nextHrT = 0; this.nextHrD = 0; this.lastSpoke = 0; this.lastMotivate = 0; this.coachLine = ''; this.gpsStatus = ''; this.notice = null;
    this.hrSum = 0; this.hrN = 0; this.hrMax = 0; this.simHr = 105; this.recordId = null;
    this.autoPaused = false; this.lastMoveT = 0; this.anchor = null; this.lastTreadT = 0; this.ghostNextD = 500; this.ghostGap = null;
  }

  // ---------- public API ----------

  async start(plan: Plan): Promise<{ ok: boolean; message: string | null }> {
    if (this.phase === 'running' || this.phase === 'paused') return { ok: true, message: null };
    this.fresh();
    this.plan = plan;
    this.lines = COACHES[plan.coach] ?? COACHES.friendly;
    configureSpeech({ voiceId: plan.voiceId, rate: plan.voiceRate, pitch: plan.voicePitch, duckMusic: plan.duckMusic });

    if (!plan.simulate && !plan.treadmill) {
      const res = await startTracking((locs) => this.onLocations(locs));
      if (!res.ok) return res;
      this.notice = res.message;
      this.gpsStatus = 'Finding GPS…';
    }
    if (plan.treadmill) this.flags.add('gps');

    this.phase = 'running';
    this.startedAt = Date.now();
    this.segStart = this.now();
    this.nextSplit = plan.splitEvery;
    const every = Number(plan.hrEvery.slice(1));
    this.nextHrT = plan.hrEvery.startsWith('t') ? every : Infinity;
    this.nextHrD = plan.hrEvery.startsWith('d') ? every : Infinity;

    if (plan.mode === 'intervals' && plan.workout) {
      this.steps = expandWorkout(plan.workout);
      this.say(vary(this.lines.workoutStart(plan.planLabel?.replace(/\.$/, '') ?? plan.workout.name)), true);
      this.announceStep(null);
    } else {
      const what = `${cap(sayDist(plan.goalMeters))}${plan.targetPace ? `, target pace ${sayPace(plan.targetPace)}` : ''}`;
      this.say(join(plan.planLabel ?? '', vary(this.lines.start(what))), true);
    }

    this.timer = setInterval(() => this.tick(true), 1000);
    this.emit();
    return { ok: true, message: null };
  }

  pause() {
    if (this.phase !== 'running') return;
    this.acc += this.now() - this.segStart;
    this.phase = 'paused';
    this.say(vary(this.lines.paused), true);
    this.emit();
  }

  resume(spoken = true) {
    if (this.phase !== 'paused') return;
    this.phase = 'running';
    this.segStart = this.now();
    this.lastPos = null; // don't count distance moved while paused
    this.samples = [];
    this.slowSince = null;
    this.autoPaused = false;
    this.anchor = null;
    this.lastMoveT = this.elapsed();
    this.lastTreadT = this.elapsed();
    if (spoken) this.say(vary(this.lines.resumed), true);
    this.emit();
  }

  async finish(reached: boolean) {
    if (this.phase !== 'running' && this.phase !== 'paused') return;
    const p = this.plan!;
    const t = this.elapsed();
    this.acc = t * 1000;
    this.phase = 'finishing';
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await stopTracking();

    // close off the last partial split and interval
    const sd = this.dist - this.lastSplitD;
    if (sd > 20) {
      const st = t - this.lastSplitT;
      this.splits.push({ distance: this.dist, time: st, pace: st / (sd / 1000), hr: mean(this.splitHr) });
    }
    if (p.mode === 'intervals' && this.stepIdx < this.steps.length) this.completeStep(t, false);

    const avg = this.dist > 50 ? t / (this.dist / 1000) : 0;
    if (reached && p.mode === 'intervals') {
      this.say(vary(this.lines.workoutDone(sayDist(this.dist), sayTime(t))), true);
    } else if (reached) {
      this.say(vary(this.lines.finish(sayDist(p.goalMeters), sayTime(t), avg ? sayPace(avg) : null)), true);
    } else {
      this.say(vary(this.lines.endedEarly(sayDist(this.dist), sayTime(t))), true);
    }

    let recordId: string | null = null;
    if (t >= 30 || this.dist >= 50) {
      this.track.push({ t, d: this.dist });
      // Treadmill distances are estimates, so they don't count for records or ranks.
      const bests = p.treadmill ? {} : bestEfforts(this.track);
      // Practice runs only compete with other practice runs, so the PB cue can be heard indoors.
      const earlier = await loadRuns().then((rs) => rs.filter((r) => r.simulated === p.simulate)).catch(() => null);
      const pbs = earlier && !p.treadmill ? newPbs(bests, earlier) : [];
      const gt = p.ghost && reached ? this.ghostTime(this.dist) : null;
      const ghostGap = gt === null ? undefined : Math.round(gt - t);
      if (ghostGap !== undefined) {
        const n = Math.abs(ghostGap);
        this.say(n < 1 ? `A dead heat with ${p.ghost!.label}!` : ghostGap > 0 ? `You beat ${p.ghost!.label} by ${sayTime(n)}!` : `${cap(p.ghost!.label)} won by ${sayTime(n)}. Next time!`, true);
      }
      const top = [...PB_DISTANCES].reverse().find((d) => pbs.includes(d.key));
      if (top) this.say(vary(this.lines.pb(top.spoken, sayTime(bests[top.key]))), true);
      const record: RunRecord = {
        id: uid(),
        startedAt: new Date(this.startedAt).toISOString(),
        mode: p.mode,
        title: this.title(),
        distance: this.dist,
        duration: t,
        avgPace: avg,
        avgHr: this.hrN ? Math.round(this.hrSum / this.hrN) : null,
        maxHr: this.hrMax || null,
        splits: this.splits,
        intervals: this.intervals,
        route: thin(this.route, 400),
        completed: reached,
        simulated: p.simulate,
        bests,
        pbs,
        track: thinTrack(this.track, 300),
        ...(p.treadmill ? { treadmill: true } : {}),
        ...(p.shoeId ? { shoeId: p.shoeId } : {}),
        ...(ghostGap !== undefined ? { ghostGap, ghostLabel: p.ghost!.label } : {}),
        ...(p.planSession && reached ? { planSession: p.planSession } : {}),
      };
      try { await saveRun(record); recordId = record.id; } catch { recordId = null; }
      if (earlier && recordId) {
        // Announce an overall rank-up, or else the longest distance whose rank went up.
        const all = [...earlier, record];
        const before = rankFor(earlier), after = rankFor(all);
        const was = allRanks(earlier), now = allRanks(all);
        const up = [...RANKED].reverse().find((d) => now[d.key].level > was[d.key].level);
        if (after.level > before.level) {
          this.say(vary(this.lines.rankUp(before.step ? `${after.step!.spoken} overall` : after.step!.spoken)), true);
        } else if (up) {
          this.say(vary(this.lines.rankUp(`${now[up.key].step!.spoken} for the ${up.long}`)), true);
        }
        // New achievements, at most two so the finish doesn't drag on.
        const had = earned(earlier, p.weeklyGoalKm), has = earned(all, p.weeklyGoalKm);
        ACHIEVEMENTS.filter((a) => has.has(a.id) && !had.has(a.id)).slice(0, 2)
          .forEach((a) => this.say(vary(this.lines.achievement(a.title)), true));
      }
      // Log the training plan attempt, ticking the session off if it was finished.
      if (recordId && p.planSession && !p.simulate) await recordAttempt(p.planSession, recordId, reached, !!p.planEasier).catch(() => {});
    }
    this.recordId = recordId;
    this.phase = 'finished';
    this.emit();
  }

  /** A cheer from a friend, read out by the coach (queued behind anything it's already saying). */
  announceCheer(from: string, text: string) {
    if (this.phase !== 'running' && this.phase !== 'paused') return;
    this.say(`Cheer from ${from}: ${text}`, true);
    this.emit();
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    l(this.snapshot());
    return () => { this.listeners.delete(l); };
  }

  snapshot(): LiveSnapshot {
    const p = this.plan;
    const t = this.elapsed();
    const step = this.steps[this.stepIdx] ?? null;
    let stepRemaining = 0, stepProgress = 0;
    if (step) {
      const done = step.measure === 'time' ? t - this.stepStartT : this.dist - this.stepStartD;
      stepRemaining = Math.max(0, step.value - done);
      stepProgress = Math.min(1, Math.max(0, done / step.value));
    }
    return {
      phase: this.phase,
      mode: p?.mode ?? 'distance',
      title: p ? this.title() : '',
      elapsed: t,
      distance: this.dist,
      currentPace: this.phase === 'running' ? this.currentPace() : NaN,
      avgPace: this.avgPace(),
      hr: this.liveHr(),
      slow: this.slowNow,
      coachLine: this.coachLine,
      gpsStatus: this.gpsStatus,
      notice: this.notice,
      goal: p?.goalMeters ?? 0,
      step,
      nextStep: this.steps[this.stepIdx + 1] ?? null,
      stepIndex: this.stepIdx,
      stepCount: this.steps.length,
      stepRemaining,
      stepProgress,
      recordId: this.recordId,
      simulated: !!p?.simulate,
      autoPaused: this.autoPaused,
      treadmill: !!p?.treadmill,
      ghostGap: this.ghostGap,
      ghostLabel: p?.ghost?.label ?? null,
    };
  }

  // ---------- clock & measurements ----------

  private now() { return this.plan?.simulate ? this.sim : Date.now(); }
  private elapsed() { return (this.acc + (this.phase === 'running' ? this.now() - this.segStart : 0)) / 1000; }

  private title() {
    const p = this.plan!;
    return p.mode === 'intervals' && p.workout ? p.workout.name : `${+(p.goalMeters / 1000).toFixed(2)} km run`;
  }

  private addDistance(d: number) {
    this.dist += d;
    this.lastMoveT = this.elapsed();
    this.samples.push({ t: this.elapsed(), d: this.dist });
  }

  /** Pace over roughly the last 20 seconds. Infinity means standing still. */
  private currentPace() {
    const t = this.elapsed();
    this.samples = this.samples.filter((s) => s.t >= t - 60);
    const ref = this.samples.find((s) => s.t >= t - 20);
    if (!ref) return NaN;
    const dt = t - ref.t, dd = this.dist - ref.d;
    if (dt < 8) return NaN;
    if (dd < 5) return Infinity;
    return dt / (dd / 1000);
  }
  private avgPace() { return this.dist > 50 ? this.elapsed() / (this.dist / 1000) : NaN; }
  private liveHr() { return this.plan?.simulate && this.phase !== 'idle' ? Math.round(this.simHr) : hrStore.current(); }

  private onLocations(locs: LocationObject[]) {
    if (!this.plan || this.plan.simulate) return;
    if (this.phase === 'paused' && this.autoPaused) { this.checkAutoResume(locs); return; }
    if (this.phase !== 'running') return;
    for (const l of locs) {
      const accuracy = l.coords.accuracy ?? 99;
      if (accuracy > 35) {
        if (!this.flags.has('gps')) this.gpsStatus = 'Weak GPS signal. Head somewhere open.';
        continue;
      }
      const pt = { lat: l.coords.latitude, lon: l.coords.longitude, t: l.timestamp };
      if (!this.flags.has('gps')) {
        this.flags.add('gps');
        this.gpsStatus = '';
        this.lastMoveT = this.elapsed();
        this.say('GPS locked.', false);
      }
      if (!this.lastPos) { this.lastPos = pt; this.addRoute(pt); this.lastMoveT = this.elapsed(); continue; }
      const d = haversine(this.lastPos, pt);
      const dt = (pt.t - this.lastPos.t) / 1000;
      if (d < 3) continue; // standing-still jitter
      if (dt > 0 && d / dt > 9) { this.lastPos = pt; continue; } // GPS jump, faster than a sprinter
      this.lastPos = pt;
      this.addDistance(d);
      this.addRoute(pt);
    }
    this.tick(false);
  }

  private addRoute(pt: { lat: number; lon: number; t: number }) {
    const last = this.route[this.route.length - 1];
    if (!last || haversine(last, pt) >= 8) this.route.push({ lat: pt.lat, lon: pt.lon, t: pt.t });
  }

  // ---------- auto-pause ----------

  /** Stopped for 10 seconds (with GPS locked, and not in a rest step): pause the clock. */
  private checkAutoPause(t: number) {
    const p = this.plan!;
    if (!p.autoPause || p.simulate || p.treadmill || !this.flags.has('gps') || t < 20) return;
    if (this.steps[this.stepIdx]?.kind === 'rest') { this.lastMoveT = t; return; }
    if (t - this.lastMoveT < 10) return;
    this.acc += this.now() - this.segStart;
    this.phase = 'paused';
    this.autoPaused = true;
    this.anchor = this.lastPos ? { lat: this.lastPos.lat, lon: this.lastPos.lon } : null;
    this.say("Auto-paused. I'll carry on when you start moving.", true);
    this.emit();
  }

  /** Moved 12 metres from where the auto-pause happened: start the clock again. */
  private checkAutoResume(locs: LocationObject[]) {
    for (const l of locs) {
      if ((l.coords.accuracy ?? 99) > 35) continue;
      const pt = { lat: l.coords.latitude, lon: l.coords.longitude };
      if (!this.anchor) { this.anchor = pt; continue; }
      if (haversine(this.anchor, pt) > 12) {
        this.resume(false);
        this.say('And we\'re off again.', true);
        return;
      }
    }
  }

  // ---------- treadmill ----------

  /** Treadmill runs: distance from the set speed (run steps and distance runs), 5 km/h for walks, nothing for rests. */
  private treadStep() {
    const p = this.plan!;
    const t = this.elapsed();
    const dt = Math.max(0, t - this.lastTreadT);
    this.lastTreadT = t;
    const kind = p.mode === 'intervals' ? this.steps[this.stepIdx]?.kind : 'run';
    const kmh = kind === 'run' ? p.treadmillKmh ?? 10 : kind === 'walk' ? 5 : 0;
    if (kmh > 0) this.addDistance((kmh / 3.6) * dt);
  }

  // ---------- ghost runner ----------

  /** Seconds the ghost took to reach distance `d`, or null if it never got that far. */
  private ghostTime(d: number): number | null {
    const g = this.plan?.ghost?.track;
    if (!g || g.length < 2 || d > g[g.length - 1].d) return null;
    let i = g.findIndex((x) => x.d >= d);
    if (i <= 0) return g[Math.max(0, i)].t;
    const a = g[i - 1], b = g[i];
    return a.t + ((d - a.d) / Math.max(1e-6, b.d - a.d)) * (b.t - a.t);
  }

  /** Every 500 m: how far ahead of or behind the ghost you are, in seconds. */
  private checkGhost(t: number) {
    const p = this.plan!;
    if (!p.ghost) return;
    const gt = this.ghostTime(this.dist);
    this.ghostGap = gt === null ? null : Math.round(gt - t);
    if (this.dist < this.ghostNextD) return;
    this.ghostNextD += 500;
    if (this.ghostGap === null) {
      if (!this.flags.has('ghostDone')) { this.flags.add('ghostDone'); this.say(`You've gone further than ${p.ghost.label}. Keep it going!`, false); }
      return;
    }
    const n = Math.abs(this.ghostGap);
    const secs = `${n} ${n === 1 ? 'second' : 'seconds'}`;
    this.say(n < 2 ? `Neck and neck with ${p.ghost.label}.` : this.ghostGap > 0 ? `You're ${secs} ahead of ${p.ghost.label}.` : `${cap(p.ghost.label)} is ${secs} ahead. Reel them in!`, false);
  }

  private simStep() {
    const p = this.plan!;
    const step = this.steps[this.stepIdx];
    const runSpeed = p.targetPace ? 1000 / p.targetPace : 2.9;
    let v: number, hrGoal: number;
    if (p.mode === 'intervals' && step) {
      v = step.kind === 'run' ? runSpeed * 1.05 : step.kind === 'walk' ? 1.5 : 0.2;
      hrGoal = step.kind === 'run' ? 168 : step.kind === 'walk' ? 122 : 108;
      const progress = step.measure === 'time' ? (this.elapsed() - this.stepStartT) / step.value : (this.dist - this.stepStartD) / step.value;
      if (step.kind === 'run' && progress > 0.6) v *= 0.84; // tire late in reps so you hear the slowing cue
    } else {
      const f = this.dist / p.goalMeters;
      v = runSpeed * (1 + 0.04 * Math.sin(this.sim / 40000));
      hrGoal = 152;
      if (f > 0.55 && f < 0.75) { v *= 0.82; hrGoal = 170; }
      if (f > 0.9) { v *= 1.12; hrGoal = 182; }
    }
    this.sim += 1000 * SIM_SPEED;
    this.addDistance(v * SIM_SPEED);
    this.simHr += (hrGoal - this.simHr) * 0.12 + (Math.random() - 0.5) * 2;
    this.flags.add('gps');
  }

  // ---------- main loop ----------

  private tick(fromTimer: boolean) {
    if (this.phase !== 'running' || !this.plan) return;
    if (fromTimer) {
      if (this.plan.simulate) this.simStep();
      else if (this.plan.treadmill) this.treadStep();
      else this.samples.push({ t: this.elapsed(), d: this.dist });
      this.track.push({ t: this.elapsed(), d: this.dist });
      const h = this.liveHr();
      if (h) {
        this.splitHr.push(h); this.stepHr.push(h);
        this.hrSum += h; this.hrN++; this.hrMax = Math.max(this.hrMax, h);
      }
    }
    this.coach();
    if (fromTimer && this.phase === 'running') this.checkAutoPause(this.elapsed());
    if (this.phase === 'running') this.emit();
  }

  private coach() {
    const p = this.plan!;
    const t = this.elapsed();
    this.checkSplits(t);
    if (p.mode === 'intervals') this.checkIntervals(t);
    else this.checkFinishLine();
    if (this.phase !== 'running') return;

    const step = this.steps[this.stepIdx];
    const running = p.mode === 'distance' || step?.kind === 'run';
    if (running && !p.treadmill) this.checkSlowing(t); else { this.slowNow = false; this.slowSince = null; }
    if (p.mode === 'distance') this.checkGhost(t);

    const h = this.liveHr();
    if (h && h > p.maxHr * 0.93 && t - this.lastHrWarn > 90) {
      this.lastHrWarn = t;
      this.say(vary(this.lines.hrHigh(h)), true);
    }

    this.checkHrUpdate(t);

    if (running && this.lines.encourage.length && t - this.lastMotivate > 240 && t - this.lastSpoke > 60 && this.dist > 200) {
      this.lastMotivate = t;
      this.say(vary(this.lines.encourage), false);
    }
  }

  private checkSplits(t: number) {
    const p = this.plan!;
    while (this.dist >= this.nextSplit && (p.mode === 'intervals' || this.nextSplit < p.goalMeters)) {
      const st = t - this.lastSplitT, sd = this.nextSplit - this.lastSplitD, pace = st / (sd / 1000);
      const hr = mean(this.splitHr);
      this.splits.push({ distance: this.nextSplit, time: st, pace, hr });
      if (p.mode === 'distance') {
        let msg = vary(this.lines.split(sayDist(this.nextSplit), sayPace(pace), sayDist(p.goalMeters - this.nextSplit)));
        msg = cap(msg);
        if (p.targetPace) {
          const diff = Math.round((this.nextSplit / 1000) * p.targetPace - t);
          msg = join(msg, Math.abs(diff) < 5 ? vary(this.lines.onTarget)
            : diff > 0 ? vary(this.lines.ahead(sayTime(diff)))
            : vary(this.lines.behind(sayTime(-diff))));
        }
        if (hr && this.hrDueWithSplit()) msg = join(msg, this.hrLine(hr));
        if (!this.flags.has('half') && Math.abs(this.nextSplit - p.goalMeters / 2) < 1) { this.flags.add('half'); msg = join(msg, vary(this.lines.halfway)); }
        this.say(msg, true);
      }
      this.lastSplitT = t; this.lastSplitD = this.nextSplit; this.splitHr = [];
      this.nextSplit += p.splitEvery;
    }
  }

  /** True when heart rate should be read out with the split being announced now. */
  private hrDueWithSplit() {
    const p = this.plan!;
    if (p.hrEvery === 'split') return true;
    if (this.nextHrD > this.nextSplit) return false;
    const every = Number(p.hrEvery.slice(1));
    while (this.nextHrD <= this.nextSplit) this.nextHrD += every;
    return true;
  }

  /** "Heart rate 152, steady." The word comes from how close the reading is to max heart rate. */
  private hrLine(h: number) {
    const f = h / this.plan!.maxHr;
    const zone = f < 0.7 ? 'easy' : f < 0.8 ? 'steady' : f < 0.9 ? 'working hard' : 'very hard';
    return `Heart rate ${h}, ${zone}.`;
  }

  private checkHrUpdate(t: number) {
    const h = this.liveHr();
    if (!h) return;
    const every = Number(this.plan!.hrEvery.slice(1));
    // A skipped line (coach busy talking) is tried again on the next tick.
    if (t >= this.nextHrT && this.say(this.hrLine(h), false)) this.nextHrT = t + every;
    if (this.dist >= this.nextHrD && this.say(this.hrLine(h), false)) {
      this.nextHrD = (Math.floor(this.dist / every) + 1) * every;
    }
  }

  private checkFinishLine() {
    const p = this.plan!;
    const left = p.goalMeters - this.dist;
    if (!this.flags.has('half') && this.dist >= p.goalMeters / 2) { this.flags.add('half'); this.say(vary(this.lines.halfway), true); }
    if (p.goalMeters > 800 && left <= 400 && !this.flags.has('400')) { this.flags.add('400'); this.say(vary(this.lines.togo400), true); }
    if (left <= 100 && !this.flags.has('100')) { this.flags.add('100'); this.say(vary(this.lines.togo100), true); }
    if (this.dist >= p.goalMeters) this.finish(true);
  }

  private checkIntervals(t: number) {
    const step = this.steps[this.stepIdx];
    if (!step) return;
    const st = t - this.stepStartT, sd = this.dist - this.stepStartD;
    const next = this.steps[this.stepIdx + 1];
    const then = next ? `Then ${stepSpoken(next)}.` : "Then you're done!";
    const once = (k: string) => { const key = `${k}-${this.stepIdx}`; if (this.flags.has(key)) return false; this.flags.add(key); return true; };
    const word = KIND_NAME[step.kind].toLowerCase();

    if (step.measure === 'time') {
      const left = step.value - st;
      if (step.value >= 120 && st >= step.value / 2 && once('half')) this.say(`Halfway through this ${word}.`, false);
      if (step.value >= 30 && left <= 10 && left > 0 && once('ten')) this.say(`10 seconds left. ${then}`, true);
      if (left <= 0) this.completeStep(t, true);
    } else {
      const left = step.value - sd;
      if (step.value >= 800 && sd >= step.value / 2 && once('half')) this.say(`Halfway through this ${word}.`, false);
      if (step.value >= 300 && left <= 100 && left > 0 && once('100')) this.say(`100 metres left. ${then}`, true);
      if (left <= 0) this.completeStep(t, true);
    }
  }

  private completeStep(t: number, completed: boolean) {
    const step = this.steps[this.stepIdx];
    if (!step) return;
    const time = t - this.stepStartT, distance = this.dist - this.stepStartD;
    const result: IntervalResult = {
      kind: step.kind, label: stepLabel(step), time, distance,
      pace: distance > 10 ? time / (distance / 1000) : 0,
      hr: mean(this.stepHr), completed,
    };
    this.intervals.push(result);
    if (!completed) return;

    this.stepIdx++;
    this.stepStartT = t; this.stepStartD = this.dist; this.stepHr = [];
    this.repRef = null; this.slowSince = null; this.slowNow = false;
    if (this.stepIdx >= this.steps.length) { this.finish(true); return; }
    this.announceStep(result);
  }

  private announceStep(prev: IntervalResult | null) {
    const step = this.steps[this.stepIdx];
    const n = this.steps.length;
    let msg = '';
    if (prev && prev.kind === 'run') {
      const prevStep = this.steps[this.stepIdx - 1];
      msg += prevStep.measure === 'distance' ? `That rep took ${sayTime(prev.time)}. ` : `You covered ${sayDist(prev.distance)}. `;
      if (prev.hr && this.plan!.hrEvery === 'split') msg += `${this.hrLine(prev.hr)} `;
    }
    const which = this.stepIdx === n - 1 ? 'Last one.' : `Interval ${this.stepIdx + 1} of ${n}.`;
    this.say(join(`${msg}${which} ${cap(stepSpoken(step))}.`, vary(this.lines.cue[step.kind])), true);
  }

  private checkSlowing(t: number) {
    const p = this.plan!;
    const cur = this.currentPace();
    if (p.gentle) { this.checkWalking(t, cur); return; }
    let ref: number;
    if (p.mode === 'intervals') {
      const st = t - this.stepStartT, sd = this.dist - this.stepStartD;
      if (st < 30) { this.slowNow = false; return; }
      if (!p.targetPace && this.repRef === null && sd > 30) this.repRef = st / (sd / 1000);
      ref = p.targetPace ?? this.repRef ?? NaN;
    } else {
      if (t < 90 || this.dist < 300) { this.slowNow = false; return; }
      ref = p.targetPace ?? this.avgPace();
    }

    if (cur === Infinity) {
      this.slowNow = true;
      if (p.mode === 'distance' && t - this.lastSlowWarn > 90) {
        this.lastSlowWarn = t;
        this.say(vary(this.lines.stopped), true);
      }
      return;
    }
    if (!isFinite(cur) || !isFinite(ref)) { this.slowNow = false; return; }

    if (cur > ref * 1.12) {
      this.slowNow = true;
      if (this.slowSince === null) this.slowSince = t;
      if (t - this.slowSince >= 15 && t - this.lastSlowWarn > 60) {
        this.lastSlowWarn = this.warnedAt = t;
        const vs = p.targetPace ? `your target's ${sayPace(p.targetPace)}`
          : p.mode === 'intervals' ? `you started this rep at ${sayPace(ref)}`
          : `your average is ${sayPace(ref)}`;
        this.say(vary(this.lines.slow(sayPace(cur), vs)), true);
      }
    } else {
      this.slowNow = false;
      this.slowSince = null;
      if (t - this.warnedAt < 150 && cur <= ref * 1.02) {
        this.warnedAt = -999;
        this.say(vary(this.lines.backOnPace), true);
      }
    }
  }

  /**
   * Beginner plans: no slowing-down warnings. If the runner has been walking (slower than
   * 9 minutes per km, or stopped) for 20 seconds when they should be running, the coach says
   * that's fine, at most every 2 minutes.
   */
  private checkWalking(t: number, cur: number) {
    this.slowNow = false;
    const walking = cur === Infinity || (isFinite(cur) && cur > 540);
    if (!walking || t < 60) { this.slowSince = null; return; }
    if (this.slowSince === null) this.slowSince = t;
    if (t - this.slowSince >= 20 && t - this.lastSlowWarn > 120) {
      this.lastSlowWarn = t;
      this.say(vary(this.lines.walkOk), true);
    }
  }

  /** Returns false when a less important line was skipped because the coach was already talking. */
  private say(text: string, important: boolean): boolean {
    if (this.plan?.voice && !speak(text, important)) return false;
    this.coachLine = text;
    this.lastSpoke = this.elapsed();
    return true;
  }

  private emit() {
    const s = this.snapshot();
    this.listeners.forEach((l) => l(s));
  }
}

function thin<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = Math.ceil(arr.length / max);
  const out = arr.filter((_, i) => i % step === 0);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

export const session = new RunSession();

/** Keeps about `n` evenly spaced points of a distance-over-time track (always the last one). */
function thinTrack(track: { t: number; d: number }[], n: number) {
  if (track.length <= n) return track.map((p) => ({ t: Math.round(p.t), d: Math.round(p.d) }));
  const step = (track.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => track[Math.round(i * step)]).map((p) => ({ t: Math.round(p.t), d: Math.round(p.d) }));
}
