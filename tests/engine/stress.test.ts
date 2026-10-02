import { describe, expect, it } from 'vitest';
import { balanceSheet, bookEquity } from '../../src/engine/accounting';
import { createNewGame, gameReducer, type Action } from '../../src/engine/state';
import { rngFor } from '../../src/engine/rng';
import { SCENARIOS } from '../../src/data/world';
import { INGREDIENTS, PRODUCTS, UPGRADES } from '../../src/data/catalog';
import type { GameState, IngredientId, ProductId, UpgradeId } from '../../src/engine/types';
import { autoDay, morning, playDay } from './bot';
import { sane } from './game.test';

/** Walks the whole state and fails on any NaN or ±Infinity number. */
function noBadNumbers(v: unknown, path = 's', seen = new Set<unknown>()) {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`${path} is ${v}`);
    return;
  }
  if (!v || typeof v !== 'object' || seen.has(v)) return;
  seen.add(v);
  for (const [k, x] of Object.entries(v)) noBadNumbers(x, `${path}.${k}`, seen);
}

function check(s: GameState) {
  sane(s);
  noBadNumbers(s);
  expect(balanceSheet(s).equity).toBeCloseTo(bookEquity(s), 0);
  for (const e of s.staff) expect(e.wage).toBeGreaterThan(0);
  for (const p of Object.values(s.prices)) expect(p).toBeGreaterThan(0);
}

const HOSTILE = [NaN, Infinity, -Infinity, -1, -1e9, 0, 0.0001, 1e12];

describe('long playthroughs', () => {
  for (const scenario of Object.keys(SCENARIOS)) {
    it(`${scenario}: six months on autopilot stay consistent`, () => {
      let s = createNewGame({ seed: 7, scenario: scenario as keyof typeof SCENARIOS });
      for (let d = 0; d < 180 && s.phase !== 'ended'; d++) {
        s = autoDay(s);
        if (d % 30 === 0) check(s);
      }
      check(s);
      expect(s.day).toBeGreaterThan(30);
    });
  }

  it('hard mode for over a year with a hands-on player never corrupts the books', () => {
    let s = createNewGame({ seed: 99, difficulty: 'hard' });
    for (let d = 0; d < 400 && s.phase !== 'ended'; d++) {
      s = d % 5 === 0 ? playDay(s) : autoDay(s);
      if (d % 60 === 0) check(s);
    }
    check(s);
  });
});

