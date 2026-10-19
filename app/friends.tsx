import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Button, Card, Field, Screen, SectionLabel, Segmented } from '../src/ui';
import { useTheme } from '../src/theme';
import { RankBadge } from '../src/badge';
import { findRunner, follow, followingIds, Profile, profiles } from '../src/friends';
import { Challenge, CHALLENGE_TYPES, feedFrom, myChallenges, respondToInvite, wellDoneNames } from '../src/social';
import { CheerCard, FeedItem, TrophyCount } from '../src/socialUi';
import { fmtShortDate, fmtTime } from '../src/format';
import { notSetUp } from '../src/leaderboard';
import { loadRuns } from '../src/storage';
import { useAuth } from '../src/auth';

type Tab = 'feed' | 'friends' | 'challenges';

export default function FriendsScreen() {
  const t = useTheme();
  const [tab, setTab] = useState<Tab>('feed');
  const [list, setList] = useState<Profile[] | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    followingIds()
      .then(async (f) => { setIds(f); setList(await profiles(f)); })
      .catch((e) => { setList([]); setError(notSetUp(e) ? 'Friends need the latest database rules (firestore.rules).' : "Couldn't load your friends. Check your internet connection."); });
  }, []);
  useFocusEffect(load);

  return (
    <Screen inset={false}>
      <Segmented<Tab> options={[{ label: 'Feed', value: 'feed' }, { label: 'Friends', value: 'friends' }, { label: 'Challenges', value: 'challenges' }]} value={tab} onChange={setTab} />
      {error ? <Text style={{ color: t.danger, marginBottom: 10 }}>{error}</Text> : null}
      {!list ? <ActivityIndicator color={t.accent} style={{ marginTop: 20 }} />
        : tab === 'feed' ? <Feed list={list} />
        : tab === 'friends' ? <FriendsTab list={list} ids={ids} reload={load} />
        : <Challenges />}
    </Screen>
  );
}

function Feed({ list }: { list: Profile[] }) {
  const t = useTheme();
  const router = useRouter();
  const [mine, setMine] = useState<{ title: string; names: string[] }[]>([]);
  useFocusEffect(useCallback(() => {
    loadRuns().then(async (runs) => {
      const recent = runs.filter((r) => !r.simulated).slice(0, 3);
      const got = await Promise.all(recent.map(async (r) => ({ title: `${(r.distance / 1000).toFixed(1)} km on ${fmtShortDate(r.startedAt)}`, names: await wellDoneNames(r.id).catch(() => []) })));
      setMine(got.filter((g) => g.names.length));
    });
  }, []));
  const items = feedFrom(list);
  return (
    <>
      {list.map((p) => <CheerCard key={p.uid} profile={p} />)}
      {mine.map((m) => (
        <Card key={m.title} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Text style={{ fontSize: 22 }}>👏</Text>
          <Text style={{ flex: 1, color: t.text, lineHeight: 20 }}>
            <Text style={{ fontWeight: '800' }}>{m.names.slice(0, 2).join(' and ')}{m.names.length > 2 ? ` and ${m.names.length - 2} others` : ''}</Text> said well done for your {m.title}.
          </Text>
        </Card>
      ))}
      {items.length === 0 ? (
        <Card><Text style={{ color: t.muted, lineHeight: 20 }}>Your friends' runs will appear here. Follow some runners in the Friends tab.</Text></Card>
      ) : items.map(({ profile, run }) => <FeedItem key={`${profile.uid}-${run.id}`} profile={profile} run={run} onOpen={() => router.push(`/runner/${profile.uid}`)} />)}
    </>
  );
}

