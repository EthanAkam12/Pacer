import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, PlusLock, SectionLabel } from './ui';
import { useTheme } from './theme';
import { BarChart } from './charts';
import { usePlus } from './plus';
import { ZONES, trainingLoad, vo2Estimate, zoneMinutes } from './advStats';
import { RunRecord } from './types';

/** History's Advanced stats (Pacer Plus): training load, VO2 max estimate, heart-rate zones, year in review. */
export function AdvancedStats({ runs, maxHr }: { runs: RunRecord[]; maxHr: number }) {
  const t = useTheme();
  const router = useRouter();
  const plus = usePlus();
  if (!plus) {
    return (
      <>
        <SectionLabel>Advanced stats</SectionLabel>
        <PlusLock title="Advanced stats" text="Training load, a fitness score (VO2 max), heart-rate zones and your year in review." onPress={() => router.push('/plus')} />
      </>
    );
  }
  const load = trainingLoad(runs);
  const vo2 = vo2Estimate(runs);
  const zones = zoneMinutes(runs, maxHr);
  const zoneTotal = zones.reduce((a, b) => a + b, 0);
  const tone = { low: t.muted, good: t.accent, high: '#E0A100', danger: t.danger }[load.verdict.tone];

  return (
    <>
      <SectionLabel>Advanced stats</SectionLabel>
      <Card>
        <Text style={{ color: t.muted, fontWeight: '600' }}>Training load</Text>
        <Text style={{ color: tone, fontSize: 20, fontWeight: '800', marginTop: 2 }}>{load.verdict.title}</Text>
        <Text style={{ color: t.muted, marginTop: 2, lineHeight: 20 }}>{load.verdict.text}</Text>
        <Text style={{ color: t.text, marginTop: 8 }}>This week <Text style={{ fontWeight: '800' }}>{load.acute}</Text> · usual week <Text style={{ fontWeight: '800' }}>{load.chronic}</Text></Text>
        <View style={{ marginTop: 10 }}>
          <BarChart title="Load per week" data={load.weeks.map((w) => ({ ...w, text: `Week of ${w.label}: ${w.value}` }))} maxLabel={String(Math.max(1, ...load.weeks.map((w) => w.value)))} />
        </View>
      </Card>

      <Card>
        <Text style={{ color: t.muted, fontWeight: '600' }}>Fitness score (VO2 max estimate)</Text>
        {vo2 ? (
          <>
            <Text style={{ color: t.text, fontSize: 30, fontWeight: '900', marginTop: 2 }}>{vo2.value} <Text style={{ color: t.accent, fontSize: 16, fontWeight: '700' }}>{vo2.band}</Text></Text>
            <Text style={{ color: t.muted, marginTop: 2, lineHeight: 20 }}>Worked out from your best run in the last 60 days. It goes up as you get fitter.</Text>
          </>
        ) : (
          <Text style={{ color: t.muted, marginTop: 4 }}>Run a mile or more to get your score.</Text>
        )}
      </Card>

      <Card>
        <Text style={{ color: t.muted, fontWeight: '600', marginBottom: 8 }}>Heart-rate zones (last 4 weeks)</Text>
        {zoneTotal > 0 ? ZONES.map((z, i) => (
          <View key={z.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={{ color: t.text, width: 96, fontWeight: '600' }}>{z.label}</Text>
            <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: t.chip, overflow: 'hidden' }}>
              <View style={{ width: `${(zones[i] / zoneTotal) * 100}%`, height: '100%', backgroundColor: i < 2 ? t.walk : i < 3 ? t.accent : t.heart }} />
            </View>
            <Text style={{ color: t.muted, width: 52, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{Math.round(zones[i])} min</Text>
          </View>
        )) : (
          <Text style={{ color: t.muted, lineHeight: 20 }}>Run with a heart-rate strap to see how much time you spend in each zone. Most of your running should be easy (zones 1–2).</Text>
        )}
      </Card>

      <Pressable onPress={() => router.push('/review')} accessibilityRole="button">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="gift" size={24} color={t.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 16 }}>Your {new Date().getFullYear()} in running</Text>
            <Text style={{ color: t.muted }}>Your year in review</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.muted} />
        </Card>
      </Pressable>
    </>
  );
}