describe('exploits and bad input', () => {
  it('hostile numbers in every numeric action are rejected or clamped', () => {
    let s = morning(createNewGame(5));
    const ing = Object.keys(INGREDIENTS)[0] as IngredientId;
    const prod = Object.keys(PRODUCTS)[0] as ProductId;
    for (const n of HOSTILE) {
      const actions: Action[] = [
        { type: 'buy', ingredient: ing, supplier: 'cho', packs: n },
        { type: 'setPrice', product: prod, price: n },
        { type: 'setPlan', item: prod, trays: n },
        { type: 'setReorder', ingredient: ing, below: n, packs: n, supplier: 'cho' },
        { type: 'signContract', ingredient: ing, supplier: 'cho', packsPerWeek: n, weeks: n },
        { type: 'fund', amount: n },
        { type: 'savingsRate', rate: n },
        { type: 'takeLoan', principal: n, term: n },
        { type: 'repayCredit', amount: n },
        { type: 'raiseEquity', amount: n },
        { type: 'issueBond', amount: n },
        { type: 'trade', coop: 'dairy', delta: n },
        { type: 'tick', minutes: n },
        { type: 'bake', item: 'baguette', process: n },
      ];
      for (const a of actions) {
        s = gameReducer(s, a);
        check(s);
      }
      if (s.staff[0]) {
        s = gameReducer(s, { type: 'setWage', id: s.staff[0].id, wage: n });
        check(s);
      }
    }
    s = autoDay(s);
    check(s);
  });

  it('buying and reselling equipment never makes money', () => {
    let s = morning(createNewGame(6));
    s = { ...s, cash: s.cash + 100000, equity: { ...s.equity, contributed: s.equity.contributed + 100000 }, today: { ...s.today, books: { ...s.today.books, cashEquity: s.today.books.cashEquity + 100000 } } };
    for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
      const before = s.cash + s.safetyFund;
      const bought = gameReducer(s, { type: 'buyUpgrade', id });
      const item = bought.equipment.find((e) => !s.equipment.some((x) => x.uid === e.uid));
      if (!item) continue;
      const sold = gameReducer(bought, { type: 'sellEquipment', uid: item.uid });
      expect(sold.cash + sold.safetyFund).toBeLessThanOrEqual(before + 1e-6);
      check(sold);
    }
  });

  it('borrowing is capped and loans cannot be repaid twice', () => {
    let s = morning(createNewGame(8));
    const startDebt = () => s.loans.reduce((a, l) => a + l.balance, 0);
    for (let i = 0; i < 20; i++) s = gameReducer(s, { type: 'takeLoan', principal: 1e9, term: 12 });
    expect(startDebt()).toBeLessThan(1e6);
    const loan = s.loans[0];
    if (loan) {
      s = gameReducer(s, { type: 'repayLoan', id: loan.id });
      const cash = s.cash;
      s = gameReducer(s, { type: 'repayLoan', id: loan.id });
      expect(s.cash).toBe(cash);
    }
    check(s);
  });

  it('absurd prices sell nothing rather than printing money', () => {
    let s = morning(createNewGame(9));
    for (const p of Object.keys(s.prices) as ProductId[]) s = gameReducer(s, { type: 'setPrice', product: p, price: 1e6 });
    s = autoDay(s);
    const last = s.history[s.history.length - 1];
    expect(last.revenue).toBeLessThan(5000);
    check(s);
  });

  it('every random sequence of actions keeps the state valid', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const r = rngFor(seed, 0, 77);
      let s = createNewGame(seed);
      const ings = Object.keys(INGREDIENTS) as IngredientId[];
      const prods = Object.keys(PRODUCTS) as ProductId[];
      const ups = Object.keys(UPGRADES) as UpgradeId[];
      const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
      for (let d = 0; d < 40 && s.phase !== 'ended'; d++) {
        s = morning(s);
        for (let k = 0; k < 6; k++) {
          const n = pick([...HOSTILE, 1, 3, 10, 50]);
          const a = pick<Action>([
            { type: 'buy', ingredient: pick(ings), supplier: pick(['cho', 'farm', 'premium', 'distributor'] as const), packs: Math.round(r() * 10) },
            { type: 'setPrice', product: pick(prods), price: r() * 20 },
            { type: 'buyUpgrade', id: pick(ups) },
            { type: 'setMenu', product: pick(prods), on: r() > 0.3 },
            { type: 'takeLoan', principal: n, term: 12 },
            { type: 'campaign', kind: pick(['flyers', 'social', 'community', 'loyalty'] as const) },
            { type: 'hire', applicantId: s.applicants[0]?.id ?? -1 },
            { type: 'fire', id: s.staff[0]?.id ?? -1 },
            { type: 'sellEquipment', uid: s.equipment[Math.floor(r() * s.equipment.length)]?.uid ?? -1 },
            { type: 'setPlan', item: pick(prods), trays: Math.round(r() * 5) },
          ]);
          s = gameReducer(s, a);
        }
        s = r() > 0.5 ? autoDay(s) : playDay(s);
        check(s);
      }
    }
  });
});

describe('long-term goals and endings', () => {
  it('goal progress is always between 0 and 1 and a reached goal is recorded once', async () => {
    const { goalProgress } = await import('../../src/engine/progression');
    const { GOALS } = await import('../../src/data/world');
    let s = createNewGame({ seed: 4, scenario: 'family' });
    for (let d = 0; d < 60; d++) s = autoDay(s);
    for (const goal of Object.keys(GOALS)) {
      const g = goalProgress({ ...s, goal });
      expect(g.pct).toBeGreaterThanOrEqual(0);
      expect(g.pct).toBeLessThanOrEqual(1);
      expect(g.text.length).toBeGreaterThan(0);
    }
    // 'survive' needs two years; jump the clock to check it's detected.
    s = autoDay({ ...s, goal: 'survive', day: 721 });
    expect(s.goalReached).toBeGreaterThan(720);
    const reached = s.goalReached;
    s = autoDay(s);
    expect(s.goalReached).toBe(reached);
  });

  it('retiring sells the owner’s share and ends the game', () => {
    let s = createNewGame({ seed: 4 });
    for (let d = 0; d < 61; d++) s = autoDay(s);
    s = morning(s);
    s = gameReducer(s, { type: 'retire' });
    expect(s.phase).toBe('ended');
    expect(s.ending?.kind).toBe('retired');
    expect(s.ending!.value).toBeGreaterThan(0);
  });
});

