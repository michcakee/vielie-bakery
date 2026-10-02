import { GREEN, INVESTMENTS, PACKAGING, SOURCING } from '../config/balance';
import type { DayResult, GameState } from './types';

export interface GreenComponent {
  label: string;
  points: number;
}

/** Share of baked units wasted over the last `days` days (0–1). */
export function recentWasteRate(history: DayResult[], days = 7): number {
  const slice = history.slice(-days);
  const produced = slice.reduce((s, d) => s + d.unitsProduced, 0);
  const wasted = slice.reduce((s, d) => s + d.unitsWasted, 0);
  return produced > 0 ? wasted / produced : 0;
}

/**
 * Green score is built from concrete choices, not a free-floating number:
 * packaging, sourcing, equipment, and how much food you actually throw away.
 */
export function greenBreakdown(state: Pick<GameState, 'packaging' | 'sourcing' | 'owned' | 'history'>): GreenComponent[] {
  const parts: GreenComponent[] = [{ label: 'Starting point', points: GREEN.base }];
  parts.push({ label: PACKAGING[state.packaging].name, points: PACKAGING[state.packaging].greenPoints });
  if (SOURCING[state.sourcing].greenPoints) parts.push({ label: SOURCING[state.sourcing].name, points: SOURCING[state.sourcing].greenPoints });
  for (const id of state.owned) parts.push({ label: INVESTMENTS[id].name, points: INVESTMENTS[id].greenPoints });
  const wastePct = recentWasteRate(state.history) * 100;
  const compostRelief = state.owned.includes('compost') ? 0.5 : 1;
  const penalty = Math.min(35, wastePct * GREEN.wastePenaltyPerPct * compostRelief);
  if (penalty > 0.5) parts.push({ label: `Food waste (${wastePct.toFixed(0)}% of output, last 7 days)`, points: -penalty });
  return parts;
}

export function computeGreenScore(state: Pick<GameState, 'packaging' | 'sourcing' | 'owned' | 'history'>): number {
  const total = greenBreakdown(state).reduce((s, p) => s + p.points, 0);
  return Math.round(Math.min(100, Math.max(0, total)));
}
