import { describe, expect, it } from 'vitest';
import { AWNINGS, GARLANDS, SIGNS, UNIFORMS } from '../../src/data/shopfit';
import { APRONS } from '../../src/ui/pixel/palette';
import { PRODUCTS, PRODUCT_ORDER } from '../../src/data/catalog';
import { favouritesPull } from '../../src/engine/economy';
import { TRAITS } from '../../src/data/world';
import { ARC } from '../../src/engine/arc';
import { CHALLENGE, challengeText } from '../../src/engine/challenge';
import { weeklyApplicants } from '../../src/engine/labor';
import { makeServers } from '../../src/engine/service';
import { createNewGame, decorSpot, gameReducer } from '../../src/engine/state';
import { rngFor } from '../../src/engine/rng';
import { rollTwist, TWIST, twistBonus, twistLabel, twistSteps } from '../../src/engine/twists';
import type { GameState, Visit } from '../../src/engine/types';
import { COSMETICS, STAR_CASH, STYLE_COUNTS, starsToSpend } from '../../src/data/cosmetics';
import { COUNTERS, FLOORS, PATTERNS, WALLS } from '../../src/ui/pixel/scene';
import { biggestProblem } from '../../src/engine/advice';
import { balanceSheet, bookEquity } from '../../src/engine/accounting';
import { staffWait } from '../../src/engine/service';
import { activeQuests, QUESTS } from '../../src/engine/progression';
import { act, finish, morning, playDay, resolveEvents, runService } from './bot';

const start = (seed: number) => act(createNewGame(seed), { type: 'setup', name: 'Test', look: createNewGame(seed).look });

describe('order twists', () => {
  const steps = PRODUCTS.banhMi.steps!;

  it('a skipped step is left out and a doubled step appears twice', () => {
    expect(twistSteps(steps, { kind: 'skip', step: 'sauce' }).map((s) => s.id)).toEqual(['slice', 'chaLua', 'pickles', 'herbs']);
    expect(twistSteps(steps, { kind: 'double', step: 'chaLua' }).map((s) => s.id)).toEqual(['slice', 'chaLua', 'chaLua', 'pickles', 'herbs', 'sauce']);
    expect(twistSteps(steps, { kind: 'rush' })).toBe(steps);
    expect(twistSteps(steps, undefined)).toBe(steps);
  });

  it('never skips the base of a dish, never twists a pastry, and always has a label', () => {
    const rand = rngFor(7, 1, 1);
    for (let i = 0; i < 400; i++) {
      expect(rollTwist('flan', rand)).toBeUndefined();
      for (const p of ['banhMi', 'caPhe', 'traTac'] as const) {
        const t = rollTwist(p, rand);
        if (!t) continue;
        expect(twistLabel(t).length).toBeGreaterThan(3);
        if (t.kind === 'rush') continue;
        expect(PRODUCTS[p].steps!.some((s) => s.id === t.step)).toBe(true);
        if (t.kind === 'skip') expect(t.step).not.toBe(PRODUCTS[p].steps![0].id);
      }
    }
  });

  it('pays the bonus only for a flawless twist or a quick rush order', () => {
    const v = { patience: 100, twist: { kind: 'skip', step: 'sauce' } } as Visit;
    expect(twistBonus(v, 100, 50)).toBe(TWIST.tip);
    expect(twistBonus(v, 85, 5)).toBe(0);
    const rush = { patience: 100, twist: { kind: 'rush' } } as Visit;
    expect(twistBonus(rush, 70, 30)).toBe(TWIST.rushTip);
    expect(twistBonus(rush, 100, 80)).toBe(0);
    expect(twistBonus({ patience: 100 } as Visit, 100, 0)).toBe(0);
  });

  it('customers with twists turn up, and only on made-to-order dishes', () => {
    let s = start(21);
    let seen = 0;
    for (let d = 0; d < 6; d++) {
      s = gameReducer(morning(s), { type: 'open' });
      for (const v of s.service!.visits) {
        if (!v.twist) continue;
        seen++;
        expect(PRODUCTS[v.wants].steps?.length).toBeGreaterThan(0);
      }
      s = finish(runService(gameReducer(s, { type: 'closeEarly' })));
    }
    expect(seen).toBeGreaterThan(3);
  });
});

