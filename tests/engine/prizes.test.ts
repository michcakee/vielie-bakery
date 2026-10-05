import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/catalog';
import { checkProgress, levelGift, QUESTS, weeklyReward } from '../../src/engine/progression';
import { createNewGame, DEFAULT_LOOK } from '../../src/engine/state';
import type { GameState } from '../../src/engine/types';
import { act, kidDay } from './bot';

const start = (): GameState => act(createNewGame({ seed: 21, guided: true }), { type: 'setup', name: 'Shop', look: DEFAULT_LOOK });

describe('prize money stays a treat, not a wage', () => {
  it('over the first three weeks, sales earn far more than prizes', () => {
    let s = start();
    let sales = 0;
    let prizes = 0;
    for (let d = 0; d < 21 && !s.ending; d++) {
      s = kidDay(s);
      sales += s.lastReport!.stats.books.sales;
      prizes += s.lastReport!.stats.books.otherIncome;
    }
    expect(prizes).toBeLessThan(sales * 0.2);
    expect(levelGift(2)).toBeLessThan(100);
    expect(weeklyReward(s)).toBeLessThan(100);
  });

  it('legend goals wait for level 8, even when their target is already met', () => {
    const s: GameState = { ...start(), community: 95 };
    expect(checkProgress(s).quests).not.toContain('legendCommunity');
    const legend = checkProgress({ ...s, xp: LEVELS[7].xp });
    expect(legend.quests).toContain('legendCommunity');
  });

  it('“Big day” counts what the bakery earned, not prize money', () => {
    let s = kidDay(start());
    const h = s.history[s.history.length - 1];
    const big = QUESTS.find((q) => q.id === 'bigDay')!;
    // A day whose profit is all prize money doesn't count…
    s = { ...s, history: [...s.history.slice(0, -1), { ...h, profit: 300, books: { ...h.books!, otherIncome: 290 } }] };
    expect(big.progress(s)).toBeLessThan(big.target);
    // …but $300 earned from sales does.
    s = { ...s, history: [...s.history.slice(0, -1), { ...h, profit: 300, books: { ...h.books!, otherIncome: 0 } }] };
    expect(big.progress(s)).toBeGreaterThanOrEqual(big.target);
  });
});

describe('event choices', () => {
  it('the welcome flan works with an empty case (Bà makes one)', () => {
    let s = start();
    s = { ...s, display: { ...s.display, flan: { ...s.display.flan, qty: 0 } }, events: [{ id: 'competitor', day: s.day }] };
    const after = act(s, { type: 'resolveEvent', choice: 'welcome' });
    expect(after.events).toHaveLength(0);
    expect(after.community).toBeGreaterThan(s.community);
  });

  it('a choice you can’t afford is refused by the engine too, not just greyed out', () => {
    let s = start();
    s = { ...s, cash: 50, events: [{ id: 'fridgeBroke', day: s.day }] };
    const after = act(s, { type: 'resolveEvent', choice: 'repair' });
    expect(after.events).toHaveLength(1);
    expect(after.cash).toBe(50);
  });
});
