import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from '../../src/charts';
import { RunMap } from '../../src/map';
import { planById } from '../../src/plans';
import { PB_DISTANCES, runBests } from '../../src/records';
import { Button, Card, Chip, Field, Screen, SectionLabel, Stat } from '../../src/ui';
import { kindColor, useTheme } from '../../src/theme';
import { deleteRun, getRun, loadShoes, updateRun } from '../../src/storage';
import { PlanProgress, RunRecord, Shoe } from '../../src/types';
import { Feel, FEELS, PlanAttempt, attemptFor, currentWeek, restartFrom, setFeel, struggling } from '../../src/planAdapt';
import { fmtDate, fmtKm, fmtPace, fmtTime } from '../../src/format';

export default function RunDetail() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [run, setRun] = useState<RunRecord | null | undefined>(undefined);

  useEffect(() => { getRun(String(id)).then(setRun); }, [id]);

  if (run === undefined) return <Screen inset={false}>{null}</Screen>;
  if (run === null) {
    return (
      <Screen inset={false}>
        <Text style={{ color: t.text, fontSize: 17 }}>This run has been deleted.</Text>
      </Screen>
    );
  }

  function remove() {
    Alert.alert('Delete this run?', 'It will be removed from your history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRun(run!.id); router.back(); } },
    ]);
  }

  const fastest = run.splits.length > 1 ? Math.min(...run.splits.map((s) => s.pace || Infinity)) : NaN;
  const bests = runBests(run);
  const efforts = PB_DISTANCES.filter((d) => bests[d.key]);
  const paced = run.splits.filter((s) => s.pace > 0);

  return (
    <Screen inset={false}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: t.text }}>{run.title}</Text>
      <Text style={{ color: t.muted, marginBottom: 12 }}>
        {fmtDate(run.startedAt)}{run.simulated ? ', practice run' : ''}{!run.completed ? ', ended early' : ''}
        {run.planSession ? ` · ${planById(run.planSession.split(':')[0])?.name ?? 'Training plan'}` : ''}
      </Text>
      <Button small label="Share this run" onPress={() => router.push(`/share/${run.id}`)} style={{ alignSelf: 'flex-start', marginBottom: 14 }} />

      <FeelCard runId={run.id} />

      {run.treadmill ? <TreadmillFix run={run} onSaved={setRun} /> : null}

      {Date.now() - Date.parse(run.startedAt) < 6 * 3600e3 && !run.simulated ? (
        <Button variant="secondary" label="Cool down: 5-minute stretches" onPress={() => router.push('/routine/stretch')} style={{ marginBottom: 12 }} />
      ) : null}

      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Stat value={fmtKm(run.distance)} label="km" />
          <Stat value={fmtTime(run.duration)} label="time" />
          <Stat value={fmtPace(run.avgPace)} label="average pace /km" />
          <Stat value={run.avgHr ? String(run.avgHr) : '––'} label="average heart rate" />
          {run.maxHr ? <Stat value={String(run.maxHr)} label="max heart rate" /> : null}
        </View>
      </Card>

      {run.route.length > 1 ? (
        <Card>
          <SectionLabel>Route</SectionLabel>
          <RunMap route={run.route} />
        </Card>
      ) : null}

      {efforts.length ? (
        <Card>
          <SectionLabel>Best efforts</SectionLabel>
          {efforts.map((d, i) => {
            const pb = run.pbs?.includes(d.key);
            return (
              <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
                <Text style={{ flex: 1, color: t.text, fontWeight: '600' }}>{d.label}</Text>
                {pb ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 12 }}>
                    <Ionicons name="trophy" size={14} color={t.accent} />
                    <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>{run.simulated ? 'Practice PB' : 'Personal best'}</Text>
                  </View>
                ) : null}
                <Text style={{ color: t.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{fmtTime(bests[d.key])}</Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      {paced.length >= 2 ? (
        <Card>
          <BarChart
            title="Pace per split (taller is faster)"
            initial={Math.max(0, paced.findIndex((s) => s.pace === fastest))}
            data={paced.map((s) => ({ label: `${+(s.distance / 1000).toFixed(1)}`, name: `Split to ${fmtKm(s.distance)} km`, value: 1000 / s.pace, text: `${fmtPace(s.pace)} /km${s.hr ? `, ${s.hr} bpm` : ''}` }))}
          />
          <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center' }}>km</Text>
        </Card>
      ) : null}

      {run.intervals.length ? (
        <Card>
          <SectionLabel>Intervals</SectionLabel>
          {run.intervals.map((iv, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: kindColor(t, iv.kind), marginRight: 10 }} />
              <Text style={{ flex: 1, color: t.text, fontWeight: '600' }}>{iv.label}{iv.completed ? '' : ' (stopped)'}</Text>
              <Text style={{ width: 64, color: t.text, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{fmtTime(iv.time)}</Text>
              <Text style={{ width: 70, color: t.muted, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{Math.round(iv.distance)} m</Text>
              <Text style={{ width: 54, color: t.muted, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{iv.kind === 'run' ? fmtPace(iv.pace) : ''}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {run.splits.length ? (
        <Card>
          <SectionLabel>Splits</SectionLabel>
          <View style={{ flexDirection: 'row', paddingBottom: 6 }}>
            {['Distance', 'Time', 'Pace', 'HR'].map((h, i) => (
              <Text key={h} style={{ flex: 1, color: t.muted, fontWeight: '600', textAlign: i ? 'right' : 'left' }}>{h}</Text>
            ))}
          </View>
          {run.splits.map((s, i) => {
            const best = s.pace === fastest;
            return (
              <View key={i} style={{ flexDirection: 'row', paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.line }}>
                <Text style={{ flex: 1, color: t.text, fontVariant: ['tabular-nums'] }}>{fmtKm(s.distance)} km</Text>
                <Text style={{ flex: 1, color: t.text, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{fmtTime(s.time)}</Text>
                <Text style={{ flex: 1, color: best ? t.accent : t.text, fontWeight: best ? '800' : '400', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{fmtPace(s.pace)}</Text>
                <Text style={{ flex: 1, color: t.muted, textAlign: 'right' }}>{s.hr ?? '–'}</Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      <ShoePicker run={run} onSaved={setRun} />
      <Button variant="danger" label="Delete run" onPress={remove} style={{ marginTop: 8 }} />
    </Screen>
  );
}

/**
 * After a training plan session: "How did that feel?". Two tough sessions in a row (too hard,
 * or stopped early) brings up the offer to repeat the week or go back one.
 */
function FeelCard({ runId }: { runId: string }) {
  const t = useTheme();
  const [state, setState] = useState<{ attempt: PlanAttempt; progress: PlanProgress } | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => { attemptFor(runId).then(setState); }, [runId]);
  if (!state) return null;
  const plan = planById(state.progress.planId);
  if (!plan) return null;
  const { attempt, progress } = state;
  const week = currentWeek(plan, progress);
  const doneThisWeek = plan.sessions.some((s) => s.week === week && progress.done[s.id]);
  const offer = !message && attempt.feel !== undefined && struggling(progress);

  async function choose(feel: Feel) {
    const next = await setFeel(runId, feel);
    if (next) setState({ attempt: { ...attempt, feel }, progress: next });
  }
  async function restart(w: number) {
    const next = await restartFrom(plan!, w);
    if (next) setMessage(`Done. Your plan picks up at the start of week ${w}. No rush, you'll get there.`);
  }

  return (
    <Card style={{ borderColor: t.accent, borderWidth: 1.5 }}>
      <Text style={{ color: t.text, fontWeight: '800', fontSize: 17 }}>
        {attempt.done ? 'How did that feel?' : 'Stopped early? That\'s okay.'}
      </Text>
      {!attempt.done && !attempt.feel ? (
        <Text style={{ color: t.muted, marginTop: 4, lineHeight: 20 }}>This session isn't ticked off, so it'll come up again next time. How was it going?</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {FEELS.map((f) => {
          const on = attempt.feel === f.value;
          return (
            <Pressable key={f.value} onPress={() => choose(f.value)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: on ? t.accent : t.chip }}>
              <Text style={{ fontSize: 22 }}>{f.emoji}</Text>
              <Text style={{ color: on ? t.onAccent : t.text, fontWeight: '700', marginTop: 2 }}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {attempt.feel === 'easy' && attempt.done ? <Text style={{ color: t.muted, marginTop: 10 }}>Brilliant. You're ready for what's next.</Text> : null}
      {attempt.feel === 'hard' && !offer && !message ? (
        <Text style={{ color: t.muted, marginTop: 10, lineHeight: 20 }}>Thanks for being honest. If the next one feels this hard too, we'll look at repeating the week.</Text>
      ) : null}
      {offer ? (
        <View style={{ marginTop: 12, gap: 8 }}>
          <Text style={{ color: t.text, lineHeight: 20 }}>That's two tough sessions in a row. Repeating a week is completely normal and helps your body catch up.</Text>
          {doneThisWeek ? <Button label={`Repeat week ${week}`} onPress={() => restart(week)} /> : null}
          {week > 1 ? <Button variant={doneThisWeek ? 'secondary' : 'primary'} label={`Go back to week ${week - 1}`} onPress={() => restart(week - 1)} /> : null}
          <Text style={{ color: t.muted, fontSize: 13 }}>Or keep going: you can decide later from the Run tab.</Text>
        </View>
      ) : null}
      {message ? <Text style={{ color: t.accent, fontWeight: '700', marginTop: 12 }}>{message}</Text> : null}
    </Card>
  );
}

/** Treadmill runs: the distance is an estimate, so let the runner type in what the treadmill showed. */
function TreadmillFix({ run, onSaved }: { run: RunRecord; onSaved: (r: RunRecord) => void }) {
  const t = useTheme();
  const [km, setKm] = useState((run.distance / 1000).toFixed(2));
  const [error, setError] = useState('');
  async function save() {
    const v = parseFloat(km.replace(',', '.'));
    if (!(v > 0 && v < 200)) { setError('Enter the distance in km, for example 5.2'); return; }
    const f = (v * 1000) / Math.max(1, run.distance);
    const next: RunRecord = {
      ...run,
      distance: v * 1000,
      avgPace: run.duration / v,
      splits: run.splits.map((x) => ({ ...x, distance: x.distance * f, pace: x.pace / f })),
      track: run.track?.map((p) => ({ t: p.t, d: Math.round(p.d * f) })),
    };
    await updateRun(next);
    setError('');
    onSaved(next);
  }
  return (
    <Card>
      <Text style={{ color: t.text, fontWeight: '800', fontSize: 16 }}>Treadmill run</Text>
      <Text style={{ color: t.muted, marginTop: 2, marginBottom: 10, lineHeight: 20 }}>
        The distance was worked out from the speed you set. If your treadmill showed something different, put it here. Treadmill runs don't count for records or ranks.
      </Text>
      <Field label="Distance on the treadmill (km)" value={km} onChangeText={setKm} keyboardType="decimal-pad" />
      {error ? <Text style={{ color: t.danger, marginBottom: 8 }}>{error}</Text> : null}
      <Button small label="Save distance" onPress={save} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

/** Which shoes this run was in (only shown once you've added shoes). */
function ShoePicker({ run, onSaved }: { run: RunRecord; onSaved: (r: RunRecord) => void }) {
  const t = useTheme();
  const [shoes, setShoes] = useState<Shoe[]>([]);
  useEffect(() => { loadShoes().then(setShoes); }, []);
  const list = shoes.filter((x) => !x.retired || x.id === run.shoeId);
  if (!list.length) return null;
  async function choose(id: string) {
    const next = { ...run, shoeId: run.shoeId === id ? null : id };
    await updateRun(next);
    onSaved(next);
  }
  return (
    <Card>
      <Text style={{ color: t.text, fontWeight: '700', marginBottom: 8 }}>Shoes</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {list.map((x) => <Chip key={x.id} small label={x.name} active={run.shoeId === x.id} onPress={() => choose(x.id)} />)}
      </View>
    </Card>
  );
}
