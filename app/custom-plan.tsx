import React, { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Card, Chip, Field, PlusLock, Screen, SectionLabel } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadPlan, loadRace, loadRuns, loadSettings, savePlan, saveRace } from '../src/storage';
import { BuiltPlan, buildCustomPlan, currentFitness } from '../src/customPlan';
import { RACE_DISTANCES, parseDate, raceDistanceName, showDate } from '../src/gear';
import { fmtPace, fmtTime } from '../src/format';
import { planFor } from '../src/plans';
import { usePlus } from '../src/plus';
import { PlanProgress, Race, RunRecord, Settings } from '../src/types';

/** "25:30" or "1:52:00" → seconds. */
function parseClock(text: string): number | null {
  const parts = text.trim().split(':').map((x) => x.trim());
  if (parts.length < 2 || parts.length > 3 || parts.some((x) => !/^\d{1,2}$/.test(x))) return null;
  const [a, b, c] = parts.map(Number);
  const s = parts.length === 3 ? a * 3600 + b * 60 + c : a * 60 + b;
  return s > 0 ? s : null;
}

/** Pacely Plus: build a personal plan for a race from your fitness, goal and running days. */
export default function CustomPlanScreen() {
  const t = useTheme();
  const router = useRouter();
  const plus = usePlus();
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [race, setRace] = useState<Race | null>(null);
  const [progress, setProgress] = useState<PlanProgress | null>(null);
  const [km, setKm] = useState(10);
  const [date, setDate] = useState('');
  const [current, setCurrent] = useState('');
  const [goal, setGoal] = useState('');
  const [perWeek, setPerWeek] = useState(3);
  const [built, setBuilt] = useState<BuiltPlan | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    Promise.all([loadRuns(), loadSettings(), loadRace(), loadPlan()]).then(([r, s, rc, pl]) => {
      setRuns(r); setSettings(s); setRace(rc); setProgress(pl);
      if (rc) { setKm(rc.km); setDate(showDate(rc.date)); }
      const fit = currentFitness(r);
      if (fit) setCurrent(fmtTime(fit));
      setPerWeek(Math.min(4, Math.max(3, s.runDays.length)));
    });
  }, []));
  if (!settings) return <Screen inset={false}>{null}</Screen>;
  if (!plus) {
    return (
      <Screen inset={false}>
        <PlusLock title="Personal adaptive plans" text="Tell Pacely your race and goal. It builds a plan around your fitness and running days, then adjusts as you go." onPress={() => router.push('/plus')} />
      </Screen>
    );
  }

  function preview() {
    setError(''); setBuilt(null);
    const iso = parseDate(date);
    if (!iso) { setError('Write the race date as day/month/year, for example 12/04/2027.'); return; }
    const cur = current.trim() ? parseClock(current) : null;
    if (current.trim() && !(cur && cur >= 12 * 60 && cur <= 60 * 60)) { setError('Write your current 5K time as minutes:seconds, for example 28:30.'); return; }
    const g = goal.trim() ? parseClock(goal) : null;
    if (goal.trim() && !g) { setError('Write your goal time as minutes:seconds or hours:minutes:seconds, for example 1:55:00.'); return; }
    const res = buildCustomPlan({ km, raceDate: iso, goalTime: g, current5k: cur, runsPerWeek: perWeek }, runs);
    if ('error' in res) { setError(res.error); return; }
    setBuilt(res);
  }

  async function start() {
    if (!built) return;
    const go = async () => {
      await savePlan({ planId: 'custom', startedAt: new Date().toISOString(), done: {}, custom: built.plan });
      if (!race) await saveRace({ name: `My ${raceDistanceName(km)}`, date: built.plan.custom!.raceDate, km });
      router.dismissAll();
      router.push('/plans');
    };
    const active = planFor(progress);
    if (active) {
      Alert.alert(`Switch to ${built.plan.name}?`, `Your ticks in ${active.name} will be cleared. Your runs stay in History.`, [
        { text: 'Cancel', style: 'cancel' }, { text: 'Switch', onPress: go },
      ]);
    } else go();
  }

  const p = built?.plan.custom?.paces;
  return (
    <Screen inset={false}>
      <Text style={{ color: t.muted, marginBottom: 12, lineHeight: 20 }}>
        Tell Pacely about your race. Your plan is built around your fitness and the days you can run, and your paces adjust as you tell Pacely how sessions felt.
      </Text>
      <Card>
        <SectionLabel>Race distance</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {RACE_DISTANCES.map((d) => <Chip key={d.label} small label={d.label} active={Math.abs(km - d.km) < 0.01} onPress={() => { setKm(d.km); setBuilt(null); }} />)}
        </View>
        <Field label="Race date (day/month/year)" placeholder="12/04/2027" value={date} onChangeText={(v) => { setDate(v); setBuilt(null); }} keyboardType="numbers-and-punctuation" />
        <Field label="Your 5K time now" hint={current ? 'Worked out from your recent runs. Change it if you know better.' : 'Leave empty if you\'re not sure.'} placeholder="28:30" value={current} onChangeText={(v) => { setCurrent(v); setBuilt(null); }} keyboardType="numbers-and-punctuation" />
        <Field label="Goal time (optional)" hint="Leave empty and Pacely picks a realistic target." placeholder={km > 21.2 ? '4:00:00' : km > 10 ? '1:55:00' : km > 5 ? '55:00' : '25:00'} value={goal} onChangeText={(v) => { setGoal(v); setBuilt(null); }} keyboardType="numbers-and-punctuation" />
        <SectionLabel>Runs a week</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {[3, 4].map((n) => <Chip key={n} small label={`${n} runs`} active={perWeek === n} onPress={() => { setPerWeek(n); setBuilt(null); }} />)}
        </View>
        {error ? <Text style={{ color: t.danger, marginBottom: 8 }}>{error}</Text> : null}
        <Button label="Build my plan" onPress={preview} />
      </Card>

      {built && p ? (
        <Card style={{ borderColor: t.accent, borderWidth: 1.5 }}>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '800' }}>{built.plan.name}</Text>
          <Text style={{ color: t.muted, marginTop: 2 }}>{built.plan.weeks} weeks · {built.plan.perWeek} runs a week</Text>
          <Text style={{ color: t.text, marginTop: 10, fontSize: 16 }}>
            Goal: <Text style={{ fontWeight: '800' }}>{fmtTime(built.goalTime)}</Text> ({fmtPace(p.race)} per km)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
            {[['Easy', p.easy], ['Tempo', p.tempo], ['Reps', p.reps], ['Race', p.race]].map(([label, v]) => (
              <View key={label as string} style={{ width: '50%', paddingVertical: 4 }}>
                <Text style={{ color: t.text, fontWeight: '800', fontSize: 17 }}>{fmtPace(v as number)}</Text>
                <Text style={{ color: t.muted, fontSize: 13 }}>{label} pace /km</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: t.muted, marginTop: 8, lineHeight: 20 }}>
            Longest run: {Math.max(...built.plan.sessions.filter((x) => x.kind === 'distance' && x.week < built.plan.weeks).map((x) => x.km ?? 0))} km. A lighter week every fourth week, and a taper before race day.
          </Text>
          <Text style={{ color: t.text, fontWeight: '700', marginTop: 12 }}>Week 1</Text>
          {built.plan.sessions.filter((x) => x.week === 1).map((x) => <Text key={x.id} style={{ color: t.muted, marginTop: 3 }}>Run {x.day}: {x.summary}</Text>)}
          <Button label="Start this plan" onPress={start} style={{ marginTop: 14 }} />
        </Card>
      ) : null}
    </Screen>
  );
}
