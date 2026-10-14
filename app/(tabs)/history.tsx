import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Screen, SectionLabel, Title } from '../../src/ui';
import { BarChart, Datum, LineChart } from '../../src/charts';
import { personalBests } from '../../src/records';
import { useTheme } from '../../src/theme';
import { loadRuns, loadSettings } from '../../src/storage';
import { useDataVersion } from '../../src/hooks';
import { ACHIEVEMENTS, earned } from '../../src/progress';
import { ProgressSection } from '../../src/progressStats';
import { AdvancedStats } from '../../src/advStatsUi';
import { RunRecord } from '../../src/types';
import { fmtDate, fmtKm, fmtPace, fmtShortDate, fmtTime } from '../../src/format';

export default function HistoryScreen() {
  const t = useTheme();
  const router = useRouter();
  const [runs, setRuns] = useState<RunRecord[] | null>(null);
  const [goal, setGoal] = useState(10);
  const [maxHr, setMaxHr] = useState(190);
  const version = useDataVersion();

  useFocusEffect(useCallback(() => {
    let alive = true;
    Promise.all([loadRuns(), loadSettings()]).then(([r, s]) => { if (alive) { setRuns(r); setGoal(s.weeklyGoalKm); const m = parseInt(s.maxHr, 10); setMaxHr(m >= 120 && m <= 230 ? m : 190); } });
    return () => { alive = false; };
  }, [version]));

  if (!runs) return <Screen>{null}</Screen>;

  const real = runs.filter((r) => !r.simulated);
  const weekAgo = Date.now() - 7 * 864e5;
  const week = real.filter((r) => Date.parse(r.startedAt) >= weekAgo);
  const sum = (list: RunRecord[]) => list.reduce((a, r) => a + r.distance, 0);
  const pbs = personalBests(real);
  const weeks = weeklyDistance(real, 8);

  return (
    <Screen>
      <Title>History</Title>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: t.text, fontVariant: ['tabular-nums'] }}>{fmtKm(sum(week))}</Text>
          <Text style={{ color: t.muted }}>km in the last 7 days</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: t.text }}>{week.length}</Text>
          <Text style={{ color: t.muted }}>{week.length === 1 ? 'run' : 'runs'} in the last 7 days</Text>
        </Card>
      </View>
      <Text style={{ color: t.muted, marginBottom: 16, marginTop: 2 }}>
        All time: {fmtKm(sum(real))} km across {real.length} {real.length === 1 ? 'run' : 'runs'}
      </Text>

      <Pressable onPress={() => router.push('/achievements')} accessibilityRole="button">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="medal" size={26} color={t.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 16 }}>Achievements</Text>
            <Text style={{ color: t.muted }}>{earned(real, goal).size} of {ACHIEVEMENTS.length} unlocked</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.muted} />
        </Card>
      </Pressable>

      {pbs.length ? (
        <Card>
          <SectionLabel>Personal bests</SectionLabel>
          {pbs.map((pb, i) => (
            <Pressable key={pb.key} onPress={() => router.push(`/run-detail/${pb.runId}`)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
              <Ionicons name="trophy" size={18} color={t.accent} style={{ marginRight: 10 }} />
              <Text style={{ flex: 1, color: t.text, fontWeight: '600' }}>{pb.label}</Text>
              <Text style={{ color: t.muted, marginRight: 12 }}>{fmtShortDate(pb.date)}</Text>
              <Text style={{ color: t.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{fmtTime(pb.time)}</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      {real.length ? (
        <Card>
          <BarChart title="Distance per week" data={weeks} maxLabel={`${Math.max(...weeks.map((w) => w.value)).toFixed(1)} km`} />
        </Card>
      ) : null}

      {real.length ? <ProgressSection runs={real} /> : null}
      {real.length ? <AdvancedStats runs={real} maxHr={maxHr} /> : null}

      {runs.length === 0 ? (
        <Card>
          <Text style={{ fontWeight: '700', fontSize: 17, color: t.text }}>No runs yet</Text>
          <Text style={{ color: t.muted, marginTop: 4 }}>Finish a run and it shows up here with your splits and route.</Text>
        </Card>
      ) : null}

      {runs.map((r) => (
        <Pressable key={r.id} onPress={() => router.push(`/run-detail/${r.id}`)}>
          {({ pressed }) => (
            <Card style={{ opacity: pressed ? 0.75 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: t.text }} numberOfLines={1}>{r.title}</Text>
                  <Text style={{ color: t.muted, marginTop: 2 }}>{fmtDate(r.startedAt)}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    {r.mode === 'intervals' ? <Tag label="Intervals" /> : null}
                    {r.simulated ? <Tag label="Practice" /> : null}
                    {!r.completed ? <Tag label="Ended early" /> : null}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: t.text, fontVariant: ['tabular-nums'] }}>{fmtKm(r.distance)} km</Text>
                  <Text style={{ color: t.muted, fontVariant: ['tabular-nums'] }}>{fmtTime(r.duration)}, {fmtPace(r.avgPace)} /km</Text>
                </View>
              </View>
            </Card>
          )}
        </Pressable>
      ))}
    </Screen>
  );
}

function Tag({ label }: { label: string }) {
  const t = useTheme();
  return (
    <Text style={{ fontSize: 12, fontWeight: '700', color: t.muted, backgroundColor: t.chip, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' }}>
      {label}
    </Text>
  );
}

/** Total km for each of the last `n` weeks (Monday to Sunday), oldest first. */
function weeklyDistance(runs: RunRecord[], n: number): Datum[] {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: n }, (_, k) => {
    const start = new Date(monday);
    start.setDate(start.getDate() - 7 * (n - 1 - k));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const km = runs.filter((r) => { const d = Date.parse(r.startedAt); return d >= +start && d < +end; }).reduce((a, r) => a + r.distance, 0) / 1000;
    const label = k === n - 1 ? 'This wk' : fmtShortDate(start.toISOString());
    return { label, value: km, text: `${km.toFixed(2)} km` };
  });
}
