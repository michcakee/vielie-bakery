import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../../src/data/catalog';
import { TRAITS } from '../../src/data/world';
import { ARC } from '../../src/engine/arc';
import { CHALLENGE, challengeText } from '../../src/engine/challenge';
import { weeklyApplicants } from '../../src/engine/labor';
import { makeServers } from '../../src/engine/service';
import { createNewGame, decorSpot, gameReducer } from '../../src/engine/state';
import { rngFor } from '../../src/engine/rng';
import { rollTwist, TWIST, twistBonus, twistLabel, twistSteps } from '../../src/engine/twists';
import type { GameState, Visit } from '../../src/engine/types';
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
    let s = start(51);
    s = act(s, { type: 'setStyle', key: 'wall', value: 3 }, { type: 'setStyle', key: 'floor', value: 99 }, { type: 'setStyle', key: 'counter', value: -4 });
    expect(s.style).toMatchObject({ wall: 3, floor: 7, counter: 0, pattern: 0 });
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
