import { describe, expect, it } from 'vitest';
import { UNLOCK_SCHEDULE } from '../../src/data/catalog';
import { ALL_FEATURES, FEATURE } from '../../src/data/unlocks';
import { validSave } from '../../src/engine/save';
import { actionFeature, createNewGame, gameReducer, type Action } from '../../src/engine/state';
import type { GameState } from '../../src/engine/types';
import { featureOn, introStep } from '../../src/engine/unlocks';
import { finish, resolveEvents, runService } from './bot';
import { BAGUETTE, INGREDIENTS, PRODUCTS } from '../../src/data/catalog';
import { canBakeTray, onMenu, trayCapacity } from '../../src/engine/economy';
import type { IngredientId } from '../../src/engine/types';

const recipeDays = new Set(UNLOCK_SCHEDULE.filter((u) => u.kind === 'recipe').map((u) => u.day));

/** Every dispatch goes through here: a locked action must leave the game exactly as it was. */
const violations: string[] = [];
function act(s: GameState, a: Action): GameState {
  const need = actionFeature(a);
  const next = gameReducer(s, a);
  if (need && !featureOn(s, need) && next !== s) violations.push(`day ${s.day}: ${a.type} went through while ${need} was locked`);
  return next;
}

/** A guided player: uses whatever is unlocked, tries a few things that aren't, and lets the team run once it can. */
function guidedDay(s: GameState): GameState {
  let next = s.phase === 'setup' ? act(s, { type: 'setup', name: 'Guided', look: s.look }) : s;
  next = resolveEvents(next);
  if (next.phase !== 'morning') return next;
  // Poke at locked systems: the reducer must refuse every one.
  for (const a of [
    { type: 'takeLoan', principal: 2000, term: 12 },
    { type: 'campaign', kind: 'flyers' },
    { type: 'buy', ingredient: 'flour', supplier: 'farm', packs: 1 },
    { type: 'buy', ingredient: 'flour', supplier: 'cho', packs: 10 },
    { type: 'signContract', ingredient: 'flour', supplier: 'farm', packsPerWeek: 2, weeks: 4 },
    { type: 'setCombo', on: true },
    { type: 'fund', amount: 50 },
  ] as Action[])
    if (!featureOn(next, actionFeature(a)!)) next = act(next, a);
  if (featureOn(next, 'staff.hire') && next.staff.length === 0 && next.applicants.length) next = act(next, { type: 'hire', applicantId: next.applicants[0].id });
  if (featureOn(next, 'today.teamDay') && next.day % 2 === 0) {
    const before = next;
    next = act(next, { type: 'runDay' });
    if (!featureOn(before, 'market.suppliers')) expect(next.supplierLoyalty.farm + next.supplierLoyalty.premium + next.supplierLoyalty.distributor).toBe(0);
    return finish(next);
  }
  // Own counter: restock what's open, bake, serve.
  if (featureOn(next, 'market.wet')) {
    const need = new Set<IngredientId>(['flour', 'chaLua', 'veg', 'coffee', 'condensed']);
    for (const p of onMenu(next)) for (const id of Object.keys(PRODUCTS[p].recipe) as IngredientId[]) need.add(id);
    for (const id of need) if (next.pantry[id].qty < INGREDIENTS[id].pack * 1.5) next = act(next, { type: 'buy', ingredient: id, supplier: 'cho', packs: 2 });
  }
  if (featureOn(next, 'kitchen.prices') && next.day === 3) next = act(next, { type: 'setPrice', product: 'banhMi', price: next.prices.banhMi + 0.25 });
  for (let i = 0; i < 2; i++) if (next.baguettes.qty < 14 && canBakeTray(next, BAGUETTE.recipe)) next = act(next, { type: 'bake', item: 'baguette', process: 80 });
  for (const p of onMenu(next)) {
    if (next.traysToday >= trayCapacity(next)) break;
    if (PRODUCTS[p].kind === 'tray' && next.display[p].qty < 6) next = act(next, { type: 'bake', item: p, process: 85 });
  }
  return finish(runService(next));
}

