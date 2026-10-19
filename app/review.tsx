import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Card, Chip, Screen } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadRuns } from '../src/storage';
import { yearReview } from '../src/advStats';
import { fmtShortDate, fmtTime } from '../src/format';
import { RunRecord } from '../src/types';

/** Year in review (Pacely Plus): a year of running in big numbers. */
export default function ReviewScreen() {
  const t = useTheme();
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  useEffect(() => { loadRuns().then((r) => setRuns(r.filter((x) => !x.simulated))); }, []);
  const years = [...new Set(runs.map((r) => new Date(r.startedAt).getFullYear()))].sort((a, b) => b - a);
  const y = yearReview(runs, year);

  const Big = ({ value, label }: { value: string; label: string }) => (
    <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
      <Text style={{ color: t.accent, fontSize: 40, fontWeight: '900', textAlign: 'center' }}>{value}</Text>
      <Text style={{ color: t.text, fontSize: 16, fontWeight: '600', marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </Card>
  );

  return (
    <Screen inset={false}>
      {years.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {years.map((yr) => <Chip key={yr} small label={String(yr)} active={yr === year} onPress={() => setYear(yr)} />)}
        </View>
      ) : null}
      <Text style={{ color: t.text, fontSize: 28, fontWeight: '900', marginBottom: 12 }}>Your {year} in running</Text>
      {!y.runs ? (
        <Card><Text style={{ color: t.muted }}>No runs in {year} yet. Get out there!</Text></Card>
      ) : (
        <>
          <Big value={`${y.km.toFixed(0)} km`} label={`across ${y.runs} ${y.runs === 1 ? 'run' : 'runs'}`} />
          <Big value={`${y.hours.toFixed(y.hours < 10 ? 1 : 0)} hours`} label="spent running" />
          {y.longest ? <Big value={`${(y.longest.distance / 1000).toFixed(1)} km`} label={`your longest run, on ${fmtShortDate(y.longest.startedAt)}`} /> : null}
          {y.fastest5k ? <Big value={fmtTime(y.fastest5k)} label="your fastest 5K" /> : null}
          {y.bestMonth ? <Big value={y.bestMonth.name} label={`your biggest month: ${y.bestMonth.km.toFixed(0)} km`} /> : null}
          {y.favouriteDay ? <Big value={y.favouriteDay} label="your favourite day to run" /> : null}
          {y.longestStreak > 1 ? <Big value={`${y.longestStreak} days`} label="your longest run streak" /> : null}
          {y.pbs ? <Big value={String(y.pbs)} label={y.pbs === 1 ? 'personal best set' : 'personal bests set'} /> : null}
          {y.earlyBird ? <Big value={String(y.earlyBird)} label={`early-bird ${y.earlyBird === 1 ? 'run' : 'runs'} before 9am 🌅`} /> : null}
        </>
      )}
    </Screen>
  );
}
