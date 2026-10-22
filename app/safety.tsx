import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, PlusLock, Screen, SectionLabel, ToggleRow } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadSettings, saveSettings } from '../src/storage';
import { followingIds, profiles, Profile } from '../src/friends';
import { clearLive } from '../src/live';
import { usePlus } from '../src/plus';
import { Settings } from '../src/types';

const MAX = 5;

/** Live tracking (Pacely Plus): choose who can see where you are while you run. */
export default function SafetyScreen() {
  const t = useTheme();
  const router = useRouter();
  const plus = usePlus();
  const [s, setS] = useState<Settings | null>(null);
  const [people, setPeople] = useState<Profile[] | null>(null);

  useFocusEffect(useCallback(() => {
    loadSettings().then(setS);
    followingIds().then(profiles).then(setPeople).catch(() => setPeople([]));
  }, []));
  if (!s) return <Screen inset={false}>{null}</Screen>;
  if (!plus) {
    return (
      <Screen inset={false}>
        <PlusLock title="Live tracking for safety" text="Let family or friends see where you are while you run, live on a map." onPress={() => router.push('/plus')} />
      </Screen>
    );
  }

  const save = async (patch: Partial<Settings>) => { const next = { ...s, ...patch }; setS(next); await saveSettings(next); };
  const picked = (uid: string) => s.safetyContacts.some((c) => c.uid === uid);
  function toggle(p: Profile) {
    if (picked(p.uid)) save({ safetyContacts: s!.safetyContacts.filter((c) => c.uid !== p.uid) });
    else if (s!.safetyContacts.length < MAX) save({ safetyContacts: [...s!.safetyContacts, { uid: p.uid, name: p.name }] });
  }

  return (
    <Screen inset={false}>
      <Card>
        <ToggleRow
          label="Share my location during runs"
          hint="Your safety contacts can see where you are on a map, live, until you finish. Nobody else can."
          value={s.liveShare}
          onChange={async (liveShare) => { await save({ liveShare }); if (!liveShare) await clearLive(); }}
        />
      </Card>

      <SectionLabel>Safety contacts (up to {MAX})</SectionLabel>
      <Text style={{ color: t.muted, marginBottom: 10, lineHeight: 20 }}>
        Pick from people you follow. They need Pacely (it's free) and will see "Live now" in their Friends tab while you run.
      </Text>
      {people === null ? null : people.length === 0 ? (
        <Card>
          <Text style={{ color: t.muted, lineHeight: 20 }}>You're not following anyone yet. Ask your family to install Pacely, then follow them from the Friends screen.</Text>
        </Card>
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {people.map((p, i) => (
            <Pressable key={p.uid} onPress={() => toggle(p)} accessibilityRole="checkbox" accessibilityState={{ checked: picked(p.uid) }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
              <Ionicons name={picked(p.uid) ? 'checkbox' : 'square-outline'} size={22} color={picked(p.uid) ? t.accent : t.muted} />
              <Text style={{ flex: 1, color: t.text, fontSize: 16, fontWeight: '600' }}>{p.name}</Text>
            </Pressable>
          ))}
        </Card>
      )}
      {s.liveShare && !s.safetyContacts.length ? (
        <Text style={{ color: t.danger, marginTop: 4 }}>Choose at least one contact, or nobody will see your location.</Text>
      ) : null}
      <View style={{ height: 8 }} />
      <Text style={{ color: t.muted, fontSize: 13, lineHeight: 18 }}>
        Your position updates about every 20 seconds while a run is going (including when your phone is locked, in the full app). When you finish, your contacts see that the run has ended.
      </Text>
    </Screen>
  );
}