describe('feature unlocks (guided game)', () => {
  it('a fresh guided game starts with only the core loop, and locked actions are refused', () => {
    const s = createNewGame({ seed: 3, guided: true });
    expect(s.allUnlocked).toBe(false);
    expect(s.features).toEqual([]);
    for (const id of ALL_FEATURES) expect(featureOn(s, id)).toBe(false);
    const m = gameReducer(s, { type: 'setup', name: 'x', look: s.look });
    expect(gameReducer(m, { type: 'takeLoan', principal: 2000, term: 12 })).toBe(m);
    expect(gameReducer(m, { type: 'buy', ingredient: 'flour', supplier: 'cho', packs: 1 })).toBe(m);
    expect(gameReducer(m, { type: 'runDay' })).toBe(m);
    // Tests and old saves without the flag see everything.
    expect(featureOn(createNewGame(3), 'finances.capital')).toBe(true);
  });

  it('plays 40 days: unlocks arrive one a day at most, never on a recipe day, prerequisites first, and nothing locked ever runs', () => {
    violations.length = 0;
    let s = createNewGame({ seed: 11, guided: true });
    const log: { day: number; id: string }[] = [];
    let have = new Set<string>();
    for (let d = 0; d < 40 && !s.ending; d++) {
      s = guidedDay(s);
      const now = new Set(s.features ?? []);
      const added = [...now].filter((x) => !have.has(x));
      expect(added.length).toBeLessThanOrEqual(1);
      for (const id of added) {
        log.push({ day: s.day, id });
        expect(recipeDays.has(s.day)).toBe(false);
        for (const r of FEATURE[id as keyof typeof FEATURE].requires ?? []) expect(have.has(r)).toBe(true);
      }
      have = now;
      if (process.env.UNLOCK_LOG) console.log(`day ${s.day}: ${added.join(", ") || "-"}  cash ${Math.round(s.cash)} staff ${s.staff.length} level-xp ${s.xp}`);
      expect(Number.isFinite(s.cash)).toBe(true);
    }
    expect(violations).toEqual([]);
    expect(s.day).toBeGreaterThanOrEqual(35);
    expect(log[0]).toEqual({ day: 2, id: 'market.wet' });
    expect(log.map((l) => l.id)).toContain('staff.hire');
    expect(log.map((l) => l.id)).toContain('today.teamDay');
    expect(log.length).toBeGreaterThanOrEqual(15);
  });

  it('each unlock starts its intro quest; doing the thing finishes it and pays a little XP', () => {
    let s = createNewGame({ seed: 5, guided: true });
    s = guidedDay(s); // day 1 → morning of day 2
    expect(s.features).toContain('market.wet');
    expect(s.intro?.active).toBe('market.wet');
    expect(introStep(s)).toBe(0);
    const xp = s.xp;
    s = gameReducer(s, { type: 'buy', ingredient: 'flour', supplier: 'cho', packs: 1 });
    expect(s.intro?.active).toBe('market.wet');
    s = gameReducer(s, { type: 'buy', ingredient: 'sugar', supplier: 'cho', packs: 1 });
    // Then the lesson asks you to bake with what you bought.
    expect(s.intro?.active).toBe('market.wet');
    expect(introStep(s)).toBe(1);
    s = gameReducer(s, { type: 'bake', item: 'baguette', process: 80 });
    expect(s.intro?.active).toBeNull();
    expect(s.intro?.done).toContain('market.wet');
    expect(s.xp).toBeGreaterThanOrEqual(xp + FEATURE['market.wet'].intro.xp);
    // "Show me again" replays without paying twice; "Later" parks it.
    s = gameReducer(s, { type: 'introStart', id: 'market.wet' });
    expect(s.intro?.replay).toBe(true);
    s = gameReducer(s, { type: 'introLater' });
    expect(s.intro?.active).toBeNull();
    expect(s.intro?.later).not.toContain('market.wet');
    // Experienced baker opens everything.
    s = gameReducer(s, { type: 'unlockAll' });
    for (const id of ALL_FEATURES) expect(featureOn(s, id)).toBe(true);
  });

  it('a v3 save from day 50 migrates with everything up to day 50 unlocked and nothing in use taken away', () => {
    let s = createNewGame(9);
    s = { ...s, phase: 'morning', day: 50, loans: [], staff: [] };
    const old = JSON.parse(JSON.stringify({ ...s, version: 3, allUnlocked: undefined, features: undefined }));
    expect(validSave(old)).toBe(true);
    expect(old.version).toBe(4);
    for (const f of ALL_FEATURES) if (FEATURE[f].fallbackDay <= 50) expect(featureOn(old, f)).toBe(true);
    expect(featureOn(old, 'today.teamDay')).toBe(true);
    // A day-5 save that already took a loan keeps the loan tools.
    const early = JSON.parse(JSON.stringify({ ...createNewGame(9), phase: 'morning', day: 5, version: 3 }));
    early.loans = [{ id: 1, lender: 'Bank', principal: 2000, balance: 2000, rate: 0.08, termMonths: 12, payment: 180, monthsLeft: 12, accrued: 0, missed: 0, takenDay: 3, interestPaid: 0 }];
    expect(validSave(early)).toBe(true);
    expect(featureOn(early, 'finances.loans')).toBe(true);
    expect(featureOn(early, 'growth.branches')).toBe(false);
    expect(early.intro.active).toBeNull();
  });

  it('scenarios built on a system start with it unlocked', () => {
    const s = createNewGame({ seed: 4, scenario: 'startup', guided: true });
    expect(featureOn(s, 'finances.loans')).toBe(true);
    expect(featureOn(s, 'market.wet')).toBe(true);
    expect(featureOn(s, 'staff.hire')).toBe(false);
  });
});
