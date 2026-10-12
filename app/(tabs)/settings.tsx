import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Button, Card, Chip, Field, PasswordField, Screen, SectionLabel, Title, ToggleRow } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { HR_OPTIONS, loadSettings, saveSettings } from '../../src/storage';
import { Settings } from '../../src/types';
import { personaFor } from '../../src/coach';
import { authMessage, deleteAccount, resetPassword, signOut, useAuth } from '../../src/auth';
import { syncMyEntry } from '../../src/leaderboard';

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { configured, user, username } = useAuth();
  const [s, setS] = useState<Settings | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    loadSettings().then((st) => { if (alive) setS(st); });
    return () => { alive = false; };
  }, []));

  if (!s) return <Screen>{null}</Screen>;
  const update = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    return saveSettings(next);
  };
  /** Saves a leaderboard change and updates (or removes) this runner's public entry. */
  const updateBoard = async (patch: Partial<Settings>) => {
    await update(patch);
    await syncMyEntry().catch(() => {});
  };

  const persona = personaFor(s.coach);

  async function changePassword() {
    try {
      await resetPassword(user!.email!);
      Alert.alert('Check your email', `We've sent a link to ${user!.email} to choose a new password.`);
    } catch (e) { Alert.alert('Could not send the email', authMessage(e)); }
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your runs stay on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  async function confirmDelete() {
    setBusy(true); setError('');
    try { await deleteAccount(password); }
    catch (e) { setError(authMessage(e)); }
    setBusy(false);
  }

  return (
    <Screen>
      <Title>Settings</Title>

      <SectionLabel>Account</SectionLabel>
      {configured && user ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: t.onAccent, fontSize: 19, fontWeight: '800' }}>{(user.email ?? '?')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontWeight: '700', fontSize: 16 }} numberOfLines={1}>{user.email}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="checkmark-circle" size={15} color={t.walk} />
                <Text style={{ color: t.muted }}>Email verified</Text>
              </View>
            </View>
          </View>
          <Row icon="key-outline" label="Change password" onPress={changePassword} />
          <Row icon="log-out-outline" label="Sign out" onPress={confirmSignOut} />
          <Row icon="trash-outline" label="Delete account" danger onPress={() => { setDeleting(!deleting); setError(''); }} />
          {deleting ? (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: t.muted, marginBottom: 10, lineHeight: 20 }}>
                This permanently deletes your account. Your runs stay on this phone. Enter your password to confirm.
              </Text>
              <PasswordField label="Password" value={password} onChangeText={setPassword} />
              {error ? <Text style={{ color: t.danger, marginBottom: 10, fontWeight: '600' }}>{error}</Text> : null}
              <Button variant="danger" label={busy ? 'Deleting…' : 'Delete my account'} onPress={confirmDelete} disabled={busy || !password} />
            </View>
          ) : null}
        </Card>
      ) : (
        <Card>
          <Text style={{ color: t.text, fontWeight: '700', marginBottom: 4 }}>Accounts aren't switched on yet</Text>
          <Text style={{ color: t.muted, lineHeight: 20 }}>Sign-in turns on once the app is connected to Firebase. See docs/ACCOUNTS.md.</Text>
        </Card>
      )}

      <SectionLabel>Leaderboards</SectionLabel>
      <Card>
        {configured && user ? <Row icon="at" label={username ?? 'Choose a username'} sub="Username: tap to change" onPress={() => router.push('/change-username')} /> : null}
        <ToggleRow label="Show me on leaderboards" hint="Turn off to remove your name, rank and times from the leaderboards." value={s.leaderboards} onChange={(leaderboards) => updateBoard({ leaderboards })} />
      </Card>

      <SectionLabel>Coach</SectionLabel>
      <Card style={{ paddingVertical: 6 }}>
        <Row icon="chatbubble-ellipses-outline" label={persona.name} sub={persona.traits.join(', ')} onPress={() => router.push('/coach')} />
      </Card>

      <SectionLabel>Heart rate</SectionLabel>
      <Card>
        <Field label="Max heart rate" hint="Used for heart-rate warnings and to say how hard you're working. Leave empty for 190." placeholder="190" value={s.maxHr} onChangeText={(maxHr) => update({ maxHr })} keyboardType="number-pad" />
        <Text style={{ fontWeight: '600', color: t.text, marginBottom: 8 }}>Heart-rate updates</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {HR_OPTIONS.map((o) => (
            <Chip key={o.value} small label={o.label} active={s.hrEvery === o.value} onPress={() => update({ hrEvery: o.value })} />
          ))}
        </View>
        <Text style={{ color: t.muted, fontSize: 13, marginTop: 8 }}>How often the coach reads out your heart rate, when a strap is connected.</Text>
      </Card>

      <SectionLabel>About</SectionLabel>
      <Card>
        <Text style={{ color: t.text }}>Pacer {Constants.expoConfig?.version ?? ''}</Text>
        <Text style={{ color: t.muted, marginTop: 2 }}>Your runs are saved on this phone.</Text>
      </Card>
    </Screen>
  );
}

function Row({ icon, label, sub, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; onPress: () => void; danger?: boolean }) {
  const t = useTheme();
  const color = danger ? t.danger : t.text;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={{ color, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={{ color: t.muted, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      {!danger ? <Ionicons name="chevron-forward" size={18} color={t.muted} /> : null}
    </Pressable>
  );
}
