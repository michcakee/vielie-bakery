import { describe, expect, it } from 'vitest';
import { DIAMOND, DIAMOND_PACKS, DREAM, DREAM_NAMES, DREAM_ORDER, BRIGHT_HAIR, packFor } from '../../src/data/dream';
import { REGULARS } from '../../src/data/people';
import { FRIENDS, STAFF_NAMES } from '../../src/data/world';
import { balanceSheet, bookEquity } from '../../src/engine/accounting';
import { laborTrays, staffQualityBonus } from '../../src/engine/economy';
import { makeEmployee, weeklyApplicants } from '../../src/engine/labor';
import { randomLook } from '../../src/engine/look';
import { rngFor } from '../../src/engine/rng';
import { loadWallet, saveWallet, validSave, WALLET_KEY, clearAllData } from '../../src/engine/save';
import { createNewGame, gameReducer } from '../../src/engine/state';
import type { GameState } from '../../src/engine/types';
import { act, finish, morning } from './bot';

const start = (seed: number) => act(createNewGame(seed), { type: 'setup', name: 'Test', look: createNewGame(seed).look });
/** Extra cash for a test, booked as the owner putting money in so the balance sheet still balances. */
const withCash = (s: GameState, cash: number): GameState => ({ ...s, cash, equity: { ...s.equity, contributed: s.equity.contributed + cash - s.cash } });
const rich = (seed: number, diamonds = 1000): GameState => ({ ...withCash(start(seed), 20000), diamonds });
const balanced = (s: GameState) => expect(balanceSheet(s).equity).toBeCloseTo(bookEquity(s), 1);

/** Opens the shop and serves everyone by hand, with a chosen goal. */
function handDay(s: GameState, goal: [number, number, number]): GameState {
  let next = gameReducer(morning(s), { type: 'open' });
  next = { ...next, today: { ...next.today, goal } };
  let guard = 0;
  while (next.phase === 'service' && guard++ < 400) {
    next = gameReducer(next, { type: 'tick', minutes: 4 });
    if (next.phase === 'service') for (const v of next.service!.visits.filter((x) => x.status === 'waiting' && !x.servedBy)) next = gameReducer(next, { type: 'serve', visitId: v.id, process: 85 });
  }
  return next;
}

/** Opens the shop and lets the team serve the whole day; the player serves nobody. */
function teamDay(s: GameState, goal?: [number, number, number]): GameState {
  let next = gameReducer(morning(s), { type: 'open' });
  if (goal) next = { ...next, today: { ...next.today, goal } };
  let guard = 0;
  while (next.phase === 'service' && guard++ < 400) next = gameReducer(next, { type: 'tick', minutes: 4 });
  return next;
}

