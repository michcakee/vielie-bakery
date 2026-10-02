import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label: string;
  format?: (v: number) => string;
  disabled?: boolean;
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, label, format, disabled }: Props) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));
  return (
    <div className={`stepper ${disabled ? 'is-disabled' : ''}`}>
      <button type="button" aria-label={`Decrease ${label}`} disabled={disabled || value <= min} onClick={() => set(value - step)}>
        <Minus size={14} aria-hidden="true" />
      </button>
      {format ? (
        <output aria-label={label}>{format(value)}</output>
      ) : (
        <input
          type="number"
          inputMode="numeric"
          aria-label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) set(v);
          }}
        />
      )}
      <button type="button" aria-label={`Increase ${label}`} disabled={disabled || value >= max} onClick={() => set(value + step)}>
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
