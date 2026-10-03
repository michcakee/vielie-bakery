import { incomeStatement } from './accounting';
import { effectivePrice, expectedWalkIns, onMenu } from './economy';
import type { GameState } from './types';

/** XP for 0, 1, 2 or 3 stars on the daily goal. */
export const STAR_XP = [0, 10, 25, 50];

const roundTo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/**
 * Today's three sales targets, like a level goal in a cooking game. Based on recent days, so the bar rises
 * as the bakery grows: one star is easy, three stars needs a great day.
 */
export function dailyGoal(s: GameState): [number, number, number] {
  const menu = onMenu(s);
  const avgPrice = menu.length ? menu.reduce((t, p) => t + effectivePrice(s, p), 0) / menu.length : 5;
  const estimate = (expectedWalkIns(s) + 2) * avgPrice * 0.8;
  const recent = s.history.slice(-5).map((h) => h.revenue);
  // After a few days, goals follow what you actually sell, not how many people walk past.
  const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const base = recent.length >= 3 ? avg : recent.length ? Math.max(estimate * 0.6, avg) : estimate;
  const one = roundTo5(base * 0.5);
  const two = Math.max(one + 5, roundTo5(base * 0.9));
  const three = Math.max(two + 5, roundTo5(base * 1.2));
  return [one, two, three];
}

/** Sales so far today (what the goal counts). */
export const salesToday = (s: GameState) => incomeStatement(s.today.books).revenue;

export const starsFor = (sales: number, goal?: number[]) => (goal ? goal.filter((g) => sales >= g).length : 0);
