import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card, PlusLock, Screen } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadSettings, saveSettings } from '../src/storage';
import { STORIES, storyMinutes } from '../src/stories';
import { usePlus } from '../src/plus';
import { Settings } from '../src/types';

/** Story runs (Pacely Plus): pick an adventure; it's ready to start on the Run tab. */
export default function StoriesScreen() {
  const t = useTheme();
  const router = useRouter();
  const plus = usePlus();
  const [s, setS] = useState<Settings | null>(null);
  useFocusEffect(useCallback(() => { loadSettings().then(setS); }, []));
  if (!s) return <Screen inset={false}>{null}</Screen>;

  async function choose(id: string) {
    if (!plus) { router.push('/plus'); return; }
    await saveSettings({ ...s!, story: id });
    router.back();
  }

  return (
    <Screen inset={false}>
      <Text style={{ color: t.muted, marginBottom: 12, lineHeight: 20 }}>
        Your coach tells a story while you run, and the sprints are part of it. Run at whatever effort feels right: there's no pace to hit. Headphones recommended!
      </Text>
      {!plus ? <PlusLock title="Story runs" text="Escape a zombie city, pull off a heist or rescue a crew on Mars. A new way to make running fun." onPress={() => router.push('/plus')} /> : null}
      {STORIES.map((st) => (
        <Pressable key={st.id} onPress={() => choose(st.id)} accessibilityRole="button">
          <Card style={s.story === st.id ? { borderColor: t.accent, borderWidth: 1.5 } : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 34 }}>{st.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{st.title}</Text>
                <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>{storyMinutes(st)} min · {st.chapters.filter((c) => c.sprint).length} sprints · {st.level}</Text>
              </View>
            </View>
            <Text style={{ color: t.muted, marginTop: 8, lineHeight: 20 }}>{st.blurb}</Text>
            <Text style={{ color: t.accent, fontWeight: '700', marginTop: 8 }}>{plus ? (s.story === st.id ? 'Ready on the Run tab ✓' : 'Choose this story →') : 'Unlock with Pacely Plus →'}</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
