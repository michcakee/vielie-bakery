export const money = (v: number, digits = 0) =>
  `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const money2 = (v: number) => money(v, 2);

export const signedMoney = (v: number, digits = 0) => `${v >= 0 ? '+' : '−'}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

export const qty = (v: number, unit = '') => {
  const s = Number.isInteger(v) ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return unit ? `${s} ${unit}` : s;
};

export const days = (v: number) => (Number.isFinite(v) ? `${Math.round(v).toLocaleString('en-US')} day${Math.round(v) === 1 ? '' : 's'}` : 'never');
