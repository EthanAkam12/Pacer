import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field, Screen, SectionLabel } from '../src/ui';
import { useTheme } from '../src/theme';
import { loadRuns, loadSettings, loadShoes, saveSettings, saveShoes } from '../src/storage';
import { shoeKm } from '../src/gear';
import { uid } from '../src/format';
import { RunRecord, Settings, Shoe } from '../src/types';

/** Shoe tracker: km on each pair, which pair new runs use, and when to replace them. */
export default function ShoesScreen() {
  const t = useTheme();
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [s, setS] = useState<Settings | null>(null);
  const [name, setName] = useState('');
  const [startKm, setStartKm] = useState('');
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    Promise.all([loadShoes(), loadRuns(), loadSettings()]).then(([sh, r, st]) => { setShoes(sh); setRuns(r); setS(st); });
  }, []));
  if (!s) return <Screen inset={false}>{null}</Screen>;

  const store = async (list: Shoe[]) => { setShoes(list); await saveShoes(list); };
  const chooseShoe = async (id: string | null) => { const next = { ...s!, shoeId: id }; setS(next); await saveSettings(next); };

  async function add() {
    const n = name.trim();
    const km = startKm.trim() ? parseFloat(startKm.replace(',', '.')) : 0;
    if (!n) { setError('Give your shoes a name, like "Blue Pegasus".'); return; }
    if (!(km >= 0 && km < 5000)) { setError('Enter the km they\'ve already done, or leave it empty.'); return; }
    const shoe: Shoe = { id: uid(), name: n.slice(0, 30), startKm: km, limitKm: 700, addedAt: new Date().toISOString() };
    await store([...shoes, shoe]);
    if (!s!.shoeId) await chooseShoe(shoe.id);
    setName(''); setStartKm(''); setError('');
  }

  function manage(shoe: Shoe) {
    Alert.alert(shoe.name, undefined, [
      ...(shoe.retired ? [] : [{ text: 'Use for new runs', onPress: () => chooseShoe(shoe.id) }]),
      { text: shoe.retired ? 'Bring back' : 'Retire', onPress: async () => {
        await store(shoes.map((x) => (x.id === shoe.id ? { ...x, retired: !x.retired } : x)));
        if (!shoe.retired && s!.shoeId === shoe.id) await chooseShoe(null);
      } },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await store(shoes.filter((x) => x.id !== shoe.id));
        if (s!.shoeId === shoe.id) await chooseShoe(null);
      } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const active = shoes.filter((x) => !x.retired), retired = shoes.filter((x) => x.retired);
  const row = (shoe: Shoe) => {
    const km = shoeKm(shoe, runs), pct = Math.min(1, km / shoe.limitKm), worn = km >= shoe.limitKm;
    const using = s.shoeId === shoe.id;
    return (
      <Pressable key={shoe.id} onPress={() => manage(shoe)} accessibilityRole="button">
        <Card style={using ? { borderColor: t.accent, borderWidth: 1.5 } : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="footsteps" size={20} color={shoe.retired ? t.muted : t.accent} />
            <Text style={{ flex: 1, color: t.text, fontWeight: '800', fontSize: 16 }}>{shoe.name}</Text>
            {using ? <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>Using</Text> : null}
          </View>
          <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', marginTop: 6, fontVariant: ['tabular-nums'] }}>
            {km.toFixed(0)} <Text style={{ color: t.muted, fontSize: 15, fontWeight: '600' }}>of about {shoe.limitKm} km</Text>
          </Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.chip, overflow: 'hidden', marginTop: 8 }}>
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: worn ? t.danger : t.accent }} />
          </View>
          {worn && !shoe.retired ? (
            <Text style={{ color: t.danger, marginTop: 8, fontWeight: '600' }}>Time for new shoes: worn-out cushioning makes injuries more likely.</Text>
          ) : null}
        </Card>
      </Pressable>
    );
  };

  return (
    <Screen inset={false}>
      <Text style={{ color: t.muted, marginBottom: 12, lineHeight: 20 }}>
        Running shoes last about 600–800 km. Pacer adds up every run in each pair. Tap a pair to use it, retire it or delete it.
      </Text>
      {active.map(row)}
      {!active.length ? <Card><Text style={{ color: t.muted }}>No shoes yet. Add your first pair below.</Text></Card> : null}

      <SectionLabel>Add a pair</SectionLabel>
      <Card>
        <Field label="Name" placeholder="Blue Pegasus" value={name} onChangeText={setName} />
        <Field label="km already run in them (optional)" placeholder="0" value={startKm} onChangeText={setStartKm} keyboardType="decimal-pad" />
        {error ? <Text style={{ color: t.danger, marginBottom: 8 }}>{error}</Text> : null}
        <Button label="Add shoes" onPress={add} />
      </Card>

      {retired.length ? (<><SectionLabel>Retired</SectionLabel>{retired.map(row)}</>) : null}
    </Screen>
  );
}
