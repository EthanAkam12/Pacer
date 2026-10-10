import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card, Screen, Title } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { loadRuns } from '../../src/storage';
import { RunRecord } from '../../src/types';
import { fmtDate, fmtKm, fmtPace, fmtTime } from '../../src/format';

export default function HistoryScreen() {
  const t = useTheme();
  const router = useRouter();
  const [runs, setRuns] = useState<RunRecord[] | null>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    loadRuns().then((r) => { if (alive) setRuns(r); });
    return () => { alive = false; };
  }, []));

  if (!runs) return <Screen>{null}</Screen>;

  const real = runs.filter((r) => !r.simulated);
  const weekAgo = Date.now() - 7 * 864e5;
  const week = real.filter((r) => Date.parse(r.startedAt) >= weekAgo);
  const sum = (list: RunRecord[]) => list.reduce((a, r) => a + r.distance, 0);

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
