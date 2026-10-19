import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, PlusLock, Screen, SectionLabel } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadRuns } from '../src/storage';
import { WeeklyReport, weeklyReport } from '../src/coachReview';
import { fmtTime } from '../src/format';
import { usePlus } from '../src/plus';

/** Pacely Plus: the coach's report on last week, and a target for this one. */
export default function WeeklyScreen() {
  const t = useTheme();
  const router = useRouter();
  const plus = usePlus();
  const [r, setR] = useState<WeeklyReport | null>(null);
  useEffect(() => { loadRuns().then((runs) => setR(weeklyReport(runs))); }, []);
  if (!plus) return <Screen inset={false}><PlusLock title="Weekly coach report" text="Every Monday: how last week went and what to aim for this week." onPress={() => router.push('/plus')} /></Screen>;
  if (!r) return <Screen inset={false}>{null}</Screen>;

  const from = new Date(r.from), to = new Date(r.from + 6 * 864e5);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const change = r.lastKm > 0 ? Math.round(((r.km - r.lastKm) / r.lastKm) * 100) : null;
  const Stat = ({ value, label }: { value: string; label: string }) => (
    <View style={{ width: '50%', paddingVertical: 8 }}>
      <Text style={{ color: t.text, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ color: t.muted }}>{label}</Text>
    </View>
  );

  return (
    <Screen inset={false}>
      <Text style={{ color: t.muted, fontWeight: '600' }}>{fmt(from)} – {fmt(to)}</Text>
      <Text style={{ color: t.text, fontSize: 26, fontWeight: '900', marginBottom: 12 }}>Your week</Text>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Stat value={`${r.km.toFixed(1)} km`} label={change === null ? 'distance' : `distance (${change >= 0 ? '+' : ''}${change}%)`} />
          <Stat value={String(r.runs)} label={r.runs === 1 ? 'run' : 'runs'} />
          <Stat value={fmtTime(r.time)} label="time running" />
          <Stat value={`${r.longest.toFixed(1)} km`} label="longest run" />
        </View>
        {r.bestFitness ? <Text style={{ color: t.muted, marginTop: 4 }}>Best effort of the week: like a {fmtTime(r.bestFitness)} 5K.</Text> : null}
      </Card>

      <SectionLabel>Coach's notes</SectionLabel>
      <Card>
        {r.notes.map((n) => (
          <View key={n} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <Ionicons name="chatbubble-ellipses" size={16} color={t.accent} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, color: t.text, lineHeight: 20 }}>{n}</Text>
          </View>
        ))}
      </Card>

      <SectionLabel>This week</SectionLabel>
      <Card style={{ borderColor: t.accent, borderWidth: 1.5 }}>
        <Text style={{ color: t.text, fontSize: 20, fontWeight: '800' }}>Aim for about {r.nextWeekKm} km</Text>
        <Text style={{ color: t.muted, marginTop: 4, lineHeight: 20 }}>
          {r.load.verdict.tone === 'danger'
            ? 'A lighter week to let your body catch up after a big jump.'
            : 'Building by no more than about 10% a week keeps you getting fitter without getting injured. Make most runs easy, with one harder session.'}
        </Text>
      </Card>
    </Screen>
  );
}
