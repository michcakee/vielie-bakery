import { describe, expect, it } from 'vitest';
import { OVEN_CAPACITY_MINUTES, PRODUCTS } from '../src/config/balance';
import { competitorShare, demandBreakdown, ovenCapacity, unitEconomics } from '../src/game/economy';
import { generateMarket } from '../src/game/market';
import { createNewGame } from '../src/game/state';

describe('demand model', () => {
  const state = createNewGame(42);
  const m = state.market;

  it('demand falls when price rises', () => {
    const low = demandBreakdown(state, m, 'muffin', 3).expected;
    const ref = demandBreakdown(state, m, 'muffin', 3.75).expected;
    const high = demandBreakdown(state, m, 'muffin', 5).expected;
    expect(low).toBeGreaterThan(ref);
    expect(ref).toBeGreaterThan(high);
  });

  it('applies constant elasticity: a 10% price rise changes demand by (1.1^e − 1)', () => {
    for (const id of ['sourdough', 'matcha'] as const) {
      const p = PRODUCTS[id];
      const base = demandBreakdown(state, m, id, p.refPrice).expected;
      const up = demandBreakdown(state, m, id, p.refPrice * 1.1).expected;
      expect(up / base).toBeCloseTo(Math.pow(1.1, p.elasticity), 6);
    }
  });

  it('elastic products lose more customers to a price rise than inelastic ones', () => {
    const drop = (id: 'sourdough' | 'matcha') => {
      const p = PRODUCTS[id];
      return 1 - demandBreakdown(state, m, id, p.refPrice * 1.2).expected / demandBreakdown(state, m, id, p.refPrice).expected;
    };
    expect(drop('matcha')).toBeGreaterThan(drop('sourdough'));
  });

  it('expected demand equals base × price factor × non-price factors', () => {
    const bd = demandBreakdown(state, m, 'croissant', 5);
    expect(bd.expected).toBeCloseTo(bd.base * bd.priceFactor * bd.nonPriceMultiplier * (1 - bd.competitorShare), 9);
  });

  it('competitor takes a larger share when you price above them', () => {
    const later = { ...generateMarket(1, 22, null), competitorActive: true };
    const cheap = competitorShare('croissant', 3.5, later, 50);
    const pricey = competitorShare('croissant', 6, later, 50);
    expect(pricey).toBeGreaterThan(cheap);
    expect(competitorShare('croissant', 6, later, 90)).toBeLessThan(pricey);
    expect(competitorShare('croissant', 6, m, 50)).toBe(0); // no competitor in week 1
  });
});

describe('costs', () => {
  it('efficient oven raises capacity by 30%', () => {
    expect(ovenCapacity([])).toBe(OVEN_CAPACITY_MINUTES);
    expect(ovenCapacity(['oven'])).toBe(Math.round(OVEN_CAPACITY_MINUTES * 1.3));
  });

  it('contribution = price − marginal cost, and every product is profitable at its reference price', () => {
    const s = createNewGame(3);
    for (const id of Object.keys(PRODUCTS) as (keyof typeof PRODUCTS)[]) {
      const ue = unitEconomics(s, s.market, id);
      expect(ue.contribution).toBeCloseTo(ue.price - ue.ingredients - ue.packaging - ue.energy, 9);
      expect(ue.contribution).toBeGreaterThan(0);
    }
  });

  it('market is deterministic for a seed', () => {
    const a = generateMarket(7, 5, generateMarket(7, 4, null));
    const b = generateMarket(7, 5, generateMarket(7, 4, null));
    expect(a).toEqual(b);
  });
});
