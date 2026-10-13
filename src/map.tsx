import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useTheme } from './theme';

/**
 * A static map of a run: OpenStreetMap tiles (CARTO's free basemaps, light or dark to match the theme)
 * with the route drawn on top. Pure JavaScript, so it needs no map SDK or API key.
 */
type Pt = { lat: number; lon: number };
const TILE = 256;

/** Web Mercator: world pixel position of a point at zoom z. */
function project(p: Pt, z: number) {
  const scale = TILE * 2 ** z;
  const s = Math.sin((p.lat * Math.PI) / 180);
  return { x: ((p.lon + 180) / 360) * scale, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale };
}

export function RunMap({ route, height = 220 }: { route: Pt[]; height?: number }) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const pad = 28;

  let body: React.ReactNode = null;
  if (w > 0 && route.length > 1) {
    // The closest zoom where the whole route fits with some padding.
    let z = 17;
    for (; z > 2; z--) {
      const ps = route.map((p) => project(p, z));
      const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
      if (Math.max(...xs) - Math.min(...xs) <= w - 2 * pad && Math.max(...ys) - Math.min(...ys) <= height - 2 * pad) break;
    }
    const ps = route.map((p) => project(p, z));
    const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const left = cx - w / 2, top = cy - height / 2;
    const style = t.dark ? 'dark_all' : 'light_all';
    const n = 2 ** z;
    const tiles: React.ReactNode[] = [];
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + w) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
        if (ty < 0 || ty >= n) continue;
        const wx = ((tx % n) + n) % n;
        tiles.push(
          <Image
            key={`${tx}-${ty}`}
            source={{ uri: `https://${'abcd'[(tx + ty) & 3]}.basemaps.cartocdn.com/${style}/${z}/${wx}/${ty}@2x.png` }}
            style={{ position: 'absolute', left: tx * TILE - left, top: ty * TILE - top, width: TILE, height: TILE }}
          />,
        );
      }
    }
    const pts = ps.map((p) => `${p.x - left},${p.y - top}`).join(' ');
    const s0 = ps[0], s1 = ps[ps.length - 1];
    body = (
      <>
        {tiles}
        <Svg width={w} height={height} style={{ position: 'absolute' }}>
          <Polyline points={pts} fill="none" stroke={t.dark ? '#000' : '#fff'} strokeOpacity={0.6} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
          <Polyline points={pts} fill="none" stroke={t.accent} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={s0.x - left} cy={s0.y - top} r={7} fill={t.walk} stroke="#fff" strokeWidth={2.5} />
          <Circle cx={s1.x - left} cy={s1.y - top} r={7} fill={t.accent} stroke="#fff" strokeWidth={2.5} />
        </Svg>
        <Text style={{ position: 'absolute', right: 6, bottom: 4, fontSize: 9, color: t.dark ? '#bbb' : '#555', backgroundColor: t.dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)', paddingHorizontal: 4, borderRadius: 3, overflow: 'hidden' }}>
          © OpenStreetMap © CARTO
        </Text>
      </>
    );
  }

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height, borderRadius: 14, overflow: 'hidden', backgroundColor: t.chip }}>
      {body}
    </View>
  );
}
