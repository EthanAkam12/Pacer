import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Card, Chip, Field, Screen, SectionLabel } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadRace, saveRace } from '../src/storage';
import { RACE_DISTANCES, daysUntil, parseDate, showDate } from '../src/gear';
import { Race } from '../src/types';

/** Set the race you're aiming for. The Run tab counts down to it. */
export default function RaceScreen() {
  const t = useTheme();
  const router = useRouter();
  const [race, setRace] = useState<Race | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [km, setKm] = useState('5');
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    loadRace().then((r) => {
      setRace(r);
      if (r) { setName(r.name); setDate(showDate(r.date)); setKm(String(r.km)); }
    });
  }, []));
  if (race === undefined) return <Screen inset={false}>{null}</Screen>;

  async function save() {
    const iso = parseDate(date);
    const dist = parseFloat(km.replace(',', '.'));
    if (!name.trim()) { setError('Give the race a name, like "Hackney Half".'); return; }
    if (!iso) { setError('Write the date as day/month/year, for example 12/04/2027.'); return; }
    const r: Race = { name: name.trim().slice(0, 40), date: iso, km: dist };
    if (daysUntil(r) < 0) { setError('That date has already gone. Pick a date in the future.'); return; }
    if (!(dist > 0 && dist <= 200)) { setError('Choose a distance.'); return; }
    await saveRace(r);
    router.back();
  }
  async function remove() { await saveRace(null); router.back(); }

  return (
    <Screen inset={false}>
      <Text style={{ color: t.muted, marginBottom: 12, lineHeight: 20 }}>
        Got a race coming up? Pacely counts down to it on the Run tab and checks your training plan finishes in time.
      </Text>
      <Card>
        <Field label="Race name" placeholder="Hackney Half" value={name} onChangeText={setName} />
        <Field label="Date (day/month/year)" placeholder="12/04/2027" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />
        <SectionLabel>Distance</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {RACE_DISTANCES.map((d) => (
            <Chip key={d.label} small label={d.label} active={Math.abs(parseFloat(km) - d.km) < 0.01} onPress={() => setKm(String(d.km))} />
          ))}
        </View>
        {error ? <Text style={{ color: t.danger, marginBottom: 8 }}>{error}</Text> : null}
        <Button label="Save race" onPress={save} />
      </Card>
      {race ? <Button variant="danger" label="Remove this race" onPress={remove} /> : null}
    </Screen>
  );
}
