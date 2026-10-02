import { accrue, move } from './accounting';
import type { ActiveEffect, Decision, GameState, Toast } from './types';

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

export type SpendKind = 'otherExpense' | 'marketing' | 'maintenance';

/** Pay an operating cost in cash (or from the safety fund). Returns null if you can't afford it. */
export function spend(s: GameState, amount: number, fromFund = false, kind: SpendKind = 'otherExpense'): GameState | null {
  if (fromFund) {
    if (s.safetyFund < amount - 1e-9) return null;
    return accrue({ ...s, safetyFund: s.safetyFund - amount, today: { ...s.today, books: { ...s.today.books, cashOperatingOther: s.today.books.cashOperatingOther - amount } } }, { [kind]: amount });
  }
  if (s.cash < amount - 1e-9) return null;
  const next = move(s, 'cashOperatingOther', -amount, { [kind]: amount });
  return { ...next, today: { ...next.today, other: next.today.other + amount } };
}

export const bump = (v: number, d: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v + d));

export function decide(s: GameState, d: Omit<Decision, 'id' | 'day'>): GameState {
  return { ...s, decisions: [...s.decisions, { ...d, id: s.nextId, day: s.day }].slice(-80), nextId: s.nextId + 1 };
}
