import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Field, Screen, SectionLabel } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { CHALLENGE_TYPES, ChallengeType, createChallenge, DURATIONS } from '../../src/social';
import { findRunner, followingIds, profiles } from '../../src/friends';

export default function NewChallenge() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string; name?: string }>();
  const [name, setName] = useState('');
  const [type, setType] = useState<ChallengeType>('distance');
  const [days, setDays] = useState(7);
  const [invited, setInvited] = useState<{ uid: string; name: string }[]>(params.invite ? [{ uid: params.invite, name: params.name ?? 'Runner' }] : []);
  const [friends, setFriends] = useState<{ uid: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { followingIds().then(profiles).then((ps) => setFriends(ps.map((p) => ({ uid: p.uid, name: p.name })))).catch(() => {}); }, []);

  const toggle = (p: { uid: string; name: string }) =>
    setInvited((list) => (list.some((x) => x.uid === p.uid) ? list.filter((x) => x.uid !== p.uid) : [...list, p]));

  async function add() {
    setMsg('');
    const p = await findRunner(search).catch(() => null);
    if (!p) { setMsg('No runner with that username.'); return; }
    if (!invited.some((x) => x.uid === p.uid)) setInvited([...invited, { uid: p.uid, name: p.name }]);
    setSearch('');
  }

  async function create() {
    if (!invited.length) { setMsg('Invite at least one runner.'); return; }
    setBusy(true);
    try {
      const id = await createChallenge({ name: name || `${CHALLENGE_TYPES.find((x) => x.value === type)!.label}: ${DURATIONS.find((d) => d.days === days)!.label}`, type, days, invited: invited.map((x) => x.uid) });
      router.replace(`/challenge/${id}`);
    } catch { setMsg("Couldn't create the challenge. Check your internet connection."); setBusy(false); }
  }

  return (
    <Screen inset={false}>
      <Card>
        <Field label="Name (optional)" placeholder="e.g. Weekend showdown" value={name} onChangeText={setName} maxLength={40} />
        <Text style={{ fontWeight: '600', color: t.text, marginBottom: 8 }}>Who wins?</Text>
        {CHALLENGE_TYPES.map((c) => (
          <Pressable key={c.value} onPress={() => setType(c.value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
            <Ionicons name={type === c.value ? 'radio-button-on' : 'radio-button-off'} size={20} color={type === c.value ? t.accent : t.muted} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontWeight: '700' }}>{c.label}</Text>
              <Text style={{ color: t.muted, fontSize: 13 }}>{c.desc}</Text>
            </View>
          </Pressable>
        ))}
        <Text style={{ fontWeight: '600', color: t.text, marginTop: 12, marginBottom: 8 }}>How long?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DURATIONS.map((d) => <Chip key={d.days} small label={d.label} active={days === d.days} onPress={() => setDays(d.days)} />)}
        </View>
        <Text style={{ color: t.muted, fontSize: 13, marginTop: 8 }}>Starts now. Only runs after the start count.</Text>
      </Card>

      <SectionLabel>Invite runners</SectionLabel>
      <Card>
        <Field label="Find by username" placeholder="Their exact username" value={search} onChangeText={(v) => setSearch(v.replace(/\s/g, ''))} autoCapitalize="none" autoCorrect={false} onSubmitEditing={add} />
        <Button small label="Add" onPress={add} disabled={!search.trim()} style={{ alignSelf: 'flex-start' }} />
        {friends.length ? <Text style={{ color: t.muted, marginTop: 14, marginBottom: 8 }}>Or pick from people you follow:</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[...friends, ...invited.filter((i) => !friends.some((f) => f.uid === i.uid))].map((p) => (
            <Chip key={p.uid} small label={p.name} active={invited.some((x) => x.uid === p.uid)} onPress={() => toggle(p)} />
          ))}
        </View>
      </Card>
      {msg ? <Text style={{ color: t.danger, marginBottom: 10, fontWeight: '600' }}>{msg}</Text> : null}
      <Button label={busy ? 'Sending…' : `Send challenge${invited.length ? ` to ${invited.length}` : ''}`} onPress={create} disabled={busy} />
      <Text style={{ color: t.muted, fontSize: 13, marginTop: 10, lineHeight: 18 }}>They need to accept before their runs count. The winner gets a 🏆 trophy.</Text>
    </Screen>
  );
}