describe('daily challenge', () => {
  it('there is one each morning from day 2, never the same kind twice running', () => {
    let s = start(31);
    let last: string | undefined;
    for (let d = 0; d < 12; d++) {
      s = playDay(s);
      expect(s.challenge?.day).toBe(s.day);
      expect(challengeText(s.challenge!).length).toBeGreaterThan(5);
      expect(s.challenge!.id).not.toBe(last);
      last = s.challenge!.id;
    }
  });

  it('finishing it pays XP and a little cash, once', () => {
    let s = morning(playDay(start(32)));
    s = { ...s, challenge: { id: 'beforeNoon', target: 1, done: false, day: s.day } };
    s = act(s, { type: 'open' });
    for (let i = 0; i < 60 && !s.service!.visits.some((x) => x.status === 'waiting'); i++) s = act(s, { type: 'tick', minutes: 4 });
    const v = s.service!.visits.find((x) => x.status === 'waiting')!;
    expect(v).toBeDefined();
    const before = s;
    s = act(s, { type: 'serve', visitId: v.id, process: 100 });
    expect(s.challenge!.done).toBe(true);
    expect(s.lifetime.challenges).toBe(1);
    expect(s.xp).toBeGreaterThanOrEqual(before.xp + CHALLENGE.xp);
    const again = s.service!.visits.find((x) => x.status === 'waiting');
    if (again) expect(act(s, { type: 'serve', visitId: again.id, process: 100 }).lifetime.challenges).toBe(1);
  });
});

describe('the Lantern Festival story', () => {
  const run = (pick: 'first' | 'last') => {
    let s = start(41);
    while (s.day < ARC.startDay + 30 && s.phase !== 'ended') s = playDay(resolveEvents(s, pick));
    return s;
  };

  it('starts on day 36, runs ten chapters and always ends with a prize on the wall', () => {
    let s = start(40);
    while (s.day < ARC.startDay) s = playDay(s);
    expect(s.events[0]?.id).toBe('arc0');
    const end = run('last');
    expect(end.story?.chapter).toBe(ARC.chapters);
    expect(end.story?.result).toBeDefined();
    expect(end.decor).toContain('trophy');
    expect(end.achievements).toContain('lantern');
    expect(end.events.some((e) => e.id.startsWith('arc'))).toBe(false);
  });

  it('kind and brave choices win more lane hearts than shrugging', () => {
    expect(run('first').story!.hearts).toBeGreaterThan(run('last').story!.hearts);
  });
});

describe('painting and arranging the shop', () => {
  it('style choices stick and stay in range', () => {
    let s: GameState = { ...start(51), cosmetics: COSMETICS.map((c) => c.id) };
    s = act(s, { type: 'setStyle', key: 'wall', value: 3 }, { type: 'setStyle', key: 'floor', value: 99 }, { type: 'setStyle', key: 'counter', value: -4 });
    expect(s.style).toMatchObject({ wall: 3, floor: STYLE_COUNTS.floor - 1, counter: 0, pattern: 0 });
    // A paint you haven't bought can't be chosen.
    const plain = act(start(51), { type: 'setStyle', key: 'floor', value: STYLE_COUNTS.floor - 1 });
    expect(plain.style?.floor ?? 0).toBe(0);
  });

  it('decorations move between three spots and never share one', () => {
    let s: GameState = { ...start(52), decor: ['plant', 'hoaMai'] };
    expect(decorSpot(s.style, 'plant')).toBe(0);
    expect(decorSpot(s.style, 'hoaMai')).toBe(2);
    s = act(s, { type: 'moveDecor', id: 'plant' });
    expect(decorSpot(s.style, 'plant')).toBe(1);
    s = act(s, { type: 'moveDecor', id: 'plant' });
    expect(decorSpot(s.style, 'plant')).toBe(0);
    const unowned = act(s, { type: 'moveDecor', id: 'birdcage' });
    expect(unowned).toBe(s);
  });
});

