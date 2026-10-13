import React, { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen, SectionLabel } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { loadPlan, savePlan } from '../../src/storage';
import { planById } from '../../src/plans';
import { GUIDES } from '../../src/planGuides';
import { PlanProgress } from '../../src/types';

/** A training plan's full guide: the goal, how it builds up week by week, session types and tips. */
export default function PlanGuideScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = planById(String(id));
  const guide = GUIDES[String(id)];
  const [progress, setProgress] = useState<PlanProgress | null | undefined>(undefined);

  useFocusEffect(useCallback(() => { loadPlan().then(setProgress); }, []));
  if (!plan || !guide || progress === undefined) return <Screen inset={false}>{null}</Screen>;

  const isActive = progress?.planId === plan.id;
  const current = progress ? planById(progress.planId) : null;

  function start() {
    const go = async () => {
      await savePlan({ planId: plan!.id, startedAt: new Date().toISOString(), done: {} });
      router.back();
    };
    if (current && !isActive) {
      Alert.alert(`Switch to ${plan!.name}?`, `Your ticks in ${current.name} will be cleared. Your runs stay in History.`, [
        { text: 'Cancel', style: 'cancel' }, { text: 'Switch', onPress: go },
      ]);
    } else go();
  }

  const heading = (icon: keyof typeof Ionicons.glyphMap, text: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Ionicons name={icon} size={18} color={t.accent} />
      <Text style={{ color: t.text, fontWeight: '800', fontSize: 16 }}>{text}</Text>
    </View>
  );
  const body = { color: t.text, lineHeight: 21 } as const;
  const startButton = isActive
    ? <Text style={{ color: t.accent, fontWeight: '700', marginTop: 12 }}>This is your current plan.</Text>
    : <Button label={current ? 'Switch to this plan' : 'Start this plan'} onPress={start} style={{ marginTop: 12 }} />;

  return (
    <Screen inset={false}>
      <Card style={{ borderColor: t.accent, borderWidth: 1.5 }}>
        <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>{plan.level} · {plan.weeks} weeks · {plan.perWeek} runs a week</Text>
        <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>{guide.goal}</Text>
        <Text style={{ ...body, color: t.muted, marginTop: 8 }}>{guide.whoFor}</Text>
        {startButton}
      </Card>

      <Card>
        {heading('bag-handle', 'What you need')}
        {guide.needs.map((n) => (
          <Text key={n} style={{ ...body, marginBottom: 4 }}>•  {n}</Text>
        ))}
      </Card>

      <SectionLabel>How it gets you there</SectionLabel>
      <Card>
        {guide.phases.map((p, i) => (
          <View key={p.weeks} style={{ flexDirection: 'row', gap: 12, paddingBottom: i < guide.phases.length - 1 ? 14 : 0 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: t.onAccent, fontWeight: '800' }}>{i + 1}</Text>
              </View>
              {i < guide.phases.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: t.line, marginTop: 4 }} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.muted, fontWeight: '700', fontSize: 13 }}>Week{p.weeks.includes('–') ? 's' : ''} {p.weeks}</Text>
              <Text style={{ color: t.text, fontWeight: '800', fontSize: 16, marginTop: 1 }}>{p.title}</Text>
              <Text style={{ ...body, marginTop: 3 }}>{p.text}</Text>
            </View>
          </View>
        ))}
      </Card>

      <SectionLabel>The sessions</SectionLabel>
      <Card>
        {guide.sessionTypes.map((s, i) => (
          <View key={s.name} style={{ paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
            <Text style={{ color: t.text, fontWeight: '800' }}>{s.name}</Text>
            <Text style={{ ...body, color: t.muted, marginTop: 2 }}>{s.text}</Text>
          </View>
        ))}
      </Card>

      <SectionLabel>Week by week</SectionLabel>
      <Card>
        {guide.weekNotes.map((note, i) => {
          const week = i + 1;
          return (
            <View key={week} style={{ paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
              <Text style={{ color: t.accent, fontWeight: '800' }}>Week {week}</Text>
              <Text style={{ ...body, marginTop: 2 }}>{note}</Text>
              {plan.sessions.filter((s) => s.week === week).map((s) => (
                <Text key={s.id} style={{ color: t.muted, marginTop: 3, lineHeight: 19 }}>Run {s.day}: {s.summary}</Text>
              ))}
            </View>
          );
        })}
      </Card>

      <SectionLabel>Tips</SectionLabel>
      <Card>
        {guide.tips.map((tip) => (
          <View key={tip} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <Ionicons name="bulb-outline" size={16} color={t.accent} style={{ marginTop: 3 }} />
            <Text style={{ ...body, flex: 1 }}>{tip}</Text>
          </View>
        ))}
      </Card>

      <Card>
        {heading('flag', 'At the end')}
        <Text style={body}>{guide.finish}</Text>
        {startButton}
      </Card>

      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 18, marginBottom: 24 }}>
        If you have a health condition, or haven't exercised for a long time, check with a doctor before starting a new training plan.
      </Text>
    </Screen>
  );
}
