import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Screen, SectionLabel } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadRuns, loadSettings, saveSettings } from '../src/storage';
import { Access, SEASONS, Story, seasonEpisodes, specials, storyAccess, storyMinutes } from '../src/stories';
import { usePlus } from '../src/plus';
import { RunRecord, Settings } from '../src/types';

/** Story runs: seasons (episode 1 free, then one a week with Plus) and Plus specials. */
export default function StoriesScreen() {
  const t = useTheme();
  const router = useRouter();
  const plus = usePlus();
  const [s, setS] = useState<Settings | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  useFocusEffect(useCallback(() => { Promise.all([loadSettings(), loadRuns()]).then(([st, r]) => { setS(st); setRuns(r); }); }, []));
  if (!s) return <Screen inset={false}>{null}</Screen>;

  async function choose(st: Story, a: Access) {
    if (a.state === 'plus') { router.push('/plus'); return; }
    if (a.state !== 'open') return;
    await saveSettings({ ...s!, story: st.id });
    router.back();
  }

  const status = (a: Access) =>
    a.state === 'open' ? (a.done ? { icon: 'checkmark-circle' as const, text: 'Done · run it again', on: true } : { icon: 'play-circle' as const, text: 'Ready to run', on: true })
    : a.state === 'plus' ? { icon: 'star' as const, text: 'Pacely Plus', on: false }
    : a.state === 'previous' ? { icon: 'lock-closed' as const, text: `Finish episode ${a.prev.episode} first`, on: false }
    : { icon: 'time' as const, text: `Unlocks ${new Date(a.at).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}`, on: false };

  const row = (st: Story) => {
    const a = storyAccess(st, runs, plus);
    const info = status(a);
    const chosen = s.story === st.id;
    return (
      <Pressable key={st.id} onPress={() => choose(st, a)} accessibilityRole="button" disabled={a.state === 'previous' || a.state === 'wait'}>
        <Card style={[chosen ? { borderColor: t.accent, borderWidth: 1.5 } : null, !info.on ? { opacity: 0.75 } : null]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {st.episode ? (
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: info.on ? t.accent : t.chip, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: info.on ? t.onAccent : t.muted, fontWeight: '900', fontSize: 17 }}>{st.episode}</Text>
              </View>
            ) : <Text style={{ fontSize: 34 }}>{st.emoji}</Text>}
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 17, fontWeight: '800' }}>{st.title}</Text>
              <Text style={{ color: t.muted, fontSize: 13 }}>{storyMinutes(st)} min · {st.chapters.filter((c) => c.sprint).length} sprints</Text>
            </View>
          </View>
          <Text style={{ color: t.muted, marginTop: 8, lineHeight: 20 }}>{st.blurb}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Ionicons name={info.icon} size={16} color={info.on ? t.accent : t.muted} />
            <Text style={{ color: info.on ? t.accent : t.muted, fontWeight: '700' }}>{chosen && a.state === 'open' ? 'Ready on the Run tab ✓' : info.text}</Text>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <Screen inset={false}>
      <Text style={{ color: t.muted, marginBottom: 12, lineHeight: 20 }}>
        Your coach tells a story while you run, and the sprints are part of it. Run at whatever effort feels right. Headphones recommended!
      </Text>
      {SEASONS.map((season) => (
        <View key={season.id}>
          <Text style={{ color: t.text, fontSize: 22, fontWeight: '900' }}>🧟 {season.title}</Text>
          <Text style={{ color: t.accent, fontWeight: '700' }}>{season.subtitle}</Text>
          <Text style={{ color: t.muted, marginTop: 2, marginBottom: 12, lineHeight: 20 }}>{season.blurb}{plus ? '' : ' Episode 1 is free.'}</Text>
          {seasonEpisodes(season.id).map(row)}
        </View>
      ))}
      <SectionLabel>Specials</SectionLabel>
      {specials().map(row)}
    </Screen>
  );
}
