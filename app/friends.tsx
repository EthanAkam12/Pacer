import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field, Screen, SectionLabel } from '../src/ui';
import { useTheme } from '../src/theme';
import { RankBadge } from '../src/badge';
import { findRunner, follow, followingIds, Profile, profiles } from '../src/friends';
import { fmtShortDate, fmtTime } from '../src/format';
import { notSetUp } from '../src/leaderboard';

export default function FriendsScreen() {
  const t = useTheme();
  const router = useRouter();
  const [list, setList] = useState<Profile[] | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<Profile | null | 'none'>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    followingIds()
      .then(async (f) => { setIds(f); const p = await profiles(f); setList(p.sort((a, b) => (b.recent[0]?.at ?? '').localeCompare(a.recent[0]?.at ?? ''))); })
      .catch((e) => { setList([]); setError(notSetUp(e) ? 'Friends need the latest database rules. See docs/LEADERBOARDS.md.' : "Couldn't load your friends. Check your internet connection."); });
  }, []);
  useFocusEffect(load);

  async function find() {
    if (!search.trim()) return;
    setBusy(true); setFound(null); setError('');
    try { setFound((await findRunner(search)) ?? 'none'); }
    catch { setError("Couldn't search right now. Check your internet connection."); }
    setBusy(false);
  }

  async function add(p: Profile) {
    await follow(p.uid).catch(() => setError("Couldn't follow right now."));
    setFound(null); setSearch('');
    load();
  }

  return (
    <Screen inset={false}>
      <Card>
        <Field label="Find a runner" placeholder="Their exact username" value={search} onChangeText={(v) => { setSearch(v.replace(/\s/g, '')); setFound(null); }} autoCapitalize="none" autoCorrect={false} onSubmitEditing={find} />
        <Button small label={busy ? 'Searching…' : 'Search'} onPress={find} disabled={busy || !search.trim()} style={{ alignSelf: 'flex-start' }} />
        {found === 'none' ? <Text style={{ color: t.muted, marginTop: 10 }}>No runner with that username.</Text> : null}
        {found && found !== 'none' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <RankBadge id={found.tier === 'hidden' ? 'unranked' : found.tier} size={28} />
            <Text style={{ flex: 1, color: t.text, fontWeight: '700', fontSize: 16 }}>{found.name}</Text>
            {ids.includes(found.uid) ? <Text style={{ color: t.muted }}>Following</Text> : <Button small label="Follow" onPress={() => add(found)} />}
          </View>
        ) : null}
      </Card>
      {error ? <Text style={{ color: t.danger, marginBottom: 10 }}>{error}</Text> : null}

      <SectionLabel>Following{list ? ` (${list.length})` : ''}</SectionLabel>
      {!list ? <ActivityIndicator color={t.accent} style={{ marginTop: 20 }} /> : list.length === 0 ? (
        <Card><Text style={{ color: t.muted, lineHeight: 20 }}>You're not following anyone yet. Search for a friend's username above. Then compare on the Friends leaderboard in Ranks.</Text></Card>
      ) : list.map((p) => (
        <Pressable key={p.uid} onPress={() => router.push(`/runner/${p.uid}`)} accessibilityRole="button">
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <RankBadge id={p.tier} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontWeight: '800', fontSize: 16 }}>{p.name}</Text>
              <Text style={{ color: t.muted, marginTop: 1 }} numberOfLines={1}>
                {p.recent[0] ? `${p.recent[0].km.toFixed(1)} km in ${fmtTime(p.recent[0].sec)} · ${fmtShortDate(p.recent[0].at)}` : 'No runs yet'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: t.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{p.weekKm.toFixed(1)} km</Text>
              <Text style={{ color: t.muted, fontSize: 12 }}>this week</Text>
            </View>
          </Card>
        </Pressable>
      ))}
      <Text style={{ color: t.muted, fontSize: 13, lineHeight: 18 }}>Only you can see who you follow. Runners who turn off "Show me on leaderboards" don't appear here.</Text>
    </Screen>
  );
}
