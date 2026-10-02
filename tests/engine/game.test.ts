import { describe, expect, it } from 'vitest';
import { ECON } from '../../src/data/config';
import { PRODUCTS } from '../../src/data/catalog';
import { acceptance, elasticityAt, priceBounds } from '../../src/engine/economy';
import { exportCode, importCode, loadGame, migrateV2, saveGame, validSave, SLOT_PREFIX, BACKUP_SUFFIX, LEGACY_V2_KEY } from '../../src/engine/save';
import { createNewGame, gameReducer } from '../../src/engine/state';
import type { GameState } from '../../src/engine/types';
import { act, autoDay, finish, morning, playDay, resolveEvents, runService } from './bot';

export const sane = (s: GameState) => {
  expect(Number.isFinite(s.cash)).toBe(true);
  expect(Number.isFinite(s.xp)).toBe(true);
  expect(Number.isFinite(s.reputation)).toBe(true);
  for (const p of Object.values(s.pantry)) expect(p.qty).toBeGreaterThanOrEqual(0);
  for (const d of Object.values(s.display)) {
    expect(d.qty).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(d.quality)).toBe(true);
  }
  expect(s.baguettes.qty).toBeGreaterThanOrEqual(0);
  expect(s.staff.length).toBeGreaterThanOrEqual(0);
  for (const l of s.loans) expect(l.balance).toBeGreaterThanOrEqual(0);
};

function memoryStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

describe('first day (Family Business)', () => {
  it('starts with Bà\'s oven, baguettes, flan and a small pantry', () => {
    const s = createNewGame(1);
    expect(s.phase).toBe('setup');
    expect(s.equipment.map((e) => e.kind)).toEqual(['ovenBasic']);
    expect(s.baguettes.qty).toBeGreaterThan(0);
    expect(s.display.flan.qty).toBe(8);
    expect(s.unlocked).toEqual(['banhMi', 'caPhe', 'flan']);
    expect(s.prepaidRent).toBeGreaterThan(0);
  });

  it('Linh walks in almost immediately and orders a bánh mì', () => {
    let s = act(createNewGame(2), { type: 'setup', name: 'Nhà Bà', look: createNewGame(2).look }, { type: 'open' });
    expect(s.service!.visits[0].name).toBe('Linh');
    s = act(s, { type: 'tick', minutes: 15 });
    const linh = s.service!.visits[0];
    expect(linh.status).toBe('waiting');
    const cash = s.cash;
    s = act(s, { type: 'serve', visitId: linh.id, process: 100 });
    expect(s.cash).toBeGreaterThan(cash);
    expect(s.lifetime.sold.banhMi).toBe(1);
    expect(s.quests).toContain('firstBanhMi');
  });

  it('the startup scenario begins with $10,000 and an empty kitchen', () => {
    const s = createNewGame({ seed: 3, scenario: 'startup' });
    expect(s.cash).toBe(10000);
    expect(s.equipment).toHaveLength(0);
    const chosen = act(s, { type: 'setup', name: 'New', look: s.look, location: 'university' });
    expect(chosen.location).toBe('university');
  });
});

