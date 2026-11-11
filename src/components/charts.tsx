import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { addDays, cx, fmtDate, startOfDay, startOfWeek } from '@/lib/util';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** "Nice" axis maximum and ticks. */
function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { max: 1, step: 1 / ticks, ticks: [0] };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) out.push(v);
  return { max: top, step, ticks: out };
}

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

export interface BarDatum {
  key: string | number;
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}

/** Vertical bars with a "tick" cap — the forge-hammer motif. Hover/tap reveals values. */
export function BarChart({
  data,
  height = 200,
  format = (v) => compact.format(v),
  emptyLabel = 'No data yet',
}: {
  data: BarDatum[];
  height?: number;
  format?: (v: number) => string;
  emptyLabel?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 40, r: 6, t: 16, b: 26 };
  const max = Math.max(0, ...data.map((d) => d.value));
  const scale = niceScale(max);
  const innerW = Math.max(0, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  const slot = data.length ? innerW / data.length : 0;
  const bw = Math.max(4, Math.min(34, slot * 0.58));
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 44)));
  const active = hover ?? data.findIndex((d) => d.highlight);
  const gid = useId();

  return (
    <div ref={ref} className="chart" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Bar chart" onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`${gid}-bar`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--ember-hi)" />
              <stop offset="1" stopColor="var(--ember)" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {scale.ticks.map((t) => {
            const y = pad.t + innerH - (t / scale.max) * innerH;
            return (
              <g key={t}>
                <line x1={pad.l} x2={width - pad.r} y1={y} y2={y} stroke="var(--grid-line)" strokeDasharray={t === 0 ? undefined : '2 4'} />
                <text x={pad.l - 8} y={y + 4} textAnchor="end" className="chart-axis">
                  {format(t)}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const h = max > 0 ? (d.value / scale.max) * innerH : 0;
            const x = pad.l + slot * i + (slot - bw) / 2;
            const y = pad.t + innerH - h;
            const on = i === active;
            return (
              <g key={d.key} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }}>
                <rect x={pad.l + slot * i} y={pad.t} width={slot} height={innerH} fill="transparent" />
                {on && <rect x={pad.l + slot * i + 2} y={pad.t} width={slot - 4} height={innerH} rx={6} fill="var(--ember-soft)" opacity={0.5} />}
                {/* Geometry lives in attributes; motion only animates transforms (grow from the baseline). */}
                <motion.rect
                  x={x}
                  y={d.value === 0 ? pad.t + innerH - 2 : y}
                  width={bw}
                  height={d.value === 0 ? 2 : Math.max(2, h)}
                  rx={Math.min(5, bw / 3)}
                  fill={d.value === 0 ? 'var(--line-2)' : on ? `url(#${gid}-bar)` : 'var(--surface-3)'}
                  stroke={d.value > 0 && !on ? 'var(--line-3)' : 'none'}
                  style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.55, delay: i * 0.025, ease: [0.2, 0.8, 0.2, 1] }}
                />
                {d.value > 0 && (
                  <motion.rect
                    x={x - 2}
                    y={y - 5}
                    width={bw + 4}
                    height={3}
                    rx={1.5}
                    fill={on ? 'var(--text)' : 'var(--ember)'}
                    initial={{ opacity: 0, translateY: h }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ duration: 0.55, delay: i * 0.025, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                )}
                {(i % labelEvery === 0 || on) && (
                  <text x={pad.l + slot * i + slot / 2} y={height - 6} textAnchor="middle" className={cx('chart-axis', on && 'chart-axis-on')}>
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
          {active >= 0 && data[active] && (
            <ChartTip x={pad.l + slot * active + slot / 2} y={pad.t + innerH - (data[active].value / scale.max) * innerH - 10} width={width}>
              {format(data[active].value)}
              {data[active].sub && <tspan className="chart-tip-sub"> · {data[active].sub}</tspan>}
            </ChartTip>
          )}
        </svg>
      )}
      {width > 0 && max === 0 && <div className="chart-empty">{emptyLabel}</div>}
    </div>
  );
}

function ChartTip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const w = 120;
  const cx0 = Math.max(w / 2 + 2, Math.min(width - w / 2 - 2, x));
  const ty = Math.max(14, y);
  return (
    <g pointerEvents="none">
      <text x={cx0} y={ty} textAnchor="middle" className="chart-tip">
        {children}
      </text>
    </g>
  );
}

export interface LinePoint {
  t: number;
  value: number;
  label?: string;
  marker?: boolean;
}

