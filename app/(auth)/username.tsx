import React from 'react';
import { AuthHeader, Button, Screen } from '../../src/ui';
import { UsernameForm } from '../../src/usernameForm';
import { signOut } from '../../src/auth';

export default function ChooseUsername() {
  return (
    <Screen>
      <AuthHeader title="Choose a username" sub="This is how other runners will see you on the leaderboards. You can change it later in Settings." />
      <UsernameForm submitLabel="Continue" />
      <Button variant="secondary" label="Sign out" onPress={() => signOut()} style={{ marginTop: 12 }} />
    </Screen>
  );
}