describe('the Dream team', () => {
  it('reserves its five names: nobody else in the game uses them', () => {
    expect(DREAM_NAMES).toEqual(['Vy', 'Yen Vy', 'Hieu', 'Sang', 'Phuong Khanh']);
    const others = [...STAFF_NAMES, ...REGULARS.map((r) => r.name), ...FRIENDS.map((f) => f.name)];
    for (const n of DREAM_NAMES) expect(others.some((o) => o.split(/\s+/).includes(n.split(' ')[0]) && o.includes(n))).toBe(false);
    // Hundreds of weeks of ordinary applicants: never one of theirs.
    let s = start(3);
    for (let day = 1; day < 400; day += 7) {
      const apps = weeklyApplicants({ ...s, day });
      for (const a of apps) expect(DREAM_NAMES).not.toContain(a.name);
    }
  });

  it('keeps the bright hair colours for the Dream team; everyone else has ordinary hair', () => {
    for (const id of DREAM_ORDER) expect(BRIGHT_HAIR).toContain(DREAM[id].look.hairColor);
    const rand = rngFor(1, 1, 1);
    for (let i = 0; i < 2000; i++) expect(BRIGHT_HAIR).not.toContain(randomLook(rand).hairColor);
    for (const r of REGULARS) expect(BRIGHT_HAIR).not.toContain(r.look.hairColor);
    const s = start(4);
    for (let day = 1; day < 200; day += 7) for (const a of weeklyApplicants({ ...s, day })) expect(BRIGHT_HAIR).not.toContain(a.look.hairColor);
  });

  it('unlocks with diamonds, waits in the applicants, and comes back after being let go', () => {
    let s: GameState = { ...start(5), diamonds: DREAM.vy.cost - 1 };
    expect(gameReducer(s, { type: 'unlockDream', id: 'vy' })).toBe(s);
    s = { ...s, diamonds: DREAM.vy.cost + 5 };
    s = gameReducer(s, { type: 'unlockDream', id: 'vy' });
    expect(s.diamonds).toBe(5);
    expect(s.dreamTeam).toEqual(['vy']);
    expect(gameReducer(s, { type: 'unlockDream', id: 'vy' })).toBe(s);
    expect(gameReducer(s, { type: 'unlockDream', id: 'nobody' })).toBe(s);
    const ap = s.applicants.find((a) => a.dream === 'vy')!;
    expect(ap.name).toBe('Vy');
    expect(ap.skill).toBe(5);
    expect(BRIGHT_HAIR).toContain(ap.look.hairColor);
    s = gameReducer(withCash(s, 5000), { type: 'hire', applicantId: ap.id });
    const vy = s.staff.find((e) => e.dream === 'vy')!;
    expect(vy).toBeTruthy();
    expect(s.applicants.some((a) => a.dream)).toBe(false);
    // A new week's applicants don't bring a second Vy while she works here.
    s = finish(teamDay(s));
    for (let i = 0; i < 8; i++) s = finish(teamDay(s));
    expect(s.applicants.some((a) => a.dream)).toBe(false);
    expect(s.staff.some((e) => e.dream === 'vy')).toBe(true);
    s = gameReducer(s, { type: 'fire', id: vy.id });
    expect(s.applicants.filter((a) => a.dream === 'vy')).toHaveLength(1);
    balanced(s);
  });

  it('never quits, even unpaid and miserable', () => {
    let s = gameReducer(rich(6), { type: 'unlockDream', id: 'hieu' });
    s = gameReducer(s, { type: 'hire', applicantId: s.applicants.find((a) => a.dream === 'hieu')!.id });
    s = { ...s, staff: s.staff.map((e) => ({ ...e, morale: 0, wage: 10 })) };
    for (let i = 0; i < 20; i++) s = finish(teamDay({ ...s, staff: s.staff.map((e) => ({ ...e, morale: 0 })) }));
    expect(s.staff.some((e) => e.dream === 'hieu')).toBe(true);
  });

  it('serves far faster and earns far bigger tips than the best ordinary hire', () => {
    const base = { ...rich(7), staffMode: 'all' as const };
    // The best ordinary counter hire: a skill-5 helper (serves anything), versus Yen Vy.
    const pro = makeEmployee({ id: 900, name: 'Mochi', role: 'helper', wage: 20, skill: 5, look: base.look }, 1);
    const normal = teamDay({ ...base, staff: [pro] });
    let dreamS = gameReducer(base, { type: 'unlockDream', id: 'yenVy' });
    dreamS = gameReducer(dreamS, { type: 'hire', applicantId: dreamS.applicants.find((a) => a.dream === 'yenVy')!.id });
    const dream = teamDay(dreamS);
    const staffTips = (s: GameState) => s.service!.visits.filter((v) => v.servedBy?.startsWith('staff:')).reduce((t, v) => t + (v.tip ?? 0), 0);
    const staffOrders = (s: GameState) => s.service!.visits.filter((v) => v.servedBy?.startsWith('staff:') && v.status === 'done' && v.paid).length;
    expect(staffOrders(dream)).toBeGreaterThan(0);
    const tipPer = (s: GameState) => staffTips(s) / Math.max(1, staffOrders(s));
    expect(tipPer(dream)).toBeGreaterThan(tipPer(normal) * 2);
    expect(dream.today.lostSlow).toBeLessThanOrEqual(normal.today.lostSlow);
    expect(dream.today.dreamTips).toBeGreaterThan(0);
    expect(dream.staff.find((e) => e.dream === 'yenVy')!.tips).toBeCloseTo(dream.today.dreamTips!, 2);
    // Their orders are graded higher too.
    const avgStars = (s: GameState) => {
      const g = s.service!.visits.filter((v) => v.servedBy?.startsWith('staff:') && v.grade).map((v) => v.grade!.stars);
      return g.reduce((t, x) => t + x, 0) / Math.max(1, g.length);
    };
    expect(avgStars(dream)).toBeGreaterThanOrEqual(avgStars(normal));
    expect(avgStars(dream)).toBeGreaterThan(4.5);
    balanced(finish(dream));
  });

  it('Sang fills the oven and Phuong Khanh lifts the quality of every tray', () => {
    let s = rich(8);
    const trays = laborTrays(s);
    const q = staffQualityBonus(s);
    for (const id of ['sang', 'phuongKhanh'] as const) {
      s = gameReducer(s, { type: 'unlockDream', id });
      s = gameReducer(s, { type: 'hire', applicantId: s.applicants.find((a) => a.dream === id)!.id });
    }
    expect(laborTrays(s)).toBeGreaterThanOrEqual(trays + 8);
    expect(staffQualityBonus(s)).toBeGreaterThanOrEqual(q + 12);
  });
});

