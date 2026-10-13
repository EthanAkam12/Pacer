import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card, Screen, SectionLabel } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadPlan, loadSettings, saveSettings } from '../src/storage';
import { planById } from '../src/plans';
import { DAY_SHORT, WEEK_ORDER, dayList, planDays } from '../src/schedule';
import { PlanProgress, Settings } from '../src/types';

/** Running schedule: tap the days you can run. Training plan sessions are placed on them. */
export default function ScheduleScreen() {
  const t = useTheme();
  const [s, setS] = useState<Settings | null>(null);
  const [progress, setProgress] = useState<PlanProgress | null>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    Promise.all([loadSettings(), loadPlan()]).then(([st, pl]) => { if (alive) { setS(st); setProgress(pl); } });
    return () => { alive = false; };
  }, []));
  if (!s) return <Screen inset={false}>{null}</Screen>;

  function toggle(day: number) {
    if (!s) return;
    const on = s.runDays.includes(day);
    if (on && s.runDays.length === 1) return; // keep at least one day
    const next = { ...s, runDays: on ? s.runDays.filter((d) => d !== day) : [...s.runDays, day].sort() };
    setS(next);
    saveSettings(next);
  }

  const plan = progress ? planById(progress.planId) : null;
  const chosen = plan ? planDays(s.runDays, plan.perWeek) : [];
  const off = WEEK_ORDER.filter((d) => !s.runDays.includes(d));

  return (
    <Screen inset={false}>
      <SectionLabel>Days you can run</SectionLabel>
      <Card>
        <Text style={{ color: t.muted, marginBottom: 12, lineHeight: 20 }}>
          Tap a day to turn it off if you can't run then. Your training plan only puts sessions on the days that are on.
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {WEEK_ORDER.map((d) => {
            const on = s.runDays.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => toggle(d)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={DAY_SHORT[d]}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: on ? t.accent : t.chip }}
              >
                <Text style={{ color: on ? t.onAccent : t.muted, fontWeight: '800', fontSize: 13 }}>{DAY_SHORT[d]}</Text>
                <Text style={{ color: on ? t.onAccent : t.muted, fontSize: 16, marginTop: 4 }}>{on ? '✓' : '–'}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: t.text, marginTop: 12, fontWeight: '600' }}>
          {off.length ? `You can't run on ${dayList(off, true)}.` : 'You can run any day of the week.'}
        </Text>
      </Card>

      {plan ? (
        <>
          <SectionLabel>Your plan</SectionLabel>
          <Card>
            <Text style={{ color: t.text, fontWeight: '800', fontSize: 17 }}>{plan.name}</Text>
            <Text style={{ color: t.text, marginTop: 6, lineHeight: 21 }}>
              Sessions go on <Text style={{ fontWeight: '800' }}>{dayList(chosen, true)}</Text>
              {chosen.length >= plan.perWeek ? ', with rest days in between where they fit.' : '.'}
            </Text>
            {chosen.length < plan.perWeek ? (
              <Text style={{ color: t.muted, marginTop: 6, lineHeight: 20 }}>
                The plan has {plan.perWeek} runs a week, so with {chosen.length} {chosen.length === 1 ? 'day' : 'days'} it will take about {Math.ceil((plan.weeks * plan.perWeek) / chosen.length)} weeks instead of {plan.weeks}. That's fine, it just goes at your pace.
              </Text>
            ) : null}
            <Text style={{ color: t.muted, marginTop: 6, lineHeight: 20 }}>Miss a day? The session moves to your next free day.</Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
