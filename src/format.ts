export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 337 -> "5:37" (min/km). Returns a dash for unknown values. */
export function fmtPace(spk: number): string {
  if (!isFinite(spk) || spk <= 0 || spk > 1800) return '–:––';
  const t = Math.round(spk);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** 3725 -> "1:02:05", 90 -> "1:30" */
export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

export const fmtKm = (m: number) => (m / 1000).toFixed(2);

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}`;
}

/** "12 Oct" */
export const fmtShortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** "6:00" -> 360, "6" -> 360 (minutes). Used for both pace and durations. */
export function parseDuration(str: string): number | null {
  const m = str.trim().match(/^(\d{1,3})(?::(\d{1,2}))?$/);
  if (!m) return null;
  const sec = m[2] !== undefined ? Number(m[1]) * 60 + Number(m[2]) : Number(m[1]) * 60;
  return sec > 0 ? sec : null;
}
export const parsePace = parseDuration;

/** "25:30" or "1:52:00" → seconds; null if it isn't a time. */
export function parseClock(text: string): number | null {
  const parts = text.trim().split(':').map((x) => x.trim());
  if (parts.length < 2 || parts.length > 3 || parts.some((x) => !/^\d{1,2}$/.test(x))) return null;
  const [a, b, c] = parts.map(Number);
  const s = parts.length === 3 ? a * 3600 + b * 60 + c : a * 60 + b;
  return s > 0 ? s : null;
}

// ----- spoken forms -----
/** Said the way runners say it: 330 -> "5 30 per kilometre", 305 -> "5 oh 5 per kilometre". */
export function sayPace(spk: number): string {
  const t = Math.round(spk), m = Math.floor(t / 60), s = t % 60;
  if (!s) return `${m} minute${m === 1 ? '' : 's'} per kilometre`;
  return `${m} ${s < 10 ? `oh ${s}` : s} per kilometre`;
}
export function sayTime(sec: number): string {
  const t = Math.round(sec), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const out: string[] = [];
  if (h) out.push(`${h} hour${h > 1 ? 's' : ''}`);
  if (m) out.push(`${m} minute${m > 1 ? 's' : ''}`);
  if (s || !out.length) out.push(`${s} second${s === 1 ? '' : 's'}`);
  return out.join(' ');
}
export function sayDist(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} metres`;
  const k = Math.round(m / 100) / 10;
  return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)} kilometre${k === 1 ? '' : 's'}`;
}

export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000, r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
