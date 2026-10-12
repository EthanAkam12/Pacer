import React, { useEffect } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { session, SIM_SPEED } from '../src/session';
import { useRunSnapshot } from '../src/hooks';
import { runScreen as C } from '../src/theme';
import { fmtKm, fmtPace, fmtTime } from '../src/format';
import { KIND_NAME, stepLabel } from '../src/intervals';
import { syncMyEntry } from '../src/leaderboard';

export default function RunScreen() {
  const s = useRunSnapshot();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === 'dark';

  // Stop the Android back button from leaving a run by accident.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (s.phase === 'finished') {
      if (s.recordId && !s.simulated) syncMyEntry().catch(() => {});
      router.replace(s.recordId ? `/run-detail/${s.recordId}` : '/');
    }
    else if (s.phase === 'idle') router.replace('/');
  }, [s.phase, s.recordId]);

  const paused = s.phase === 'paused';
  const busy = s.phase === 'finishing';
  const confirmFinish = () =>
    Alert.alert('Finish this run?', 'It will be saved to your history.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Finish', style: 'destructive', onPress: () => session.finish(false) },
    ]);

  const left = Math.max(0, s.goal - s.distance);
  const pct = s.goal ? Math.min(1, s.distance / s.goal) : 0;
  const stepColor = s.step ? C.kind[s.step.kind] : C.volt;
  const remaining = s.step
    ? s.step.measure === 'time' ? fmtTime(Math.ceil(s.stepRemaining)) : `${Math.ceil(s.stepRemaining)} m`
    : '';

  return (
    <View style={{ flex: 1, backgroundColor: dark ? C.bgDark : C.bg }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: C.muted, fontSize: 16, fontWeight: '600' }}>{paused ? 'Paused' : s.title}</Text>
          {s.simulated ? (
            <Text style={{ backgroundColor: C.volt, color: '#1A1A1A', fontWeight: '800', fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' }}>
              Practice {SIM_SPEED}×
            </Text>
          ) : null}
        </View>

        {s.mode === 'intervals' && s.step ? (
          <View style={{ backgroundColor: C.panel, borderRadius: 20, padding: 18, marginTop: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Text style={{ color: stepColor, fontSize: 44, fontWeight: '900' }}>{KIND_NAME[s.step.kind]}</Text>
              <Text style={{ color: C.text, fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{remaining}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.line, marginTop: 12, overflow: 'hidden' }}>
              <View style={{ width: `${s.stepProgress * 100}%`, height: '100%', backgroundColor: stepColor }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ color: C.muted }}>Interval {s.stepIndex + 1} of {s.stepCount}</Text>
              <Text style={{ color: C.muted }}>{s.nextStep ? `Next: ${stepLabel(s.nextStep)}` : 'Last one'}</Text>
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 14 }}>
            <View style={{ height: 44, borderRadius: 10, backgroundColor: C.panel, overflow: 'hidden', justifyContent: 'center' }}>
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, backgroundColor: 'rgba(244,232,58,0.25)' }} />
              <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, backgroundColor: C.text }} />
              <View style={{ position: 'absolute', left: `${pct * 92}%`, marginLeft: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: C.volt }} />
            </View>
            <Text style={{ color: C.muted, marginTop: 8, textAlign: 'right' }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>{left < 1000 ? `${Math.round(left)} m` : `${fmtKm(left)} km`}</Text> to go
            </Text>
          </View>
        )}

        <View style={{ alignItems: 'center', marginVertical: 18 }}>
          <Text
            style={{ color: s.slow ? C.warn : C.volt, fontSize: s.mode === 'intervals' ? 84 : 112, fontWeight: '900', fontVariant: ['tabular-nums'], lineHeight: s.mode === 'intervals' ? 90 : 118 }}
            accessibilityLabel={`Current pace ${fmtPace(s.currentPace)} per kilometre`}
          >
            {s.currentPace === Infinity ? '0:00' : fmtPace(s.currentPace)}
          </Text>
          <Text style={{ color: C.muted, fontSize: 15 }}>{s.slow ? 'Slower than your pace, pick it up' : 'min per km right now'}</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderColor: C.line }}>
          <Tile value={fmtKm(s.distance)} label="km run" />
          <Tile value={fmtTime(s.elapsed)} label="time" right />
          <Tile value={fmtPace(s.avgPace)} label="average pace" />
          <Tile value={s.hr ? String(s.hr) : '––'} label="heart rate" right />
        </View>

        <View style={{ backgroundColor: C.panel, borderRadius: 18, borderBottomLeftRadius: 4, padding: 16, marginTop: 18, minHeight: 64 }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '500', lineHeight: 23 }} accessibilityLiveRegion="polite">
            {s.gpsStatus || s.coachLine || 'Your coach will talk to you here.'}
          </Text>
        </View>
        {s.notice ? <Text style={{ color: C.muted, marginTop: 10, fontSize: 13 }}>{s.notice}</Text> : null}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={() => (paused ? session.resume() : session.pause())}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => ({ flex: 1, backgroundColor: C.text, borderRadius: 999, paddingVertical: 18, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}
        >
          <Text style={{ color: C.bg, fontWeight: '800', fontSize: 18 }}>{paused ? 'Resume' : 'Pause'}</Text>
        </Pressable>
        <Pressable
          onPress={confirmFinish}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => ({ flex: 1, borderWidth: 2, borderColor: C.text, borderRadius: 999, paddingVertical: 16, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}
        >
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>{busy ? 'Saving…' : 'Finish'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Tile({ value, label, right }: { value: string; label: string; right?: boolean }) {
  return (
    <View style={{ width: '50%', paddingVertical: 12, paddingLeft: right ? 16 : 0, borderBottomWidth: 1, borderLeftWidth: right ? 1 : 0, borderColor: C.line }}>
      <Text style={{ color: C.text, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ color: C.muted, fontSize: 14 }}>{label}</Text>
    </View>
  );
}
