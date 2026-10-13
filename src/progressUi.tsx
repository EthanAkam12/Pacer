import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './theme';
import { Button, Card } from './ui';
import { WeekStats } from './progress';
import { PlanSession, TrainingPlan } from './plans';

/** A ring that fills as this week's distance approaches the goal. */
export function GoalRing({ value, size = 76, stroke = 9, color, track }: { value: number; size?: number; stroke?: number; color: string; track: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - Math.min(1, value))} rotation={-90} origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

export function WeekGoalCard({ w, onEdit }: { w: WeekStats; onEdit?: () => void }) {
  const t = useTheme();
  const pct = w.goal ? w.km / w.goal : 0;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <GoalRing value={pct} color={t.accent} track={t.chip} />
          <Text style={{ position: 'absolute', color: t.text, fontWeight: '800', fontSize: 15 }}>{Math.min(999, Math.round(pct * 100))}%</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.muted, fontWeight: '600' }}>This week</Text>
          <Text style={{ color: t.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{w.km.toFixed(1)} <Text style={{ color: t.muted, fontSize: 16, fontWeight: '600' }}>of {w.goal} km</Text></Text>
          <Text style={{ color: t.muted, marginTop: 2 }}>
            {w.hitThisWeek ? 'Goal smashed this week!' : `${(w.goal - w.km).toFixed(1)} km to go · ${w.runs} ${w.runs === 1 ? 'run' : 'runs'} so far`}
          </Text>
        </View>
        <Pressable onPress={onEdit} disabled={!onEdit} style={{ alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="Weekly goal streak">
          <Ionicons name="flame" size={26} color={w.streak ? t.accent : t.muted} />
          <Text style={{ color: t.text, fontWeight: '800' }}>{w.streak}</Text>
          <Text style={{ color: t.muted, fontSize: 11 }}>{w.streak === 1 ? 'week' : 'weeks'}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

/** "Today's session" from the active training plan, with a button to start it. */
export function PlanSessionCard({ plan, next, doneCount, onStart, onOpen, starting }: {
  plan: TrainingPlan; next: PlanSession | null; doneCount: number; onStart: () => void; onOpen: () => void; starting: boolean;
}) {
  const t = useTheme();
  const total = plan.sessions.length;
  return (
    <Card style={{ borderColor: t.accent, borderWidth: 1.5 }}>
      <Pressable onPress={onOpen} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Ionicons name="school" size={18} color={t.accent} />
        <Text style={{ flex: 1, marginLeft: 6, color: t.accent, fontWeight: '800' }}>{plan.name}</Text>
        <Text style={{ color: t.muted, fontWeight: '600' }}>{doneCount}/{total}</Text>
        <Ionicons name="chevron-forward" size={16} color={t.muted} />
      </Pressable>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: t.chip, overflow: 'hidden', marginBottom: 12 }}>
        <View style={{ width: `${(doneCount / total) * 100}%`, height: '100%', backgroundColor: t.accent }} />
      </View>
      {next ? (
        <>
          <Text style={{ color: t.muted, fontWeight: '600' }}>Next session · {next.title}</Text>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '800', marginTop: 2, lineHeight: 24 }}>{next.summary}</Text>
          <Button label={starting ? 'Starting…' : 'Start this session'} onPress={onStart} disabled={starting} style={{ marginTop: 12 }} />
        </>
      ) : (
        <Text style={{ color: t.text, fontSize: 17, fontWeight: '800' }}>Plan complete! Amazing work. 🎉</Text>
      )}
    </Card>
  );
}
