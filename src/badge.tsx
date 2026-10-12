import React from 'react';
import Svg, { Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { TIERS, UNRANKED_COLORS } from './ranks';

const SHIELD = 'M50 4 L92 19 V52 C92 79 73 97 50 106 C27 97 8 79 8 52 V19 Z';
const INNER = 'M50 14 L83 26 V52 C83 73 69 87 50 95 C31 87 17 73 17 52 V26 Z';
const ROMAN = ['', 'I', 'II', 'III'];

/** A shield in the tier's colours with the division (I, II, III) in the middle. `id` is like "gold-2". */
export function RankBadge({ id, size = 48 }: { id: string; size?: number }) {
  const [tierId, div] = id.split('-');
  const tier = TIERS.find((t) => t.id === tierId);
  const [light, dark] = tier?.colors ?? UNRANKED_COLORS;
  const label = tier ? (tier.id === 'elite' ? '★' : ROMAN[Number(div)] ?? '') : '?';
  const g = `g-${id}`;
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 100 110" accessibilityLabel={tier ? `${tier.name} ${label}` : 'Unranked'}>
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
        <LinearGradient id={`${g}-in`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={dark} />
          <Stop offset="1" stopColor={light} />
        </LinearGradient>
      </Defs>
      <Path d={SHIELD} fill={`url(#${g})`} stroke={dark} strokeWidth={3} strokeLinejoin="round" />
      <Path d={INNER} fill={`url(#${g}-in)`} opacity={0.55} />
      <SvgText x={50} y={label === '★' ? 72 : 67} fontSize={label === '★' ? 44 : label.length > 2 ? 30 : 36} fontWeight="900" fill="#FFFFFF" stroke={dark} strokeWidth={1.5} textAnchor="middle">
        {label}
      </SvgText>
    </Svg>
  );
}
