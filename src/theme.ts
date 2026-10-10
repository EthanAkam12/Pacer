import { useColorScheme } from 'react-native';
import { StepKind } from './types';

const light = {
  bg: '#F3F4F8', card: '#FFFFFF', text: '#0E1433', muted: '#5D667E', line: '#E1E4EE',
  chip: '#E9ECF6', accent: '#1B3BCF', onAccent: '#FFFFFF', danger: '#D2363C',
  walk: '#12875A', rest: '#7D869B', heart: '#E5484D',
};
const dark: typeof light = {
  bg: '#080C1F', card: '#131A36', text: '#F2F4FF', muted: '#9AA3C2', line: '#242C4E',
  chip: '#1C2447', accent: '#7089FF', onAccent: '#08102E', danger: '#FF6B70',
  walk: '#3DD39A', rest: '#8C95B3', heart: '#FF6B70',
};
export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const kindColor = (t: Theme, k: StepKind) => (k === 'run' ? t.accent : k === 'walk' ? t.walk : t.rest);

/** The live run screen is always on cobalt, so it has its own colours. */
export const runScreen = {
  bg: '#1B3BCF', bgDark: '#0F1F72', panel: 'rgba(0,0,0,0.18)', text: '#FFFFFF', muted: '#C3CEFF',
  volt: '#F4E83A', warn: '#FF9A8C', line: 'rgba(255,255,255,0.22)',
  kind: { run: '#F4E83A', walk: '#7EE2B8', rest: '#C3CEFF' } as Record<StepKind, string>,
};
