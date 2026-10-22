import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Screen, SectionLabel } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { RankBadge } from '../../src/badge';
import { followingIds, getProfile, Profile, unfollow, follow } from '../../src/friends';
import { RANKED, stepFor, ladder } from '../../src/ranks';
import { fmtShortDate, fmtTime } from '../../src/format';
import { CheerCard, TrophyCount } from '../../src/socialUi';
import { loadRuns, loadSettings } from '../../src/storage';
import { summary } from '../../src/leaderboard';
import { useAuth } from '../../src/auth';

export default function RunnerScreen() {
  const t = useTheme();
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const [p, setP] = useState<Profile | null | undefined>(undefined);
  const [following, setFollowing] = useState(false);
  const [me, setMe] = useState<ReturnType<typeof summary> | null>(null);
  const { username } = useAuth();

  useEffect(() => {
    getProfile(String(uid)).then(setP).catch(() => setP(null));
    followingIds().then((ids) => setFollowing(ids.includes(String(uid)))).catch(() => {});
    Promise.all([loadRuns(), loadSettings()]).then(([runs, s]) => setMe(summary(runs, s.weeklyGoalKm)));
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
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '900' }}>{p.name}{p.plus ? <Text style={{ color: t.accent, fontSize: 16 }}>  ★ Plus</Text> : null}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: t.muted }}>{tierLabel} overall</Text>
              <TrophyCount n={p.trophies} />
            </View>
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
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <Button small variant={following ? 'secondary' : 'primary'} label={following ? 'Following' : 'Follow'} onPress={toggle} />
          <Button small variant="secondary" label="Challenge" onPress={() => router.push({ pathname: '/challenge/new', params: { invite: p.uid, name: p.name } })} />
        </View>
      </Card>

      <CheerCard profile={p} />

      {me ? (
        <>
          <SectionLabel>You vs {p.name}</SectionLabel>
          <Card>
            <View style={{ flexDirection: 'row', paddingBottom: 6 }}>
              <Text style={{ flex: 1.3, color: t.muted }} />
              <Text style={{ flex: 1, color: t.muted, fontWeight: '700', textAlign: 'right' }} numberOfLines={1}>{username ?? 'You'}</Text>
              <Text style={{ flex: 1, color: t.muted, fontWeight: '700', textAlign: 'right' }} numberOfLines={1}>{p.name}</Text>
            </View>
            {([
              ['This week', me.weekKm, p.weekKm, (v: number) => `${v.toFixed(1)} km`, false],
              ['All time', me.totalKm, p.totalKm, (v: number) => `${v.toFixed(0)} km`, false],
              ['Runs', me.runs, p.runs, (v: number) => String(v), false],
              ['Goal streak', me.streak, p.streak, (v: number) => `${v} wk`, false],
              ...RANKED.map((d) => [`Best ${d.label}`, me.bests[`best${d.key}`] ?? 0, p.bests[d.key] ?? 0, (v: number) => (v ? fmtTime(v) : '–'), true] as const),
            ] as const).map(([label, a, b, f, low]) => {
              const aWins = a && b ? (low ? a < b : a > b) : !!a && !b;
              const bWins = a && b ? (low ? b < a : b > a) : !!b && !a;
              return (
                <View key={label} style={{ flexDirection: 'row', paddingVertical: 7, borderTopWidth: 1, borderTopColor: t.line }}>
                  <Text style={{ flex: 1.3, color: t.text, fontWeight: '600' }}>{label}</Text>
                  <Text style={{ flex: 1, textAlign: 'right', color: aWins ? t.accent : t.text, fontWeight: aWins ? '800' : '500', fontVariant: ['tabular-nums'] }}>{f(a)}</Text>
                  <Text style={{ flex: 1, textAlign: 'right', color: bWins ? t.accent : t.text, fontWeight: bWins ? '800' : '500', fontVariant: ['tabular-nums'] }}>{f(b)}</Text>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

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
