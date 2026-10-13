import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen, SectionLabel } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadPlan, savePlan } from '../src/storage';
import { PLANS, planById } from '../src/plans';
import { PlanProgress } from '../src/types';

export default function PlansScreen() {
  const t = useTheme();
  const router = useRouter();
  const [progress, setProgress] = useState<PlanProgress | null | undefined>(undefined);

  useFocusEffect(useCallback(() => { loadPlan().then(setProgress); }, []));
  if (progress === undefined) return <Screen inset={false}>{null}</Screen>;

  const active = progress ? planById(progress.planId) : null;

  async function choose(id: string) {
    const go = async () => {
      const p = { planId: id, startedAt: new Date().toISOString(), done: {} };
      await savePlan(p);
      setProgress(p);
      router.back();
    };
    if (active && active.id !== id) {
      Alert.alert(`Switch to ${planById(id)!.name}?`, `Your progress in ${active.name} will be cleared.`, [
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

  return (
    <Screen inset={false}>
      {active && progress ? (
        <>
          <SectionLabel>Your plan</SectionLabel>
          <Card>
            <Text style={{ color: t.text, fontSize: 20, fontWeight: '800' }}>{active.name}</Text>
            <Text style={{ color: t.muted, marginTop: 2, marginBottom: 10 }}>
              {Object.keys(progress.done).length} of {active.sessions.length} sessions done. Start the next one from the Run tab.
            </Text>
            {Array.from({ length: active.weeks }, (_, i) => i + 1).map((week) => (
              <View key={week} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.line }}>
                <Text style={{ color: t.text, fontWeight: '700', marginBottom: 4 }}>Week {week}</Text>
                {active.sessions.filter((x) => x.week === week).map((x) => {
                  const done = !!progress.done[x.id];
                  return (
                    <View key={x.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 3 }}>
                      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={done ? t.accent : t.muted} style={{ marginTop: 1 }} />
                      <Text style={{ flex: 1, color: done ? t.muted : t.text, textDecorationLine: done ? 'line-through' : 'none' }}>Run {x.day}: {x.summary}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
            <Button variant="danger" label="Stop this plan" onPress={stop} style={{ marginTop: 12 }} />
          </Card>
        </>
      ) : null}

      <SectionLabel>{active ? 'Other plans' : 'Choose a plan'}</SectionLabel>
      {PLANS.filter((p) => p.id !== active?.id).map((p) => (
        <Pressable key={p.id} onPress={() => choose(p.id)} accessibilityRole="button">
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: t.text, fontSize: 18, fontWeight: '800' }}>{p.name}</Text>
              <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>{p.level}</Text>
            </View>
            <Text style={{ color: t.muted, marginTop: 4, lineHeight: 20 }}>{p.blurb}</Text>
            <Text style={{ color: t.text, marginTop: 8, fontWeight: '600' }}>{p.weeks} weeks · {p.perWeek} runs a week</Text>
            <Text style={{ color: t.accent, marginTop: 8, fontWeight: '700' }}>Start this plan →</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
