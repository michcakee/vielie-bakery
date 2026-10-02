import type { ActiveEffect, GameState, Toast } from './types';

export function addEffect(s: GameState, id: string, days: number, data?: ActiveEffect['data']): GameState {
  const effects = s.effects.filter((e) => e.id !== id || e.until < s.day);
  return { ...s, effects: [...effects, { id, until: s.day + days - 1, data }] };
}

export function toast(s: GameState, kind: Toast['kind'], title: string, text: string): GameState {
  const t: Toast = { id: s.nextToast, kind, title, text };
  return { ...s, toasts: [...s.toasts, t].slice(-6), nextToast: s.nextToast + 1 };
}

export function learn(s: GameState, ...ids: string[]): GameState {
  const add = ids.filter((i) => !s.learned.includes(i));
  return add.length ? { ...s, learned: [...s.learned, ...add] } : s;
}

export function note(s: GameState, text: string): GameState {
  return { ...s, today: { ...s.today, notes: [...s.today.notes, text] } };
}

export function spend(s: GameState, amount: number, fromFund = false): GameState | null {
  if (fromFund) return s.safetyFund >= amount - 1e-9 ? { ...s, safetyFund: s.safetyFund - amount, today: { ...s.today, other: s.today.other + amount } } : null;
  return s.cash >= amount - 1e-9 ? { ...s, cash: s.cash - amount, today: { ...s.today, other: s.today.other + amount } } : null;
}

export const bump = (v: number, d: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v + d));
