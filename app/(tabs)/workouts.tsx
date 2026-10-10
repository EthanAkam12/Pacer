import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen, StepStrip, Title } from '../../src/ui';
import { kindColor, useTheme } from '../../src/theme';
import { loadSettings, loadWorkouts, saveSettings } from '../../src/storage';
import { Settings, StepKind, Workout } from '../../src/types';
import { estimateMinutes, KIND_NAME, summarize } from '../../src/intervals';

export default function WorkoutsScreen() {
  const t = useTheme();
  const router = useRouter();
  const [list, setList] = useState<Workout[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    Promise.all([loadWorkouts(), loadSettings()]).then(([w, s]) => { if (alive) { setList(w); setSettings(s); } });
    return () => { alive = false; };
  }, []));

  async function chooseWorkout(w: Workout) {
    if (!settings) return;
    await saveSettings({ ...settings, mode: 'intervals', workoutId: w.id });
    router.navigate('/');
  }

  return (
    <Screen>
      <Title sub="Mix running, walking and rest. Pacer calls out every change.">Intervals</Title>

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
        {(['run', 'walk', 'rest'] as StepKind[]).map((k) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: kindColor(t, k) }} />
            <Text style={{ color: t.muted }}>{KIND_NAME[k]}</Text>
          </View>
        ))}
      </View>

      <Button label="Build a new workout" onPress={() => router.push('/workout/edit')} style={{ marginBottom: 16 }} />

      {list.map((w) => {
        const selected = settings?.mode === 'intervals' && settings.workoutId === w.id;
        return (
          <Card key={w.id}>
            <Pressable onPress={() => router.push({ pathname: '/workout/edit', params: { id: w.id } })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, fontSize: 19, fontWeight: '700', color: t.text }}>{w.name}</Text>
                {selected ? <Ionicons name="checkmark-circle" size={22} color={t.accent} /> : null}
              </View>
              <StepStrip workout={w} />
              <Text style={{ color: t.muted, lineHeight: 20 }}>{summarize(w)}</Text>
              <Text style={{ color: t.muted, marginTop: 4 }}>About {estimateMinutes(w)} minutes</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Button small label={selected ? 'Selected' : 'Use for next run'} onPress={() => chooseWorkout(w)} variant={selected ? 'secondary' : 'primary'} />
              <Button small variant="secondary" label="Edit" onPress={() => router.push({ pathname: '/workout/edit', params: { id: w.id } })} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