describe('content added after a save was written', () => {
  it('a save from before the Gress menu and new ingredients still loads and plays', async () => {
    const { saveGame, loadGame } = await import('../../src/engine/save');
    // Strip everything the Gress update added from a fresh game, as an older save would lack it.
    const old = JSON.parse(JSON.stringify(createNewGame(12))) as GameState;
    for (const p of ['gressCupcake', 'gressTeaLight', 'gressOreo', 'gressCoffee', 'gressHoneycomb', 'gressBoba', 'gressPie', 'gressMilkshake', 'gressCrepe', 'gressCake'] as const) {
      delete (old.display as Partial<typeof old.display>)[p];
      delete (old.prices as Partial<typeof old.prices>)[p];
      delete (old.bakedToday as Partial<typeof old.bakedToday>)[p];
      delete (old.lifetime.sold as Partial<typeof old.lifetime.sold>)[p];
      delete (old.today.sold as Partial<typeof old.today.sold>)[p];
      old.unlocked = old.unlocked.filter((x) => x !== p);
      old.menu = old.menu.filter((x) => x !== p);
    }
    for (const id of ['gress', 'greenApple', 'lychee'] as const) {
      delete (old.pantry as Partial<typeof old.pantry>)[id];
      delete (old.market.prices as Partial<typeof old.market.prices>)[id];
      delete (old.market.walk as Partial<typeof old.market.walk>)[id];
    }
    const m = new Map<string, string>();
    const store = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
    saveGame(old, 1, store);
    let back = loadGame(1, store);
    expect(back).not.toBeNull();
    expect(back!.prices.gressCupcake).toBeGreaterThan(0);
    for (let d = 0; d < 5; d++) back = autoDay(back!);
    check(back!);
    expect(back!.unlocked).toContain('gressCupcake');
  });

  it('the first applicants are always the owner’s friends, in order, until hired', () => {
    let s = createNewGame(3);
    for (let d = 0; d < 8 && !s.applicants.length; d++) s = autoDay(s);
    expect(s.applicants.slice(0, 6).map((a) => a.name)).toEqual(['Vy', 'Sang', 'Hieu', 'Yen Vy', 'Phuong Khanh', 'Vien']);
    s = morning(s);
    s = gameReducer({ ...s, cash: s.cash + 2000 }, { type: 'hire', applicantId: s.applicants[0].id });
    expect(s.staff.map((e) => e.name)).toContain('Vy');
    for (let d = 0; d < 8; d++) s = autoDay(s);
    expect(s.applicants.slice(0, 5).map((a) => a.name)).toEqual(['Sang', 'Hieu', 'Yen Vy', 'Phuong Khanh', 'Vien']);
  });
});

describe('order grades', () => {
  it('every served order gets a 0–100 score with stars; a fast, flawless order is five stars with a tip', async () => {
    const { gradeOrder } = await import('../../src/engine/service');
    const perfect = gradeOrder(100, 80, 0, 90, 6.5, false);
    expect(perfect.score).toBeGreaterThanOrEqual(90);
    expect(perfect.stars).toBe(5);
    expect(perfect.tip).toBeGreaterThan(0);
    const slowSloppy = gradeOrder(40, 60, 85, 90, 6.5, false);
    expect(slowSloppy.stars).toBeLessThanOrEqual(2);
    expect(slowSloppy.tip).toBe(0);
    expect(gradeOrder(100, 80, 0, 90, 6.5, true).tip).toBeGreaterThan(perfect.tip);

    let s = morning(createNewGame(5));
    s = gameReducer(s, { type: 'open' });
    for (let i = 0; i < 60 && !s.service!.visits.some((v) => v.status === 'waiting'); i++) s = gameReducer(s, { type: 'tick', minutes: 4 });
    const v = s.service!.visits.find((x) => x.status === 'waiting')!;
    s = gameReducer(s, { type: 'serve', visitId: v.id, process: 100 });
    const done = s.service!.visits.find((x) => x.id === v.id)!;
    expect(done.grade).toBeDefined();
    expect(done.grade!.score).toBeGreaterThan(0);
    expect(done.grade!.score).toBeLessThanOrEqual(100);
    expect(s.today.bestOrder?.score).toBe(done.grade!.score);
    expect(done.tip).toBe(done.grade!.tip);
  });
});
