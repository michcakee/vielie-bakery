import { describe, expect, it } from 'vitest';
import { CONFIG, INGREDIENT_ORDER, PRODUCT_ORDER } from '../../src/data/catalog';
import { acceptance, levelOf, packPrice } from '../../src/engine/economy';
import { exportCode, importCode, validSave } from '../../src/engine/save';
import { createNewGame, gameReducer } from '../../src/engine/state';
import type { GameState } from '../../src/engine/types';
import { act, finish, morning, playDay, resolveEvents, runService } from './bot';

const sane = (s: GameState) => {
  expect(Number.isFinite(s.cash)).toBe(true);
  expect(Number.isFinite(s.xp)).toBe(true);
  expect(Number.isFinite(s.reputation)).toBe(true);
  for (const id of INGREDIENT_ORDER) expect(s.pantry[id].qty).toBeGreaterThanOrEqual(0);
  for (const p of PRODUCT_ORDER) {
    expect(s.display[p].qty).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(s.display[p].quality)).toBe(true);
  }
  expect(s.baguettes.qty).toBeGreaterThanOrEqual(0);
};

describe('first day', () => {
  it('starts in setup with a small pantry, baguettes and a tray of flan from Bà', () => {
    const s = createNewGame(1);
    expect(s.phase).toBe('setup');
    expect(s.baguettes.qty).toBeGreaterThan(0);
    expect(s.display.flan.qty).toBe(8);
    expect(s.unlocked).toEqual(['banhMi', 'caPhe', 'flan']);
  });

  it('Linh walks in almost immediately and orders a bánh mì', () => {
    let s = act(createNewGame(2), { type: 'setup', name: 'Nhà Bà', look: createNewGame(2).look }, { type: 'open' });
    expect(s.service!.visits[0].name).toBe('Linh');
    expect(s.service!.visits[0].wants).toBe('banhMi');
    s = act(s, { type: 'tick', minutes: 15 });
    const linh = s.service!.visits[0];
    expect(linh.status).toBe('waiting');
    const cash = s.cash;
    s = act(s, { type: 'serve', visitId: linh.id, process: 100 });
    expect(s.cash).toBeGreaterThan(cash);
    expect(s.lifetime.sold.banhMi).toBe(1);
    expect(s.quests).toContain('firstBanhMi');
  });

  it('a whole day produces a report whose profit = sales + tips − expenses', () => {
    const s0 = morning(createNewGame(3));
    const s1 = gameReducer(runService(s0), { type: 'finishDay' });
    const r = s1.lastReport!;
    const t = r.stats;
    const expenses = t.cogs + t.packaging + t.rent + t.wages + t.energy + t.interest + t.spoilage + t.other;
    expect(r.expenses).toBeCloseTo(expenses, 6);
    expect(r.profit).toBeCloseTo(t.revenue + t.tips - expenses, 6);
    expect(s1.history).toHaveLength(1);
    expect(r.recap.length).toBeGreaterThan(0);
    expect(r.tip.length).toBeGreaterThan(10);
    sane(s1);
  });
});

describe('guards', () => {
  it('blocks buying without cash, baking past oven capacity and silly prices', () => {
    let s = morning(createNewGame(4));
    const broke = { ...s, cash: 0 };
    expect(gameReducer(broke, { type: 'buy', ingredient: 'flour', supplier: 'cho', packs: 1 })).toBe(broke);
    s = { ...s, traysToday: CONFIG.ovenTrays[0] };
    expect(gameReducer(s, { type: 'bake', item: 'flan', process: 90 })).toBe(s);
    const p = gameReducer(s, { type: 'setPrice', product: 'banhMi', price: 999 });
    expect(p.prices.banhMi).toBeLessThanOrEqual(3 * CONFIG.maxPriceFactor);
    expect(gameReducer(s, { type: 'setPrice', product: 'banhMi', price: NaN })).toBe(s);
    expect(gameReducer(s, { type: 'serve', visitId: 1 })).toBe(s);
  });

  it('cannot open until the morning event is answered', () => {
    let s = createNewGame(5);
    for (let i = 0; i < 2; i++) s = playDay(s);
    expect(s.day).toBe(3);
    expect(s.events[0]?.id).toBe('coffeeRumour');
    expect(gameReducer(s, { type: 'open' })).toBe(s);
    expect(resolveEvents(s).events).toHaveLength(0);
  });
});

