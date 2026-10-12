import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Field, Screen, SectionLabel, Segmented, StepStrip, Title, ToggleRow } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { HR_OPTIONS, loadSettings, loadWorkouts, saveSettings } from '../../src/storage';
import { Plan, RunMode, Settings, Workout } from '../../src/types';
import { parsePace } from '../../src/format';
import { estimateMinutes, summarize } from '../../src/intervals';
import { session, SIM_SPEED } from '../../src/session';
import { useHr } from '../../src/hooks';
import { connectStrap, disconnectStrap, scanForStraps } from '../../src/heartRate';
import { personaFor } from '../../src/coach';
import { voiceFor } from '../../src/speech';

const DISTANCES = [1, 3, 5, 10, 21.1];

export default function StartScreen() {
  const t = useTheme();
  const router = useRouter();
  const hr = useHr();
  const [s, setS] = useState<Settings | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    Promise.all([loadSettings(), loadWorkouts()]).then(([st, w]) => { if (alive) { setS(st); setWorkouts(w); } });
    return () => { alive = false; };
  }, []));

  if (!s) return <Screen>{null}</Screen>;

  const update = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    saveSettings(next);
    setError('');
  };
  const workout = workouts.find((w) => w.id === s.workoutId) ?? workouts[0] ?? null;

  async function start() {
    if (!s) return;
    const goalKm = parseFloat(s.goalKm.replace(',', '.'));
    const target = s.targetPace.trim() ? parsePace(s.targetPace) : null;
    if (s.mode === 'distance' && !(goalKm >= 0.2 && goalKm <= 200)) { setError('Enter a distance between 0.2 and 200 km.'); return; }
    if (s.targetPace.trim() && !(target && target >= 150 && target <= 1200)) { setError('Write target pace as minutes:seconds per km, for example 6:00.'); return; }
    if (s.mode === 'intervals' && !workout) { setError('Choose an interval workout first.'); return; }
    const maxHr = parseInt(s.maxHr, 10);
    const persona = personaFor(s.coach);
    setStarting(true);
    const voice = await voiceFor(persona, s.voiceId, s.voiceRate);
    const plan: Plan = {
      mode: s.mode,
      goalMeters: s.mode === 'distance' ? goalKm * 1000 : 0,
      targetPace: target,
      splitEvery: s.mode === 'distance' ? s.splitEvery : 1000,
      workout: s.mode === 'intervals' ? workout : null,
      voice: s.voice,
      maxHr: maxHr >= 120 && maxHr <= 230 ? maxHr : 190,
      simulate: s.simulate,
      coach: persona.style,
      voiceId: voice.voiceId,
      voiceRate: voice.rate,
      voicePitch: voice.pitch,
      hrEvery: s.hrEvery,
      duckMusic: s.duckMusic,
    };
    const res = await session.start(plan);
    setStarting(false);
    if (!res.ok) { setError(res.message ?? 'The run could not start.'); return; }
    router.push('/run');
  }

  return (
    <Screen>
      <Title sub="Pick a run and Pacer will coach you through it.">Ready to run?</Title>

      <Segmented<RunMode>
        options={[{ label: 'Distance run', value: 'distance' }, { label: 'Intervals', value: 'intervals' }]}
        value={s.mode}
        onChange={(mode) => update({ mode })}
      />

      {s.mode === 'distance' ? (
        <Card>
          <SectionLabel>How far?</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {DISTANCES.map((d) => (
              <Chip key={d} label={`${d} km`} active={parseFloat(s.goalKm) === d} onPress={() => update({ goalKm: String(d) })} />
            ))}
          </View>
          <Field label="Distance (km)" value={s.goalKm} onChangeText={(goalKm) => update({ goalKm })} keyboardType="decimal-pad" />
          <Field label="Target pace (optional)" hint="Minutes:seconds per km. The coach tells you if you're ahead or behind." placeholder="6:00" value={s.targetPace} onChangeText={(targetPace) => update({ targetPace })} keyboardType="numbers-and-punctuation" />
          <SectionLabel>Coach updates</SectionLabel>
          <Segmented<number>
            options={[{ label: 'Every 0.5 km', value: 500 }, { label: 'Every 1 km', value: 1000 }]}
            value={s.splitEvery}
            onChange={(splitEvery) => update({ splitEvery })}
          />
        </Card>
      ) : (
        <Card>
          {workout ? (
            <>
              <Text style={{ fontSize: 20, fontWeight: '700', color: t.text }}>{workout.name}</Text>
              <StepStrip workout={workout} />
              <Text style={{ color: t.muted, lineHeight: 20 }}>{summarize(workout)}</Text>
              <Text style={{ color: t.muted, marginTop: 4 }}>About {estimateMinutes(workout)} minutes</Text>
            </>
          ) : (
            <Text style={{ color: t.muted }}>No workouts yet. Build one in the Intervals tab.</Text>
          )}
          <Button small variant="secondary" label="Choose or build a workout" onPress={() => router.navigate('/workouts')} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
          <View style={{ height: 14 }} />
          <Field label="Target pace for run intervals (optional)" placeholder="5:30" value={s.targetPace} onChangeText={(targetPace) => update({ targetPace })} keyboardType="numbers-and-punctuation" />
        </Card>
      )}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="heart" size={24} color={hr.deviceName ? t.heart : t.muted} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: t.text }}>{hr.deviceName ?? 'Heart-rate strap'}</Text>
            <Text style={{ color: t.muted, fontSize: 14 }}>
              {hr.deviceName ? (hr.bpm ? `${hr.bpm} bpm` : 'Waiting for a reading…') : hr.status}
            </Text>
          </View>
          {hr.deviceName
            ? <Button small variant="secondary" label="Disconnect" onPress={disconnectStrap} />
            : <Button small variant="secondary" label={hr.scanning ? 'Searching…' : 'Connect'} onPress={scanForStraps} disabled={hr.scanning} />}
        </View>
        <Text style={{ fontWeight: '600', color: t.text, marginTop: 14, marginBottom: 8 }}>Heart-rate updates</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {HR_OPTIONS.map((o) => (
            <Chip key={o.value} small label={o.label} active={s.hrEvery === o.value} onPress={() => update({ hrEvery: o.value })} />
          ))}
        </View>
        {hr.found.map((d) => (
          <Pressable key={d.id} onPress={() => connectStrap(d.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: t.line }}>
            <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{d.name}</Text>
            <Ionicons name="chevron-forward" size={18} color={t.muted} />
          </Pressable>
        ))}
      </Card>

      <Card>
        <Pressable onPress={() => router.push('/coach')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="chatbubble-ellipses" size={24} color={t.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: t.text }}>Coach: {personaFor(s.coach).name}</Text>
            <Text style={{ color: t.muted, fontSize: 14 }}>{personaFor(s.coach).traits.join(', ')}</Text>
          </View>
          <Text style={{ color: t.accent, fontWeight: '700' }}>Change</Text>
        </Pressable>
      </Card>

      <Card>
        <ToggleRow label="Voice coaching" hint="Pace, distance, splits and encouragement in your ear." value={s.voice} onChange={(voice) => update({ voice })} />
        <ToggleRow label="Practice mode" hint={`Simulated run at ${SIM_SPEED}× speed so you can test the coach indoors.`} value={s.simulate} onChange={(simulate) => update({ simulate })} />
      </Card>

      {error ? <Text style={{ color: t.danger, marginBottom: 12, fontWeight: '600' }}>{error}</Text> : null}
      <Button label={starting ? 'Starting…' : s.mode === 'intervals' ? 'Start workout' : 'Start run'} onPress={start} disabled={starting} />
    </Screen>
  );
}
