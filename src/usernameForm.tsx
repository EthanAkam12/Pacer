import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Field } from './ui';
import { useTheme } from './theme';
import { authMessage, useAuth, USERNAME_RULE } from './auth';

/** Pick or change the account's username. Used after sign-up and from Settings. */
export function UsernameForm({ onDone, submitLabel }: { onDone?: () => void; submitLabel: string }) {
  const t = useTheme();
  const { username, setUsername } = useAuth();
  const [name, setName] = useState(username ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const n = name.trim();
    if (!USERNAME_RULE.test(n)) { setError('Use 3 to 20 letters, numbers, dots or underscores. No spaces.'); return; }
    setBusy(true); setError('');
    try { await setUsername(n); onDone?.(); }
    catch (e) { setError(authMessage(e)); }
    setBusy(false);
  }

  return (
    <>
      <Card>
        <Field
          label="Username"
          hint="3 to 20 letters, numbers, dots or underscores. Shown on the leaderboards."
          value={name}
          onChangeText={(v) => { setName(v.replace(/\s/g, '')); setError(''); }}
          placeholder="e.g. ethan_runs"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          onSubmitEditing={submit}
        />
      </Card>
      {error ? <Text style={{ color: t.danger, marginBottom: 12, fontWeight: '600' }}>{error}</Text> : null}
      <Button label={busy ? 'Checking…' : submitLabel} onPress={submit} disabled={busy || !name.trim()} />
    </>
  );
}