function FriendsTab({ list, ids, reload }: { list: Profile[]; ids: string[]; reload: () => void }) {
  const t = useTheme();
  const router = useRouter();
  const { username } = useAuth();
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<Profile | null | 'none'>(null);
  const [busy, setBusy] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const link = `pacely://add/${username ?? ''}`;

  async function find() {
    if (!search.trim()) return;
    setBusy(true); setFound(null);
    try { setFound((await findRunner(search)) ?? 'none'); } catch { setFound('none'); }
    setBusy(false);
  }

  return (
    <>
      <Card>
        <Field label="Find a runner" placeholder="Their exact username" value={search} onChangeText={(v) => { setSearch(v.replace(/\s/g, '')); setFound(null); }} autoCapitalize="none" autoCorrect={false} onSubmitEditing={find} />
        <Button small label={busy ? 'Searching…' : 'Search'} onPress={find} disabled={busy || !search.trim()} style={{ alignSelf: 'flex-start' }} />
        {found === 'none' ? <Text style={{ color: t.muted, marginTop: 10 }}>No runner with that username.</Text> : null}
        {found && found !== 'none' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <RankBadge id={found.tier === 'hidden' ? 'unranked' : found.tier} size={28} />
            <Pressable style={{ flex: 1 }} onPress={() => router.push(`/runner/${found.uid}`)}><Text style={{ color: t.text, fontWeight: '700', fontSize: 16 }}>{found.name}</Text></Pressable>
            {ids.includes(found.uid) ? <Text style={{ color: t.muted }}>Following</Text>
              : <Button small label="Follow" onPress={() => follow(found.uid).then(() => { setFound(null); setSearch(''); reload(); })} />}
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={{ color: t.text, fontWeight: '800', fontSize: 16 }}>Invite friends</Text>
        <Text style={{ color: t.muted, marginTop: 2, marginBottom: 10 }}>Your username is <Text style={{ color: t.text, fontWeight: '800' }}>{username}</Text>. Share it, or let a friend scan your code in Pacely.</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button small label="Share invite" onPress={() => Share.share({ message: `Run with me on Pacely! My username is ${username}. Open this on your phone: ${link}` })} />
          <Button small variant="secondary" label={showQr ? 'Hide code' : 'Show my code'} onPress={() => setShowQr(!showQr)} />
        </View>
        {showQr ? <View style={{ alignItems: 'center', marginTop: 14, padding: 12, backgroundColor: '#fff', borderRadius: 12, alignSelf: 'center' }}><QRCode value={link} size={180} /></View> : null}
      </Card>

      <SectionLabel>Following ({list.length})</SectionLabel>
      {list.length === 0 ? <Card><Text style={{ color: t.muted }}>You're not following anyone yet.</Text></Card> : list.map((p) => (
        <Pressable key={p.uid} onPress={() => router.push(`/runner/${p.uid}`)} accessibilityRole="button">
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <RankBadge id={p.tier} size={34} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: t.text, fontWeight: '800', fontSize: 16 }}>{p.name}</Text>
                {p.trophies ? <TrophyCount n={p.trophies} /> : null}
              </View>
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
      <Text style={{ color: t.muted, fontSize: 13, lineHeight: 18 }}>Only you can see who you follow. Runners who turn off "Show me on leaderboards" don't appear.</Text>
    </>
  );
}

function Challenges() {
  const t = useTheme();
  const router = useRouter();
  const [data, setData] = useState<{ active: Challenge[]; invites: Challenge[] } | null>(null);
  const load = useCallback(() => { myChallenges().then(setData).catch(() => setData({ active: [], invites: [] })); }, []);
  useFocusEffect(load);
  if (!data) return <ActivityIndicator color={t.accent} />;
  const now = Date.now();
  const live = data.active.filter((c) => c.end > now), done = data.active.filter((c) => c.end <= now);
  const typeLabel = (c: Challenge) => CHALLENGE_TYPES.find((x) => x.value === c.type)?.label ?? '';
  const left = (c: Challenge) => { const h = Math.round((c.end - now) / 3600e3); return h < 48 ? `${h} hours left` : `${Math.round(h / 24)} days left`; };

  return (
    <>
      <Button label="New challenge" onPress={() => router.push('/challenge/new')} style={{ marginBottom: 14 }} />
      {data.invites.length ? <SectionLabel>Invites</SectionLabel> : null}
      {data.invites.map((c) => (
        <Card key={c.id} style={{ borderColor: t.accent, borderWidth: 1.5 }}>
          <Text style={{ color: t.text, fontWeight: '800', fontSize: 16 }}>{c.creatorName} challenged you!</Text>
          <Text style={{ color: t.muted, marginTop: 2 }}>{c.name} · {typeLabel(c)} · {left(c)}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Button small label="Accept" onPress={() => respondToInvite(c, true).then(load)} />
            <Button small variant="secondary" label="Decline" onPress={() => respondToInvite(c, false).then(load)} />
          </View>
        </Card>
      ))}
      <SectionLabel>Live</SectionLabel>
      {live.length === 0 ? <Card><Text style={{ color: t.muted, lineHeight: 20 }}>No challenges running. Challenge someone: whoever runs the most wins a trophy!</Text></Card> : live.map((c) => (
        <Pressable key={c.id} onPress={() => router.push(`/challenge/${c.id}`)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="flag" size={22} color={t.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontWeight: '800' }}>{c.name}</Text>
              <Text style={{ color: t.muted }}>{typeLabel(c)} · {c.members.length} {c.members.length === 1 ? 'runner' : 'runners'} · {left(c)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.muted} />
          </Card>
        </Pressable>
      ))}
      {done.length ? <SectionLabel>Finished</SectionLabel> : null}
      {done.map((c) => (
        <Pressable key={c.id} onPress={() => router.push(`/challenge/${c.id}`)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="trophy" size={22} color="#E8B931" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontWeight: '800' }}>{c.name}</Text>
              <Text style={{ color: t.muted }}>{c.winner && c.winner !== 'none' ? `Won by ${c.winnerName}` : 'Tap to see the result'}</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </>
  );
}
