import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Screen, SectionLabel, Segmented } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadSettings, saveSettings } from '../src/storage';
import { Settings } from '../src/types';
import { COACHES, Persona, PERSONAS, personaFor } from '../src/coach';
import { accentName, bestVoiceFor, englishVoices, previewSpeech, VoiceOption } from '../src/speech';

const RATES = [{ label: 'Slower', value: 0.85 }, { label: 'Normal', value: 1 }, { label: 'Faster', value: 1.15 }];

export default function CoachScreen() {
  const t = useTheme();
  const [s, setS] = useState<Settings | null>(null);
  const [voices, setVoices] = useState<VoiceOption[] | null>(null);
  const [showVoices, setShowVoices] = useState(false);

  useEffect(() => {
    loadSettings().then(setS);
    englishVoices().then(setVoices).catch(() => setVoices([]));
  }, []);

  if (!s) return <Screen inset={false}>{null}</Screen>;

  const persona = personaFor(s.coach);
  const update = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    saveSettings(next);
    return next;
  };
  const voiceOf = (p: Persona, chosen: string | null) =>
    (chosen && voices?.find((v) => v.id === chosen)) || (voices ? bestVoiceFor(p, voices) : null);
  const hear = (next: Settings) => {
    const p = personaFor(next.coach);
    previewSpeech(COACHES[p.style].sample, { voiceId: voiceOf(p, next.voiceId)?.id ?? null, rate: p.rate * next.voiceRate, pitch: p.pitch });
  };
  const autoVoice = voices ? bestVoiceFor(persona, voices) : null;
  const lowQuality = voices !== null && (!autoVoice || autoVoice.quality === 'standard');

  return (
    <Screen inset={false}>
      <SectionLabel>Choose your coach</SectionLabel>
      {PERSONAS.map((p) => {
        const active = persona.id === p.id;
        const v = voiceOf(p, active ? s.voiceId : null);
        return (
          <Pressable key={p.id} onPress={() => hear(update({ coach: p.id, voiceId: null }))} accessibilityRole="radio" accessibilityState={{ selected: active }}>
            <Card style={{ borderColor: active ? t.accent : t.line, borderWidth: active ? 2 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: active ? t.accent : t.chip, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: active ? t.onAccent : t.text }}>{p.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 19, fontWeight: '800', color: t.text }}>{p.name}</Text>
                  <Text style={{ color: t.muted, marginTop: 1 }}>{p.traits.join(' · ')}</Text>
                </View>
                <Ionicons name={active ? 'volume-high' : 'play-circle-outline'} size={24} color={active ? t.accent : t.muted} />
              </View>
              <Text style={{ color: t.text, marginTop: 10, fontStyle: 'italic', lineHeight: 20 }}>"{COACHES[p.style].sample}"</Text>
              {v ? <Text style={{ color: t.muted, fontSize: 13, marginTop: 6 }}>Voice: {v.name}, {accentName(v.language)}{v.quality !== 'standard' ? `, ${v.quality} quality` : ''}</Text> : null}
            </Card>
          </Pressable>
        );
      })}

      {lowQuality ? (
        <Card style={{ backgroundColor: t.chip }}>
          <Text style={{ color: t.text, fontWeight: '700', marginBottom: 4 }}>Want a more natural voice?</Text>
          <Text style={{ color: t.muted, lineHeight: 20 }}>
            {Platform.OS === 'ios'
              ? 'Your iPhone can download free high-quality voices. Go to Settings > Accessibility > Spoken Content > Voices > English, and download a voice marked Premium or Enhanced. Then come back here.'
              : 'Your phone can download free high-quality voices. Go to Settings, search for "Text-to-speech", tap the cog next to Speech Services by Google, then Install voice data > English. Then come back here.'}
          </Text>
        </Card>
      ) : null}

      <SectionLabel>Speaking speed</SectionLabel>
      <Segmented<number> options={RATES} value={s.voiceRate} onChange={(voiceRate) => hear(update({ voiceRate }))} />

      <Pressable onPress={() => setShowVoices(!showVoices)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: t.muted }}>Use a different voice for {persona.name}</Text>
        <Ionicons name={showVoices ? 'chevron-up' : 'chevron-down'} size={18} color={t.muted} />
      </Pressable>
      {showVoices ? (
        <Card style={{ paddingVertical: 4 }}>
          <VoiceRow label="Automatic" sub={autoVoice ? `Best match: ${autoVoice.name}` : 'Phone default'} active={!s.voiceId} onPress={() => hear(update({ voiceId: null }))} />
          {voices === null ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={t.accent} />
          ) : voices.length === 0 ? (
            <Text style={{ color: t.muted, paddingVertical: 12 }}>This phone didn't list any other English voices.</Text>
          ) : (
            voices.map((v) => (
              <VoiceRow
                key={v.id}
                label={v.name}
                sub={`${accentName(v.language)}${v.gender ? `, ${v.gender}` : ''}${v.quality !== 'standard' ? `, ${v.quality} quality` : ''}`}
                active={s.voiceId === v.id}
                onPress={() => hear(update({ voiceId: v.id }))}
              />
            ))
          )}
        </Card>
      ) : null}
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
