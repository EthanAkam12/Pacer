import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen, SectionLabel } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { Challenge, CHALLENGE_TYPES, getChallenge, leaveChallenge, settle, Standing, standings, syncChallenge } from '../../src/social';
import { useAuth } from '../../src/auth';
import { fmtTime } from '../../src/format';

const PODIUM = ['#E8B931', '#A8B2BD', '#C07A45'];

export default function ChallengeScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [c, setC] = useState<Challenge | null | undefined>(undefined);
  const [rows, setRows] = useState<Standing[] | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      let ch = await getChallenge(String(id)).catch(() => null);
      if (!ch) { setC(null); return; }
      await syncChallenge(ch).catch(() => {});
      if (Date.now() >= ch.end) ch = await settle(ch).catch(() => ch!);
      setC(ch);
      setRows(await standings(ch!).catch(() => []));
    })();
  }, [id]));

  if (c === undefined) return <Screen inset={false}><ActivityIndicator color={t.accent} /></Screen>;
  if (c === null) return <Screen inset={false}><Text style={{ color: t.muted }}>This challenge has been deleted.</Text></Screen>;

  const over = Date.now() >= c.end;
  const type = CHALLENGE_TYPES.find((x) => x.value === c.type)!;
  const show = (v: number) => (c.type === 'distance' ? `${v.toFixed(2)} km` : c.type === 'runs' ? `${v} ${v === 1 ? 'run' : 'runs'}` : v ? fmtTime(v) : '–');
  const hours = Math.max(0, Math.round((c.end - Date.now()) / 3600e3));
  const mine = c.creator === user?.uid;

  function leave() {
    Alert.alert(mine ? 'Delete this challenge?' : 'Leave this challenge?', mine ? 'It will be removed for everyone.' : undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: mine ? 'Delete' : 'Leave', style: 'destructive', onPress: () => leaveChallenge(c!).then(() => router.back()) },
    ]);
  }

  return (
    <Screen inset={false}>
      <Stack.Screen options={{ title: c.name }} />
      <Card>
        <Text style={{ color: t.text, fontSize: 22, fontWeight: '900' }}>{c.name}</Text>
        <Text style={{ color: t.muted, marginTop: 2 }}>{type.label} · {type.desc}</Text>
        <Text style={{ color: over ? t.muted : t.accent, fontWeight: '700', marginTop: 8 }}>
          {over ? `Finished ${new Date(c.end).toLocaleDateString()}` : hours < 48 ? `${hours} hours left` : `${Math.round(hours / 24)} days left`}
        </Text>
      </Card>

      {over && c.winner ? (
        <Card style={{ alignItems: 'center', borderColor: '#E8B931', borderWidth: 1.5 }}>
          <Ionicons name="trophy" size={40} color="#E8B931" />
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '900', marginTop: 6 }}>
            {c.winner === 'none' ? 'No winner this time' : c.winner === user?.uid ? 'You won! 🎉' : `${c.winnerName} won!`}
          </Text>
          {c.winner === user?.uid ? <Text style={{ color: t.muted, marginTop: 2 }}>A trophy has been added to your profile.</Text> : null}
        </Card>
      ) : null}

      <SectionLabel>Standings</SectionLabel>
      <Card>
        {!rows ? <ActivityIndicator color={t.accent} /> : rows.length === 0 ? <Text style={{ color: t.muted }}>No scores yet.</Text> : rows.map((r, i) => (
          <View key={r.uid} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
            <View style={{ width: 30, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: r.position <= 3 ? PODIUM[r.position - 1] : 'transparent' }}>
              <Text style={{ color: r.position <= 3 ? '#1A1A1A' : t.muted, fontWeight: '800' }}>{r.position}</Text>
            </View>
            <Text style={{ flex: 1, marginLeft: 10, color: t.text, fontWeight: r.uid === user?.uid ? '800' : '600' }}>{r.name}{r.uid === user?.uid ? ' (you)' : ''}</Text>
            <Text style={{ color: t.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{show(r.value)}</Text>
          </View>
        ))}
        {c.invited.length ? <Text style={{ color: t.muted, marginTop: 10, fontSize: 13 }}>{c.invited.length} invited {c.invited.length === 1 ? 'runner hasn\'t' : 'runners haven\'t'} accepted yet.</Text> : null}
      </Card>
      <Text style={{ color: t.muted, fontSize: 13, marginBottom: 12, lineHeight: 18 }}>Scores update when each runner opens Pacer after a run.</Text>
      <Button variant="danger" label={mine ? 'Delete challenge' : 'Leave challenge'} onPress={leave} />
    </Screen>
  );
}
