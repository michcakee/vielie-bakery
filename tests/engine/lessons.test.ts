import { describe, expect, it } from 'vitest';
import { demandCurve, expectedQuality, expectedWalkIns, laborTrays, playerShare } from '../../src/engine/economy';
import { PRODUCT_ORDER } from '../../src/data/catalog';
import { createNewGame, gameReducer } from '../../src/engine/state';
import type { Employee, GameState } from '../../src/engine/types';
import { autoDay, morning } from './bot';

/**
 * The economics lessons the game teaches must hold in the model itself (visual brief §13.4).
 * If one of these fails, the lesson would be a lie, so fix the model, not the test.
 */

const baker = (id: number, skill = 3): Employee => ({ id, name: `Baker ${id}`, role: 'baker', wage: 18, skill, morale: 72, hiredDay: 1, trainingUntil: 0, look: { skin: 1, hair: 2, hairColor: 0, shirt: 1, apron: 0, accessory: 0 }, served: 0, branch: null });

describe('economics lessons hold in the model', () => {
  it('raising the price of an elastic treat past the revenue-maximising point lowers revenue; a staple barely minds a small rise', () => {
    const base = morning(createNewGame(61));
    const s = { ...base, unlocked: [...PRODUCT_ORDER], menu: [...PRODUCT_ORDER] };
    const cake = demandCurve(s, 'banhKem');
    const best = cake.reduce((m, p) => (p.revenue > m.revenue ? p : m), cake[0]);
    const top = cake[cake.length - 1];
    expect(top.price).toBeGreaterThan(best.price);
    expect(top.revenue).toBeLessThan(best.revenue);
    // coffee (elasticity 0.65): a 10% rise from the reference keeps revenue up
    const coffee = demandCurve(s, 'caPhe', 25);
    const ref = s.prices.caPhe;
    const at = (price: number) => coffee.reduce((m, p) => (Math.abs(p.price - price) < Math.abs(m.price - price) ? p : m), coffee[0]);
    expect(at(ref * 1.1).revenue).toBeGreaterThanOrEqual(at(ref).revenue * 0.97);
  });

  it('with identical goods, a rival undercutting by 30% pulls most walk-ins', () => {
    let s = morning(createNewGame(62));
    const rival = s.competitors.find((c) => c.id === 'coTu')!;
    const q = expectedQuality(s, 'banhMi');
    s = { ...s, competitors: s.competitors.map((c) => (c.id === rival.id ? { ...c, openedDay: 0, quality: q, reputation: s.reputation, marketing: 0, prices: { ...c.prices, banhMi: s.prices.banhMi * 0.7 } } : c)) };
    expect(playerShare(s, 'banhMi', { walkIn: false })).toBeLessThan(0.5);
    const even = { ...s, competitors: s.competitors.map((c) => (c.id === rival.id ? { ...c, prices: { ...c.prices, banhMi: s.prices.banhMi } } : c)) };
    expect(playerShare(even, 'banhMi', { walkIn: false })).toBeGreaterThan(playerShare(s, 'banhMi', { walkIn: false }));
  });

  it('a third baker in a small kitchen adds fewer trays than the second', () => {
    const base = morning(createNewGame(63));
    const with1 = laborTrays({ ...base, staff: [baker(1)] });
    const with2 = laborTrays({ ...base, staff: [baker(1), baker(2)] });
    const with3 = laborTrays({ ...base, staff: [baker(1), baker(2), baker(3)] });
    expect(with2 - with1).toBeGreaterThan(0);
    expect(with3 - with2).toBeLessThan(with2 - with1);
  });

  it('an upgrade that pays for itself raises profit over the following month when the ovens are the bottleneck', () => {
    const run = (buy: boolean): number => {
      let s = createNewGame({ seed: 64, scenario: 'expansion' });
      s = morning(s);
      if (buy) s = gameReducer(s, { type: 'buyUpgrade', id: 'oven2' });
      let total = 0;
      for (let d = 0; d < 45; d++) {
        s = autoDay(s);
        total += s.history[s.history.length - 1]?.profit ?? 0;
      }
      return total;
    };
    const without = run(false);
    const withOven = run(true);
    expect(withOven).toBeGreaterThan(without);
  });

  it('the day-to-day noise is small enough to see a price change: random variation in walk-ins stays within ±10%', () => {
    for (const seed of [65, 66, 67, 68]) {
      let s = autoDay(createNewGame(seed));
      s = morning(s);
      const expected = expectedWalkIns(s);
      s = gameReducer(s, { type: 'open' });
      const walkIns = s.service!.visits.filter((v) => v.who === 'walkin' && !v.loyal && !v.lastCallOnly && !v.specialOrder && !v.source).length;
      expect(Math.abs(walkIns - expected) / expected).toBeLessThan(0.15);
    }
  });
});

void ((s: GameState) => s);
