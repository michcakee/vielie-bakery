import { describe, expect, it } from 'vitest';
import { FIXED_COST_TOTAL, INVESTMENTS, LOAN } from '../src/config/balance';
import { inventoryValue } from '../src/game/finance';
import { gameReducer, createNewGame } from '../src/game/state';
import type { GameState } from '../src/game/types';

const ready = (seed = 11, plan?: Partial<GameState['plan']>): GameState => {
  let s = createNewGame(seed);
  s = { ...s, tutorialDone: true, plan: { ...s.plan, ...plan } };
  return gameReducer(s, { type: 'buyShortfall' });
};

describe('impossible actions are blocked', () => {
  it('cannot bake without ingredients', () => {
    const s = createNewGame(1); // starting stock is short of butter and matcha
    expect(gameReducer(s, { type: 'bake' })).toBe(s);
  });

  it('cannot bake beyond oven capacity', () => {
    const s = ready(1, { sourdough: 200 });
    expect(gameReducer(s, { type: 'bake' }).phase).toBe('morning');
  });

  it('cannot buy ingredients with money you do not have', () => {
    const s = { ...createNewGame(1), cash: 5 };
    expect(gameReducer(s, { type: 'buyIngredient', ingredient: 'butter', qty: 10 })).toBe(s);
  });

  it('cannot buy equipment or borrow before week 3', () => {
    const s = createNewGame(1);
    expect(gameReducer(s, { type: 'buyInvestment', id: 'compost' })).toBe(s);
    expect(gameReducer(s, { type: 'borrow', amount: 1000 })).toBe(s);
    expect(gameReducer(s, { type: 'setPrice', product: 'matcha', price: 4 })).toBe(s);
  });

  it('cannot borrow beyond the credit limit', () => {
    let s = { ...createNewGame(1), sandbox: true };
    s = gameReducer(s, { type: 'borrow', amount: 100000 });
    expect(s.loan).toBe(LOAN.maxPrincipal);
  });
});

describe('a trading day', () => {
  it('produces a consistent income statement', () => {
    const s = gameReducer(ready(), { type: 'bake' });
    const i = s.lastResult!.income;
    expect(s.phase).toBe('report');
    expect(i.grossProfit).toBeCloseTo(i.revenue - i.cogs, 9);
    expect(i.operatingExpenses).toBeCloseTo(i.wages + i.rent + i.admin + i.energy + i.waste + i.depreciation, 9);
    expect(i.operatingProfit).toBeCloseTo(i.grossProfit - i.operatingExpenses, 9);
    expect(i.netProfit).toBeCloseTo(i.operatingProfit - i.interest, 9);
    expect(i.wages + i.rent + i.admin).toBe(FIXED_COST_TOTAL);
  });

  it('revenue equals units sold × price (day-old loaves at half price)', () => {
    const s = gameReducer(ready(), { type: 'bake' });
    for (const p of Object.values(s.lastResult!.products)) {
      expect(p.revenue).toBeCloseTo(p.sold * p.price + p.dayOldSold * p.price * 0.5, 9);
      expect(p.sold + p.dayOldSold).toBeLessThanOrEqual(p.customers);
    }
  });

  it('overproduction creates waste; underproduction turns customers away', () => {
    const over = gameReducer(ready(5, { muffin: 120, croissant: 10, sourdough: 10, matcha: 10 }), { type: 'bake' });
    expect(over.lastResult!.products.muffin.wasted).toBeGreaterThan(40);
    expect(over.lastResult!.income.waste).toBeGreaterThan(0);
    expect(over.lastResult!.products.croissant.stockout).toBeGreaterThan(0);
  });

  it('unsold sourdough is carried over and sold as day-old', () => {
    let s = gameReducer(ready(5, { sourdough: 55, matcha: 20, muffin: 10, croissant: 10 }), { type: 'bake' });
    const carried = s.lastResult!.products.sourdough.carriedOver;
    expect(carried).toBeGreaterThan(0);
    expect(s.dayOld.qty).toBe(carried);
    s = gameReducer(s, { type: 'continue' });
    s = gameReducer(gameReducer(s, { type: 'setPlan', product: 'sourdough', qty: 5 }), { type: 'buyShortfall' });
    s = gameReducer(s, { type: 'bake' });
    expect(s.lastResult!.products.sourdough.dayOldSold).toBeGreaterThan(0);
  });

  it('cash change = revenue − cash costs (ingredients were paid in the morning)', () => {
    const before = ready();
    const after = gameReducer(before, { type: 'bake' });
    const i = after.lastResult!.income;
    // Non-cash items: ingredient stock consumed, depreciation. Everything else is cash.
    const stockUsed = inventoryValue(before) - inventoryValue(after);
    const expectedCash = before.cash + i.netProfit + stockUsed + i.depreciation;
    expect(after.cash).toBeCloseTo(expectedCash, 6);
  });

  it('runs into an overdraft instead of negative cash', () => {
    let s = ready();
    s = { ...s, cash: 0 };
    s = gameReducer(s, { type: 'setPlan', product: 'sourdough', qty: 0 });
    const r = gameReducer({ ...s, plan: { sourdough: 0, matcha: 0, muffin: 0, croissant: 0 } }, { type: 'bake' });
    expect(r.cash).toBe(0);
    expect(r.overdraft).toBeGreaterThan(FIXED_COST_TOTAL - 1);
    expect(r.learned).toContain('liquidity');
  });
});

describe('finance actions', () => {
  it('loans accrue daily interest at APR / 365', () => {
    let s = { ...ready(), sandbox: true };
    s = gameReducer(s, { type: 'borrow', amount: 3000 });
    s = gameReducer(s, { type: 'bake' });
    expect(s.lastResult!.income.interest).toBeCloseTo((3000 * LOAN.apr) / 365, 9);
  });

  it('repayment pays the expensive overdraft first', () => {
    let s = { ...createNewGame(1), loan: 1000, overdraft: 200, cash: 500 };
    s = gameReducer(s, { type: 'repay', amount: 300 });
    expect(s.overdraft).toBe(0);
    expect(s.loan).toBe(900);
    expect(s.cash).toBe(200);
  });

  it('investments are capitalised, not expensed, and depreciate daily', () => {
    let s = { ...ready(), sandbox: true, cash: 10000 };
    s = gameReducer(s, { type: 'buyInvestment', id: 'solar' });
    expect(s.cash).toBe(10000 - INVESTMENTS.solar.cost);
    expect(s.equipmentCost).toBe(INVESTMENTS.solar.cost);
    s = gameReducer(s, { type: 'bake' });
    expect(s.lastResult!.income.depreciation).toBeCloseTo(INVESTMENTS.solar.cost / INVESTMENTS.solar.usefulLifeDays, 9);
  });

  it('solar roof lowers the energy bill', () => {
    const base = gameReducer(ready(9), { type: 'bake' }).lastResult!.income.energy;
    const solar = gameReducer(gameReducer({ ...ready(9), sandbox: true, cash: 9000 }, { type: 'buyInvestment', id: 'solar' }), { type: 'bake' }).lastResult!.income.energy;
    expect(solar).toBeCloseTo(base * 0.45, 6);
  });
});
