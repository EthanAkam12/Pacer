import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Screen, SectionLabel, Segmented } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadSettings, saveSettings } from '../src/storage';
import { CoachStyle, Settings } from '../src/types';
import { COACH_ORDER, COACHES } from '../src/coach';
import { englishVoices, previewSpeech, VoiceOption } from '../src/speech';

const RATES = [{ label: 'Slower', value: 0.85 }, { label: 'Normal', value: 1 }, { label: 'Faster', value: 1.15 }];

export default function CoachScreen() {
  const t = useTheme();
  const [s, setS] = useState<Settings | null>(null);
  const [voices, setVoices] = useState<VoiceOption[] | null>(null);

  useEffect(() => {
    loadSettings().then(setS);
    englishVoices().then(setVoices);
  }, []);

  if (!s) return <Screen inset={false}>{null}</Screen>;

  const update = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    saveSettings(next);
    return next;
  };
  const hear = (next: Settings) => previewSpeech(COACHES[next.coach].sample, { voiceId: next.voiceId, rate: next.voiceRate });

  return (
    <Screen inset={false}>
      <SectionLabel>Personality</SectionLabel>
      {COACH_ORDER.map((key: CoachStyle) => {
        const c = COACHES[key];
        const active = s.coach === key;
        return (
          <Pressable key={key} onPress={() => hear(update({ coach: key }))} accessibilityRole="radio" accessibilityState={{ selected: active }}>
            <Card style={{ borderColor: active ? t.accent : t.line, borderWidth: active ? 2 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? t.accent : t.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: t.text }}>{c.name}</Text>
                  <Text style={{ color: t.muted, marginTop: 2 }}>{c.blurb}</Text>
                  <Text style={{ color: t.text, marginTop: 6, fontStyle: 'italic' }}>"{c.sample}"</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        );
      })}

      <SectionLabel>Speaking speed</SectionLabel>
      <Segmented<number> options={RATES} value={s.voiceRate} onChange={(voiceRate) => hear(update({ voiceRate }))} />

      <SectionLabel>Voice</SectionLabel>
      <Card style={{ paddingVertical: 4 }}>
        <VoiceRow label="Phone default" sub="British English" active={!s.voiceId} onPress={() => hear(update({ voiceId: null }))} />
        {voices === null ? (
          <ActivityIndicator style={{ marginVertical: 16 }} color={t.accent} />
        ) : voices.length === 0 ? (
          <Text style={{ color: t.muted, paddingVertical: 12 }}>This phone didn't list any other English voices.</Text>
        ) : (
          voices.map((v) => (
            <VoiceRow
              key={v.id}
              label={v.name}
              sub={`${v.language}${v.enhanced ? ', enhanced quality' : ''}`}
              active={s.voiceId === v.id}
              onPress={() => hear(update({ voiceId: v.id }))}
            />
          ))
        )}
      </Card>
      <Text style={{ color: t.muted, fontSize: 13 }}>Tap a coach, speed or voice to hear it. More voices can be downloaded in your phone's text-to-speech or Spoken Content settings.</Text>
    </Screen>
  );
}

function VoiceRow({ label, sub, active, onPress }: { label: string; sub: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: active }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
      <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? t.accent : t.muted} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
        <Text style={{ color: t.muted, fontSize: 13 }}>{sub}</Text>
      </View>
      <Ionicons name="volume-medium-outline" size={18} color={t.muted} />
    </Pressable>
  );
}
