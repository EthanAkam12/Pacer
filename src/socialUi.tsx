import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './theme';
import { Button, Card, Chip } from './ui';
import { RankBadge } from './badge';
import { Profile } from './friends';
import { CHEERS, isRunningNow, sayWellDone, sendCheer, undoWellDone, wellDoneState } from './social';
import { fmtShortDate, fmtTime } from './format';

/** One friend's run in the feed, with a "Well done" button. */
export function FeedItem({ profile, run, onOpen }: { profile: Profile; run: { id: string; km: number; sec: number; at: string; title: string }; onOpen: () => void }) {
  const t = useTheme();
  const [state, setState] = useState<{ count: number; mine: boolean } | null>(null);
  useEffect(() => { wellDoneState(profile.uid, run.id).then(setState).catch(() => setState({ count: 0, mine: false })); }, [profile.uid, run.id]);

  async function toggle() {
    if (!state) return;
    const next = { count: state.count + (state.mine ? -1 : 1), mine: !state.mine };
    setState(next);
    await (state.mine ? undoWellDone(profile.uid, run.id) : sayWellDone(profile.uid, run.id)).catch(() => setState(state));
  }

  const pace = run.km > 0 ? run.sec / run.km : 0;
  return (
    <Card>
      <Pressable onPress={onOpen} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <RankBadge id={profile.tier} size={30} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontWeight: '800' }}>{profile.name}</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>{run.title} · {fmtShortDate(run.at)}</Text>
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', marginTop: 10, gap: 20 }}>
        <View><Text style={{ color: t.text, fontSize: 20, fontWeight: '800' }}>{run.km.toFixed(2)}</Text><Text style={{ color: t.muted, fontSize: 12 }}>km</Text></View>
        <View><Text style={{ color: t.text, fontSize: 20, fontWeight: '800' }}>{fmtTime(run.sec)}</Text><Text style={{ color: t.muted, fontSize: 12 }}>time</Text></View>
        {pace ? <View><Text style={{ color: t.text, fontSize: 20, fontWeight: '800' }}>{fmtTime(pace)}</Text><Text style={{ color: t.muted, fontSize: 12 }}>per km</Text></View> : null}
      </View>
      <Pressable onPress={toggle} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start', backgroundColor: state?.mine ? t.accent : t.chip, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }}>
        <Text style={{ fontSize: 16 }}>👏</Text>
        <Text style={{ color: state?.mine ? t.onAccent : t.text, fontWeight: '700' }}>{state?.mine ? 'You said well done' : 'Well done'}</Text>
        {state && state.count > 0 ? <Text style={{ color: state.mine ? t.onAccent : t.muted, fontWeight: '700' }}>· {state.count}</Text> : null}
      </Pressable>
    </Card>
  );
}

/** Shown when a friend is out running: send them a cheer their coach will read out. */
export function CheerCard({ profile }: { profile: Profile }) {
  const t = useTheme();
  const [custom, setCustom] = useState('');
  const [sent, setSent] = useState('');
  if (!isRunningNow(profile)) return null;
  const send = async (text: string) => {
    if (!text.trim()) return;
    await sendCheer(profile.uid, text).then(() => { setSent(text); setCustom(''); }).catch(() => setSent(''));
  };
  return (
    <Card style={{ borderColor: t.accent, borderWidth: 1.5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.accent }} />
        <Text style={{ color: t.text, fontWeight: '800', flex: 1 }}>{profile.name} is running now</Text>
      </View>
      <Text style={{ color: t.muted, marginBottom: 10 }}>Send a cheer and their coach will say it in their ear.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CHEERS.map((c) => <Chip key={c} small label={c} active={sent === c} onPress={() => send(c)} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <TextInput value={custom} onChangeText={setCustom} placeholder="Or write your own…" placeholderTextColor={t.muted} maxLength={80}
          style={{ flex: 1, backgroundColor: t.bg, borderRadius: 10, borderWidth: 1, borderColor: t.line, paddingHorizontal: 10, paddingVertical: 8, color: t.text }} />
        <Button small label="Send" onPress={() => send(custom)} disabled={!custom.trim()} />
      </View>
      {sent ? <Text style={{ color: t.walk, marginTop: 8, fontWeight: '600' }}>Cheer sent: "{sent}"</Text> : null}
    </Card>
  );
}

export function TrophyCount({ n }: { n: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="trophy" size={15} color="#E8B931" />
      <Text style={{ color: t.text, fontWeight: '800' }}>{n}</Text>
    </View>
  );
}
