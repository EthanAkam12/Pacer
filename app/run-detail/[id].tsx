import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from '../../src/charts';
import { PB_DISTANCES, runBests } from '../../src/records';
import { Button, Card, Screen, SectionLabel, Stat } from '../../src/ui';
import { kindColor, useTheme } from '../../src/theme';
import { deleteRun, getRun } from '../../src/storage';
import { RunRecord } from '../../src/types';
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
      <Text style={{ color: t.muted, marginBottom: 16 }}>
        {fmtDate(run.startedAt)}{run.simulated ? ', practice run' : ''}{!run.completed ? ', ended early' : ''}
      </Text>

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
          <RouteSketch route={run.route} color={t.accent} start={t.walk} />
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

      <Button variant="danger" label="Delete run" onPress={remove} style={{ marginTop: 8 }} />
    </Screen>
  );
}

function RouteSketch({ route, color, start }: { route: { lat: number; lon: number }[]; color: string; start: string }) {
  const W = 320, H = 200, pad = 14;
  const k = Math.cos((route[0].lat * Math.PI) / 180);
  const xs = route.map((p) => p.lon * k), ys = route.map((p) => p.lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((W - 2 * pad) / Math.max(maxX - minX, 1e-9), (H - 2 * pad) / Math.max(maxY - minY, 1e-9));
  const offX = (W - (maxX - minX) * scale) / 2, offY = (H - (maxY - minY) * scale) / 2;
  const pts = route.map((p, i) => [offX + (xs[i] - minX) * scale, H - (offY + (ys[i] - minY) * scale)]);
  const [sx, sy] = pts[0], [ex, ey] = pts[pts.length - 1];
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={sx} cy={sy} r={6} fill={start} />
      <Circle cx={ex} cy={ey} r={6} fill={color} />
    </Svg>
  );
}