describe('diamonds', () => {
  it('a 3-star day pays diamonds, shown on the report', () => {
    let s = handDay(start(9), [1, 2, 3]);
    s = gameReducer(s, { type: 'finishDay' });
    expect(s.lastReport?.stars).toBe(3);
    expect(s.lastReport?.diamonds).toBe(DIAMOND.perThreeStarDay);
    expect(s.diamonds).toBe(DIAMOND.perThreeStarDay);
    expect(s.diamondsEarned).toBe(DIAMOND.perThreeStarDay);
    // A day short of three stars pays none.
    let t = handDay(start(9), [1, 2, 1e9]);
    t = gameReducer(t, { type: 'finishDay' });
    expect(t.lastReport?.diamonds).toBeUndefined();
    expect(t.diamonds ?? 0).toBe(0);
  });

  it('buying is far faster than earning: the smallest pack beats a dozen 3-star days for the first unlock', () => {
    expect(DIAMOND_PACKS[0].diamonds).toBeGreaterThanOrEqual(DREAM.vy.cost);
    expect(DIAMOND_PACKS[DIAMOND_PACKS.length - 1].diamonds).toBeGreaterThanOrEqual(DREAM_ORDER.reduce((t, id) => t + DREAM[id].cost, 0));
    expect(DREAM.vy.cost / DIAMOND.perThreeStarDay).toBeGreaterThanOrEqual(10);
    for (const p of DIAMOND_PACKS) expect(packFor(p.product)).toBe(p);
    expect(new Set(DIAMOND_PACKS.map((p) => p.product)).size).toBe(DIAMOND_PACKS.length);
  });

  it('purchased diamonds are added only for sane amounts and never touch the books', () => {
    const s = start(10);
    for (const n of [0, -5, NaN, Infinity, 1e9]) expect(gameReducer(s, { type: 'addDiamonds', n })).toBe(s);
    const t = gameReducer(s, { type: 'addDiamonds', n: 60 });
    expect(t.diamonds).toBe(60);
    expect(t.cash).toBe(s.cash);
    balanced(t);
  });

  it('the device wallet loads into a bakery, cleaned of anything unknown', () => {
    const s = start(11);
    const t = gameReducer(s, { type: 'syncWallet', diamonds: 42.7, dreamTeam: ['vy', 'vy', 'ghost'] });
    expect(t.diamonds).toBe(42);
    expect(t.dreamTeam).toEqual(['vy']);
    expect(t.applicants.filter((a) => a.dream === 'vy')).toHaveLength(1);
    expect(gameReducer(t, { type: 'syncWallet', diamonds: 42, dreamTeam: ['vy'] })).toBe(t);
  });

  it('the wallet is stored on its own, survives bad data, and "delete all my data" clears it', () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    expect(loadWallet(store)).toBeNull();
    saveWallet({ diamonds: 125, dreamTeam: ['vy', 'sang'], credited: ['t1'] }, store);
    expect(loadWallet(store)).toEqual({ diamonds: 125, dreamTeam: ['vy', 'sang'], credited: ['t1'] });
    mem.set(WALLET_KEY, '{"diamonds":"lots","dreamTeam":["vy","x"],"credited":[3,"t2"]}');
    expect(loadWallet(store)).toEqual({ diamonds: 0, dreamTeam: ['vy'], credited: ['t2'] });
    mem.set(WALLET_KEY, 'not json');
    expect(loadWallet(store)).toBeNull();
    saveWallet({ diamonds: 1, dreamTeam: [], credited: [] }, store);
    clearAllData(store);
    expect(mem.has(WALLET_KEY)).toBe(false);
  });

  it('an older save loads: ordinary staff lose bright hair, broken Dream team data is dropped', () => {
    const s = JSON.parse(JSON.stringify(start(12))) as GameState;
    s.staff = [makeEmployee({ id: 500, name: 'Peanut', role: 'cashier', wage: 18, skill: 3, look: { ...s.look, hairColor: 8 } }, 1)];
    s.applicants = [{ ...s.applicants[0], look: { ...s.applicants[0].look, hairColor: 4 } }, { ...s.applicants[0], id: 999, dream: 'ghost' as never }];
    (s as unknown as Record<string, unknown>).dreamTeam = ['vy', 'ghost'];
    expect(validSave(s)).toBe(true);
    expect(BRIGHT_HAIR).not.toContain(s.staff[0].look.hairColor);
    expect(BRIGHT_HAIR).not.toContain(s.applicants[0].look.hairColor);
    expect(s.applicants.some((a) => a.id === 999)).toBe(false);
    expect(s.dreamTeam).toEqual(['vy']);
    // And a save from before diamonds existed plays on with none.
    const old = JSON.parse(JSON.stringify(start(13))) as GameState;
    delete old.diamonds;
    delete old.dreamTeam;
    expect(validSave(old)).toBe(true);
    expect(finish(teamDay(old)).phase).toBe('morning');
  });
});
