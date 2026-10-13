import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadRuns, loadSettings } from '../src/storage';
import { ACHIEVEMENTS, earned } from '../src/progress';

export default function AchievementsScreen() {
  const t = useTheme();
  const [got, setGot] = useState<Set<string> | null>(null);

  useFocusEffect(useCallback(() => {
    Promise.all([loadRuns(), loadSettings()]).then(([runs, s]) => setGot(earned(runs.filter((r) => !r.simulated), s.weeklyGoalKm)));
  }, []));
  if (!got) return <Screen inset={false}>{null}</Screen>;

  const list = [...ACHIEVEMENTS].sort((a, b) => Number(got.has(b.id)) - Number(got.has(a.id)));
  return (
    <Screen inset={false}>
      <Text style={{ color: t.text, fontSize: 28, fontWeight: '900' }}>{got.size} <Text style={{ color: t.muted, fontSize: 18, fontWeight: '600' }}>of {ACHIEVEMENTS.length} unlocked</Text></Text>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: t.chip, overflow: 'hidden', marginTop: 8, marginBottom: 18 }}>
        <View style={{ width: `${(got.size / ACHIEVEMENTS.length) * 100}%`, height: '100%', backgroundColor: t.accent }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {list.map((a) => {
          const on = got.has(a.id);
          return (
            <View key={a.id} style={{ width: '48%', flexGrow: 1, backgroundColor: t.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: on ? t.accent : t.line, opacity: on ? 1 : 0.6 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: on ? t.soft : t.chip, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name={(on ? a.icon : 'lock-closed') as keyof typeof Ionicons.glyphMap} size={22} color={on ? t.accent : t.muted} />
              </View>
              <Text style={{ color: t.text, fontWeight: '800' }}>{a.title}</Text>
              <Text style={{ color: t.muted, fontSize: 13, marginTop: 2, lineHeight: 18 }}>{a.desc}</Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
