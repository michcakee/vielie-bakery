import { describe, expect, it } from 'vitest';
import { FUTURES } from '../src/config/balance';
import { ingredientBuyPrice } from '../src/game/economy';
import { balanceSheet, sumIncome } from '../src/game/finance';
import { contractPrice, createNewGame, gameReducer } from '../src/game/state';
import type { GameState } from '../src/game/types';
import { botDay } from './helpers';

const toDay = (seed: number, day: number): GameState => {
  let s = createNewGame(seed);
  while (s.day < day) s = botDay(s);
  return s;
};

describe('forward contracts', () => {
  it('are locked until week 2', () => {
    const s = createNewGame(1);
    expect(gameReducer(s, { type: 'signContract', ingredient: 'butter', qtyPerDay: 2 })).toBe(s);
  });

  it('lock today\'s price plus the premium and deliver each morning for a week', () => {
    const s0 = toDay(4, 8);
    const locked = contractPrice(s0, 'butter');
    let s = gameReducer(s0, { type: 'signContract', ingredient: 'butter', qtyPerDay: 2 });
    expect(s.contracts).toHaveLength(1);
    expect(s.contracts[0].price).toBeCloseTo(locked, 9);
    expect(locked).toBeCloseTo(ingredientBuyPrice(s0, s0.market, 'butter') * (1 + FUTURES.premium), 9);
    expect(s.learned).toContain('hedging');
    // No second contract on the same ingredient while one is running.
    expect(gameReducer(s, { type: 'signContract', ingredient: 'butter', qtyPerDay: 1 })).toBe(s);

    s = gameReducer(gameReducer(gameReducer(s, { type: 'buyShortfall' }), { type: 'bake' }), { type: 'continue' });
    expect(s.day).toBe(9);
    expect(s.contracts[0].delivered).toBe(2);
    const spot = s.market.ingredientPrices.butter;
    expect(s.contracts[0].gain).toBeCloseTo((spot - locked) * 2, 9);
  });

  it('delivery moves cash into inventory without touching profit', () => {
    let s = gameReducer(toDay(6, 8), { type: 'signContract', ingredient: 'flour', qtyPerDay: 10 });
    s = gameReducer(gameReducer(s, { type: 'buyShortfall' }), { type: 'bake' });
    const before = { cash: s.cash, flour: s.ingredients.flour.qty };
    s = gameReducer(s, { type: 'continue' });
    expect(s.ingredients.flour.qty).toBeCloseTo(before.flour + 10, 9);
    expect(s.cash).toBeCloseTo(before.cash - 10 * s.contracts[0].price, 6);
    expect(s.cashAtDayStart).toBeCloseTo(s.cash, 9);
  });

  it('runs out exactly after the contract length, and the books still balance at day 30', () => {
    let s = gameReducer(toDay(9, 8), { type: 'signContract', ingredient: 'berries', qtyPerDay: 1 });
    s = gameReducer(s, { type: 'signContract', ingredient: 'matcha', qtyPerDay: 50 });
    while (s.phase !== 'final') s = botDay(s);
    for (const c of s.contracts) expect(c.delivered).toBeCloseTo(c.qtyPerDay * FUTURES.days, 9);
    const bs = balanceSheet(s);
    expect(bs.totalAssets).toBeCloseTo(bs.totalLiabilities + bs.equity, 6);
    expect(bs.equity).toBeCloseTo(s.startingCapital + sumIncome(s.history).netProfit, 4);
  });
});
