import { useEffect, useState } from 'react';
import { onDataChanged } from './storage';
import { session } from './session';
import { hrStore, HrState } from './heartRate';
import { LiveSnapshot } from './types';

export function useRunSnapshot(): LiveSnapshot {
  const [s, setS] = useState<LiveSnapshot>(() => session.snapshot());
  useEffect(() => session.subscribe(setS), []);
  return s;
}

/** Bumps whenever runs, workouts or plan progress arrive from the cloud; add it to a screen's reload effect. */
export function useDataVersion() {
  const [v, setV] = useState(0);
  useEffect(() => onDataChanged(() => setV((n) => n + 1)), []);
  return v;
}

export function useHr(): HrState {
  const [s, setS] = useState<HrState>(() => hrStore.get());
  useEffect(() => hrStore.subscribe(setS), []);
  return s;
}
