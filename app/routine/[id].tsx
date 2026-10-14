import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Button, Card, Screen } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { ROUTINES, routineMinutes } from '../../src/routines';
import { loadSettings } from '../../src/storage';
import { personaFor } from '../../src/coach';
import { previewSpeech, voiceFor, VoiceSettings } from '../../src/speech';
import { fmtTime } from '../../src/format';

/** Plays a warm-up or stretch routine: the coach reads each move, with a countdown on screen. */
export default function RoutineScreen() {
  useKeepAwake();
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routine = ROUTINES[String(id)] ?? ROUTINES.warmup;
  const [idx, setIdx] = useState(-1); // -1 = not started, moves.length = finished
  const [left, setLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const voice = useRef<VoiceSettings | null>(null);

  useEffect(() => {
    loadSettings().then(async (s) => { voice.current = await voiceFor(personaFor(s.coach), s.voiceId, s.voiceRate); });
  }, []);
  const say = (text: string) => { if (voice.current) previewSpeech(text, voice.current); };

  // Announce each move as it starts.
  useEffect(() => {
    if (idx < 0) return;
    if (idx >= routine.moves.length) { say(routine.id === 'warmup' ? 'Warm-up done. Have a great run!' : 'All done. Lovely work today.'); return; }
    const m = routine.moves[idx];
    setLeft(m.seconds);
    say(`${m.name}. ${m.say}${m.sides ? ' Start with your left side.' : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // The countdown.
  useEffect(() => {
    if (idx < 0 || idx >= routine.moves.length || paused) return;
    const timer = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(timer);
  }, [idx, paused, routine.moves.length]);
  useEffect(() => {
    if (idx < 0 || idx >= routine.moves.length) return;
    const m = routine.moves[idx];
    if (m.sides && left === Math.floor(m.seconds / 2)) say('Switch sides.');
    if (left <= 0) setIdx((i) => i + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const move = routine.moves[idx];
  const next = routine.moves[idx + 1];
  const done = idx >= routine.moves.length;

  return (
    <Screen inset={false}>
      {idx < 0 ? (
        <Card>
          <Text style={{ color: t.text, fontSize: 22, fontWeight: '800' }}>{routine.title}</Text>
          <Text style={{ color: t.muted, marginTop: 4, lineHeight: 20 }}>{routine.blurb} About {routineMinutes(routine)} minutes. Your coach talks you through each move.</Text>
          {routine.moves.map((m) => (
            <Text key={m.name} style={{ color: t.text, marginTop: 8 }}>• {m.name} <Text style={{ color: t.muted }}>({m.seconds} s{m.sides ? ', both sides' : ''})</Text></Text>
          ))}
          <Button label="Start" onPress={() => setIdx(0)} style={{ marginTop: 16 }} />
        </Card>
      ) : done ? (
        <Card>
          <Text style={{ color: t.text, fontSize: 22, fontWeight: '800' }}>All done! 🎉</Text>
          <Text style={{ color: t.muted, marginTop: 4 }}>{routine.id === 'warmup' ? 'Your legs are ready. Have a great run.' : 'Great job looking after your legs.'}</Text>
          <Button variant="secondary" label="Do it again" onPress={() => setIdx(0)} style={{ marginTop: 16 }} />
        </Card>
      ) : (
        <>
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Text style={{ color: t.muted, fontWeight: '700' }}>Move {idx + 1} of {routine.moves.length}</Text>
            <Text style={{ color: t.text, fontSize: 28, fontWeight: '900', marginTop: 6, textAlign: 'center' }}>{move.name}</Text>
            <Text style={{ color: t.accent, fontSize: 72, fontWeight: '900', fontVariant: ['tabular-nums'], marginVertical: 8 }}>{fmtTime(Math.max(0, left))}</Text>
            <Text style={{ color: t.text, textAlign: 'center', lineHeight: 22, fontSize: 16 }}>{move.say}</Text>
            {move.sides ? <Text style={{ color: t.muted, marginTop: 8 }}>{left > move.seconds / 2 ? 'Left side' : 'Right side'}</Text> : null}
          </Card>
          {next ? <Text style={{ color: t.muted, textAlign: 'center', marginBottom: 12 }}>Next: {next.name}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button label={paused ? 'Resume' : 'Pause'} onPress={() => setPaused((p) => !p)} style={{ flex: 1 }} />
            <Button variant="secondary" label="Skip" onPress={() => setIdx((i) => i + 1)} style={{ flex: 1 }} />
          </View>
        </>
      )}
    </Screen>
  );
}
