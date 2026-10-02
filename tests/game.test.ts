import { describe, expect, it } from 'vitest';
import { INVESTMENTS } from '../src/config/balance';
import { balanceSheet, sumIncome } from '../src/game/finance';
import { observedElasticity, weeklyInsights } from '../src/game/insights';
import { analyseInvestment } from '../src/game/investments';
import { SAVE_KEY, clearSave, loadGame, saveGame } from '../src/game/persistence';
import { businessProfile, finalSummary } from '../src/game/profile';
import { createNewGame, gameReducer } from '../src/game/state';
import type { GameState } from '../src/game/types';
import { botDay, playFullGame } from './helpers';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}

describe('full season', () => {
  for (const [label, opts] of [
    ['steady player', {}],
    ['investor who borrows', { invest: true }],
    ['over-baker', { overbake: 1.4 }],
  ] as const) {
    it(`a ${label} reaches day 30 and the final report`, () => {
      const s = playFullGame(123, opts);
      expect(s.phase).toBe('final');
      expect(s.day).toBe(30);
      expect(s.history).toHaveLength(30);
    });

    it(`books balance for a ${label}: assets = liabilities + equity, equity = capital + profit`, () => {
      const s = playFullGame(321, opts);
      const bs = balanceSheet(s);
      const profit = sumIncome(s.history).netProfit;
      expect(bs.totalAssets).toBeCloseTo(bs.totalLiabilities + bs.equity, 6);
      expect(bs.equity).toBeCloseTo(s.startingCapital + profit, 4);
    });
  }

  it('shows the weekly report after days 7, 14, 21 and 28 only', () => {
    let s = createNewGame(5);
    const weeklyDays: number[] = [];
    let guard = 0;
    while (s.phase !== 'final' && guard++ < 200) {
      if (s.phase === 'morning') {
        s = gameReducer(s, { type: 'buyShortfall' });
        s = gameReducer(s, { type: 'bake' });
      } else {
        if (s.phase === 'weekly') weeklyDays.push(s.day);
        s = gameReducer(s, { type: 'continue' });
      }
    }
    expect(weeklyDays).toEqual([7, 14, 21, 28]);
  });

  it('waste is costly: over-baking earns less than baking to forecast', () => {
    const steady = sumIncome(playFullGame(77).history);
    const over = sumIncome(playFullGame(77, { overbake: 1.4 }).history);
    expect(over.waste).toBeGreaterThan(steady.waste * 3);
    expect(over.netProfit).toBeLessThan(steady.netProfit);
  });

  it('restart produces a fresh day-1 game', () => {
    const done = playFullGame(9);
    const fresh = gameReducer(done, { type: 'newGame', seed: 10 });
    expect(fresh.day).toBe(1);
    expect(fresh.phase).toBe('morning');
    expect(fresh.history).toHaveLength(0);
    expect(fresh.cash).toBe(2500);
  });

  it('final report produces a descriptive profile, not a grade', () => {
    const s = playFullGame(55, { invest: true });
    const summary = finalSummary(s);
    const profile = businessProfile(s, summary);
    expect(profile.title.length).toBeGreaterThan(3);
    expect(profile.traits.map((t) => t.name)).toContain('Builder');
    expect(profile.reflections.length).toBeGreaterThan(0);
  });
});

describe('investment analysis', () => {
  it('payback = cost ÷ daily benefit and return = annual benefit ÷ cost', () => {
    let s = createNewGame(4);
    for (let i = 0; i < 5; i++) s = botDay(s);
    for (const id of ['oven', 'compost', 'reusable', 'solar'] as const) {
      const a = analyseInvestment(s, id);
      expect(a.dailyBenefit).toBeGreaterThanOrEqual(0);
      if (a.dailyBenefit > 0) {
        expect(a.paybackDays).toBeCloseTo(INVESTMENTS[id].cost / a.dailyBenefit, 9);
        expect(a.simpleAnnualReturn).toBeCloseTo((a.dailyBenefit * 365) / INVESTMENTS[id].cost, 9);
      }
    }
  });

  it('a capacity-constrained bakery values the efficient oven highly', () => {
    let s = createNewGame(4);
    for (let i = 0; i < 7; i++) s = botDay(s);
    const oven = analyseInvestment(s, 'oven');
    expect(oven.paybackDays).toBeLessThan(120);
  });

  it('the oven investment pays off within the season when financed by a loan', () => {
    const plain = playFullGame(31);
    const invest = playFullGame(31, { invest: true });
    expect(balanceSheet(invest).equity).toBeGreaterThan(balanceSheet(plain).equity);
  });
});

describe('weekly insights', () => {
  it('measures elasticity from observed data after removing non-price effects', () => {
    let s = createNewGame(8);
    s = { ...s, sandbox: true };
    for (let i = 0; i < 7; i++) s = botDay(s);
    s = gameReducer(s, { type: 'setPrice', product: 'matcha', price: 3.75 });
    for (let i = 0; i < 7; i++) s = botDay(s);
    const obs = observedElasticity(s.history.slice(0, 7), s.history.slice(7, 14), 'matcha');
    expect(obs).not.toBeNull();
    // True elasticity is −1.6; the hidden ±12% noise allows some error.
    expect(obs!.elasticity).toBeLessThan(-1.1);
    expect(obs!.elasticity).toBeGreaterThan(-2.1);
    const insights = weeklyInsights(s, s.history.slice(7, 14), s.history.slice(0, 7));
    expect(insights.some((i) => i.concept === 'elasticity')).toBe(true);
  });
});

describe('persistence', () => {
  it('saves and loads a game', () => {
    const store = memoryStorage();
    let s = createNewGame(2);
    s = botDay(s);
    expect(saveGame(s, store)).toBe(true);
    const loaded = loadGame(store) as GameState;
    expect(loaded).toEqual(s);
  });

  it('ignores corrupt or outdated saves', () => {
    const store = memoryStorage();
    store.setItem(SAVE_KEY, '{not json');
    expect(loadGame(store)).toBeNull();
    store.setItem(SAVE_KEY, JSON.stringify({ ...createNewGame(1), version: 999 }));
    expect(loadGame(store)).toBeNull();
    clearSave(store);
    expect(store.raw.size).toBe(0);
  });
});
