import React, { useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthHeader, Button, Card, Field, Screen } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { authMessage, resetPassword } from '../../src/auth';

export default function Forgot() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError('');
    try { await resetPassword(email); setSent(true); }
    catch (e) { setError(authMessage(e)); }
    setBusy(false);
  }

  return (
    <Screen>
      <AuthHeader title="Reset your password" sub={sent ? `If there's an account for ${email.trim()}, we've emailed it a link to choose a new password.` : "Enter your email and we'll send you a link to choose a new password."} />
      {sent ? (
        <Button label="Back to sign in" onPress={() => router.back()} />
      ) : (
        <>
          <Card>
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" onSubmitEditing={submit} />
          </Card>
          {error ? <Text style={{ color: t.danger, marginBottom: 12, fontWeight: '600' }}>{error}</Text> : null}
          <Button label={busy ? 'Sending…' : 'Send reset link'} onPress={submit} disabled={busy} />
          <Button variant="secondary" label="Back to sign in" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </>
      )}
    </Screen>
  );
}
