import type { LocationObject } from 'expo-location';
import { IntervalResult, IntervalStep, LiveSnapshot, Phase, Plan, RunRecord, Split } from './types';
import { cap, haversine, sayDist, sayPace, sayTime, uid } from './format';
import { expandWorkout, KIND_NAME, stepLabel, stepSpoken } from './intervals';
import { configureSpeech, speak } from './speech';
import { hrStore } from './heartRate';
import { loadRuns, saveRun } from './storage';
import { COACHES, CoachLines } from './coach';
import { bestEfforts, newPbs, PB_DISTANCES } from './records';
import { rankFor } from './ranks';
import { startTracking, stopTracking } from './tracking';

/** Practice mode runs the clock this many times faster than real time. */
export const SIM_SPEED = 5;

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
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
  private route: { lat: number; lon: number }[] = [];
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
  }

  // ---------- public API ----------

  async start(plan: Plan): Promise<{ ok: boolean; message: string | null }> {
    if (this.phase === 'running' || this.phase === 'paused') return { ok: true, message: null };
    this.fresh();
    this.plan = plan;
    this.lines = COACHES[plan.coach] ?? COACHES.friendly;
    configureSpeech({ voiceId: plan.voiceId, rate: plan.voiceRate, pitch: plan.voicePitch });

    if (!plan.simulate) {
      const res = await startTracking((locs) => this.onLocations(locs));
      if (!res.ok) return res;
      this.notice = res.message;
      this.gpsStatus = 'Finding GPS…';
    }

    this.phase = 'running';
    this.startedAt = Date.now();
    this.segStart = this.now();
    this.nextSplit = plan.splitEvery;
    const every = Number(plan.hrEvery.slice(1));
    this.nextHrT = plan.hrEvery.startsWith('t') ? every : Infinity;
    this.nextHrD = plan.hrEvery.startsWith('d') ? every : Infinity;

    if (plan.mode === 'intervals' && plan.workout) {
      this.steps = expandWorkout(plan.workout);
      this.say(`Starting ${plan.workout.name}.`, true);
      this.announceStep(null);
    } else {
      this.say(join(`Run started. ${sayDist(plan.goalMeters)}${plan.targetPace ? `, target pace ${sayPace(plan.targetPace)}` : ''}.`, this.lines.letsGo), true);
    }

    this.timer = setInterval(() => this.tick(true), 1000);
    this.emit();
    return { ok: true, message: null };
  }

  pause() {
    if (this.phase !== 'running') return;
    this.acc += this.now() - this.segStart;
    this.phase = 'paused';
    this.say(this.lines.paused, true);
    this.emit();
  }

  resume() {
    if (this.phase !== 'paused') return;
    this.phase = 'running';
    this.segStart = this.now();
    this.lastPos = null; // don't count distance moved while paused
    this.samples = [];
    this.slowSince = null;
    this.say(this.lines.resumed, true);
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
      this.say(join(`Workout complete! ${sayDist(this.dist)} in ${sayTime(t)}.`, this.lines.workoutDone), true);
    } else if (reached) {
      this.say(join(`Finish line! ${sayDist(p.goalMeters)} in ${sayTime(t)}.${avg ? ` Average pace ${sayPace(avg)}.` : ''}`, this.lines.finishCheer), true);
    } else {
      this.say(`Run finished. ${sayDist(this.dist)} in ${sayTime(t)}.`, true);
    }

    let recordId: string | null = null;
    if (t >= 30 || this.dist >= 50) {
      this.track.push({ t, d: this.dist });
      const bests = bestEfforts(this.track);
      // Practice runs only compete with other practice runs, so the PB cue can be heard indoors.
      const earlier = await loadRuns().then((rs) => rs.filter((r) => r.simulated === p.simulate)).catch(() => null);
      const pbs = earlier ? newPbs(bests, earlier) : [];
      const top = [...PB_DISTANCES].reverse().find((d) => pbs.includes(d.key));
      if (top) this.say(this.lines.pb(top.spoken, sayTime(bests[top.key])), true);
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
      };
      try { await saveRun(record); recordId = record.id; } catch { recordId = null; }
      if (earlier && recordId) {
        const before = rankFor(earlier), after = rankFor([...earlier, record]);
        if (after.level > before.level) {
          this.say(before.tier ? `You've ranked up to ${after.spoken}!` : `You've earned your first rank: ${after.spoken}!`, true);
        }
      }
    }
    this.recordId = recordId;
    this.phase = 'finished';
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
    if (this.phase !== 'running' || !this.plan || this.plan.simulate) return;
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
        this.say('GPS locked.', false);
      }
      if (!this.lastPos) { this.lastPos = pt; this.addRoute(pt); continue; }
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

  private addRoute(pt: { lat: number; lon: number }) {
    const last = this.route[this.route.length - 1];
    if (!last || haversine(last, pt) >= 8) this.route.push({ lat: pt.lat, lon: pt.lon });
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
      else this.samples.push({ t: this.elapsed(), d: this.dist });
      this.track.push({ t: this.elapsed(), d: this.dist });
      const h = this.liveHr();
      if (h) {
        this.splitHr.push(h); this.stepHr.push(h);
        this.hrSum += h; this.hrN++; this.hrMax = Math.max(this.hrMax, h);
      }
    }
    this.coach();
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
    if (running) this.checkSlowing(t); else { this.slowNow = false; this.slowSince = null; }

    const h = this.liveHr();
    if (h && h > p.maxHr * 0.93 && t - this.lastHrWarn > 90) {
      this.lastHrWarn = t;
      this.say(join(`Heart rate is ${h}.`, this.lines.hrTip || 'That is very high.'), true);
    }

    this.checkHrUpdate(t);

    if (running && this.lines.encourage.length && t - this.lastMotivate > 240 && t - this.lastSpoke > 60 && this.dist > 200) {
      this.lastMotivate = t;
      this.say(pick(this.lines.encourage), false);
    }
  }

  private checkSplits(t: number) {
    const p = this.plan!;
    while (this.dist >= this.nextSplit && (p.mode === 'intervals' || this.nextSplit < p.goalMeters)) {
      const st = t - this.lastSplitT, sd = this.nextSplit - this.lastSplitD, pace = st / (sd / 1000);
      const hr = mean(this.splitHr);
      this.splits.push({ distance: this.nextSplit, time: st, pace, hr });
      if (p.mode === 'distance') {
        let msg = `${cap(sayDist(this.nextSplit))} done. That split was ${sayPace(pace)}. ${cap(sayDist(p.goalMeters - this.nextSplit))} to go.`;
        if (p.targetPace) {
          const diff = Math.round((this.nextSplit / 1000) * p.targetPace - t);
          msg = join(msg, Math.abs(diff) < 5 ? this.lines.onTarget
            : diff > 0 ? `You're ${sayTime(diff)} ahead of target.`
            : join(`You're ${sayTime(-diff)} behind target.`, this.lines.behindTip));
        }
        if (hr && this.hrDueWithSplit()) msg = join(msg, this.hrLine(hr));
        if (!this.flags.has('half') && Math.abs(this.nextSplit - p.goalMeters / 2) < 1) { this.flags.add('half'); msg = join(msg, this.lines.halfway); }
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
    if (!this.flags.has('half') && this.dist >= p.goalMeters / 2) { this.flags.add('half'); this.say(this.lines.halfway, true); }
    if (p.goalMeters > 800 && left <= 400 && !this.flags.has('400')) { this.flags.add('400'); this.say(this.lines.togo400, true); }
    if (left <= 100 && !this.flags.has('100')) { this.flags.add('100'); this.say(this.lines.togo100, true); }
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
    this.say(join(`${msg}${which} ${cap(stepSpoken(step))}.`, this.lines.cue[step.kind]), true);
  }

  private checkSlowing(t: number) {
    const p = this.plan!;
    const cur = this.currentPace();
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
        this.say(this.lines.stopped, true);
      }
      return;
    }
    if (!isFinite(cur) || !isFinite(ref)) { this.slowNow = false; return; }

    if (cur > ref * 1.12) {
      this.slowNow = true;
      if (this.slowSince === null) this.slowSince = t;
      if (t - this.slowSince >= 15 && t - this.lastSlowWarn > 60) {
        this.lastSlowWarn = this.warnedAt = t;
        const vs = p.targetPace ? `your target is ${sayPace(p.targetPace)}`
          : p.mode === 'intervals' ? `you started this rep at ${sayPace(ref)}`
          : `your average is ${sayPace(ref)}`;
        this.say(join(`You're slowing down. You're at ${sayPace(cur)}, ${vs}.`, this.lines.slowTip), true);
      }
    } else {
      this.slowNow = false;
      this.slowSince = null;
      if (t - this.warnedAt < 150 && cur <= ref * 1.02) {
        this.warnedAt = -999;
        this.say(this.lines.backOnPace, true);
      }
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