describe('guards and exploits', () => {
  it('blocks buying without cash, baking past capacity and silly prices', () => {
    let s = morning(createNewGame(4));
    const broke = { ...s, cash: 0 };
    expect(gameReducer(broke, { type: 'buy', ingredient: 'flour', supplier: 'cho', packs: 1 })).toBe(broke);
    s = { ...s, traysToday: 99 };
    expect(gameReducer(s, { type: 'bake', item: 'flan', process: 90 })).toBe(s);
    const p = gameReducer(s, { type: 'setPrice', product: 'banhMi', price: 999 });
    expect(p.prices.banhMi).toBeLessThanOrEqual(priceBounds(s, 'banhMi')[1]);
    expect(gameReducer(s, { type: 'setPrice', product: 'banhMi', price: NaN })).toBe(s);
    expect(gameReducer(s, { type: 'serve', visitId: 1 })).toBe(s);
  });

  it('the distributor refuses tiny orders', () => {
    const s = morning(createNewGame(4));
    expect(gameReducer(s, { type: 'buy', ingredient: 'flour', supplier: 'distributor', packs: 2 })).toBe(s);
    const ok = gameReducer(s, { type: 'buy', ingredient: 'flour', supplier: 'distributor', packs: 5 });
    expect(ok.deliveries).toHaveLength(1);
    expect(ok.pantry.flour.qty).toBe(s.pantry.flour.qty);
  });

  it('buying and reselling equipment always loses money', () => {
    let s = { ...morning(createNewGame(5)), cash: 20000 };
    const before = s.cash;
    s = gameReducer(s, { type: 'buyUpgrade', id: 'fridge' });
    const uid = s.equipment.find((e) => e.kind === 'fridge')!.uid;
    s = gameReducer(s, { type: 'sellEquipment', uid });
    expect(s.cash).toBeLessThan(before);
  });

  it('cannot fire someone who does not exist or hire a stranger', () => {
    const s = morning(createNewGame(6));
    expect(gameReducer(s, { type: 'fire', id: 123456 })).toBe(s);
    expect(gameReducer(s, { type: 'hire', applicantId: 123456 })).toBe(s);
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
    expect(acceptance(s, 'banhMi', 4)).toBeGreaterThan(acceptance(s, 'banhMi', 6.5));
    expect(acceptance(s, 'banhMi', 6.5)).toBeGreaterThan(acceptance(s, 'banhMi', 12));
    expect(acceptance(s, 'banhMi', 15)).toBeLessThan(0.1);
  });

  it('coffee regulars barely notice a price rise; cakes are elastic', () => {
    const s = morning(createNewGame(7));
    const coffee = Math.abs(elasticityAt(s, 'caPhe'));
    const flan = Math.abs(elasticityAt(s, 'flan'));
    expect(coffee).toBeLessThan(flan);
  });

  it('a better reputation lets you charge more', () => {
    const s = morning(createNewGame(8));
    expect(acceptance({ ...s, reputation: 90 }, 'banhMi', 7.5)).toBeGreaterThan(acceptance({ ...s, reputation: 20 }, 'banhMi', 7.5));
  });

  it('very high prices send customers away saying "Đắt quá…"', () => {
    let s = morning(createNewGame(7));
    s = act(s, { type: 'setPrice', product: 'banhMi', price: 15 }, { type: 'setPrice', product: 'caPhe', price: 12 }, { type: 'setPrice', product: 'flan', price: 8 });
    s = runService(s);
    expect(s.today.lostPrice).toBeGreaterThan(s.today.served);
  });

  it('sales a product never makes are tracked as lost demand', () => {
    let s = morning(createNewGame(9));
    s = { ...s, baguettes: { ...s.baguettes, qty: 1 } };
    s = runService(s);
    expect(s.today.soldOutAt.banhMi).toBeDefined();
  });
});

describe('a long season', () => {
  it('60 days of hand-played and staff-run days stay sane', () => {
    let s = createNewGame(12);
    for (let d = 0; d < 60; d++) {
      s = d < 25 ? playDay(s) : autoDay(s);
      sane(s);
    }
    expect(s.day).toBeGreaterThan(55);
    expect(s.history.length).toBeGreaterThan(50);
    expect(s.achievements).toContain('firstSale');
  });

  it('is deterministic for a seed', () => {
    let a = createNewGame(77);
    let b = createNewGame(77);
    for (let d = 0; d < 8; d++) {
      a = playDay(a);
      b = playDay(b);
    }
    expect(a.cash).toBe(b.cash);
    expect(a.history.map((h) => h.profit)).toEqual(b.history.map((h) => h.profit));
  });
});

