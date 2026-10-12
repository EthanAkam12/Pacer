import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Field, Screen, SectionLabel, Segmented, Title } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { loadRuns, loadSettings, saveSettings } from '../../src/storage';
import { Rank, rankFor, ladder, TIERS, WINDOW_DAYS } from '../../src/ranks';
import { RankBadge } from '../../src/badge';
import { Board, FASTEST_BOARDS, fetchBoard, notSetUp, Row, syncMyEntry } from '../../src/leaderboard';
import { useAuth } from '../../src/auth';
import { fmtPace, fmtShortDate, fmtTime } from '../../src/format';
import { Settings } from '../../src/types';

type Tab = 'week' | 'total' | 'fastest';

export default function RanksScreen() {
  const t = useTheme();
  const { configured, user } = useAuth();
  const [rank, setRank] = useState<Rank | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [showLadder, setShowLadder] = useState(false);
  const [tab, setTab] = useState<Tab>('week');
  const [fast, setFast] = useState<Board>('best5000');
  const [data, setData] = useState<{ rows: Row[]; me: Row | null } | null>(null);
  const [error, setError] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState('');
  const [synced, setSynced] = useState(0);

  const board: Board = tab === 'fastest' ? fast : tab;
  const online = configured && !!user;
  const joined = !!s?.runnerName.trim() && s.leaderboards;

  useFocusEffect(useCallback(() => {
    let alive = true;
    Promise.all([loadRuns(), loadSettings()]).then(([runs, st]) => {
      if (!alive) return;
      setRank(rankFor(runs.filter((r) => !r.simulated)));
      setS(st);
      if (online && st.runnerName.trim()) syncMyEntry().catch(() => {}).finally(() => alive && setSynced((n) => n + 1));
    });
    return () => { alive = false; };
  }, [online]));

  useEffect(() => {
    if (!online || !s) return;
    let alive = true;
    setData(null); setError('');
    fetchBoard(board)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(notSetUp(e) ? 'setup' : 'offline'));
    return () => { alive = false; };
  }, [board, online, synced, joined]);

  async function join() {
    const name = nameDraft.trim();
    if (!/^[\p{L}\p{N} ._'-]{2,20}$/u.test(name)) { setNameError('Use 2 to 20 letters, numbers or spaces.'); return; }
    const next = { ...s!, runnerName: name, leaderboards: true };
    setS(next); setNameError('');
    await saveSettings(next);
    await syncMyEntry().catch(() => {});
    setSynced((n) => n + 1);
  }

  if (!rank || !s) return <Screen>{null}</Screen>;
  const unit = board.startsWith('best') ? '' : ' km';
  const show = (r: Row) => (board.startsWith('best') ? fmtTime(r.value) : `${r.value.toFixed(1)}${unit}`);

  return (
    <Screen>
      <Title sub="Get faster to climb the ranks. Run more to top the leaderboards.">Ranks</Title>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <RankBadge id={rank.id} size={84} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.muted, fontWeight: '600' }}>Your rank</Text>
            <Text style={{ color: t.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>{rank.label}</Text>
            {rank.from ? (
              <Text style={{ color: t.muted, marginTop: 2, lineHeight: 19 }}>
                From your {rank.from.distance} in {fmtTime(rank.from.time)} on {fmtShortDate(rank.from.date)}{rank.from.distance === '5 km' ? '' : ` (like a ${fmtTime(rank.score!)} 5 km)`}.
              </Text>
            ) : (
              <Text style={{ color: t.muted, marginTop: 2, lineHeight: 19 }}>Run at least 1 mile (1.6 km) to get your rank.</Text>
            )}
          </View>
        </View>
        {rank.next ? (
          <View style={{ marginTop: 16 }}>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: t.chip, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(4, rank.next.progress * 100)}%`, height: '100%', borderRadius: 5, backgroundColor: rank.tier?.colors[1] ?? t.accent }} />
            </View>
            <Text style={{ color: t.text, marginTop: 8, lineHeight: 20 }}>
              <Text style={{ fontWeight: '800' }}>Next: {rank.next.label}. </Text>
              Run 5 km in {fmtTime(rank.next.target)} or faster ({fmtPace(rank.next.target / 5)} per km).
            </Text>
          </View>
        ) : rank.tier?.id === 'elite' ? (
          <Text style={{ color: t.text, marginTop: 12, fontWeight: '700' }}>You've reached the top rank. Incredible running.</Text>
        ) : null}
      </Card>

      <Pressable onPress={() => setShowLadder(!showLadder)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', flex: 1, gap: 2 }}>
          {TIERS.map((tier) => (
            <View key={tier.id} style={{ opacity: rank.tier?.id === tier.id ? 1 : 0.45 }}>
              <RankBadge id={tier.id === 'elite' ? 'elite' : `${tier.id}-1`} size={26} />
            </View>
          ))}
        </View>
        <Text style={{ color: t.accent, fontWeight: '700', marginRight: 4 }}>How ranks work</Text>
        <Ionicons name={showLadder ? 'chevron-up' : 'chevron-down'} size={16} color={t.accent} />
      </Pressable>
      {showLadder ? (
        <Card>
          <Text style={{ color: t.muted, lineHeight: 20, marginBottom: 10 }}>
            Your rank comes from your fastest run of 1 mile or more in the last {WINDOW_DAYS} days, turned into the 5 km time it predicts. Each tier has three divisions: III, then II, then I.
          </Text>
          {ladder().slice().reverse().map((l, i) => (
            <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: i ? 1 : 0, borderTopColor: t.line, opacity: l.label === rank.label ? 1 : 0.85 }}>
              <RankBadge id={l.division ? `${l.tier.id}-${l.division}` : l.tier.id} size={22} />
              <Text style={{ flex: 1, marginLeft: 10, color: t.text, fontWeight: l.label === rank.label ? '900' : '600' }}>{l.label}{l.label === rank.label ? '  (you)' : ''}</Text>
              <Text style={{ color: t.muted, fontVariant: ['tabular-nums'] }}>{l.target === Infinity ? 'Any time' : `5 km under ${fmtTime(l.target)}`}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <SectionLabel>Leaderboards</SectionLabel>
      {!online ? (
        <Card><Text style={{ color: t.muted }}>Sign in to see the leaderboards.</Text></Card>
      ) : !joined ? (
        <Card>
          <Text style={{ color: t.text, fontSize: 17, fontWeight: '800', marginBottom: 4 }}>Join the leaderboards</Text>
          <Text style={{ color: t.muted, lineHeight: 20, marginBottom: 12 }}>
            Pick a runner name. Other runners see your name, rank, distances and best times, but never your email.
          </Text>
          <Field label="Runner name" value={nameDraft} onChangeText={setNameDraft} placeholder="e.g. Ethan R" autoCorrect={false} maxLength={20} onSubmitEditing={join} />
          {nameError ? <Text style={{ color: t.danger, marginBottom: 10, fontWeight: '600' }}>{nameError}</Text> : null}
          <Button label="Join" onPress={join} />
        </Card>
      ) : (
        <Card>
          <Segmented<Tab> options={[{ label: 'This week', value: 'week' }, { label: 'All time', value: 'total' }, { label: 'Fastest', value: 'fastest' }]} value={tab} onChange={setTab} />
          {tab === 'fastest' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {FASTEST_BOARDS.map((f) => <Chip key={f.board} small label={f.label} active={fast === f.board} onPress={() => setFast(f.board)} />)}
            </View>
          ) : null}
          <Text style={{ color: t.muted, marginBottom: 6 }}>
            {tab === 'week' ? 'Most distance since Monday.' : tab === 'total' ? 'Most distance ever.' : 'Fastest time over this distance, within any run.'}
          </Text>
          {error === 'setup' ? (
            <Text style={{ color: t.muted, lineHeight: 20, paddingVertical: 8 }}>The leaderboards aren't switched on yet. (Firestore needs setting up: see docs/LEADERBOARDS.md.)</Text>
          ) : error ? (
            <Text style={{ color: t.muted, lineHeight: 20, paddingVertical: 8 }}>Couldn't load the leaderboard. Check your internet connection.</Text>
          ) : !data ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={t.accent} />
          ) : data.rows.length === 0 ? (
            <Text style={{ color: t.muted, paddingVertical: 8 }}>Nobody's on this board yet. Go for a run and be first!</Text>
          ) : (
            <>
              {data.rows.map((r) => <LeaderRow key={r.uid} row={r} me={r.uid === user!.uid} value={show(r)} />)}
              {data.me ? (
                <>
                  <Text style={{ color: t.muted, textAlign: 'center', paddingVertical: 2 }}>⋯</Text>
                  <LeaderRow row={data.me} me value={show(data.me)} />
                </>
              ) : null}
            </>
          )}
        </Card>
      )}
    </Screen>
  );
}

const PODIUM = ['#E8B931', '#A8B2BD', '#C07A45'];

function LeaderRow({ row, me, value }: { row: Row; me: boolean; value: string }) {
  const t = useTheme();
  const podium = row.position <= 3 ? PODIUM[row.position - 1] : null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: me ? 8 : 0, marginHorizontal: me ? -8 : 0, borderRadius: 10, backgroundColor: me ? t.chip : 'transparent' }}>
      <View style={{ width: 34, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: podium ?? 'transparent' }}>
        <Text style={{ color: podium ? '#1A1A1A' : t.muted, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{row.position}</Text>
      </View>
      <View style={{ marginLeft: 8 }}><RankBadge id={row.tier} size={22} /></View>
      <Text style={{ flex: 1, marginLeft: 10, color: t.text, fontWeight: me ? '800' : '600' }} numberOfLines={1}>{row.name}{me ? ' (you)' : ''}</Text>
      <Text style={{ color: t.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}
