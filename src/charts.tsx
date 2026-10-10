import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { useTheme } from './theme';

export interface Datum {
  label: string; // short x-axis label
  value: number; // what is plotted
  text: string; // what the readout says when this point is selected
  name?: string; // longer name for the readout, when the axis label is too short to make sense alone
}

const AXIS_H = 20;

/** Tap or drag across a chart to read any value. The readout sits above the plot so a finger never covers it. */
function Readout({ d, title }: { d: Datum | undefined; title: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: t.muted, fontWeight: '600' }}>{title}</Text>
      <Text style={{ color: t.text, fontWeight: '700', fontSize: 17, marginTop: 2, fontVariant: ['tabular-nums'] }}>
        {d ? `${d.name ?? d.label}: ${d.text}` : ' '}
      </Text>
    </View>
  );
}

function useWidth() {
  const [w, setW] = useState(0);
  return [w, (e: { nativeEvent: { layout: { width: number } } }) => setW(e.nativeEvent.layout.width)] as const;
}

/** Shows at most about six x-axis labels, always including the last. */
const showLabel = (i: number, n: number) => n <= 6 || i === n - 1 || (i % Math.ceil(n / 6) === 0 && n - 1 - i >= Math.ceil(n / 6));

export function BarChart({ data, title, height = 150, initial, maxLabel }: {
  data: Datum[]; title: string; height?: number; initial?: number; maxLabel?: string;
}) {
  const t = useTheme();
  const [w, onLayout] = useWidth();
  const [sel, setSel] = useState(initial ?? data.length - 1);
  const plotH = height - AXIS_H;
  const max = Math.max(...data.map((d) => d.value), 1e-9);
  const slot = w / Math.max(data.length, 1);
  const barW = Math.max(4, Math.min(28, slot - 6));
  const pick = (x: number) => setSel(Math.min(data.length - 1, Math.max(0, Math.floor(x / slot))));

  return (
    <View>
      <Readout d={data[sel]} title={title} />
      <View onLayout={onLayout} style={{ height }}>
        <Pressable onPressIn={(e) => pick(e.nativeEvent.locationX)} onTouchMove={(e) => pick(e.nativeEvent.locationX)} style={{ flex: 1 }}>
          {w > 0 ? (
            <Svg width={w} height={height}>
              <Line x1={0} x2={w} y1={0.5} y2={0.5} stroke={t.line} strokeWidth={1} />
              {maxLabel ? <SvgText x={w} y={12} fill={t.muted} fontSize={11} textAnchor="end">{maxLabel}</SvgText> : null}
              <Line x1={0} x2={w} y1={plotH} y2={plotH} stroke={t.line} strokeWidth={1} />
              {data.map((d, i) => {
                const h = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * (plotH - 16));
                const x = i * slot + (slot - barW) / 2, y = plotH - h, r = Math.min(4, barW / 2, h);
                const path = `M${x},${plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${plotH} Z`;
                return <Path key={i} d={path} fill={t.accent} opacity={i === sel ? 1 : 0.45} />;
              })}
              {data.map((d, i) => showLabel(i, data.length) ? (
                <SvgText key={i} x={i * slot + slot / 2} y={height - 5} fill={i === sel ? t.text : t.muted} fontSize={11} textAnchor="middle">{d.label}</SvgText>
              ) : null)}
            </Svg>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

/** A line chart. With `invert`, smaller values plot higher (used for pace, where lower is faster). */
export function LineChart({ data, title, height = 150, invert, topLabel, bottomLabel }: {
  data: Datum[]; title: string; height?: number; invert?: boolean; topLabel?: string; bottomLabel?: string;
}) {
  const t = useTheme();
  const [w, onLayout] = useWidth();
  const [sel, setSel] = useState(data.length - 1);
  const plotH = height - AXIS_H, pad = 10, gutter = topLabel || bottomLabel ? 40 : 0;
  const vals = data.map((d) => d.value);
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const x0 = gutter + pad, span_x = w - x0 - pad;
  const x = (i: number) => (data.length === 1 ? x0 + span_x / 2 : x0 + (i * span_x) / (data.length - 1));
  const y = (v: number) => {
    const f = (v - lo) / span;
    return pad + (invert ? f : 1 - f) * (plotH - 2 * pad);
  };
  const pick = (px: number) => {
    const step = data.length > 1 ? span_x / (data.length - 1) : w;
    setSel(Math.min(data.length - 1, Math.max(0, Math.round((px - x0) / step))));
  };

  return (
    <View>
      <Readout d={data[sel]} title={title} />
      <View onLayout={onLayout} style={{ height }}>
        <Pressable onPressIn={(e) => pick(e.nativeEvent.locationX)} onTouchMove={(e) => pick(e.nativeEvent.locationX)} style={{ flex: 1 }}>
          {w > 0 ? (
            <Svg width={w} height={height}>
              <Line x1={gutter} x2={w} y1={pad} y2={pad} stroke={t.line} strokeWidth={1} />
              <Line x1={gutter} x2={w} y1={plotH - pad} y2={plotH - pad} stroke={t.line} strokeWidth={1} />
              {topLabel ? <SvgText x={0} y={pad + 4} fill={t.muted} fontSize={11}>{topLabel}</SvgText> : null}
              {bottomLabel ? <SvgText x={0} y={plotH - pad + 4} fill={t.muted} fontSize={11}>{bottomLabel}</SvgText> : null}
              {data[sel] ? <Line x1={x(sel)} x2={x(sel)} y1={pad} y2={plotH - pad} stroke={t.muted} strokeWidth={1} strokeDasharray="3,3" /> : null}
              <Polyline points={data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')} fill="none" stroke={t.accent} strokeWidth={2} strokeLinejoin="round" />
              {data.map((d, i) => (
                <Circle key={i} cx={x(i)} cy={y(d.value)} r={i === sel ? 6 : 4} fill={t.accent} stroke={t.card} strokeWidth={2} />
              ))}
              {data.map((d, i) => showLabel(i, data.length) ? (
                <SvgText key={i} x={x(i)} y={height - 5} fill={i === sel ? t.text : t.muted} fontSize={11} textAnchor={i === data.length - 1 && data.length > 1 ? 'end' : 'middle'}>{d.label}</SvgText>
              ) : null)}
            </Svg>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
