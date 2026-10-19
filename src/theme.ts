import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { StepKind } from './types';

/**
 * Colour themes. Each has a dark background and accent for dark mode, a light background and a
 * deeper accent for light mode (so it stays readable on white), and a second colour for walk steps.
 * Everything else (cards, lines, muted text) is mixed from those.
 */
export interface ThemeDef {
  id: string;
  name: string;
  dark: { bg: string; accent: string; walk: string };
  light: { bg: string; accent: string; walk: string };
  /** Pacely Plus bonus theme. */
  plus?: boolean;
}

export const THEMES: ThemeDef[] = [
  { id: 'ocean', name: 'Ocean & teal', dark: { bg: '#062A30', accent: '#2DD4BF', walk: '#7DD3FC' }, light: { bg: '#EEF6F6', accent: '#0D7F75', walk: '#0369A1' } },
  { id: 'midnight', name: 'Midnight & coral', dark: { bg: '#0B1220', accent: '#FF6B4A', walk: '#5EEAD4' }, light: { bg: '#F4F5F9', accent: '#D9431F', walk: '#0F766E' } },
  { id: 'lime', name: 'Black & lime', dark: { bg: '#0A0A0A', accent: '#C6FF3D', walk: '#7DD3FC' }, light: { bg: '#F4F5F2', accent: '#3F6212', walk: '#0369A1' } },
  { id: 'violet', name: 'Graphite & violet', dark: { bg: '#16151D', accent: '#A78BFA', walk: '#5EEAD4' }, light: { bg: '#F5F4F8', accent: '#6D28D9', walk: '#0F766E' } },
  { id: 'forest', name: 'Forest & amber', dark: { bg: '#0D1F16', accent: '#F59E0B', walk: '#86EFAC' }, light: { bg: '#F2F6F1', accent: '#B45309', walk: '#15803D' } },
  { id: 'wine', name: 'Wine & rose', dark: { bg: '#1E0F17', accent: '#FB7185', walk: '#5EEAD4' }, light: { bg: '#FAF3F5', accent: '#BE123C', walk: '#0F766E' } },
  { id: 'slate', name: 'Slate & sky', dark: { bg: '#0F172A', accent: '#38BDF8', walk: '#86EFAC' }, light: { bg: '#F1F5F9', accent: '#0369A1', walk: '#15803D' } },
  { id: 'mocha', name: 'Mocha & peach', dark: { bg: '#1C1512', accent: '#FDBA74', walk: '#7DD3FC' }, light: { bg: '#F8F4F1', accent: '#C2410C', walk: '#0369A1' } },
  { id: 'aurora', name: 'Aurora', plus: true, dark: { bg: '#071A24', accent: '#4ADE80', walk: '#C4B5FD' }, light: { bg: '#EFF7F3', accent: '#15803D', walk: '#6D28D9' } },
  { id: 'sunset', name: 'Sunset', plus: true, dark: { bg: '#1F1030', accent: '#FB923C', walk: '#F472B6' }, light: { bg: '#FAF4F0', accent: '#C2410C', walk: '#BE185D' } },
  { id: 'gold', name: 'Black & gold', plus: true, dark: { bg: '#0C0B08', accent: '#FACC15', walk: '#93C5FD' }, light: { bg: '#F7F5EE', accent: '#A16207', walk: '#1D4ED8' } },
  { id: 'glacier', name: 'Glacier', plus: true, dark: { bg: '#0A1A2F', accent: '#A5F3FC', walk: '#FDE68A' }, light: { bg: '#F0F7FA', accent: '#0E7490', walk: '#B45309' } },
];
export const DEFAULT_THEME = 'ocean';
export type Appearance = 'system' | 'light' | 'dark';

// ----- colour maths -----
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
/** Mixes `b` into `a` by `t` (0 = all a, 1 = all b). */
export const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const alpha = (h: string, a: number) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };

function build(def: ThemeDef, dark: boolean) {
  if (dark) {
    const { bg, accent, walk } = def.dark;
    return {
      dark: true, bg, card: mix(bg, '#FFFFFF', 0.06), chip: mix(bg, '#FFFFFF', 0.11), line: mix(bg, '#FFFFFF', 0.15),
      text: '#F4F7F8', muted: mix(bg, '#FFFFFF', 0.6), accent, onAccent: lum(accent) > 0.3 ? bg : '#FFFFFF',
      soft: alpha(accent, 0.18), danger: '#FF7A7F', walk, rest: mix(bg, '#FFFFFF', 0.5), heart: '#FF6B70',
      run: { bg: mix(bg, '#000000', 0.15), top: mix(bg, '#FFFFFF', 0.05), panel: 'rgba(255,255,255,0.07)', warn: '#FF8A7A' },
    };
  }
  const { bg, accent, walk } = def.light;
  const ink = mix(def.dark.bg, '#000000', 0.2);
  return {
    dark: false, bg, card: '#FFFFFF', chip: mix(bg, ink, 0.07), line: mix(bg, ink, 0.12),
    text: ink, muted: mix(ink, '#FFFFFF', 0.42), accent, onAccent: '#FFFFFF',
    soft: alpha(accent, 0.14), danger: '#C62E35', walk, rest: mix(ink, '#FFFFFF', 0.5), heart: '#D93A40',
    run: { bg, top: mix(bg, accent, 0.06), panel: alpha(ink, 0.05), warn: '#C62E35' },
  };
}
export type Theme = ReturnType<typeof build>;

// ----- the chosen theme, shared app-wide -----
let prefs: { themeId: string; appearance: Appearance } = { themeId: DEFAULT_THEME, appearance: 'system' };
const listeners = new Set<() => void>();
const cache = new Map<string, Theme>();

export function setThemePrefs(p: Partial<typeof prefs>) {
  prefs = { ...prefs, ...p };
  listeners.forEach((l) => l());
}
export const themePrefs = () => prefs;

export function useThemePrefs() {
  const [, force] = useState(0);
  useEffect(() => { const l = () => force((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return prefs;
}

export function useTheme(): Theme {
  const system = useColorScheme();
  const p = useThemePrefs();
  const dark = p.appearance === 'system' ? system === 'dark' : p.appearance === 'dark';
  const key = `${p.themeId}-${dark}`;
  if (!cache.has(key)) cache.set(key, build(THEMES.find((x) => x.id === p.themeId) ?? THEMES[0], dark));
  return cache.get(key)!;
}

/** Preview colours for a theme swatch in Settings. */
export const swatch = (id: string, dark: boolean) => build(THEMES.find((x) => x.id === id) ?? THEMES[0], dark);

export const kindColor = (t: Theme, k: StepKind) => (k === 'run' ? t.accent : k === 'walk' ? t.walk : t.rest);
