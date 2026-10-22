import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { session, SIM_SPEED } from '../src/session';
import { useRunSnapshot } from '../src/hooks';
import { kindColor, Theme, useTheme } from '../src/theme';
import { fmtKm, fmtPace, fmtTime } from '../src/format';
import { KIND_NAME, stepLabel } from '../src/intervals';
import { syncMyEntry } from '../src/leaderboard';
import { collectCheers, setRunning, syncAllChallenges } from '../src/social';
import { endLive, startLive } from '../src/live';

/** Moves an Animated.Value smoothly to each new target, over about one update interval. */
function useGlide(target: number, ms = 900) {
  const v = useRef(new Animated.Value(target)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: target, duration: ms, easing: Easing.linear, useNativeDriver: false }).start();
  }, [target]);
  return v;
}

/** Current pace with the jitter taken out, so the big number changes calmly. */
function useSteadyPace(pace: number, running: boolean) {
  const ema = useRef<number | null>(null);
  if (!running || pace === Infinity) ema.current = null; // paused or standing still: start afresh
  if (pace === Infinity) return Infinity;
  if (!isFinite(pace)) return ema.current ?? NaN;
  ema.current = ema.current === null ? pace : ema.current + 0.3 * (pace - ema.current);
  return ema.current;
}

export default function RunScreen() {
  useKeepAwake(); // the screen stays on during a run
  const s = useRunSnapshot();
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Stop the Android back button from leaving a run by accident.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // Show friends you're running, and read out any cheers they send (checked every 20 seconds).
  useEffect(() => {
    const started = Date.now() - 5 * 60e3; // cheers sent just before you started count too
    setRunning(true).catch(() => {});
    startLive().catch(() => {});
    const poll = setInterval(() => {
      collectCheers(started).then((list) => list.forEach((c) => session.announceCheer(c.from, c.text))).catch(() => {});
    }, 20000);
    return () => { clearInterval(poll); setRunning(false).catch(() => {}); endLive(); };
  }, []);

  useEffect(() => {
    if (s.phase === 'finished') {
      if (s.recordId && !s.simulated) syncMyEntry().then(() => syncAllChallenges()).catch(() => {});
      router.replace(s.recordId ? `/run-detail/${s.recordId}` : '/');
    } else if (s.phase === 'idle') router.replace('/');
  }, [s.phase, s.recordId]);

  const paused = s.phase === 'paused';
  const busy = s.phase === 'finishing';
  const confirmFinish = () =>
    Alert.alert('Finish this run?', 'It will be saved to your history.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Finish', style: 'destructive', onPress: () => session.finish(false) },
    ]);

  const pace = useSteadyPace(s.currentPace, s.phase === 'running');
  const left = Math.max(0, s.goal - s.distance);
  const pct = s.goal ? Math.min(1, s.distance / s.goal) : 0;
  const stepColor = s.step ? kindColor(t, s.step.kind) : t.accent;
  const remaining = s.step
    ? s.step.measure === 'time' ? fmtTime(Math.ceil(s.stepRemaining)) : `${Math.ceil(s.stepRemaining)} m`
    : '';

  return (
    <View style={{ flex: 1, backgroundColor: t.run.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.run.top} />
            <Stop offset="0.55" stopColor={t.run.bg} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bg)" />
      </Svg>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: t.muted, fontSize: 16, fontWeight: '600' }}>{s.autoPaused ? 'Auto-paused' : paused ? 'Paused' : s.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {s.treadmill ? (
              <Text style={{ backgroundColor: t.soft, color: t.text, fontWeight: '800', fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' }}>
                Treadmill
              </Text>
            ) : null}
            {s.simulated ? (
              <Text style={{ backgroundColor: t.soft, color: t.text, fontWeight: '800', fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' }}>
                Practice {SIM_SPEED}×
              </Text>
            ) : null}
            <LiveDot on={s.phase === 'running'} color={t.accent} />
          </View>
        </View>

        {s.autoPaused ? (
          <View style={{ backgroundColor: t.soft, borderRadius: 14, padding: 12, marginTop: 12 }}>
            <Text style={{ color: t.text, fontWeight: '700' }}>Auto-paused: you've stopped moving. The clock starts again when you do.</Text>
          </View>
        ) : null}

        {s.mode === 'intervals' && s.step ? (
          <View style={{ backgroundColor: t.run.panel, borderRadius: 20, padding: 18, marginTop: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Text style={{ color: stepColor, fontSize: 44, fontWeight: '900' }}>{KIND_NAME[s.step.kind]}</Text>
              <Text style={{ color: t.text, fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{remaining}</Text>
            </View>
            <Bar progress={s.stepProgress} color={stepColor} track={t.line} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ color: t.muted }}>Interval {s.stepIndex + 1} of {s.stepCount}</Text>
              <Text style={{ color: t.muted }}>{s.nextStep ? `Next: ${stepLabel(s.nextStep)}` : 'Last one'}</Text>
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 14 }}>
            <Lane progress={pct} t={t} />
            <Text style={{ color: t.muted, marginTop: 8, textAlign: 'right' }}>
              <Text style={{ color: t.text, fontWeight: '800', fontSize: 18 }}>{left < 1000 ? `${Math.round(left)} m` : `${fmtKm(left)} km`}</Text> to go
            </Text>
          </View>
        )}

        <View style={{ alignItems: 'center', marginVertical: 18 }}>
          <Text
            style={{ color: s.slow ? t.run.warn : t.accent, fontSize: s.mode === 'intervals' ? 84 : 112, fontWeight: '900', letterSpacing: -3, fontVariant: ['tabular-nums'], lineHeight: s.mode === 'intervals' ? 90 : 118 }}
            accessibilityLabel={`Current pace ${fmtPace(pace)} per kilometre`}
          >
            {pace === Infinity ? '0:00' : fmtPace(pace)}
          </Text>
          <Text style={{ color: s.slow ? t.run.warn : t.muted, fontSize: 15, fontWeight: s.slow ? '700' : '400' }}>{s.slow ? 'Slower than your pace, pick it up' : 'min per km right now'}</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderColor: t.line }}>
          <Tile t={t} value={fmtKm(s.distance)} label="km" />
          <Tile t={t} value={fmtTime(s.elapsed)} label="time" right />
          <Tile t={t} value={fmtPace(s.avgPace)} label="average pace" />
          <Tile t={t} value={s.hr ? String(s.hr) : '––'} label="heart rate" right />
          {s.raceProjected !== null ? (
            <Tile t={t} value={fmtTime(s.raceProjected)} label={s.raceGap === null ? 'projected finish' : `projected · ${s.raceGap >= 0 ? `${fmtTime(s.raceGap)} ahead` : `${fmtTime(-s.raceGap)} behind`}`} />
          ) : null}
          {s.ghostLabel ? (
            <Tile t={t} value={s.ghostGap === null ? '––' : `${s.ghostGap >= 0 ? '+' : '−'}${fmtTime(Math.abs(s.ghostGap))}`}
              label={s.ghostGap === null ? `vs ${s.ghostLabel}` : s.ghostGap >= 0 ? `ahead of ${s.ghostLabel}` : `behind ${s.ghostLabel}`} />
          ) : null}
        </View>

        <CoachBubble t={t} text={s.gpsStatus || s.coachLine || 'Your coach will talk to you here.'} />
        {s.notice ? <Text style={{ color: t.muted, marginTop: 10, fontSize: 13 }}>{s.notice}</Text> : null}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={() => (paused ? session.resume() : session.pause())}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => ({ flex: 1, backgroundColor: t.accent, borderRadius: 999, paddingVertical: 18, alignItems: 'center', opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <Text style={{ color: t.onAccent, fontWeight: '800', fontSize: 18 }}>{paused ? 'Resume' : 'Pause'}</Text>
        </Pressable>
        <Pressable
          onPress={confirmFinish}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => ({ flex: 1, borderWidth: 2, borderColor: t.text, borderRadius: 999, paddingVertical: 16, alignItems: 'center', opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <Text style={{ color: t.text, fontWeight: '800', fontSize: 18 }}>{busy ? 'Saving…' : 'Finish'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The track to the finish line: a filled lane, a glowing runner dot and the finish line. */
function Lane({ progress, t }: { progress: number; t: Theme }) {
  const [w, setW] = useState(0);
  const p = useGlide(progress);
  const DOT = 26;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 40, borderRadius: 12, backgroundColor: t.run.panel, overflow: 'hidden', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: t.soft, width: p.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, backgroundColor: t.text }} />
      {w > 0 ? (
        <Animated.View style={{
          position: 'absolute', left: 6, width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: t.accent,
          borderWidth: 4, borderColor: t.soft,
          transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, w - DOT - 18)] }) }],
        }} />
      ) : null}
    </View>
  );
}

