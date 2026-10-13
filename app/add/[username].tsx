import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Screen } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { RankBadge } from '../../src/badge';
import { findRunner, follow, Profile } from '../../src/friends';

/** Opened from an invite link (pacer://add/<username>) or QR code. */
export default function AddFriend() {
  const t = useTheme();
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const [p, setP] = useState<Profile | null | undefined>(undefined);
  const [done, setDone] = useState(false);
  useEffect(() => { findRunner(String(username)).then(setP).catch(() => setP(null)); }, [username]);

  if (p === undefined) return <Screen><ActivityIndicator color={t.accent} /></Screen>;
  return (
    <Screen>
      <Card style={{ alignItems: 'center', marginTop: 40 }}>
        {p ? (
          <>
            <RankBadge id={p.tier === 'hidden' ? 'unranked' : p.tier} size={64} />
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '900', marginTop: 10 }}>{p.name}</Text>
            <Text style={{ color: t.muted, marginTop: 4, marginBottom: 16 }}>wants you to run with them on Pacer</Text>
            {done ? <Text style={{ color: t.walk, fontWeight: '700' }}>You're now following {p.name}.</Text>
              : <Button label={`Follow ${p.name}`} onPress={() => follow(p.uid).then(() => setDone(true))} />}
          </>
        ) : <Text style={{ color: t.muted }}>Couldn't find a runner called {username}.</Text>}
      </Card>
      <Button variant="secondary" label="Go to Pacer" onPress={() => router.replace('/')} />
    </Screen>
  );
}