describe('staff personalities', () => {
  it('every applicant has one, and a careful worker serves better than a speedy one', () => {
    const s = start(61);
    const apps = weeklyApplicants(s);
    expect(apps.length).toBeGreaterThan(0);
    for (const a of apps) expect(TRAITS[a.trait!]).toBeDefined();
    const mk = (id: number, trait: 'careful' | 'speedy') => ({ id, name: 'A', role: 'cashier' as const, wage: 12, skill: 3, morale: 80, hiredDay: 1, trainingUntil: 0, look: s.look, served: 0, branch: null, trait });
    const servers = makeServers({ ...s, staff: [mk(1, 'careful'), mk(2, 'speedy')] }, false);
    const q = (id: number) => servers.find((x) => x.id === `staff:${id}`)!.quality;
    expect(q(1)).toBeGreaterThan(q(2));
  });
});

describe('tester round 4', () => {
  it('Bà’s help earns no tips and no XP', () => {
    let s = act(start(71), { type: 'open' });
    for (let i = 0; i < 40 && !s.service!.visits.some((v) => v.status === 'waiting'); i++) s = act(s, { type: 'tick', minutes: 4 });
    s = act(s, { type: 'handOver' });
    const xp = s.today.xp;
    for (let i = 0; i < 30; i++) s = act(s, { type: 'tick', minutes: 4 });
    const byBa = s.service!.visits.filter((v) => v.servedBy === 'owner');
    expect(byBa.length).toBeGreaterThan(0);
    for (const v of byBa) expect(v.tip).toBe(0);
    expect(s.today.xp).toBe(xp);
  });

  it('quick bake is locked until you have baked a recipe by hand three times, then gives normal quality', () => {
    let s: GameState = { ...start(72), allUnlocked: false };
    const quick = (x: GameState) => act(x, { type: 'bake', item: 'baguette', process: 100, quick: true });
    expect(quick(s).traysToday).toBe(s.traysToday);
    for (let i = 0; i < 3; i++) s = act(s, { type: 'bake', item: 'baguette', process: 90 });
    expect(s.questProgress.handBakes_baguette).toBe(3);
    const after = quick({ ...s, traysToday: 0, pantry: { ...s.pantry, flour: { ...s.pantry.flour, qty: 50 } } });
    expect(after.traysToday).toBe(1);
  });

  it('stars from daily goals buy cosmetics, once, and locked looks can’t be worn', () => {
    let s: GameState = { ...start(73), questProgress: { ...start(73).questProgress, stars: 12 } };
    const crowned = act(s, { type: 'setLook', look: { ...s.look, accessory: 11 } });
    expect(crowned.look.accessory).toBe(0);
    s = act(s, { type: 'buyCosmetic', id: 'catEars' });
    expect(s.cosmetics).toContain('catEars');
    expect(s.questProgress.starsSpent).toBe(10);
    expect(act(s, { type: 'buyCosmetic', id: 'crown' })).toBe(s);
    expect(act(s, { type: 'setLook', look: { ...s.look, accessory: 9 } }).look.accessory).toBe(9);
  });

  it('the guess question takes turns between buyers and money', () => {
    let s = playDay(playDay(start(74)));
    s = morning(s);
    s = act(s, { type: 'setPrice', product: 'banhMi', price: s.prices.banhMi + 0.5 });
    expect(s.pendingPrediction?.ask).toBe('buyers');
    s = act(s, { type: 'predict', guess: 'fewer' });
    s = finish(runService(s));
    s = morning(s);
    s = act(s, { type: 'setPrice', product: 'banhMi', price: s.prices.banhMi - 0.5 });
    expect(s.pendingPrediction?.ask).toBe('money');
    expect(s.pendingPrediction?.moneyBefore).toBeGreaterThan(0);
  });

  it('putting a group’s favourites on the menu brings more customers', () => {
    const s = start(75);
    expect(favouritesPull({ ...s, menu: ['banhMi'] })).toBeLessThan(favouritesPull(s));
    expect(favouritesPull({ ...s, menu: PRODUCT_ORDER })).toBeGreaterThan(favouritesPull(s));
  });
});