function Bar({ progress, color, track }: { progress: number; color: string; track: string }) {
  const p = useGlide(progress);
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: track, marginTop: 12, overflow: 'hidden' }}>
      <Animated.View style={{ height: '100%', borderRadius: 4, backgroundColor: color, width: p.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

/** A small dot that gently pulses while the run is live. */
function LiveDot({ on, color }: { on: boolean; color: string }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!on) { v.setValue(0.35); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [on]);
  return <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity: v }} />;
}

/** The coach's latest line; each new line slides up and fades in. */
function CoachBubble({ text, t }: { text: string; t: Theme }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [text]);
  return (
    <Animated.View style={{
      backgroundColor: t.run.panel, borderRadius: 18, borderBottomLeftRadius: 4, padding: 16, marginTop: 18, minHeight: 64,
      opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
    }}>
      <Text style={{ color: t.text, fontSize: 17, fontWeight: '500', lineHeight: 23 }} accessibilityLiveRegion="polite">{text}</Text>
    </Animated.View>
  );
}

function Tile({ value, label, right, t }: { value: string; label: string; right?: boolean; t: Theme }) {
  return (
    <View style={{ width: '50%', paddingVertical: 12, paddingLeft: right ? 16 : 0, borderBottomWidth: 1, borderLeftWidth: right ? 1 : 0, borderColor: t.line }}>
      <Text style={{ color: t.text, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ color: t.muted, fontSize: 14 }}>{label}</Text>
    </View>
  );
}
