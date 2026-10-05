import { describe, expect, it } from 'vitest';
import { owns, starsToSpend } from '../../src/data/cosmetics';
import { BLOCKED, clampPlace, COUNTER_BAND, DECO_SETS, DECOS, MAX_TIER, RENOVATIONS } from '../../src/data/shopfit';
import { LEVELS } from '../../src/data/catalog';
import { balanceSheet, bookEquity } from '../../src/engine/accounting';
import { expectedWalkIns } from '../../src/engine/economy';
import { exportCode, importCode, validSave } from '../../src/engine/save';
import { createNewGame, DEFAULT_LOOK, gameReducer } from '../../src/engine/state';
import type { GameState } from '../../src/engine/types';
import { act } from './bot';

const start = (): GameState => act(createNewGame(11), { type: 'setup', name: 'Shop', look: DEFAULT_LOOK });
const withCash = (s: GameState, cash: number): GameState => ({ ...s, cash, equity: { ...s.equity, contributed: s.equity.contributed + cash - s.cash } });
const atLevel = (s: GameState, level: number): GameState => ({ ...s, xp: LEVELS[level - 1].xp });
const withStars = (s: GameState, n: number): GameState => ({ ...s, questProgress: { ...s.questProgress, stars: (s.questProgress.stars ?? 0) + n } });
const balanced = (s: GameState) => expect(balanceSheet(s).equity).toBeCloseTo(bookEquity(s), 1);

describe('renovations: the bakery levels up', () => {
  it('each level needs its player level and the cash, costs what it says, and brings more people in', () => {
    let s = withCash(start(), 40000);
    // Level 1 player: the first renovation is locked.
    expect(act(s, { type: 'renovate' }).shopTier ?? 0).toBe(0);
    s = atLevel(s, 6);
    const base = s;
    for (let t = 1; t <= MAX_TIER; t++) {
      const spent = s.today.books.otherExpense;
      const rep = s.reputation;
      s = act(s, { type: 'renovate' });
      expect(s.shopTier).toBe(t);
      expect(s.today.books.otherExpense - spent).toBeCloseTo(RENOVATIONS[t].cost, 2);
      expect(s.reputation).toBeGreaterThanOrEqual(rep);
      balanced(s);
    }
    // No level past the top.
    expect(act(s, { type: 'renovate' })).toBe(s);
    // (Day 1 always has its fixed first few customers, so compare on a later day.)
    const later = { ...s, day: 9 };
    expect(expectedWalkIns(later) / expectedWalkIns({ ...later, shopTier: 0 })).toBeCloseTo(1 + RENOVATIONS[MAX_TIER].walkIns, 5);
    expect(expectedWalkIns(later)).toBeGreaterThan(expectedWalkIns({ ...base, day: 9 }));
  });

  it('is refused without the cash, or while the shop is open', () => {
    const s = atLevel(withCash(start(), 100), 6);
    expect(act(s, { type: 'renovate' })).toBe(s);
    const open = act(withCash(atLevel(start(), 6), 5000), { type: 'bake', item: 'flan', process: 80 }, { type: 'open' });
    expect(open.phase).toBe('service');
    expect(act(open, { type: 'renovate' })).toBe(open);
  });
});

describe('star-shop decorations and themed sets', () => {
  it('cost stars, never cash, and a full set says so', () => {
    let s = withStars(start(), 200);
    const set = DECO_SETS[0];
    const cash = s.cash;
    for (const id of set.items) s = act(s, { type: 'buyCosmetic', id });
    expect(set.items.every((id) => owns(s, id))).toBe(true);
    expect(s.cash).toBe(cash);
    expect(starsToSpend(s)).toBe(200 - set.items.reduce((t, id) => t + DECOS[id].cost, 0));
    expect(s.toasts.some((t) => t.title === `Set complete: ${set.name}!`)).toBe(true);
  });

  it('a garland can only be hung once it is yours', () => {
    let s = withStars(start(), 50);
    const i = 1; // the silk lantern string
    expect(act(s, { type: 'setStyle', key: 'garland', value: i }).style?.garland ?? 0).toBe(0);
    s = act(s, { type: 'buyCosmetic', id: 'silkLanterns' });
    expect(act(s, { type: 'setStyle', key: 'garland', value: i }).style?.garland).toBe(i);
  });

  it('shop front, sign and team aprons stay inside their lists', () => {
    let s = start();
    s = act(s, { type: 'setStyle', key: 'awning', value: 3 }, { type: 'setStyle', key: 'sign', value: 99 }, { type: 'setStyle', key: 'uniform', value: -4 });
    expect(s.style?.awning).toBe(3);
    expect(s.style?.sign).toBe(4);
    expect(s.style?.uniform).toBe(0);
  });
});

