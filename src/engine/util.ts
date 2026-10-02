export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const round2 = (v: number) => Math.round(v * 100) / 100;
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Standard loan payment for a fully amortising loan. */
export function pmt(principal: number, monthlyRate: number, months: number): number {
  if (months <= 0) return principal;
  if (Math.abs(monthlyRate) < 1e-9) return principal / months;
  return (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
}

export function weightedPick<T>(rand: () => number, items: T[], weight: (t: T) => number): T | null {
  const ws = items.map(weight);
  const total = ws.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return null;
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export const pick = <T,>(rand: () => number, list: readonly T[]): T => list[Math.floor(rand() * list.length)];
