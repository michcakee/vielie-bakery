import { PRODUCTS, PRODUCT_ORDER } from '../src/config/balance';
import { demandBreakdown, ovenCapacity, ovenMinutesFor } from '../src/game/economy';
import { gameReducer, shortfallCost } from '../src/game/state';
import type { GameState } from '../src/game/types';

/**
 * A simple "sensible player" bot: bakes close to the forecast, trims to fit the oven,
 * buys what it needs, optionally invests and borrows. Used to check the game can be finished
 * and that the books balance.
 */
export function botDay(state: GameState, opts: { invest?: boolean; overbake?: number } = {}): GameState {
  let s = state;
  if (s.phase === 'morning') {
    if (opts.invest && s.day >= 15 && !s.owned.includes('oven')) {
      if (s.cash < 3600) s = gameReducer(s, { type: 'borrow', amount: 3000 });
      s = gameReducer(s, { type: 'buyInvestment', id: 'oven' });
    }
    const factor = opts.overbake ?? 1;
    for (const p of PRODUCT_ORDER) {
      const exp = demandBreakdown(s, s.market, p, s.prices[p]).expected;
      s = gameReducer(s, { type: 'setPlan', product: p, qty: Math.round(exp * factor) });
    }
    // Trim the lowest contribution-per-minute product until the plan fits the oven.
    const cap = ovenCapacity(s.owned);
    let guard = 0;
    while (ovenMinutesFor(s.plan) > cap && guard++ < 500) {
      const p = s.plan.sourdough > 0 ? 'sourdough' : s.plan.croissant > 0 ? 'croissant' : 'muffin';
      s = gameReducer(s, { type: 'setPlan', product: p, qty: s.plan[p] - 1 });
    }
    // Shrink if we cannot afford ingredients.
    guard = 0;
    while (shortfallCost(s) > s.cash && guard++ < 500) {
      for (const p of PRODUCT_ORDER) s = gameReducer(s, { type: 'setPlan', product: p, qty: Math.floor(s.plan[p] * 0.9) });
    }
    s = gameReducer(s, { type: 'buyShortfall' });
    s = gameReducer(s, { type: 'bake' });
  }
  while (s.phase === 'report' || s.phase === 'weekly') {
    if (s.phase === 'report' && s.day >= 30) return gameReducer(s, { type: 'continue' });
    s = gameReducer(s, { type: 'continue' });
  }
  return s;
}

export function playFullGame(seed: number, opts: Parameters<typeof botDay>[1] = {}): GameState {
  let s = gameReducer({} as GameState, { type: 'newGame', seed });
  let guard = 0;
  while (s.phase !== 'final' && guard++ < 100) s = botDay(s, opts);
  return s;
}

export const refPriceOf = (p: keyof typeof PRODUCTS) => PRODUCTS[p].refPrice;
