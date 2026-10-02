import { describe, expect, it } from 'vitest';
import { balanceSheet, bookEquity } from '../../src/engine/accounting';
import { createNewGame, gameReducer, type Action } from '../../src/engine/state';
import { rngFor } from '../../src/engine/rng';
import { SCENARIOS } from '../../src/data/world';
import { INGREDIENTS, PRODUCTS, UPGRADES } from '../../src/data/catalog';
import type { GameState, IngredientId, ProductId, UpgradeId } from '../../src/engine/types';
import { autoDay, finish, morning, playDay } from './bot';
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

describe('regulars: badges and the critic', () => {
  it('five hearts become a badge that is never lost; the critic grades harder and pays more', async () => {
    const { gradeOrder } = await import('../../src/engine/service');
    const { REGULARS } = await import('../../src/data/people');
    // Critic: same order, fewer stars, bigger tip when she is impressed.
    const plain = gradeOrder(100, 80, 0, 90, 6.5, true);
    const critic = gradeOrder(100, 80, 0, 90, 6.5, true, true);
    expect(critic.score).toBe(plain.score);
    expect(critic.stars).toBeLessThanOrEqual(plain.stars);
    expect(gradeOrder(100, 100, 0, 90, 6.5, true, true).tip).toBeGreaterThan(gradeOrder(100, 100, 0, 90, 6.5, true).tip);
    expect(REGULARS.find((r) => r.critic)?.id).toBe('ngoc');

    // Badge: a regular at 4.75 hearts who loves one more order crosses five.
    let s = morning(createNewGame(5));
    s = { ...s, hearts: { ...s.hearts, minh: 4.75 }, visitsByRegular: { ...s.visitsByRegular, minh: 3 } };
    s = gameReducer(s, { type: 'open' });
    let minh = s.service!.visits.find((v) => v.who === 'minh');
    if (!minh) {
      // Minh didn't come today; put him in the queue by hand.
      const any = s.service!.visits.find((v) => v.status === 'coming' || v.status === 'walking' || v.status === 'waiting')!;
      s = { ...s, service: { ...s.service!, visits: s.service!.visits.map((v) => (v.id === any.id ? { ...v, who: 'minh', name: 'Minh', wants: 'caPhe' as const, loyal: true } : v)) } };
      minh = s.service!.visits.find((v) => v.who === 'minh');
    }
    for (let i = 0; i < 80 && s.service!.visits.find((v) => v.who === 'minh')!.status !== 'waiting'; i++) s = gameReducer(s, { type: 'tick', minutes: 4 });
    s = gameReducer(s, { type: 'serve', visitId: minh!.id, process: 100 });
    const served = s.service!.visits.find((v) => v.who === 'minh')!;
    expect(served.status).toBe('done');
    if (served.grade && served.grade.stars >= 4) {
      expect(s.badges?.minh).toBe(1);
      expect(s.hearts.minh).toBe(0);
      expect(served.line ?? '').not.toBe('');
    }
    // Badges survive bad days: force a bad order and a slow leave.
    const withBadge = { ...s, badges: { minh: 2 }, hearts: { minh: 3 } };
    let later = autoDay(withBadge);
    for (let d = 0; d < 20; d++) later = autoDay(later);
    expect(later.badges?.minh).toBe(2);
    check(later);
  });
});

describe('first-week unlock schedule and the next goal', () => {
  it('something new arrives on its scheduled day, and the next unlock is always known', async () => {
    const { nextUnlock } = await import('../../src/engine/progression');
    let s = createNewGame(21);
    expect(morning(s).unlocked).not.toContain('gressCupcake'); // level 1, but scheduled for the morning of day 2
    s = autoDay(s); // day 1 → the morning of day 2
    expect(s.unlocked).toContain('gressCupcake');
    const n1 = nextUnlock(s);
    expect(n1.pct).toBeGreaterThanOrEqual(0);
    expect(n1.pct).toBeLessThanOrEqual(1);
    expect(n1.text.length).toBeGreaterThan(0);
    for (let d = 0; d < 5; d++) s = autoDay(s); // through day 6
    expect(s.day).toBeGreaterThanOrEqual(6);
    expect(s.unlocked).toContain('gressCupcake');
    expect(s.unlocked).toContain('traTac');
    expect(s.unlockedRegulars).toContain('mai');
    expect(s.decor).toContain('stringLights');
    for (let d = 0; d < 10; d++) s = autoDay(s);
    expect(s.unlocked).toContain('gressOreo');
    const late = nextUnlock(s);
    expect(late.text).toMatch(/Level|everything/);
    check(s);
  });
});

describe('daily special and special orders', () => {
  it('from day 3 one menu item pays x1.5 and sells as readily; big orders show up now and then with a bonus tip', async () => {
    const { effectivePrice, willingToPay } = await import('../../src/engine/economy');
    let s = createNewGame(31);
    expect(s.special ?? null).toBeNull();
    for (let d = 0; d < 3; d++) s = autoDay(s);
    expect(s.special).toBeTruthy();
    const p = s.special!;
    expect(effectivePrice(morning(s), p)).toBeCloseTo(s.prices[p] * 1.5, 2);
    const plain = { ...s, special: null };
    expect(willingToPay(s, p, 1, 75, false)).toBeCloseTo(willingToPay(plain, p, 1, 75, false) * 1.5, 6);

    let big = 0;
    let bonusSeen = false;
    let g = { ...createNewGame(32), xp: 200 };
    for (let d = 0; d < 25; d++) {
      g = morning(g);
      if (g.phase !== 'morning') break;
      g = gameReducer(g, { type: 'open' });
      const specials = g.service!.visits.filter((v) => v.specialOrder);
      big += specials.length;
      for (let i = 0; i < 400 && g.phase === 'service'; i++) {
        g = gameReducer(g, { type: 'tick', minutes: 4 });
        for (const v of g.service?.visits.filter((x) => x.status === 'waiting' && !x.servedBy) ?? []) g = gameReducer(g, { type: 'serve', visitId: v.id, process: 95 });
      }
      for (const v of g.service?.visits ?? []) if (v.specialOrder && v.status === 'done' && (v.tip ?? 0) > (v.grade?.tip ?? 0)) bonusSeen = true;
      g = finish(g);
    }
    expect(big).toBeGreaterThan(0);
    expect(bonusSeen).toBe(true);
    check(g);
  });
});
