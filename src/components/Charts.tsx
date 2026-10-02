interface LineProps {
  values: number[];
  width?: number;
  height?: number;
  label: string;
  zero?: boolean;
  format?: (v: number) => string;
}

/** Small inline line chart. Draws a zero line when values cross it. */
export function LineChart({ values, width = 320, height = 96, label, zero = false, format = String }: LineProps) {
  if (values.length < 2) {
    return <p className="chart-empty">The chart fills in after a couple of days of trading.</p>;
  }
  const lo = Math.min(...values, zero ? 0 : Infinity);
  const hi = Math.max(...values, zero ? 0 : -Infinity);
  const pad = 6;
  const span = hi - lo || 1;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - lo) / span) * (height - pad * 2);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values[values.length - 1];
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label}: latest ${format(last)}, lowest ${format(lo)}, highest ${format(hi)}`} preserveAspectRatio="none">
        {zero && lo < 0 && hi > 0 && <line x1={pad} x2={width - pad} y1={y(0)} y2={y(0)} className="chart-zero" />}
        <path d={`${d} L${x(values.length - 1)},${height - pad} L${x(0)},${height - pad} Z`} className="chart-area" />
        <path d={d} className="chart-line" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption>
        <span>Low {format(lo)}</span>
        <span>High {format(hi)}</span>
      </figcaption>
    </figure>
  );
}

export function Sparkline({ values, width = 64, height = 18 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const d = values
    .map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - lo) / span) * (height - 4)).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} aria-hidden="true" className="sparkline">
      <path d={d} />
    </svg>
  );
}

/** Horizontal meter bar. */
export function Meter({ value, max, tone = 'forest', label }: { value: number; max: number; tone?: 'forest' | 'crust' | 'berry' | 'herb'; label: string }) {
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <div className={`meter tone-${tone}`} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} aria-label={label}>
      <span style={{ width: `${frac * 100}%` }} />
    </div>
  );
}
