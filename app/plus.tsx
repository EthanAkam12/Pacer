import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Screen, SectionLabel, ToggleRow } from '../src/ui';
import { DEFAULT_THEME, THEMES, setThemePrefs, useTheme } from '../src/theme';
import { personaFor } from '../src/coach';
import { syncMyEntry } from '../src/leaderboard';
import { loadSettings, saveSettings } from '../src/storage';
import { PLUS_BENEFITS, PLUS_PRICE, setPlusFlag } from '../src/plus';
import { Settings } from '../src/types';

/** Free vs Plus, row by row. Free is `true` (included), a short note, or `false`. */
const COMPARE: [string, boolean | string][] = [
  ['Voice coach, splits and pace alerts', true],
  ['GPS tracking, intervals, history', true],
  ['Couch to 5K and starter plans', true],
  ['Ranks, friends, cheers, challenges', true],
  ['Story runs', 'Episode 1'],
  ['Coach review after every run', 'Preview'],
  ['Race mode', false],
  ['Personal adaptive plans', false],
  ['Live tracking for safety', false],
  ['Local leaderboard', false],
  ['Ghost runner', false],
  ['Advanced stats and weekly report', false],
  ['Marathon, sub-20 and more plans', false],
  ['Plus ★ next to your name', false],
];

/** What Pacely Plus adds, and (until payments are set up) a switch to try it. */
export default function PlusScreen() {
  const t = useTheme();
  const [s, setS] = useState<Settings | null>(null);
  useFocusEffect(useCallback(() => { loadSettings().then(setS); }, []));
  if (!s) return <Screen inset={false}>{null}</Screen>;

  function toggle(plus: boolean) {
    const next = { ...s!, plus };
    if (!plus) {
      if (THEMES.find((x) => x.id === next.themeId)?.plus) { next.themeId = DEFAULT_THEME; setThemePrefs({ themeId: DEFAULT_THEME }); }
      if (personaFor(next.coach).plus) { next.coach = 'maya'; next.voiceId = null; }
      if (next.ghost !== 'off') next.ghost = 'off';
    }
    setS(next);
    saveSettings(next).then(() => syncMyEntry().catch(() => {}));
    setPlusFlag(plus);
  }

  return (
    <Screen inset={false}>
      <Card style={{ backgroundColor: t.accent, borderWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="star" size={22} color={t.onAccent} />
          <Text style={{ color: t.onAccent, fontSize: 24, fontWeight: '900' }}>Pacely Plus</Text>
        </View>
        <Text style={{ color: t.onAccent, marginTop: 6, lineHeight: 21, fontSize: 15 }}>
          Everything in Pacely stays free. Plus adds extra coaching, stats and plans for runners who want more.
        </Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1, borderRadius: 16, borderWidth: 2, borderColor: t.accent, padding: 14, backgroundColor: t.card }}>
          <Text style={{ color: t.accent, fontWeight: '800', fontSize: 12 }}>BEST VALUE · SAVE 37%</Text>
          <Text style={{ color: t.text, fontSize: 22, fontWeight: '900', marginTop: 4 }}>{PLUS_PRICE.year}</Text>
          <Text style={{ color: t.muted }}>a year · just £2.50 a month</Text>
        </View>
        <View style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: t.line, padding: 14, backgroundColor: t.card }}>
          <Text style={{ color: t.muted, fontWeight: '800', fontSize: 12 }}>MONTHLY</Text>
          <Text style={{ color: t.text, fontSize: 22, fontWeight: '900', marginTop: 4 }}>{PLUS_PRICE.month}</Text>
          <Text style={{ color: t.muted }}>a month</Text>
        </View>
      </View>
      <Text style={{ color: t.muted, textAlign: 'center', marginBottom: 16 }}>
        Start with a {PLUS_PRICE.trialDays}-day free trial. Cancel any time.
      </Text>

      <SectionLabel>Free vs Plus</SectionLabel>
      <Card style={{ paddingVertical: 6 }}>
        <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
          <Text style={{ flex: 1 }} />
          <Text style={{ width: 56, textAlign: 'center', color: t.muted, fontWeight: '800' }}>Free</Text>
          <Text style={{ width: 56, textAlign: 'center', color: t.accent, fontWeight: '800' }}>Plus</Text>
        </View>
        {COMPARE.map(([label, free], i) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: t.line }}>
            <Text style={{ flex: 1, color: t.text }}>{label}</Text>
            <View style={{ width: 56, alignItems: 'center' }}>
              {free === true ? <Ionicons name="checkmark" size={20} color={t.text} /> : free ? <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center' }}>{free}</Text> : <Text style={{ color: t.muted }}>–</Text>}
            </View>
            <View style={{ width: 56, alignItems: 'center' }}><Ionicons name="checkmark-circle" size={20} color={t.accent} /></View>
          </View>
        ))}
      </Card>

      <SectionLabel>What you get</SectionLabel>
      <Card>
        {PLUS_BENEFITS.map((b, i) => (
          <View key={b.title} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
            <Ionicons name={b.icon as keyof typeof Ionicons.glyphMap} size={22} color={t.accent} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontWeight: '800', fontSize: 16 }}>{b.title}</Text>
              <Text style={{ color: t.muted, marginTop: 2, lineHeight: 20 }}>{b.text}</Text>
            </View>
          </View>
        ))}
      </Card>

      <SectionLabel>Testing</SectionLabel>
      <Card>
        <Text style={{ color: t.muted, lineHeight: 20, marginBottom: 6 }}>
          Payments aren't set up yet (that comes with the Play Store). Until then you can switch Plus on to try everything.
        </Text>
        <ToggleRow label="Pacely Plus on" value={s.plus} onChange={toggle} />
      </Card>
    </Screen>
  );
}
