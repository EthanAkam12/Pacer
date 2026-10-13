import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, SectionLabel, Segmented } from './ui';
import { BarChart, LineChart } from './charts';
import { useTheme } from './theme';
import { RunRecord } from './types';
import { calendar, fitnessTrend, inRange, monthCompare, monthlyKm, predictions, Range, RANGES } from './stats';
import { fmtPace, fmtShortDate, fmtTime } from './format';

/** The Progress part of History: fitness trend, race predictions, this month vs last, monthly km and a calendar. */
export function ProgressSection({ runs }: { runs: RunRecord[] }) {
  const t = useTheme();
  const [range, setRange] = useState<Range>('3m');
  const ranged = inRange(runs, range);
  const trend = fitnessTrend(ranged);
  const paceRuns = ranged.filter((r) => r.avgPace > 0 && r.distance >= 500).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const preds = predictions(runs);
  const month = monthCompare(runs);
  const months = monthlyKm(runs);
  const change = trend.length >= 2 ? trend[0].five - trend[trend.length - 1].five : 0;

  return (
    <>
      <SectionLabel>Progress</SectionLabel>
      <Segmented<Range> options={RANGES} value={range} onChange={setRange} />

      <Card>
        {trend.length >= 2 ? (
          <>
            <LineChart
              title="Fitness (as a 5K time, up is fitter)"
              invert
              topLabel={fmtTime(Math.min(...trend.map((p) => p.five)))}
              bottomLabel={fmtTime(Math.max(...trend.map((p) => p.five)))}
              data={trend.map((p) => ({ label: fmtShortDate(p.at), value: p.five, text: `like a ${fmtTime(p.five)} 5K` }))}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Ionicons name={change >= 0 ? 'trending-up' : 'trending-down'} size={18} color={change >= 0 ? t.walk : t.danger} />
              <Text style={{ color: t.text, fontWeight: '600', flex: 1 }}>
                {Math.abs(change) < 5 ? 'Holding steady over this period.' : change > 0 ? `${fmtTime(change)} fitter than at the start of this period.` : `${fmtTime(-change)} slower than at the start of this period.`}
              </Text>
            </View>
          </>
        ) : (
          <Text style={{ color: t.muted, lineHeight: 20 }}>Run a mile or more a couple of times in this period to see your fitness trend.</Text>
        )}
      </Card>

      {preds ? (
        <Card>
          <Text style={{ color: t.muted, fontWeight: '600', marginBottom: 8 }}>Race predictions</Text>
          <View style={{ flexDirection: 'row' }}>
            {preds.map((p) => (
              <View key={p.label} style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{fmtTime(p.time)}</Text>
                <Text style={{ color: t.muted, fontSize: 13 }}>{p.label}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: t.muted, fontSize: 12, marginTop: 8 }}>Based on your best run in the last 60 days. Longer races assume you've trained for the distance.</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={{ color: t.muted, fontWeight: '600', marginBottom: 10 }}>This month vs last month (same days)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Delta label="distance" now={`${month.now.km.toFixed(1)} km`} better={month.now.km > month.before.km} worse={month.now.km < month.before.km} was={`${month.before.km.toFixed(1)} km`} />
          <Delta label="runs" now={String(month.now.runs)} better={month.now.runs > month.before.runs} worse={month.now.runs < month.before.runs} was={String(month.before.runs)} />
          <Delta label="average pace" now={month.now.pace ? fmtPace(month.now.pace) : '–'} was={month.before.pace ? fmtPace(month.before.pace) : '–'}
            better={!!(month.now.pace && month.before.pace && month.now.pace < month.before.pace)} worse={!!(month.now.pace && month.before.pace && month.now.pace > month.before.pace)} />
          <Delta label="longest run" now={`${month.now.longest.toFixed(1)} km`} better={month.now.longest > month.before.longest} worse={month.now.longest < month.before.longest} was={`${month.before.longest.toFixed(1)} km`} />
        </View>
      </Card>

      <Card>
        <BarChart title="Distance per month" data={months.map((m) => ({ label: m.label, value: m.km, text: `${m.km.toFixed(1)} km` }))} maxLabel={`${Math.max(...months.map((m) => m.km)).toFixed(0)} km`} />
      </Card>

      {paceRuns.length >= 2 ? (
        <Card>
          <LineChart
            title="Average pace per run (up is faster)"
            invert
            topLabel={fmtPace(Math.min(...paceRuns.map((r) => r.avgPace)))}
            bottomLabel={fmtPace(Math.max(...paceRuns.map((r) => r.avgPace)))}
            data={paceRuns.map((r) => ({ label: fmtShortDate(r.startedAt), value: r.avgPace, text: `${fmtPace(r.avgPace)} /km, ${(r.distance / 1000).toFixed(2)} km` }))}
          />
        </Card>
      ) : null}

      <Card>
        <Text style={{ color: t.muted, fontWeight: '600', marginBottom: 10 }}>Last 12 weeks</Text>
        <Calendar runs={runs} />
      </Card>
    </>
  );
}

function Delta({ label, now, was, better, worse }: { label: string; now: string; was: string; better: boolean; worse: boolean }) {
  const t = useTheme();
  return (
    <View style={{ width: '50%', paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{now}</Text>
        {better || worse ? <Ionicons name={better ? 'arrow-up' : 'arrow-down'} size={16} color={better ? t.walk : t.danger} /> : null}
      </View>
      <Text style={{ color: t.muted, fontSize: 13 }}>{label} · was {was}</Text>
    </View>
  );
}

/** A square per day for the last 12 weeks, darker for longer runs. */
function Calendar({ runs }: { runs: RunRecord[] }) {
  const t = useTheme();
  const weeks = calendar(runs);
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const shade = (km: number) => (km <= 0 ? t.chip : km < 3 ? t.soft : km < 8 ? `${t.accent}99` : t.accent);
  const active = weeks.flat().filter((d) => d.km > 0).length;
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <View style={{ gap: 4, marginRight: 2 }}>
          {days.map((d, i) => <Text key={i} style={{ color: t.muted, fontSize: 10, height: 16, lineHeight: 16 }}>{d}</Text>)}
        </View>
        {weeks.map((w, i) => (
          <View key={i} style={{ flex: 1, gap: 4 }}>
            {w.map((d) => (
              <View key={d.day} accessibilityLabel={`${new Date(d.day).toDateString()}: ${d.km.toFixed(1)} km`}
                style={{ height: 16, borderRadius: 4, backgroundColor: d.future ? 'transparent' : shade(d.km) }} />
            ))}
          </View>
        ))}
      </View>
      <Text style={{ color: t.muted, fontSize: 13, marginTop: 10 }}>{active} running {active === 1 ? 'day' : 'days'} in the last 12 weeks. Darker squares are longer runs.</Text>
    </View>
  );
}