/** Time-scaled line with gradient fill, crosshair and PR markers. */
export function LineChart({
  data,
  height = 220,
  format = (v) => String(Math.round(v)),
  color = 'var(--ember)',
  emptyLabel = 'Log this exercise to see progression',
}: {
  data: LinePoint[];
  height?: number;
  format?: (v: number) => string;
  color?: string;
  emptyLabel?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();
  const pad = { l: 40, r: 12, t: 18, b: 26 };
  const innerW = Math.max(0, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;

  const geo = useMemo(() => {
    if (data.length === 0) return null;
    const vals = data.map((d) => d.value);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = hi - lo || hi * 0.1 || 1;
    const min = Math.max(0, lo - span * 0.25);
    const scale = niceScale(hi + span * 0.15 - min, 4);
    const yMax = min + scale.max;
    const t0 = data[0].t;
    const t1 = data[data.length - 1].t;
    const tx = (t: number) => (t1 === t0 ? pad.l + innerW / 2 : pad.l + ((t - t0) / (t1 - t0)) * innerW);
    const ty = (v: number) => pad.t + innerH - ((v - min) / (yMax - min)) * innerH;
    const pts = data.map((d) => [tx(d.t), ty(d.value)] as const);
    // Monotone-ish smoothing with short cubic tangents.
    let path = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const dx = (x1 - x0) * 0.4;
      path += ` C${x0 + dx},${y0} ${x1 - dx},${y1} ${x1},${y1}`;
    }
    const area = `${path} L${pts[pts.length - 1][0]},${pad.t + innerH} L${pts[0][0]},${pad.t + innerH} Z`;
    const ticks = scale.ticks.map((t) => min + t);
    return { pts, path, area, ticks, ty, t0, t1 };
  }, [data, innerW, innerH, pad.l, pad.t]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let best = 0;
    for (let i = 1; i < geo.pts.length; i++) if (Math.abs(geo.pts[i][0] - x) < Math.abs(geo.pts[best][0] - x)) best = i;
    setHover(best);
  };

  const sel = hover ?? (data.length ? data.length - 1 : null);

  return (
    <div ref={ref} className="chart" style={{ height }}>
      {width > 0 && geo && (
        <svg width={width} height={height} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Line chart">
          <defs>
            <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.28" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {geo.ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={geo.ty(t)} y2={geo.ty(t)} stroke="var(--grid-line)" strokeDasharray="2 4" />
              <text x={pad.l - 8} y={geo.ty(t) + 4} textAnchor="end" className="chart-axis">
                {format(t)}
              </text>
            </g>
          ))}
          <text x={pad.l} y={height - 6} className="chart-axis">
            {fmtDate(geo.t0)}
          </text>
          {geo.t1 !== geo.t0 && (
            <text x={width - pad.r} y={height - 6} textAnchor="end" className="chart-axis">
              {fmtDate(geo.t1)}
            </text>
          )}
          <motion.path d={geo.area} fill={`url(#${gid}-fill)`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
          <motion.path
            d={geo.path}
            fill="none"
            stroke={color}
            strokeWidth={2.25}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
          />
          {geo.pts.map(([x, y], i) =>
            data[i].marker ? (
              <g key={i} transform={`translate(${x},${y})`}>
                <rect x={-4} y={-4} width={8} height={8} transform="rotate(45)" fill="var(--gold)" stroke="var(--surface)" strokeWidth={1.5} />
              </g>
            ) : geo.pts.length <= 40 ? (
              <circle key={i} cx={x} cy={y} r={2.5} fill="var(--surface)" stroke={color} strokeWidth={1.5} />
            ) : null,
          )}
          {sel != null && geo.pts[sel] && (
            <g pointerEvents="none">
              <line x1={geo.pts[sel][0]} x2={geo.pts[sel][0]} y1={pad.t} y2={pad.t + innerH} stroke="var(--line-3)" />
              <circle cx={geo.pts[sel][0]} cy={geo.pts[sel][1]} r={5.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
              <ChartTip x={geo.pts[sel][0]} y={pad.t - 4} width={width}>
                {format(data[sel].value)}
                <tspan className="chart-tip-sub"> · {data[sel].label ?? fmtDate(data[sel].t)}</tspan>
              </ChartTip>
            </g>
          )}
        </svg>
      )}
      {width > 0 && !geo && <div className="chart-empty">{emptyLabel}</div>}
    </div>
  );
}

