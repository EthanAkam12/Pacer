import React, { useEffect, useState } from 'react';
import { AppState, Text } from 'react-native';
import { AuthHeader, Button, Card, Screen } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { authMessage, resendVerification, signOut, useAuth } from '../../src/auth';

const RESEND_WAIT = 60;

export default function Verify() {
  const t = useTheme();
  const { user, refresh } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [wait, setWait] = useState(RESEND_WAIT);

  // Checks automatically every few seconds, and as soon as the person comes back from their email app.
  useEffect(() => {
    const check = () => { refresh().catch(() => {}); };
    const poll = setInterval(check, 4000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => { clearInterval(poll); sub.remove(); };
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function checkNow() {
    setError(''); setMessage('');
    try {
      if (!(await refresh())) setError("Not verified yet. Tap the link in the email, then try again.");
    } catch (e) { setError(authMessage(e)); }
  }

  async function resend() {
    setError(''); setMessage('');
    try { await resendVerification(); setMessage('Sent! Check your inbox.'); setWait(RESEND_WAIT); }
    catch (e) { setError(authMessage(e)); }
  }

  return (
    <Screen>
      <AuthHeader title="Check your email" sub={`We sent a link to ${user?.email ?? 'your email'}. Tap it to verify your account, then come back here.`} />
      <Card>
        <Text style={{ color: t.muted, lineHeight: 21 }}>
          Can't find it? Look in your spam or junk folder. The email comes from noreply@ and has "Verify your email" in the subject.
        </Text>
      </Card>
      {message ? <Text style={{ color: t.walk, marginBottom: 12, fontWeight: '600' }}>{message}</Text> : null}
      {error ? <Text style={{ color: t.danger, marginBottom: 12, fontWeight: '600' }}>{error}</Text> : null}
      <Button label="I've verified my email" onPress={checkNow} />
      <Button variant="secondary" label={wait > 0 ? `Send the email again (${wait}s)` : 'Send the email again'} onPress={resend} disabled={wait > 0} style={{ marginTop: 12 }} />
      <Button variant="secondary" label="Use a different email" onPress={() => signOut()} style={{ marginTop: 12 }} />
    </Screen>
  );
}
