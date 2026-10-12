import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../src/ui';
import { useTheme } from '../src/theme';
import { UsernameForm } from '../src/usernameForm';
import { syncMyEntry } from '../src/leaderboard';

export default function ChangeUsername() {
  const t = useTheme();
  const router = useRouter();
  return (
    <Screen inset={false}>
      <Text style={{ color: t.muted, lineHeight: 20, marginBottom: 12 }}>Your old username becomes free for someone else to take.</Text>
      <UsernameForm submitLabel="Save username" onDone={() => { syncMyEntry().catch(() => {}); router.back(); }} />
    </Screen>
  );
}
