import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field, Screen, SectionLabel, Segmented, StepStrip, ToggleRow } from '../../src/ui';
import { useTheme } from '../../src/theme';
import { deleteWorkout, loadWorkouts, saveWorkout } from '../../src/storage';
import { IntervalStep, StepKind, StepMeasure, Workout } from '../../src/types';
import { fmtTime, parseDuration, uid } from '../../src/format';
import { estimateMinutes } from '../../src/intervals';

type Draft = { kind: StepKind; measure: StepMeasure; text: string };

const toDraft = (s: IntervalStep): Draft => ({ kind: s.kind, measure: s.measure, text: s.measure === 'time' ? fmtTime(s.value) : String(s.value) });

function fromDraft(d: Draft): IntervalStep | null {
  const v = d.measure === 'time' ? parseDuration(d.text) : parseInt(d.text, 10);
  if (!v || !isFinite(v) || v <= 0) return null;
  if (d.measure === 'distance' && (v < 20 || v > 50000)) return null;
  if (d.measure === 'time' && v > 6 * 3600) return null;
  return { kind: d.kind, measure: d.measure, value: v };
}

export default function EditWorkout() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [loaded, setLoaded] = useState(!id);
  const [name, setName] = useState('My workout');
  const [warm, setWarm] = useState<Draft | null>({ kind: 'walk', measure: 'time', text: '5:00' });
  const [block, setBlock] = useState<Draft[]>([
    { kind: 'run', measure: 'time', text: '1:00' },
    { kind: 'walk', measure: 'time', text: '1:30' },
  ]);
  const [repeats, setRepeats] = useState(6);
  const [cool, setCool] = useState<Draft | null>({ kind: 'walk', measure: 'time', text: '5:00' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    loadWorkouts().then((list) => {
      const w = list.find((x) => x.id === id);
      if (w) {
        setName(w.name);
        setWarm(w.warmup ? toDraft(w.warmup) : null);
        setBlock(w.block.map(toDraft));
        setRepeats(w.repeats);
        setCool(w.cooldown ? toDraft(w.cooldown) : null);
      }
      setLoaded(true);
    });
  }, [id]);

  if (!loaded) return <Screen inset={false}>{null}</Screen>;

  const build = (): Workout | string => {
    if (!name.trim()) return 'Give the workout a name.';
    if (!block.length) return 'Add at least one step.';
    const steps = block.map(fromDraft);
    if (steps.some((s) => !s)) return 'Check each step. Times look like 1:30, distances are in metres.';
    const w = warm ? fromDraft(warm) : null;
    const c = cool ? fromDraft(cool) : null;
    if ((warm && !w) || (cool && !c)) return 'Check the warm-up and cool-down lengths.';
    return { id: id ?? uid(), name: name.trim(), warmup: w, block: steps as IntervalStep[], repeats, cooldown: c };
  };
  const preview = build();

  async function save() {
    const w = build();
    if (typeof w === 'string') { setError(w); return; }
    await saveWorkout(w);
    router.back();
  }

  function remove() {
    if (!id) return;
    Alert.alert('Delete this workout?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteWorkout(id); router.back(); } },
    ]);
  }

  const setStep = (i: number, d: Draft) => setBlock((b) => b.map((x, j) => (j === i ? d : x)));

  return (
    <Screen inset={false}>
      <Field label="Workout name" value={name} onChangeText={setName} />

      {typeof preview !== 'string' ? (
        <Card>
          <Text style={{ fontWeight: '700', color: t.text }}>Preview, about {estimateMinutes(preview)} minutes</Text>
          <StepStrip workout={preview} height={14} />
        </Card>
      ) : null}

      <Card>
        <ToggleRow label="Warm-up" value={!!warm} onChange={(on) => setWarm(on ? { kind: 'walk', measure: 'time', text: '5:00' } : null)} />
        {warm ? <StepFields value={warm} onChange={setWarm} /> : null}
      </Card>

      <SectionLabel>Main set, repeated</SectionLabel>
      {block.map((d, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ flex: 1, fontWeight: '700', fontSize: 16, color: t.text }}>Step {i + 1}</Text>
            {block.length > 1 ? (
              <Pressable onPress={() => setBlock((b) => b.filter((_, j) => j !== i))} hitSlop={12} accessibilityLabel={`Remove step ${i + 1}`}>
                <Ionicons name="trash-outline" size={20} color={t.muted} />
              </Pressable>
            ) : null}
          </View>
          <StepFields value={d} onChange={(nd) => setStep(i, nd)} />
        </Card>
      ))}
      <Button small variant="secondary" label="Add a step" onPress={() => setBlock((b) => [...b, { kind: 'walk', measure: 'time', text: '1:00' }])} style={{ alignSelf: 'flex-start', marginBottom: 16 }} />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontWeight: '600', fontSize: 16, color: t.text }}>Repeat the main set</Text>
          <Pressable onPress={() => setRepeats((r) => Math.max(1, r - 1))} hitSlop={10} accessibilityLabel="Fewer repeats">
            <Ionicons name="remove-circle-outline" size={30} color={t.accent} />
          </Pressable>
          <Text style={{ width: 54, textAlign: 'center', fontSize: 22, fontWeight: '800', color: t.text }}>{repeats}×</Text>
          <Pressable onPress={() => setRepeats((r) => Math.min(50, r + 1))} hitSlop={10} accessibilityLabel="More repeats">
            <Ionicons name="add-circle-outline" size={30} color={t.accent} />
          </Pressable>
        </View>
      </Card>

      <Card>
        <ToggleRow label="Cool-down" value={!!cool} onChange={(on) => setCool(on ? { kind: 'walk', measure: 'time', text: '5:00' } : null)} />
        {cool ? <StepFields value={cool} onChange={setCool} /> : null}
      </Card>

      {error ? <Text style={{ color: t.danger, fontWeight: '600', marginBottom: 12 }}>{error}</Text> : null}
      <Button label="Save workout" onPress={save} />
      {id ? <Button variant="danger" label="Delete workout" onPress={remove} style={{ marginTop: 12 }} /> : null}
    </Screen>
  );
}

function StepFields({ value, onChange }: { value: Draft; onChange: (d: Draft) => void }) {
  return (
    <View>
      <Segmented<StepKind>
        options={[{ label: 'Run', value: 'run' }, { label: 'Walk', value: 'walk' }, { label: 'Rest', value: 'rest' }]}
        value={value.kind}
        onChange={(kind) => onChange({ ...value, kind })}
      />
      <Segmented<StepMeasure>
        options={[{ label: 'By time', value: 'time' }, { label: 'By distance', value: 'distance' }]}
        value={value.measure}
        onChange={(measure) => onChange({ ...value, measure, text: measure === 'time' ? '1:00' : '400' })}
      />
      <Field
        label={value.measure === 'time' ? 'How long (minutes:seconds)' : 'How far (metres)'}
        value={value.text}
        onChangeText={(text) => onChange({ ...value, text })}
        keyboardType={value.measure === 'time' ? 'numbers-and-punctuation' : 'number-pad'}
      />
    </View>
  );
}
