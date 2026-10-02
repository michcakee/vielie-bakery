import { useId, useState } from 'react';

export interface Series {
  name: string;
  values: number[];
  color: string;
  dash?: string;
  marker?: 'circle' | 'square' | 'diamond';
}

const W = 320;
const H = 150;
const PAD = { l: 40, r: 8, t: 10, b: 22 };

function niceRange(values: number[]): [number, number] {
  let lo = Math.min(0, ...values);
  let hi = Math.max(1, ...values);
  if (hi === lo) hi = lo + 1;
  const pad = (hi - lo) * 0.08;
  return [lo < 0 ? lo - pad : 0, hi + pad];
}

const fmt = (v: number, money: boolean) => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : a >= 10 ? a.toFixed(0) : a.toFixed(1);
  return `${v < 0 ? '−' : ''}${money ? '$' : ''}${s}`;
};

function Marker({ kind, x, y, color }: { kind: Series['marker']; x: number; y: number; color: string }) {
  if (kind === 'square') return <rect x={x - 2.5} y={y - 2.5} width={5} height={5} fill={color} stroke="#3b2a25" strokeWidth={1} />;
  if (kind === 'diamond') return <path d={`M${x} ${y - 3.5}L${x + 3.5} ${y}L${x} ${y + 3.5}L${x - 3.5} ${y}Z`} fill={color} stroke="#3b2a25" strokeWidth={1} />;
  return <circle cx={x} cy={y} r={2.6} fill={color} stroke="#3b2a25" strokeWidth={1} />;
}

/** A small, readable line chart. Each series also gets a marker shape so colour is never the only cue. */
export function LineChart({ series, labels, money = true, title, height = H }: { series: Series[]; labels: string[]; money?: boolean; title: string; height?: number }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values);
  const n = Math.max(1, ...series.map((s) => s.values.length));
  if (!all.length) return <p className="muted small">Not enough days yet. Play a few more and this fills in.</p>;
  const [lo, hi] = niceRange(all);
  const ih = height - PAD.t - PAD.b;
  const iw = W - PAD.l - PAD.r;
  const x = (i: number) => PAD.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => PAD.t + ih - ((v - lo) / (hi - lo)) * ih;
  const ticks = [lo, (lo + hi) / 2, hi];
  const every = Math.max(1, Math.ceil(n / 6));
  const summary = series.map((s) => `${s.name}: from ${fmt(s.values[0] ?? 0, money)} to ${fmt(s.values[s.values.length - 1] ?? 0, money)}`).join('; ');
  return (
    <figure className="chart-fig">
      <figcaption className="sr-only" id={id}>
        {title}. {summary}.
      </figcaption>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-labelledby={id} className="chart-svg" onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="rgba(59,42,37,0.15)" />
            <text x={PAD.l - 4} y={y(t) + 3} textAnchor="end" className="chart-tick">
              {fmt(t, money)}
            </text>
          </g>
        ))}
        {lo < 0 && <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="#3b2a25" strokeWidth={1} />}
        {labels.map((l, i) =>
          i % every === 0 || i === labels.length - 1 ? (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="chart-tick">
              {l}
            </text>
          ) : null,
        )}
        {series.map((s) => (
          <g key={s.name}>
            <polyline fill="none" stroke={s.color} strokeWidth={2.2} strokeDasharray={s.dash} strokeLinejoin="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
            {s.values.map((v, i) => (n <= 40 || i === s.values.length - 1 ? <Marker key={i} kind={s.marker} x={x(i)} y={y(v)} color={s.color} /> : null))}
          </g>
        ))}
        {Array.from({ length: n }).map((_, i) => (
          <rect key={i} x={x(i) - iw / n / 2} y={PAD.t} width={iw / n} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="rgba(59,42,37,0.4)" strokeDasharray="3 3" />}
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name}>
            <svg width="22" height="10" aria-hidden="true">
              <line x1="1" x2="21" y1="5" y2="5" stroke={s.color} strokeWidth="2.2" strokeDasharray={s.dash} />
              <Marker kind={s.marker} x={11} y={5} color={s.color} />
            </svg>
            {s.name}
            {hover !== null && s.values[hover] !== undefined && <b> {fmt(s.values[hover], money)}</b>}
          </span>
        ))}
        {hover !== null && <span className="muted">{labels[hover]}</span>}
      </div>
    </figure>
  );
}

/** Horizontal bars with numbers printed on them, sorted as given. */
export function BarList({ rows, money = false, title }: { rows: { label: string; value: number; note?: string; color?: string }[]; money?: boolean; title: string }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <ul className="barlist" aria-label={title}>
      {rows.map((r) => (
        <li key={r.label}>
          <span className="barlist-label">{r.label}</span>
          <span className="barlist-track">
            <span className={`barlist-fill ${r.value < 0 ? 'neg' : ''}`} style={{ width: `${(Math.abs(r.value) / max) * 100}%`, background: r.color }} />
          </span>
          <span className="barlist-val">
            {r.value < 0 ? '▼ ' : ''}
            {fmt(r.value, money)}
            {r.note && <em> {r.note}</em>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Spark({ values, color = '#4f8a35', label }: { values: number[]; color?: string; label: string }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 60},${18 - ((v - lo) / span) * 16}`).join(' ');
  const up = values[values.length - 1] >= values[0];
  return (
    <span className="spark" role="img" aria-label={`${label}: ${up ? 'rising' : 'falling'}`}>
      <svg width="62" height="20" aria-hidden="true">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
      </svg>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span>
    </span>
  );
}

export const CHART_COLORS = { revenue: '#e0a04a', profit: '#4f8a35', cash: '#4f9c94', cost: '#c2453d', lost: '#8e2f2a', other: '#7b4a6b' };