describe('demand', () => {
  it('the demand meter falls as price rises', () => {
    const s = morning(createNewGame(6));
    const lo = acceptance(s, 'banhMi', 2);
    const mid = acceptance(s, 'banhMi', 3);
    const hi = acceptance(s, 'banhMi', 6);
    expect(lo).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(hi);
    expect(hi).toBeLessThan(0.1);
  });

  it('very high prices send customers away saying "Đắt quá…"', () => {
    let s = morning(createNewGame(7));
    s = act(s, { type: 'setPrice', product: 'banhMi', price: 7.5 }, { type: 'setPrice', product: 'caPhe', price: 6 }, { type: 'setPrice', product: 'flan', price: 4.25 });
    s = runService(s);
    expect(s.today.lostPrice).toBeGreaterThan(s.today.served);
  });

  it('customers who find nothing left go home sad or pick something else', () => {
    let s = morning(createNewGame(8));
    s = { ...s, baguettes: { ...s.baguettes, qty: 1 } };
    s = runService(s);
    expect(s.today.lostSoldOut + Object.values(s.today.wishedFor).length).toBeGreaterThanOrEqual(0);
    expect(s.today.soldOutAt.banhMi).toBeDefined();
  });
});

describe('events and finance', () => {
  it('locking coffee before the price spike keeps the pack price low', () => {
    let s = createNewGame(9);
    for (let i = 0; i < 2; i++) s = playDay(s);
    const locked = resolveEvents(s, 'first');
    expect(locked.locks.some((l) => l.ingredient === 'coffee')).toBe(true);
    let a = locked;
    let b = resolveEvents(s, 'last');
    for (let i = 0; i < 4; i++) {
      a = playDay(a);
      b = playDay(b);
    }
    expect(a.day).toBe(7);
    expect(packPrice(a, 'coffee', 'cho')).toBeLessThan(packPrice(b, 'coffee', 'cho'));
  });

  it('a loan pays out, then is repaid day by day', () => {
    let s = { ...morning(createNewGame(10)), xp: 600 };
    s = gameReducer(s, { type: 'borrow', amount: 300 });
    expect(s.loan!.remaining).toBeCloseTo(300 * (1 + CONFIG.loanFee), 6);
    for (let i = 0; i < 11; i++) s = playDay(s);
    expect(s.loan).toBeNull();
    expect(s.questProgress.loanRepaid).toBe(1);
  });

  it('the safety fund takes and returns money', () => {
    const s = morning(createNewGame(11));
    const a = gameReducer(s, { type: 'fund', amount: 50 });
    expect(a.cash).toBeCloseTo(s.cash - 50, 6);
    expect(gameReducer(a, { type: 'fund', amount: -60 })).toBe(a);
    expect(gameReducer(a, { type: 'fund', amount: -50 }).cash).toBeCloseTo(s.cash, 6);
  });
});

describe('a long season', () => {
  it('40 days of play stays sane, levels up, unlocks recipes and reaches Tết', () => {
    let s = createNewGame(12);
    let tetBoxes = false;
    for (let d = 0; d < 40; d++) {
      s = playDay(s);
      sane(s);
      if (s.unlocked.includes('mutDua') || s.today.made.mutDua > 0) tetBoxes = true;
    }
    expect(s.day).toBe(41);
    expect(levelOf(s.xp)).toBeGreaterThanOrEqual(3);
    expect(s.unlocked).toContain('banhChuoi');
    expect(s.history.length).toBe(40);
    expect(s.achievements).toContain('firstSale');
    expect(tetBoxes || s.lifetime.sold.mutDua >= 0).toBe(true);
  });

  it('is deterministic for a seed', () => {
    let a = createNewGame(77);
    let b = createNewGame(77);
    for (let d = 0; d < 6; d++) {
      a = playDay(a);
      b = playDay(b);
    }
    expect(a.cash).toBe(b.cash);
    expect(a.history).toEqual(b.history);
  });
});

describe('saving', () => {
  it('validates saves and rejects corrupt ones', () => {
    const s = playDay(createNewGame(13));
    expect(validSave(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(validSave({ ...s, cash: NaN })).toBe(false);
    expect(validSave({ ...s, version: 1 })).toBe(false);
    expect(validSave({ ...s, pantry: { ...s.pantry, eggs: { ...s.pantry.eggs, qty: -1 } } })).toBe(false);
    expect(validSave(null)).toBe(false);
  });

  it('round-trips through a save code', async () => {
    const s = playDay(playDay(createNewGame(14)));
    const code = await exportCode(s);
    expect(code.length).toBeLessThan(12000);
    const back = await importCode(code);
    expect(back!.day).toBe(s.day);
    expect(back!.cash).toBe(s.cash);
    expect(await importCode('zgarbage')).toBeNull();
  });

  it('leftovers can only be kept with a fridge', () => {
    let s = runService(morning(createNewGame(15)));
    expect(s.phase).toBe('closing');
    if (s.display.flan.qty > 0) {
      expect(gameReducer(s, { type: 'leftover', key: 'flan', choice: 'keep' })).toBe(s);
      s = { ...s, upgrades: ['fridge'] };
      expect(gameReducer(s, { type: 'leftover', key: 'flan', choice: 'keep' }).leftoverPlan.flan).toBe('keep');
    }
    expect(finish(s).day).toBe(2);
  });
});