/** Training calendar: one column per week, intensity = number of sessions / volume. */
export function CalendarHeatmap({
  days,
  weeks = 20,
  weekStartsOn = 1,
  now = Date.now(),
}: {
  days: Map<number, number>;
  weeks?: number;
  weekStartsOn?: 0 | 1;
  now?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const labelW = 22;
  const gap = 4;
  const fitWeeks = width ? Math.max(8, Math.min(weeks, Math.floor((width - labelW + gap) / (14 + gap)))) : weeks;
  const cell = width ? Math.min(18, Math.floor((width - labelW - gap * (fitWeeks - 1)) / fitWeeks)) : 14;
  const first = addDays(startOfWeek(now, weekStartsOn), -(fitWeeks - 1) * 7);
  const today = startOfDay(now);
  const cols = Array.from({ length: fitWeeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
  const max = Math.max(1, ...[...days.values()]);
  const dayLabels = weekStartsOn === 1 ? ['M', '', 'W', '', 'F', '', ''] : ['', 'M', '', 'W', '', 'F', ''];
  const months: { x: number; label: string }[] = [];
  cols.forEach((c, i) => {
    const d = new Date(c[0]);
    if (i === 0 || d.getDate() <= 7) months.push({ x: i, label: d.toLocaleString(undefined, { month: 'short' }) });
  });
  return (
    <div ref={ref} className="heatmap">
      {width > 0 && (
        <svg width={labelW + fitWeeks * (cell + gap)} height={18 + 7 * (cell + gap)} role="img" aria-label="Training calendar">
          {months.map((m, i) =>
            i > 0 && m.x - months[i - 1].x < 3 ? null : (
              <text key={m.x} x={labelW + m.x * (cell + gap)} y={11} className="chart-axis">
                {m.label}
              </text>
            ),
          )}
          {dayLabels.map((l, i) => (
            <text key={i} x={0} y={18 + i * (cell + gap) + cell - 3} className="chart-axis">
              {l}
            </text>
          ))}
          {cols.map((col, w) =>
            col.map((t, d) => {
              const v = days.get(t) ?? 0;
              const future = t > today;
              const lvl = v === 0 ? 0 : Math.min(1, 0.45 + (v / max) * 0.55);
              return (
                <motion.rect
                  key={t}
                  x={labelW + w * (cell + gap)}
                  y={18 + d * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={Math.max(2, cell / 4)}
                  fill={v ? 'var(--ember)' : 'var(--surface-3)'}
                  fillOpacity={future ? 0.25 : v ? lvl : 1}
                  stroke={t === today ? 'var(--text-2)' : 'none'}
                  strokeWidth={1.25}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: future ? 0.4 : 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: (w * 7 + d) * 0.002 }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                >
                  <title>{`${fmtDate(t)} — ${v ? `${v} workout${v > 1 ? 's' : ''}` : 'rest day'}`}</title>
                </motion.rect>
              );
            }),
          )}
        </svg>
      )}
    </div>
  );
}

/** Muscle balance radar. Values normalised to the max axis. */
export function RadarChart({
  axes,
  size = 280,
}: {
  axes: { label: string; value: number }[];
  size?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const s = Math.min(size, width || size);
  const c = s / 2;
  const r = c - 34;
  const max = Math.max(1, ...axes.map((a) => a.value));
  const n = axes.length;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v] as const;
  };
  const poly = axes.map((a, i) => pt(i, a.value / max).join(',')).join(' ');
  return (
    <div ref={ref} className="radar">
      {width > 0 && (
        <svg width={s} height={s} role="img" aria-label="Muscle group distribution">
          {[0.25, 0.5, 0.75, 1].map((k) => (
            <polygon key={k} points={axes.map((_, i) => pt(i, k).join(',')).join(' ')} fill="none" stroke="var(--grid-line)" strokeWidth={k === 1 ? 1.5 : 1} />
          ))}
          {axes.map((_, i) => {
            const [x, y] = pt(i, 1);
            return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--grid-line)" />;
          })}
          <motion.polygon
            points={poly}
            fill="var(--ember)"
            fillOpacity={0.18}
            stroke="var(--ember)"
            strokeWidth={2}
            strokeLinejoin="round"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ transformOrigin: `${c}px ${c}px` }}
          />
          {axes.map((a, i) => {
            const [x, y] = pt(i, a.value / max);
            const [lx, ly] = pt(i, 1.17);
            return (
              <g key={a.label}>
                {a.value > 0 && <circle cx={x} cy={y} r={3} fill="var(--ember)" />}
                <text x={lx} y={ly + 4} textAnchor={Math.abs(lx - c) < 4 ? 'middle' : lx > c ? 'start' : 'end'} className="chart-axis radar-label">
                  {a.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/** Tiny inline trend line. */
export function Sparkline({ values, width = 96, height = 30, color = 'var(--ember)' }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 3 - ((v - lo) / span) * (height - 6)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
    </svg>
  );
}

/** Horizontal share bars, used for muscle volume breakdown. */
export function ShareBars({ rows, format }: { rows: { label: string; value: number; sub?: string }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="share-bars">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="row-between">
            <span className="share-label">{r.label}</span>
            <span className="num share-val">
              {format(r.value)}
              {r.sub && <span className="faint"> {r.sub}</span>}
            </span>
          </div>
          <div className="share-track">
            <motion.div
              className="share-fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: r.value / max }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

