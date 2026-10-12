import React from 'react';
import { Image, Pressable, ScrollView, StyleProp, StyleSheet, Switch, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { kindColor, useTheme } from './theme';
import { Workout } from './types';
import { estimateSeconds, expandWorkout } from './intervals';

export function Screen({ children, inset = true }: { children: React.ReactNode; inset?: boolean }) {
  const t = useTheme();
  return (
    <SafeAreaView edges={inset ? ['top'] : []} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 8, marginBottom: 20 }}>
      <Text style={{ fontSize: 34, fontWeight: '800', color: t.text, letterSpacing: -0.6 }}>{children}</Text>
      {sub ? <Text style={{ fontSize: 16, color: t.muted, marginTop: 4, lineHeight: 22 }}>{sub}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: t.card, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: t.line }, style]}>
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={{ fontSize: 15, fontWeight: '600', color: t.muted, marginBottom: 8 }}>{children}</Text>;
}

export function Segmented<T extends string | number>({ options, value, onChange }: {
  options: { label: string; value: T }[]; value: T; onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.chip, borderRadius: 12, padding: 3, marginBottom: 12 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: active ? t.card : 'transparent' }}
          >
            <Text style={{ fontWeight: '600', fontSize: 15, color: active ? t.text : t.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress, small }: { label: string; active: boolean; onPress: () => void; small?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{ paddingHorizontal: small ? 12 : 16, paddingVertical: small ? 7 : 9, borderRadius: 999, backgroundColor: active ? t.accent : t.chip }}
    >
      <Text style={{ fontWeight: '700', fontSize: small ? 14 : 15, color: active ? t.onAccent : t.text }}>{label}</Text>
    </Pressable>
  );
}

export function Button({ label, onPress, variant = 'primary', disabled, small, style }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.accent : variant === 'secondary' ? t.chip : 'transparent';
  const fg = variant === 'primary' ? t.onAccent : variant === 'danger' ? t.danger : t.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [{
        backgroundColor: bg, borderRadius: small ? 999 : 16, alignItems: 'center', justifyContent: 'center',
        paddingVertical: small ? 8 : 16, paddingHorizontal: small ? 14 : 20,
        borderWidth: variant === 'danger' ? 1.5 : 0, borderColor: t.danger,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      }, style]}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 15 : 18 }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, style, ...props }: TextInputProps & { label: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontWeight: '600', color: t.text, marginBottom: 6 }}>{label}</Text>
      <TextInput
        placeholderTextColor={t.muted}
        style={[{ backgroundColor: t.bg, borderRadius: 12, borderWidth: 1, borderColor: t.line, paddingHorizontal: 12, paddingVertical: 11, fontSize: 17, color: t.text }, style]}
        {...props}
      />
      {hint ? <Text style={{ color: t.muted, fontSize: 13, marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );
}

export function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600', color: t.text, fontSize: 16 }}>{label}</Text>
        {hint ? <Text style={{ color: t.muted, fontSize: 13, marginTop: 2 }}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.accent, false: t.line }} />
    </View>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  const t = useTheme();
  return (
    <View style={{ width: '50%', paddingVertical: 10 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: t.text, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ color: t.muted, fontSize: 14 }}>{label}</Text>
    </View>
  );
}

/** A bar showing every step of a workout, sized by roughly how long it takes. */
export function StepStrip({ workout, height = 10 }: { workout: Workout; height?: number }) {
  const t = useTheme();
  const steps = expandWorkout(workout);
  if (!steps.length) return null;
  return (
    <View style={{ flexDirection: 'row', height, borderRadius: height / 2, overflow: 'hidden', gap: 2, marginVertical: 10 }}>
      {steps.map((s, i) => (
        <View key={i} style={{ flex: Math.max(estimateSeconds(s), 1), backgroundColor: kindColor(t, s.kind) }} />
      ))}
    </View>
  );
}

export function PasswordField({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const t = useTheme();
  const [show, setShow] = React.useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontWeight: '600', color: t.text, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg, borderRadius: 12, borderWidth: 1, borderColor: t.line }}>
        <TextInput
          placeholderTextColor={t.muted}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 11, fontSize: 17, color: t.text }}
          {...props}
        />
        <Pressable onPress={() => setShow(!show)} accessibilityRole="button" style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ color: t.accent, fontWeight: '700' }}>{show ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
      {hint ? <Text style={{ color: t.muted, fontSize: 13, marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );
}

/** Header for the sign-in screens: the app mark, a title and a line of explanation. */
export function AuthHeader({ title, sub }: { title: string; sub: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 24 }}>
      <Image source={require('../assets/images/icon.png')} style={{ width: 88, height: 88, borderRadius: 20, marginBottom: 16 }} />
      <Text style={{ fontSize: 30, fontWeight: '800', color: t.text, letterSpacing: -0.5, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontSize: 16, color: t.muted, marginTop: 6, lineHeight: 22, textAlign: 'center' }}>{sub}</Text>
    </View>
  );
}
