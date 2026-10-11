import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthHeader, Button, Card, Field, PasswordField, Screen } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { authMessage, signIn } from '../../src/auth';

export default function SignIn() {
  const t = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true); setError('');
    try { await signIn(email, password); } // the app moves on by itself once signed in
    catch (e) { setError(authMessage(e)); }
    setBusy(false);
  }

  return (
    <Screen>
      <AuthHeader title="Welcome to Pacer" sub="Sign in to your account to start running with your coach." />
      <Card>
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
        <PasswordField label="Password" value={password} onChangeText={setPassword} autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
        <Pressable onPress={() => router.push({ pathname: '/forgot', params: { email } })} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
          <Text style={{ color: t.accent, fontWeight: '700' }}>Forgot your password?</Text>
        </Pressable>
      </Card>
      {error ? <Text style={{ color: t.danger, marginBottom: 12, fontWeight: '600' }}>{error}</Text> : null}
      <Button label={busy ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={busy} />
      <Text style={{ color: t.muted, textAlign: 'center', marginTop: 24, marginBottom: 8 }}>New to Pacer?</Text>
      <Button variant="secondary" label="Create an account" onPress={() => router.push('/sign-up')} />
    </Screen>
  );
}
