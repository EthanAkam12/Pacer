import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager, Device, Subscription } from 'react-native-ble-plx';

const HR_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

export interface HrState {
  bpm: number | null;
  at: number;
  deviceName: string | null;
  status: string;
  scanning: boolean;
  found: { id: string; name: string }[];
}

let state: HrState = { bpm: null, at: 0, deviceName: null, status: 'Optional. Works with Bluetooth chest straps.', scanning: false, found: [] };
const listeners = new Set<(s: HrState) => void>();
function set(patch: Partial<HrState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

export const hrStore = {
  get: () => state,
  subscribe(l: (s: HrState) => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  /** Latest reading, or null if nothing arrived in the last 10 seconds. */
  current: () => (state.bpm && Date.now() - state.at < 10000 ? state.bpm : null),
};

let manager: BleManager | null = null;
let device: Device | null = null;
let monitor: Subscription | null = null;
const seen = new Map<string, Device>();

function getManager(): BleManager | null {
  if (manager) return manager;
  try {
    // Loaded lazily so the app still opens in Expo Go, where Bluetooth isn't available.
    const { BleManager: Manager } = require('react-native-ble-plx');
    manager = new Manager() as BleManager;
    return manager;
  } catch {
    return null;
  }
}

async function androidPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const perms = (Platform.Version as number) >= 31
    ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const res = await PermissionsAndroid.requestMultiple(perms);
  return perms.every((p) => res[p] === PermissionsAndroid.RESULTS.GRANTED);
}

export async function scanForStraps() {
  const m = getManager();
  if (!m) { set({ status: 'Heart-rate straps need the full app build, not Expo Go.' }); return; }
  if (!(await androidPermissions())) { set({ status: 'Allow Bluetooth access to find your strap.' }); return; }
  seen.clear();
  set({ scanning: true, found: [], status: 'Searching. Put your strap on to wake it up.' });
  m.startDeviceScan([HR_SERVICE], null, (err, d) => {
    if (err) { set({ scanning: false, status: `Bluetooth error: ${err.message}. Check Bluetooth is on.` }); return; }
    if (d && !seen.has(d.id)) {
      seen.set(d.id, d);
      set({ found: [...state.found, { id: d.id, name: d.name || d.localName || 'Heart-rate strap' }] });
    }
  });
  setTimeout(() => {
    m.stopDeviceScan();
    if (state.scanning) {
      set({ scanning: false, status: state.found.length ? 'Choose your strap.' : 'No straps found. Check it is on and not connected to another app.' });
    }
  }, 10000);
}

export async function connectStrap(id: string) {
  const m = getManager();
  const d = seen.get(id);
  if (!m || !d) return;
  m.stopDeviceScan();
  set({ scanning: false, status: 'Connecting…' });
  try {
    device = await d.connect();
    await device.discoverAllServicesAndCharacteristics();
    monitor = device.monitorCharacteristicForService(HR_SERVICE, HR_MEASUREMENT, (err, ch) => {
      if (err || !ch?.value) return;
      const b = base64ToBytes(ch.value);
      const bpm = b[0] & 1 ? b[1] | (b[2] << 8) : b[1]; // flag bit 0 means a 16-bit value
      if (bpm > 0) set({ bpm, at: Date.now() });
    });
    device.onDisconnected(() => {
      monitor?.remove();
      monitor = null;
      device = null;
      set({ bpm: null, deviceName: null, status: 'Strap disconnected.' });
    });
    set({ deviceName: d.name || d.localName || 'Heart-rate strap', status: 'Connected', found: [] });
  } catch (e: any) {
    set({ status: `Couldn't connect: ${e?.message ?? 'unknown error'}` });
  }
}

export async function disconnectStrap() {
  try { await device?.cancelConnection(); } catch { /* ignore */ }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64ToBytes(s: string): number[] {
  const out: number[] = [];
  let buf = 0, bits = 0;
  for (const c of s) {
    if (c === '=') break;
    const v = B64.indexOf(c);
    if (v < 0) continue;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 0xff); buf &= (1 << bits) - 1; }
  }
  return out;
}
