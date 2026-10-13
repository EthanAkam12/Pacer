import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen, SectionLabel } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadPlan, loadRuns, loadSettings, savePlan } from '../src/storage';
import { PLANS, TrainingPlan, planById } from '../src/plans';
import { dayList, planDays, scheduleSessions } from '../src/schedule';
import { PlanProgress, RunRecord, Settings } from '../src/types';

export default function PlansScreen() {
  const t = useTheme();
  const router = useRouter();
  const [progress, setProgress] = useState<PlanProgress | null | undefined>(undefined);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [allWeeks, setAllWeeks] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    Promise.all([loadPlan(), loadSettings(), loadRuns()]).then(([pl, st, r]) => {
      if (alive) { setProgress(pl); setSettings(st); setRuns(r); }
    });
    return () => { alive = false; };
  }, []));
  if (progress === undefined || !settings) return <Screen inset={false}>{null}</Screen>;

  const active = progress ? planById(progress.planId) : null;

  async function choose(id: string) {
    const go = async () => {
      const p = { planId: id, startedAt: new Date().toISOString(), done: {} };
      await savePlan(p);
      setProgress(p);
      setAllWeeks(false);
    };
    if (active && active.id !== id) {
      Alert.alert(`Switch to ${planById(id)!.name}?`, `Your ticks in ${active.name} will be cleared. Your runs stay in History.`, [
        { text: 'Cancel', style: 'cancel' }, { text: 'Switch', onPress: go },
      ]);
    } else go();
  }

  function stop() {
    Alert.alert('Stop this plan?', 'Your progress will be cleared. Your runs stay in History.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop plan', style: 'destructive', onPress: async () => { await savePlan(null); setProgress(null); } },
    ]);
  }

  const others = PLANS.filter((p) => p.id !== active?.id);

  return (
    <Screen inset={false}>
      {active && progress ? (
        <ActivePlan plan={active} progress={progress} settings={settings} onSchedule={() => router.push('/schedule')} onStop={stop} />
      ) : null}

      <SectionLabel>{active ? 'Switch to a different plan' : 'Choose a plan'}</SectionLabel>
      {others.map((p) => (
        <Pressable key={p.id} onPress={() => choose(p.id)} accessibilityRole="button">
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: t.text, fontSize: 18, fontWeight: '800' }}>{p.name}</Text>
              <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>{p.level}</Text>
            </View>
            <Text style={{ color: t.muted, marginTop: 4, lineHeight: 20 }}>{p.blurb}</Text>
            <Text style={{ color: t.text, marginTop: 8, fontWeight: '600' }}>{p.weeks} weeks · {p.perWeek} runs a week</Text>
            <Text style={{ color: t.accent, marginTop: 8, fontWeight: '700' }}>{active ? 'Switch to this plan →' : 'Start this plan →'}</Text>
          </Card>
        </Pressable>
      ))}

      {active && progress ? <Sessions plan={active} progress={progress} settings={settings} runs={runs} all={allWeeks} onAll={() => setAllWeeks(true)} /> : null}
    </Screen>
  );
}

function ActivePlan({ plan, progress, settings, onSchedule, onStop }: {
  plan: TrainingPlan; progress: PlanProgress; settings: Settings; onSchedule: () => void; onStop: () => void;
}) {
  const t = useTheme();
  const done = Object.keys(progress.done).length;
  const days = planDays(settings.runDays, plan.perWeek);
  return (
    <>
      <SectionLabel>Your plan</SectionLabel>
      <Card>
        <Text style={{ color: t.text, fontSize: 20, fontWeight: '800' }}>{plan.name}</Text>
        <Text style={{ color: t.muted, marginTop: 2 }}>
          {done} of {plan.sessions.length} sessions done. Start the next one from the Run tab.
        </Text>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: t.chip, overflow: 'hidden', marginTop: 10 }}>
          <View style={{ width: `${(done / plan.sessions.length) * 100}%`, height: '100%', backgroundColor: t.accent }} />
        </View>
        <Pressable onPress={onSchedule} accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 6 }}>
          <Ionicons name="calendar" size={18} color={t.accent} />
          <Text style={{ flex: 1, color: t.text }}>Sessions on <Text style={{ fontWeight: '800' }}>{dayList(days)}</Text></Text>
          <Text style={{ color: t.accent, fontWeight: '700' }}>Change</Text>
        </Pressable>
        <Button variant="danger" label="Stop this plan" onPress={onStop} style={{ marginTop: 10 }} />
      </Card>
    </>
  );
}

/** Week-by-week checklist, with dates for the sessions still to do. Shows the current week and the next one until expanded. */
function Sessions({ plan, progress, settings, runs, all, onAll }: {
  plan: TrainingPlan; progress: PlanProgress; settings: Settings; runs: RunRecord[]; all: boolean; onAll: () => void;
}) {
  const t = useTheme();
  const dates = new Map(scheduleSessions(plan, progress, settings.runDays, runs).map((x) => [x.session.id, x.date]));
  const next = plan.sessions.find((x) => !progress.done[x.id]);
  const current = next?.week ?? plan.weeks;
  const weeks = Array.from({ length: plan.weeks }, (_, i) => i + 1).filter((w) => all || (w >= current && w <= current + 1));
  return (
    <>
      <SectionLabel>Sessions</SectionLabel>
      <Card>
        {weeks.map((week, i) => (
          <View key={week} style={{ paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
            <Text style={{ color: t.text, fontWeight: '700', marginBottom: 4 }}>Week {week}</Text>
            {plan.sessions.filter((x) => x.week === week).map((x) => {
              const done = !!progress.done[x.id];
              const date = dates.get(x.id);
              return (
                <View key={x.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 3 }}>
                  <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={done ? t.accent : t.muted} style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, color: done ? t.muted : t.text, textDecorationLine: done ? 'line-through' : 'none' }}>Run {x.day}: {x.summary}</Text>
                  {date && !done ? (
                    <Text style={{ color: x === next ? t.accent : t.muted, fontWeight: x === next ? '700' : '500', fontSize: 13 }}>
                      {date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
        {!all && weeks.length < plan.weeks ? (
          <Button variant="secondary" small label={`Show all ${plan.weeks} weeks`} onPress={onAll} style={{ marginTop: 8 }} />
        ) : null}
      </Card>
    </>
  );
}
