import { describe, expect, it } from 'vitest';
import { OPENING, openingOn } from '../../src/engine/challenge';
import { balanceSheet, bookEquity } from '../../src/engine/accounting';
import { buildSchedule } from '../../src/engine/service';
import { createNewGame, DEFAULT_LOOK, gameReducer } from '../../src/engine/state';
import { featureOn } from '../../src/engine/unlocks';
import type { GameState } from '../../src/engine/types';
import { finish, kidDay, morning, resolveEvents, runServiceKid } from './bot';

const guided = (seed: number) => gameReducer(createNewGame({ seed, guided: true }), { type: 'setup', name: 'Kid', look: DEFAULT_LOOK });

describe('opening week (guided game)', () => {
  it('days 2 to 7 each bring their own event, with its own customers, and most can be won by a kid', () => {
    for (const seed of [3, 12, 41]) {
      let s: GameState = guided(seed);
      const won: string[] = [];
      for (let d = 0; d < 7; d++) {
        const today = s.day;
        const ev = openingOn(s, today);
        if (ev) {
          expect(s.challenge?.id).toBe(ev);
          // The event changes who walks in.
          const ready = morning(resolveEvents(s));
          const visits = buildSchedule(ready);
          if (ev === 'rush') expect(visits.filter((v) => v.source === 'rush').length).toBe(7);
          if (ev === 'tasteTest') expect(visits.filter((v) => v.source === 'taste' && v.wants === 'banhChuoi').length).toBe(5);
          if (ev === 'critic') expect(visits.filter((v) => v.critic).length).toBe(1);
          if (ev === 'bigOrder') expect(visits.filter((v) => v.specialOrder).length).toBeGreaterThanOrEqual(1);
          if (ev === 'laneParty') expect(visits.filter((v) => v.source === 'party').length).toBe(12);
        }
        const closed = runServiceKid(morning(resolveEvents(s)));
        if (ev && closed.challenge?.day === today && closed.challenge.done) won.push(ev);
        s = finish(closed);
        // The books still balance after every event day.
        expect(balanceSheet(s).equity).toBeCloseTo(bookEquity(s), 1);
      }
      console.log(`seed ${seed}: won ${won.join(', ')}`);
      expect(won.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('the new recipe on day 3 comes with enough for a first tray, and hiring opens in the first week', () => {
    let s: GameState = guided(5);
    for (let d = 0; d < 2; d++) s = kidDay(s);
    expect(s.day).toBe(3);
    expect(s.menu).toContain('banhChuoi');
    expect(s.pantry.banana.qty).toBeGreaterThanOrEqual(4);
    expect(s.challenge?.id).toBe('tasteTest');
    for (let d = 0; d < 2; d++) s = kidDay(s);
    expect(featureOn(s, 'staff.hire')).toBe(true);
    expect(s.day).toBeLessThanOrEqual(5);
  });

  it('a flan baked in the golden zone and served promptly wins over the critic, and Bà leaves her to you', () => {
    let s: GameState = guided(3);
    for (let d = 0; d < 3; d++) s = kidDay(s);
    expect(s.challenge?.id).toBe('critic');
    s = resolveEvents(s);
    s = gameReducer(s, { type: 'bake', item: 'flan', process: 100 });
    s = gameReducer(s, { type: 'open' });
    let guard = 0;
    while (s.phase === 'service' && !s.challenge?.done && guard++ < 400) {
      s = gameReducer(s, { type: 'tick', minutes: 2 });
      const critic = s.service?.visits.find((v) => v.critic && v.status === 'waiting');
      if (critic) {
        expect(critic.servedBy).not.toBe('ba');
        s = gameReducer(s, { type: 'serve', visitId: critic.id });
      }
    }
    expect(s.challenge?.done).toBe(true);
    expect(s.today.criticPleased).toBe(1);
  });

  it('experienced bakers (everything unlocked) get ordinary daily challenges', () => {
    let s: GameState = gameReducer(createNewGame({ seed: 9 }), { type: 'setup', name: 'Pro', look: DEFAULT_LOOK });
    for (let d = 0; d < 4; d++) {
      s = kidDay(s);
      expect(s.challenge && s.challenge.id in OPENING).toBe(false);
    }
  });
});
