import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, Screen, SectionLabel, Segmented, Title } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { loadRuns, loadSettings } from '../../src/storage';
import { allRanks, distanceOf, ladder, Rank, RANKED, rankFor, stepFor, WINDOW_DAYS } from '../../src/ranks';
import { RankBadge } from '../../src/badge';
import { Board, distanceBoard, fetchBoard, myArea, notSetUp, Row, syncMyEntry } from '../../src/leaderboard';
import { useAuth } from '../../src/auth';
import { friendsAndMe, localProfiles, Profile } from '../../src/friends';
import { usePlus } from '../../src/plus';
import { useDataVersion } from '../../src/hooks';
import { fmtPace, fmtShortDate, fmtTime } from '../../src/format';
import { RunRecord } from '../../src/types';

type Sel = 'overall' | string; // or a ranked distance key
type OverallBoard = 'week' | 'total' | 'rank' | 'trophies';

export default function RanksScreen() {
  const t = useTheme();
  const router = useRouter();
  const { configured, user, username } = useAuth();
  const [runs, setRuns] = useState<RunRecord[] | null>(null);
  const [hidden, setHidden] = useState(false);
  const [sel, setSel] = useState<Sel>('overall');
  const [overallBoard, setOverallBoard] = useState<OverallBoard>('week');
  const [showLadder, setShowLadder] = useState(false);
  const [data, setData] = useState<{ rows: Row[]; me: Row | null } | null>(null);
  const [error, setError] = useState('');
  const [synced, setSynced] = useState(0);
  const [scope, setScope] = useState<'everyone' | 'friends' | 'local'>('everyone');
  const [areaName, setAreaName] = useState<string | null>(null);
  const plus = usePlus();
  const version = useDataVersion();

  const online = configured && !!user && !!username;
  const board: Board = sel === 'overall' ? overallBoard : distanceBoard(sel);

  useFocusEffect(useCallback(() => {
    let alive = true;
    Promise.all([loadRuns(), loadSettings()]).then(([r, st]) => {
      if (!alive) return;
      setRuns(r.filter((x) => !x.simulated));
      setHidden(!st.leaderboards);
      if (online) syncMyEntry().catch(() => {}).finally(() => alive && setSynced((n) => n + 1));
    });
    return () => { alive = false; };
  }, [online, version]));

  useEffect(() => {
    if (!online || !synced) return;
    let alive = true;
    setData(null); setError('');
    const local = async () => {
      const a = await myArea();
      if (alive) setAreaName(a?.areaName ?? '');
      return friendsBoard(a ? await localProfiles(a.area) : [], board);
    };
    (scope === 'friends' ? friendsAndMe().then((ps) => friendsBoard(ps, board)) : scope === 'local' ? local() : fetchBoard(board))
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(notSetUp(e) ? 'setup' : 'offline'));
    return () => { alive = false; };
  }, [board, online, synced, scope]);

  if (!runs) return <Screen>{null}</Screen>;
  const ranks = allRanks(runs);
  const rank: Rank = sel === 'overall' ? rankFor(runs) : ranks[sel];
  const dist = sel === 'overall' ? rank.distance : distanceOf(sel);
  const ladderKey = dist?.key ?? '5000';
  const isTime = board.startsWith('best');
  const show = (r: Row) => board === 'trophies' ? `🏆 ${r.value}` : board === 'rank' ? ladder().find((s) => s.id === r.tier)?.label ?? '' : isTime ? fmtTime(r.value) : `${r.value.toFixed(1)} km`;
  const badgeOf = (r: Row) => (isTime ? stepFor(sel, r.value)?.id ?? 'unranked' : r.tier);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><Title sub="Get faster to climb the ranks. Run more to top the leaderboards.">Ranks</Title></View>
        {online ? (
          <Pressable onPress={() => router.push('/friends')} accessibilityRole="button" style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.chip, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}>
            <Ionicons name="people" size={16} color={t.accent} />
            <Text style={{ color: t.text, fontWeight: '700' }}>Friends</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        <Chip label="Overall" active={sel === 'overall'} onPress={() => setSel('overall')} />
        {RANKED.map((d) => <Chip key={d.key} label={d.label} active={sel === d.key} onPress={() => setSel(d.key)} />)}
      </ScrollView>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <RankBadge id={rank.id} size={84} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.muted, fontWeight: '600' }}>{sel === 'overall' ? 'Your overall rank' : `Your ${dist!.label} rank`}</Text>
            <Text style={{ color: t.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>{rank.label}</Text>
            <Text style={{ color: t.muted, marginTop: 2, lineHeight: 19 }}>
              {rank.from && dist
                ? `${sel === 'overall' ? `From your ${dist.label}` : `Your best ${dist.label}`}: ${fmtTime(rank.from.time)} on ${fmtShortDate(rank.from.date)}.`
                : sel === 'overall' ? 'Run a mile (1.6 km) or further to get your first rank.'
                : `Run ${dist!.long} or further to get your ${dist!.label} rank.`}
            </Text>
          </View>
        </View>
        {rank.next && dist ? (
          <View style={{ marginTop: 16 }}>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: t.chip, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(4, rank.next.progress * 100)}%`, height: '100%', borderRadius: 5, backgroundColor: rank.step?.tier.colors[1] ?? t.accent }} />
            </View>
            <Text style={{ color: t.text, marginTop: 8, lineHeight: 20 }}>
              <Text style={{ fontWeight: '800' }}>Next: {rank.next.label}. </Text>
              Run {dist.long} in {fmtTime(rank.next.target)} or faster ({fmtPace(rank.next.target / (dist.meters / 1000))} per km).
            </Text>
          </View>
        ) : rank.step?.tier.id === 'elite' ? (
          <Text style={{ color: t.text, marginTop: 12, fontWeight: '700' }}>You've reached the top rank. Incredible running.</Text>
        ) : null}
        {sel === 'overall' ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.line }}>
            {RANKED.map((d) => (
              <Pressable key={d.key} onPress={() => setSel(d.key)} accessibilityRole="button" style={{ alignItems: 'center', flex: 1 }}>
                <RankBadge id={ranks[d.key].id} size={30} />
                <Text style={{ color: t.text, fontWeight: '700', fontSize: 12, marginTop: 4 }}>{d.label}</Text>
                <Text style={{ color: t.muted, fontSize: 11 }} numberOfLines={1}>{ranks[d.key].level ? ranks[d.key].label : 'None yet'}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Card>

      <Pressable onPress={() => setShowLadder(!showLadder)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, marginBottom: 6 }}>
        <Text style={{ flex: 1, color: t.accent, fontWeight: '700' }}>How ranks work{dist ? `: ${dist.label} times` : ''}</Text>
        <Ionicons name={showLadder ? 'chevron-up' : 'chevron-down'} size={16} color={t.accent} />
      </Pressable>
      {showLadder ? (
        <Card>
          <Text style={{ color: t.muted, lineHeight: 20, marginBottom: 10 }}>
            Each distance has its own rank, from your fastest time over it (within any run) in the last {WINDOW_DAYS === 365 ? 'year' : `${WINDOW_DAYS} days`}. Your overall rank is your best one. Every tier has three divisions: III, then II, then I.
          </Text>
          {ladder(ladderKey).slice().reverse().map((l, i) => {
            const mine = l.id === (sel === 'overall' ? ranks[ladderKey]?.id : rank.id);
            return (
              <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
                <RankBadge id={l.id} size={22} />
                <Text style={{ flex: 1, marginLeft: 10, color: t.text, fontWeight: mine ? '900' : '600' }}>{l.label}{mine ? '  (you)' : ''}</Text>
                <Text style={{ color: t.muted, fontVariant: ['tabular-nums'] }}>{l.target === Infinity ? 'Any time' : `under ${fmtTime(l.target)}`}</Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      <SectionLabel>{sel === 'overall' ? 'Leaderboards' : `Fastest ${dist!.long}`}</SectionLabel>
      {!online ? (
        <Card><Text style={{ color: t.muted }}>Sign in to see the leaderboards.</Text></Card>
      ) : (
        <Card>
          <Segmented<'everyone' | 'friends' | 'local'>
            options={[{ label: 'Everyone', value: 'everyone' }, { label: 'Friends', value: 'friends' }, { label: plus ? 'Local' : 'Local ★', value: 'local' }]}
            value={scope}
            onChange={(v) => (v === 'local' && !plus ? router.push('/plus') : setScope(v))}
          />
          {scope === 'local' ? (
            <Text style={{ color: t.text, fontWeight: '700', marginBottom: 4 }}>
              {areaName === null ? 'Finding your area…' : areaName ? `📍 Best runners around ${areaName}` : 'Go for an outdoor run so Pacely knows your area.'}
            </Text>
          ) : null}
          {sel === 'overall' ? (
            <Segmented<OverallBoard> options={[{ label: 'Week', value: 'week' }, { label: 'All time', value: 'total' }, { label: 'Ranked', value: 'rank' }, { label: 'Trophies', value: 'trophies' }]} value={overallBoard} onChange={setOverallBoard} />
          ) : null}
          <Text style={{ color: t.muted, marginBottom: 6 }}>
            {board === 'week' ? 'Most distance since Monday.' : board === 'total' ? 'Most distance ever.' : board === 'rank' ? 'Highest overall rank.' : board === 'trophies' ? 'Most challenges won.' : `Fastest ${dist!.long} within any run.`}
          </Text>
          {hidden ? (
            <Pressable onPress={() => router.navigate('/settings')}>
              <Text style={{ color: t.accent, fontWeight: '600', marginBottom: 6 }}>You're hidden from the leaderboards. Change this in Settings.</Text>
            </Pressable>
          ) : null}
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
              {data.rows.map((r) => <LeaderRow key={r.uid} row={r} badge={badgeOf(r)} me={r.uid === user!.uid} value={show(r)} />)}
              {data.me ? (
                <>
                  <Text style={{ color: t.muted, textAlign: 'center', paddingVertical: 2 }}>⋯</Text>
                  <LeaderRow row={data.me} badge={badgeOf(data.me)} me value={show(data.me)} />
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

function LeaderRow({ row, badge, me, value }: { row: Row; badge: string; me: boolean; value: string }) {
  const t = useTheme();
  const podium = row.position <= 3 ? PODIUM[row.position - 1] : null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: me ? 8 : 0, marginHorizontal: me ? -8 : 0, borderRadius: 10, backgroundColor: me ? t.chip : 'transparent' }}>
      <View style={{ width: 34, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: podium ?? 'transparent' }}>
        <Text style={{ color: podium ? '#1A1A1A' : t.muted, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{row.position}</Text>
      </View>
      <View style={{ marginLeft: 8 }}><RankBadge id={badge} size={22} /></View>
      <Text style={{ flex: 1, marginLeft: 10, color: t.text, fontWeight: me ? '800' : '600' }} numberOfLines={1}>{row.name}{row.plus ? <Text style={{ color: t.accent }}> ★</Text> : null}{me ? ' (you)' : ''}</Text>
      <Text style={{ color: t.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

/** Builds a leaderboard from you and the runners you follow. */
function friendsBoard(ps: Profile[], board: Board): { rows: Row[]; me: Row | null } {
  const fastest = board.startsWith('best') || board === 'rank';
  const value = (p: Profile) => board === 'week' ? p.weekKm : board === 'total' ? p.totalKm : board === 'rank' ? p.rankScore : board === 'trophies' ? p.trophies : p.bests[board.slice(4)];
  const scored = ps.map((p) => ({ p, v: value(p) })).filter((x): x is { p: Profile; v: number } => typeof x.v === 'number' && x.v > 0)
    .sort((a, b) => (fastest ? a.v - b.v : b.v - a.v));
  const rows: Row[] = [];
  scored.forEach(({ p, v }, i) => {
    const position = i > 0 && v === rows[i - 1].value ? rows[i - 1].position : i + 1;
    rows.push({ uid: p.uid, name: p.name, tier: p.tier, value: v, position, plus: p.plus });
  });
  return { rows, me: null };
}
