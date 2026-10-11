import React, { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthHeader, Button, Card, Field, PasswordField, Screen } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { authMessage, MIN_PASSWORD, signUp } from '../../src/auth';

export default function SignUp() {
  const t = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("That email address doesn't look right."); return; }
    if (password.length < MIN_PASSWORD) { setError(`Use a password of at least ${MIN_PASSWORD} characters.`); return; }
    if (password !== confirm) { setError("The two passwords don't match."); return; }
    setBusy(true); setError('');
    try { await signUp(email, password); } // signed in but not verified, so the app shows the verify screen
    catch (e) { setError(authMessage(e)); setBusy(false); }
  }

  return (
    <Screen>
      <AuthHeader title="Create your account" sub="We'll email you a link to check it's really you." />
      <Card>
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
        <PasswordField label="Password" hint={`At least ${MIN_PASSWORD} characters.`} value={password} onChangeText={setPassword} autoComplete="new-password" textContentType="newPassword" />
        <PasswordField label="Confirm password" value={confirm} onChangeText={setConfirm} autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
      </Card>
      {error ? <Text style={{ color: t.danger, marginBottom: 12, fontWeight: '600' }}>{error}</Text> : null}
      <Button label={busy ? 'Creating account…' : 'Create account'} onPress={submit} disabled={busy} />
      <Button variant="secondary" label="I already have an account" onPress={() => router.back()} style={{ marginTop: 12 }} />
    </Screen>
  );
}
