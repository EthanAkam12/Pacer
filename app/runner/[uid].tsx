import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Screen, SectionLabel } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { RankBadge } from '../../src/badge';
import { followingIds, getProfile, Profile, unfollow, follow } from '../../src/friends';
import { RANKED, stepFor, ladder } from '../../src/ranks';
import { fmtShortDate, fmtTime } from '../../src/format';

export default function RunnerScreen() {
  const t = useTheme();
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const [p, setP] = useState<Profile | null | undefined>(undefined);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    getProfile(String(uid)).then(setP).catch(() => setP(null));
    followingIds().then((ids) => setFollowing(ids.includes(String(uid)))).catch(() => {});
  }, [uid]);

  if (p === undefined) return <Screen inset={false}><ActivityIndicator color={t.accent} /></Screen>;
  if (p === null) return <Screen inset={false}><Text style={{ color: t.muted }}>This runner's profile is hidden.</Text></Screen>;

  const tierLabel = ladder().find((s) => s.id === p.tier)?.label ?? 'Unranked';
  function toggle() {
    if (!following) { follow(p!.uid).then(() => setFollowing(true)); return; }
    Alert.alert(`Unfollow ${p!.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unfollow', style: 'destructive', onPress: () => unfollow(p!.uid).then(() => { setFollowing(false); router.back(); }) },
    ]);
  }

  return (
    <Screen inset={false}>
      <Stack.Screen options={{ title: p.name }} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <RankBadge id={p.tier} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '900' }}>{p.name}</Text>
            <Text style={{ color: t.muted }}>{tierLabel} overall</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 14 }}>
          {[[p.weekKm.toFixed(1), 'km this week'], [p.totalKm.toFixed(0), 'km total'], [String(p.runs), 'runs']].map(([v, l]) => (
            <View key={l} style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{v}</Text>
              <Text style={{ color: t.muted, fontSize: 13 }}>{l}</Text>
            </View>
          ))}
        </View>
        <Button small variant={following ? 'secondary' : 'primary'} label={following ? 'Following' : 'Follow'} onPress={toggle} style={{ alignSelf: 'flex-start', marginTop: 14 }} />
      </Card>

      <SectionLabel>Best times</SectionLabel>
      <Card>
        {RANKED.map((d, i) => {
          const time = p.bests[d.key];
          return (
            <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
              <RankBadge id={stepFor(d.key, time)?.id ?? 'unranked'} size={22} />
              <Text style={{ flex: 1, marginLeft: 10, color: t.text, fontWeight: '600' }}>{d.label}</Text>
              <Text style={{ color: time ? t.text : t.muted, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{time ? fmtTime(time) : '–'}</Text>
            </View>
          );
        })}
      </Card>

      <SectionLabel>Recent runs</SectionLabel>
      <Card>
        {p.recent.length === 0 ? <Text style={{ color: t.muted }}>No runs yet.</Text> : p.recent.map((r, i) => (
          <View key={r.at} style={{ flexDirection: 'row', paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontWeight: '600' }} numberOfLines={1}>{r.title}</Text>
              <Text style={{ color: t.muted, fontSize: 13 }}>{fmtShortDate(r.at)}</Text>
            </View>
            <Text style={{ color: t.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{r.km.toFixed(2)} km · {fmtTime(r.sec)}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
