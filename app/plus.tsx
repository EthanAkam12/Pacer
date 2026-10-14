import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Screen, SectionLabel, ToggleRow } from '../src/ui';
import { DEFAULT_THEME, THEMES, setThemePrefs, useTheme } from '../src/theme';
import { personaFor } from '../src/coach';
import { loadSettings, saveSettings } from '../src/storage';
import { PLUS_BENEFITS, PLUS_PRICE, setPlusFlag } from '../src/plus';
import { Settings } from '../src/types';

/** What Pacer Plus adds, and (until payments are set up) a switch to try it. */
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
    saveSettings(next);
    setPlusFlag(plus);
  }

  return (
    <Screen inset={false}>
      <Card style={{ backgroundColor: t.accent, borderWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="star" size={22} color={t.onAccent} />
          <Text style={{ color: t.onAccent, fontSize: 24, fontWeight: '900' }}>Pacer Plus</Text>
        </View>
        <Text style={{ color: t.onAccent, marginTop: 6, lineHeight: 21, fontSize: 15 }}>
          Everything in Pacer stays free. Plus adds extra coaching, stats and plans for runners who want more.
        </Text>
        <Text style={{ color: t.onAccent, marginTop: 10, fontWeight: '800' }}>
          {PLUS_PRICE.month} a month or {PLUS_PRICE.year} a year · {PLUS_PRICE.trialDays}-day free trial
        </Text>
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
        <ToggleRow label="Pacer Plus on" value={s.plus} onChange={toggle} />
      </Card>
    </Screen>
  );
}
