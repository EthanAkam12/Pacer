import { useEffect, useState } from 'react';
import { session } from './session';
import { hrStore, HrState } from './heartRate';
import { LiveSnapshot } from './types';

export function useRunSnapshot(): LiveSnapshot {
  const [s, setS] = useState<LiveSnapshot>(() => session.snapshot());
  useEffect(() => session.subscribe(setS), []);
  return s;
}

export function useHr(): HrState {
  const [s, setS] = useState<HrState>(() => hrStore.get());
  useEffect(() => hrStore.subscribe(setS), []);
  return s;
}