describe('placing things anywhere on the floor', () => {
  it('only things you have can be placed, and they stay on the floor and out from behind the counter', () => {
    let s = withStars(start(), 50);
    expect(act(s, { type: 'placeDecor', id: 'fishTank', x: 130, y: 102 })).toBe(s);
    s = act(s, { type: 'buyCosmetic', id: 'fishTank' }, { type: 'placeDecor', id: 'fishTank', x: 130, y: 102 });
    expect(s.style?.pos?.fishTank).toEqual({ x: 130, y: 102 });
    // Off the edge: pulled back in.
    s = act(s, { type: 'placeDecor', id: 'fishTank', x: 999, y: -50 });
    const at = s.style!.pos!.fishTank;
    expect(at.x + 18).toBeLessThanOrEqual(234);
    expect(at.y).toBeGreaterThanOrEqual(44);
    // Behind the counter: nudged out.
    const behind = clampPlace('fishTank', 120, 60);
    const overlaps = behind.x + 18 > COUNTER_BAND.x0 && behind.x < COUNTER_BAND.x1 && behind.y + 18 > COUNTER_BAND.y0 && behind.y < COUNTER_BAND.y1;
    expect(overlaps).toBe(false);
    // On a café table (where it would be hidden): nudged off it.
    const table = clampPlace('fishTank', 130, 136);
    for (const b of BLOCKED) expect(table.x + 18 > b.x0 && table.x < b.x1 && table.y + 18 > b.y0 && table.y < b.y1).toBe(false);
    // Anywhere at all ends up somewhere visible.
    for (let x = 0; x < 240; x += 7) for (let y = 30; y < 170; y += 7) {
      const at = clampPlace('kumquatTree', x, y);
      for (const b of BLOCKED) expect(at.x + 14 > b.x0 && at.x < b.x1 && at.y + 22 > b.y0 && at.y < b.y1).toBe(false);
    }
    // Garlands aren't floor pieces.
    s = act(s, { type: 'buyCosmetic', id: 'neonStrip' });
    expect(act(s, { type: 'placeDecor', id: 'neonStrip', x: 50, y: 100 })).toBe(s);
  });

  it('a bakery with all of it saves and loads, and old saves without it still load', async () => {
    let s = withStars(atLevel(withCash(start(), 5000), 3), 300);
    s = act(s, { type: 'renovate' }, { type: 'renovate' }, { type: 'buyCosmetic', id: 'kumquatTree' }, { type: 'placeDecor', id: 'kumquatTree', x: 30, y: 120 }, { type: 'setStyle', key: 'awning', value: 2 }, { type: 'setStyle', key: 'uniform', value: 6 });
    expect(validSave(s)).toBe(true);
    const back = await importCode(await exportCode(s));
    expect(back?.shopTier).toBe(2);
    expect(back?.style?.pos?.kumquatTree).toEqual({ x: 30, y: 120 });
    expect(back?.style?.uniform).toBe(6);
    const old = { ...s, shopTier: undefined, style: { wall: 0, pattern: 0, floor: 0, counter: 0, spots: {} } };
    expect(validSave(old as GameState)).toBe(true);
    // An old save plays a day normally.
    const played = gameReducer(old as GameState, { type: 'bake', item: 'flan', process: 80 });
    expect(played.traysToday).toBe(1);
  });
});