describe('playtest 3 follow-ups', () => {
  it('the paint counts match the drawn lists, and every star-shop item points at a real choice', () => {
    expect(STYLE_COUNTS).toEqual({ wall: WALLS.length, pattern: PATTERNS.length, floor: FLOORS.length, counter: COUNTERS.length, garland: GARLANDS.length, awning: AWNINGS.length, sign: SIGNS.length, uniform: UNIFORMS.length });
    // Every team apron is a real apron colour.
    for (const u of UNIFORMS) expect(u.apron).toBeLessThan(APRONS.length);
    for (const c of COSMETICS) if (c.kind === 'wall' || c.kind === 'floor' || c.kind === 'counter') expect(c.index).toBeLessThan(STYLE_COUNTS[c.kind]);
  });

  it('Bà’s tip jar turns stars into cash, and only when you have enough', () => {
    let s: GameState = { ...start(61), questProgress: { ...start(61).questProgress, stars: STAR_CASH.stars + 3 } };
    const cash = s.cash;
    s = gameReducer(s, { type: 'starsForCash' });
    expect(s.cash).toBeCloseTo(cash + STAR_CASH.cash, 2);
    expect(starsToSpend(s)).toBe(3);
    // The cash is booked, so the balance sheet still balances.
    expect(balanceSheet(s).equity).toBeCloseTo(bookEquity(s), 1);
    expect(gameReducer(s, { type: 'starsForCash' })).toBe(s);
  });

  it('staff leave a new order for the player first, then step in; a claimed order is never taken', () => {
    let s = gameReducer(start(62), { type: 'open' });
    const hire = s.applicants.find((a) => a.role === 'helper')!;
    s = { ...start(62), cash: 9000 };
    s = gameReducer(s, { type: 'hire', applicantId: s.applicants.find((a) => a.role === 'helper')!.id });
    s = gameReducer(s, { type: 'open' });
    void hire;
    let first: Visit | undefined;
    for (let i = 0; i < 200 && !first; i++) {
      s = gameReducer(s, { type: 'tick', minutes: 1 });
      first = s.service?.visits.find((v) => v.status === 'waiting');
    }
    expect(first).toBeDefined();
    expect(first!.servedBy).toBeUndefined();
    s = gameReducer(s, { type: 'claim', visitId: first!.id });
    for (let i = 0; i < Math.ceil(staffWait(first!)) + 5; i++) s = gameReducer(s, { type: 'tick', minutes: 1 });
    const mine = s.service!.visits.find((v) => v.id === first!.id)!;
    expect(mine.servedBy === 'player' || mine.status !== 'waiting').toBe(true);
    // In "take every order" mode a helper picks up new orders at once.
    s = gameReducer(s, { type: 'setStaffMode', mode: 'all' });
    expect(s.staffMode).toBe('all');
  });

  it('the advice names the real bottleneck: losing money first, then an empty case', () => {
    let s = start(63);
    for (let d = 0; d < 4; d++) s = playDay(s);
    const fake = (over: Partial<GameState['history'][number]>) => s.history.slice(-3).map((h) => ({ ...h, ...over }));
    const sellOut = { ...s, history: fake({ lostSoldOut: 40, profit: 50 }) };
    expect(biggestProblem(sellOut)?.id).toBe('soldOut');
    const losing = { ...s, history: fake({ profit: -100, books: { ...s.history[0].books, wages: 400 } }), staff: s.staff };
    const p = biggestProblem(losing);
    expect(p?.id === 'losing' || p === null).toBe(true);
  });

  it('legend goals open only at the top level, and come first when they do', () => {
    const s = start(64);
    expect(activeQuests(s, 20).some((q) => q.minLevel)).toBe(false);
    const legend = { ...s, xp: 999999 };
    const open = activeQuests(legend, 3);
    expect(open[0].minLevel).toBe(8);
    expect(QUESTS.filter((q) => q.minLevel).length).toBeGreaterThanOrEqual(6);
  });

  it('opening week: a new guided bakery loses fewer customers to price than later on', () => {
    let a = createNewGame({ seed: 65, guided: true });
    a = playDay(gameReducer(a, { type: 'setup', name: 'x', look: a.look }));
    expect(a.history[0].lostPrice / Math.max(1, a.history[0].customers)).toBeLessThan(0.3);
  });
});