describe('saving', () => {
  it('validates saves and rejects corrupt ones', () => {
    const s = playDay(createNewGame(13));
    expect(validSave(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(validSave({ ...s, cash: NaN })).toBe(false);
    expect(validSave({ ...s, version: 2 })).toBe(false);
    expect(validSave({ ...s, pantry: { ...s.pantry, eggs: { ...s.pantry.eggs, qty: -1 } } })).toBe(false);
    expect(validSave(null)).toBe(false);
  });

  it('round-trips through a save code, loans included', async () => {
    let s = playDay(createNewGame(14));
    s = morning(s);
    s = gameReducer(s, { type: 'takeLoan', principal: 3000, term: 12 });
    const code = await exportCode(s);
    const back = await importCode(code);
    expect(back!.day).toBe(s.day);
    expect(back!.cash).toBe(s.cash);
    expect(back!.loans).toHaveLength(1);
    expect(back!.loans[0].balance).toBe(3000);
    expect(await importCode('zgarbage')).toBeNull();
  });

  it('a corrupted slot falls back to the weekly backup', () => {
    const store = memoryStore();
    const s = playDay(createNewGame(15));
    store.setItem(SLOT_PREFIX + 1 + BACKUP_SUFFIX, JSON.stringify(s));
    store.setItem(SLOT_PREFIX + 1, '{not json');
    expect(loadGame(1, store)!.day).toBe(s.day);
    expect(saveGame(s, 2, store)).toBe(true);
    expect(loadGame(2, store)!.cash).toBe(s.cash);
  });

  it('a v2 save is migrated, not wiped, and the original kept', () => {
    const store = memoryStore();
    const v2 = { version: 2, seed: 9, day: 12, bakeryName: 'Old Faithful', cash: 300, safetyFund: 50, xp: 200, reputation: 55, community: 30, prices: { banhMi: 3.25, caPhe: 2.5, flan: 1.75 }, pantry: { flour: { qty: 20, avgCost: 0.4, quality: 70, eco: 50 } }, display: {}, upgrades: ['fridge', 'helper'], decor: ['plant'], unlocked: ['banhMi', 'caPhe', 'flan', 'pateChaud'], lifetime: { served: 300, revenue: 900, profit: 200, sold: { banhMi: 120 } }, market: {} };
    store.setItem(LEGACY_V2_KEY, JSON.stringify(v2));
    const s = loadGame(1, store)!;
    expect(s.bakeryName).toBe('Old Faithful');
    expect(s.day).toBe(12);
    expect(s.cash).toBeCloseTo(660, 2);
    expect(s.prices.banhMi).toBeCloseTo(7, 1);
    expect(s.upgrades).toContain('fridge');
    expect(s.staff[0].name).toBe('Cô Ba');
    expect(store.getItem(LEGACY_V2_KEY)).not.toBeNull();
    expect(migrateV2({ version: 1 })).toBeNull();
  });

  it('leftovers can only be kept with a working fridge', () => {
    let s = runService(morning(createNewGame(15)));
    expect(s.phase).toBe('closing');
    if (s.display.flan.qty > 0) {
      expect(gameReducer(s, { type: 'leftover', key: 'flan', choice: 'keep' })).toBe(s);
      const fridge = { ...s, upgrades: [...s.upgrades, 'fridge' as const], equipment: [...s.equipment, { uid: 99, kind: 'fridge' as const, cost: 1600, boughtDay: 1, depreciated: 0, broken: false }] };
      expect(gameReducer(fridge, { type: 'leftover', key: 'flan', choice: 'keep' }).leftoverPlan.flan).toBe('keep');
    }
    expect(finish(s).day).toBe(2);
  });
});

describe('content', () => {
  it('every product has a sprite-friendly id, a positive price and a recipe', () => {
    for (const p of Object.values(PRODUCTS)) {
      expect(p.ref).toBeGreaterThan(0);
      expect(Object.keys(p.recipe).length).toBeGreaterThan(0);
      expect(p.elasticity).toBeGreaterThan(0);
    }
    expect(ECON.calendar.daysPerMonth).toBe(30);
  });
});
