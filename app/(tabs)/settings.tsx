import React, { useCallback, useState } from 'react';
import { Alert, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { dayList } from '../../src/schedule';
import { previewSpeech, voiceFor } from '../../src/speech';
import { allowReminders, remindersAvailable, syncReminders } from '../../src/reminders';
import { Button, Card, Chip, Field, PasswordField, Screen, SectionLabel, Segmented, Title, ToggleRow } from '../../src/ui';
import { Appearance, setThemePrefs, swatch, THEMES, useTheme } from '../../src/theme';
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

  async function toggleReminders(on: boolean) {
    if (on && !(await allowReminders())) {
      Alert.alert('Notifications are off', 'To get reminders, allow notifications for Pacely in your phone\'s settings.', [
        { text: 'Not now', style: 'cancel' }, { text: 'Open settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    await update({ reminders: on });
    await syncReminders();
  }
  function openBluetooth() {
    const fallback = () => Linking.openSettings().catch(() => {});
    if (Platform.OS === 'android') Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS').catch(fallback);
    else fallback(); // iOS apps can't open the Bluetooth page directly
  }
  async function testVoice() {
    const v = await voiceFor(persona, s!.voiceId, s!.voiceRate);
    previewSpeech(`Hi, it's ${persona.name}. If you can hear me in your earphones, you're all set.`, v);
  }

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

      <Pressable onPress={() => router.push('/plus')} accessibilityRole="button">
        <Card style={{ backgroundColor: t.accent, borderWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="star" size={24} color={t.onAccent} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.onAccent, fontWeight: '900', fontSize: 17 }}>Pacely Plus{s.plus ? ' is on' : ''}</Text>
            <Text style={{ color: t.onAccent, marginTop: 1 }}>Adaptive plans, ghost runner, advanced stats and more</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.onAccent} />
        </Card>
      </Pressable>

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

      <SectionLabel>Weekly goal and schedule</SectionLabel>
      <Card>
        <Text style={{ color: t.muted, marginBottom: 10 }}>How far you want to run each week. Hit it week after week to build a streak.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[5, 10, 15, 20, 30, 40, 50, 70].map((km) => (
            <Chip key={km} small label={`${km} km`} active={s.weeklyGoalKm === km} onPress={() => update({ weeklyGoalKm: km })} />
          ))}
        </View>
        <Row icon="calendar" label="Running schedule" sub={s.runDays.length === 7 ? 'Any day' : `Runs on ${dayList(s.runDays)}`} onPress={() => router.push('/schedule')} />
      </Card>

      <SectionLabel>Appearance</SectionLabel>
      <Card>
        <Segmented<Appearance>
          options={[{ label: 'System', value: 'system' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]}
          value={s.appearance}
          onChange={(appearance) => { setThemePrefs({ appearance }); update({ appearance }); }}
        />
        <Text style={{ fontWeight: '600', color: t.text, marginBottom: 10 }}>Colour theme</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {THEMES.map((th) => {
            const active = s.themeId === th.id;
            const d = swatch(th.id, true), l = swatch(th.id, false);
            return (
              <Pressable
                key={th.id}
                onPress={() => { if (th.plus && !s.plus) { router.push('/plus'); return; } setThemePrefs({ themeId: th.id }); update({ themeId: th.id }); }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={th.name}
                style={{ width: '48%', flexGrow: 1, borderRadius: 14, borderWidth: active ? 2 : 1, borderColor: active ? t.accent : t.line, padding: 8 }}
              >
                <View style={{ flexDirection: 'row', height: 44, borderRadius: 9, overflow: 'hidden' }}>
                  <View style={{ flex: 1, backgroundColor: d.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: d.accent }} />
                  </View>
                  <View style={{ flex: 1, backgroundColor: l.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: l.accent }} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                  {active ? <Ionicons name="checkmark-circle" size={15} color={t.accent} /> : null}
                  <Text style={{ color: t.text, fontWeight: active ? '800' : '600', fontSize: 13 }} numberOfLines={1}>{th.name}{th.plus ? ' ★' : ''}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionLabel>Coach</SectionLabel>
      <Card style={{ paddingVertical: 6 }}>
        <Row icon="chatbubble-ellipses-outline" label={persona.name} sub={persona.traits.join(', ')} onPress={() => router.push('/coach')} />
        <ToggleRow label="Lower music while the coach talks" hint="Music and podcasts get quieter for each update, then come back." value={s.duckMusic} onChange={(duckMusic) => update({ duckMusic })} />
      </Card>

      <SectionLabel>Run reminders</SectionLabel>
      <Card>
        {remindersAvailable() ? (
          <>
            <ToggleRow label="Remind me on run days" hint={`A notification on your ${s.runDays.length === 7 ? 'running' : 'planned'} days, with your next plan session.`} value={s.reminders} onChange={toggleReminders} />
            {s.reminders ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {['07:00', '08:00', '12:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((time) => (
                  <Chip key={time} small label={time} active={s.reminderTime === time} onPress={() => update({ reminderTime: time }).then(syncReminders)} />
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={{ color: t.muted, lineHeight: 20 }}>Reminders need the newest version of the app. Make a new build (see docs/STANDALONE.md) to switch them on.</Text>
        )}
      </Card>

      <SectionLabel>Headphones</SectionLabel>
      <Card style={{ paddingVertical: 6 }}>
        <Text style={{ color: t.muted, lineHeight: 20, paddingTop: 8 }}>
          Pair wireless earphones in your phone's Bluetooth settings. Once they're connected, the coach talks through them automatically.
        </Text>
        <Row icon="bluetooth" label="Open Bluetooth settings" sub={Platform.OS === 'ios' ? 'Opens Settings: go back to the main page, then tap Bluetooth' : 'Pair or connect your earphones'} onPress={openBluetooth} />
        <Row icon="headset" label="Test the coach's voice" sub="Check you can hear it in your earphones" onPress={testVoice} />
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
        <Text style={{ color: t.text }}>Pacely {Constants.expoConfig?.version ?? ''}</Text>
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
