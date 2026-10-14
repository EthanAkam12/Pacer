import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePlus } from '../../src/plus';
import Svg, { Circle, Defs, LinearGradient, Polyline, Rect, Stop } from 'react-native-svg';
import { Button, Chip, Screen } from '../../src/ui';
import { mix, useTheme } from '../../src/theme';
import { getRun, loadRuns } from '../../src/storage';
import { RankBadge } from '../../src/badge';
import { rankFor } from '../../src/ranks';
import { PB_DISTANCES } from '../../src/records';
import { RunRecord } from '../../src/types';
import { fmtDate, fmtKm, fmtPace, fmtTime } from '../../src/format';
import { useAuth } from '../../src/auth';

const DESIGNS: { id: 'classic' | 'light' | 'bold'; label: string; plus?: boolean }[] = [
  { id: 'classic', label: 'Classic' }, { id: 'light', label: 'Light', plus: true }, { id: 'bold', label: 'Bold', plus: true },
];

/** A picture of a run, made to share: distance, time, pace, route, rank and any PBs. */
export default function ShareRun() {
  const t = useTheme();
  const { username } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [run, setRun] = useState<RunRecord | null>(null);
  const [rankId, setRankId] = useState('unranked');
  const [rankLabel, setRankLabel] = useState('');
  const [error, setError] = useState('');
  const card = useRef<View>(null);
  const router = useRouter();
  const plus = usePlus();
  const [design, setDesign] = useState<'classic' | 'light' | 'bold'>('classic');

  useEffect(() => {
    getRun(String(id)).then(setRun);
    loadRuns().then((rs) => { const r = rankFor(rs.filter((x) => !x.simulated)); setRankId(r.id); setRankLabel(r.label); });
  }, [id]);
  if (!run) return <Screen inset={false}>{null}</Screen>;

  async function share() {
    setError('');
    try {
      // Loaded only when sharing, so an app build without these can still open.
      const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');
      const Sharing = require('expo-sharing') as typeof import('expo-sharing');
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) { setError("Sharing isn't available on this phone."); return; }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your run' });
    } catch {
      setError("Couldn't make the picture. This needs the latest version of the Pacer app.");
    }
  }

  // Card designs: Classic is free; Light and Bold are Pacer Plus extras.
  const D = design === 'light'
    ? { top: '#FFFFFF', bottom: mix(t.accent, '#FFFFFF', 0.85), fg: mix(t.accent, '#000000', 0.6), sub: 'rgba(0,0,0,0.55)', chip: 'rgba(0,0,0,0.07)', route: mix(t.accent, '#000000', 0.2), big: mix(t.accent, '#000000', 0.35) }
    : design === 'bold'
      ? { top: '#000000', bottom: '#111111', fg: '#FFFFFF', sub: 'rgba(255,255,255,0.65)', chip: 'rgba(255,255,255,0.12)', route: t.accent, big: t.dark ? t.accent : mix(t.accent, '#FFFFFF', 0.3) }
      : { top: mix(t.accent, '#000000', 0.55), bottom: mix(t.accent, '#000000', 0.82), fg: '#FFFFFF', sub: 'rgba(255,255,255,0.75)', chip: 'rgba(255,255,255,0.14)', route: t.dark ? t.accent : mix(t.accent, '#ffffff', 0.35), big: '#FFFFFF' };
  const top = D.top, bottom = D.bottom;
  const pbs = PB_DISTANCES.filter((d) => run.pbs?.includes(d.key));
  return (
    <Screen inset={false}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {DESIGNS.map((x) => (
          <Chip key={x.id} small label={x.plus ? `${x.label} ★` : x.label} active={design === x.id}
            onPress={() => (x.plus && !plus ? router.push('/plus') : setDesign(x.id))} />
        ))}
      </View>
      <View ref={card} collapsable={false} style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: 4 / 5 }}>
        <Svg style={{ position: 'absolute', width: '100%', height: '100%' }}>
          <Defs>
            <LinearGradient id="card" x1="0" y1="0" x2="0.6" y2="1">
              <Stop offset="0" stopColor={top} />
              <Stop offset="1" stopColor={bottom} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#card)" />
        </Svg>
        <View style={{ flex: 1, padding: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, color: D.fg, fontWeight: '900', fontSize: 20, letterSpacing: 3 }}>PACER</Text>
            {username ? <Text style={{ color: D.sub, fontWeight: '700' }}>@{username}</Text> : null}
          </View>
          <Text style={{ color: D.sub, marginTop: 4 }}>{run.title} · {fmtDate(run.startedAt)}</Text>

          <View style={{ flex: 1, marginVertical: 10 }}>
            <RouteArt route={run.route} color={D.route} dot={D.fg} />
          </View>

          <Text style={{ color: D.big, fontSize: design === 'bold' ? 80 : 64, fontWeight: '900', letterSpacing: -2, lineHeight: design === 'bold' ? 84 : 68 }}>{fmtKm(run.distance)}<Text style={{ fontSize: 24, fontWeight: '700' }}> km</Text></Text>
          <View style={{ flexDirection: 'row', gap: 22, marginTop: 6 }}>
            <View><Text style={{ color: D.fg, fontSize: 24, fontWeight: '800' }}>{fmtTime(run.duration)}</Text><Text style={{ color: D.sub }}>time</Text></View>
            <View><Text style={{ color: D.fg, fontSize: 24, fontWeight: '800' }}>{fmtPace(run.avgPace)}</Text><Text style={{ color: D.sub }}>per km</Text></View>
            {run.avgHr ? <View><Text style={{ color: D.fg, fontSize: 24, fontWeight: '800' }}>{run.avgHr}</Text><Text style={{ color: D.sub }}>avg bpm</Text></View> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: D.chip, borderRadius: 999, paddingRight: 12, paddingLeft: 4, paddingVertical: 3 }}>
              <RankBadge id={rankId} size={22} />
              <Text style={{ color: D.fg, fontWeight: '800' }}>{rankLabel}</Text>
            </View>
            {pbs.map((d) => (
              <Text key={d.key} style={{ color: '#1a1a1a', backgroundColor: '#FFE58A', fontWeight: '800', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' }}>🏆 {d.label} PB</Text>
            ))}
          </View>
        </View>
      </View>
      {error ? <Text style={{ color: t.danger, marginTop: 12 }}>{error}</Text> : null}
      <Button label="Share" onPress={share} style={{ marginTop: 16 }} />
    </Screen>
  );
}

/** The route as a glowing line, no map, so the picture always renders. */
function RouteArt({ route, color, dot }: { route: { lat: number; lon: number }[]; color: string; dot: string }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  let content: React.ReactNode = null;
  if (box.w && route.length > 1) {
    const k = Math.cos((route[0].lat * Math.PI) / 180);
    const xs = route.map((p) => p.lon * k), ys = route.map((p) => p.lat);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 12, s = Math.min((box.w - 2 * pad) / Math.max(maxX - minX, 1e-9), (box.h - 2 * pad) / Math.max(maxY - minY, 1e-9));
    const ox = (box.w - (maxX - minX) * s) / 2, oy = (box.h - (maxY - minY) * s) / 2;
    const pts = route.map((_, i) => [ox + (xs[i] - minX) * s, box.h - (oy + (ys[i] - minY) * s)]);
    content = (
      <Svg width={box.w} height={box.h}>
        <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={12} strokeLinejoin="round" strokeLinecap="round" />
        <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={6} fill={dot} />
      </Svg>
    );
  }
  return <View style={{ flex: 1 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>{content}</View>;
}
