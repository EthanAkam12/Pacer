import React, { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Card, Screen } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { RunMap } from '../../src/map';
import { LiveDoc, watchLive } from '../../src/live';
import { fmtTime } from '../../src/format';

/** Watching someone's run live: their trail on a map, distance, time, and when it last updated. */
export default function LiveScreen() {
  const t = useTheme();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const [live, setLive] = useState<LiveDoc | null | undefined>(undefined);
  const [, tick] = useState(0);
  useEffect(() => watchLive(String(uid), setLive), [uid]);
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(i); }, []);

  if (live === undefined) return <Screen inset={false}>{null}</Screen>;
  if (!live) return <Screen inset={false}><Card><Text style={{ color: t.muted }}>This runner isn't sharing a live run with you right now.</Text></Card></Screen>;

  const ago = live.updatedAt ? Math.max(0, Math.round((Date.now() - live.updatedAt) / 1000)) : null;
  const status = !live.active ? 'Run finished' : live.paused ? 'Paused' : 'Running now';
  const stale = live.active && ago !== null && ago > 120;
  return (
    <Screen inset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: live.active && !stale ? t.accent : t.muted }} />
        <Text style={{ color: live.active ? t.accent : t.muted, fontWeight: '800' }}>{status}</Text>
      </View>
      <Text style={{ color: t.text, fontSize: 26, fontWeight: '900', marginBottom: 12 }}>{live.name}</Text>
      <Card>
        {live.trail.length ? <RunMap route={live.trail} height={260} /> : <Text style={{ color: t.muted }}>Waiting for the first GPS position…</Text>}
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '800' }}>{live.km.toFixed(2)}</Text>
            <Text style={{ color: t.muted }}>km</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '800' }}>{fmtTime(live.secs)}</Text>
            <Text style={{ color: t.muted }}>time</Text>
          </View>
        </View>
        {ago !== null ? (
          <Text style={{ color: stale ? t.danger : t.muted, marginTop: 8 }}>
            {stale ? `No update for ${Math.round(ago / 60)} minutes. Their signal may be weak.` : `Updated ${ago < 10 ? 'just now' : `${ago} seconds ago`}`}
          </Text>
        ) : null}
      </Card>
      {live.lat !== null && live.lon !== null ? (
        <Button variant="secondary" label="Open in Google Maps" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${live.lat},${live.lon}`)} />
      ) : null}
    </Screen>
  );
}
