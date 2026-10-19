/**
 * Coarse location for local leaderboards. A 4-character geohash is a box about 40 × 20 km, so it
 * says roughly which town you run in and nothing more precise.
 */
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function geohash(lat: number, lon: number, precision = 4): string {
  let latR = [-90, 90], lonR = [-180, 180], hash = '', bit = 0, ch = 0, even = true;
  while (hash.length < precision) {
    const r = even ? lonR : latR, v = even ? lon : lat, mid = (r[0] + r[1]) / 2;
    if (v >= mid) { ch = (ch << 1) | 1; r[0] = mid; } else { ch <<= 1; r[1] = mid; }
    even = !even;
    if (++bit === 5) { hash += BASE32[ch]; bit = 0; ch = 0; }
  }
  return hash;
}

/** Town or area name for a point, from the phone's geocoder ("" if unavailable). */
export async function placeName(lat: number, lon: number): Promise<string> {
  try {
    const Location = require('expo-location') as typeof import('expo-location');
    const [p] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    return (p?.city || p?.subregion || p?.district || p?.region || '').slice(0, 40);
  } catch { return ''; }
}
