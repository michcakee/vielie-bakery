import { BAGUETTE, INGREDIENTS, PRODUCTS } from '../../src/data/catalog';
import { canBakeTray, onMenu, trayCapacity } from '../../src/engine/economy';
import { EVENTS } from '../../src/engine/events';
import { DEFAULT_LOOK, gameReducer, type Action } from '../../src/engine/state';
import type { GameState, IngredientId } from '../../src/engine/types';

export const act = (s: GameState, ...actions: Action[]) => actions.reduce(gameReducer, s);

export function resolveEvents(s: GameState, pick: 'first' | 'last' = 'last'): GameState {
  let next = s;
  let guard = 0;
  while (next.events.length && guard++ < 6) {
    const ev = next.events[0];
    if (ev.id === 'bailout') {
      next = gameReducer(next, { type: 'resolveEvent', choice: 'accept' });
      continue;
    }
    const choices = EVENTS[ev.id].choices(next).filter((c) => (!c.enabled || c.enabled(next)) && (c.cost === undefined || next.cash >= c.cost));
    const c = pick === 'first' ? choices[0] : choices[choices.length - 1];
    const before = next.events.length;
    next = gameReducer(next, { type: 'resolveEvent', choice: c?.id ?? 'skip' });
    if (next.events.length === before) next = { ...next, events: next.events.slice(1) };
  }
  return next;
}

/** A sensible player: restocks, bakes, opens, serves everyone it can and tidies up. */
export function morning(s: GameState): GameState {
  let next = s.phase === 'setup' ? act(s, { type: 'setup', name: 'Test Bakery', look: DEFAULT_LOOK }) : s;
  next = resolveEvents(next);
  if (next.phase !== 'morning') return next;
  const menu = onMenu(next);
  const need = new Set<IngredientId>(['flour', 'chaLua', 'veg', 'coffee', 'condensed']);
  for (const p of menu) for (const id of Object.keys(PRODUCTS[p].recipe) as IngredientId[]) need.add(id);
  for (const id of need) {
    const target = INGREDIENTS[id].pack * 1.5;
    let guard = 0;
    while (next.pantry[id].qty < target && guard++ < 3) {
      const before = next.pantry[id].qty;
      next = gameReducer(next, { type: 'buy', ingredient: id, supplier: 'cho', packs: 1 });
      if (next.pantry[id].qty === before) break;
    }
  }
  const cap = trayCapacity(next);
  for (let i = 0; i < 2; i++) if (next.baguettes.qty < 14 && canBakeTray(next, BAGUETTE.recipe)) next = gameReducer(next, { type: 'bake', item: 'baguette', process: 80 });
  for (const p of menu) {
    if (next.traysToday >= cap) break;
    if (PRODUCTS[p].kind === 'tray' && next.display[p].qty < 6) next = gameReducer(next, { type: 'bake', item: p, process: 85 });
  }
  return next;
}

export function runService(s: GameState, serveAll = true): GameState {
  if (s.phase !== 'morning') return s;
  let next = gameReducer(s, { type: 'open' });
  let guard = 0;
  while (next.phase === 'service' && guard++ < 400) {
    next = gameReducer(next, { type: 'tick', minutes: 4 });
    if (next.service?.clock && next.service.clock >= 600 && !next.service.lastCall) next = gameReducer(next, { type: 'lastCall', on: true });
    if (serveAll && next.phase === 'service') for (const v of next.service!.visits.filter((x) => x.status === 'waiting' && !x.servedBy)) next = gameReducer(next, { type: 'serve', visitId: v.id, process: 85 });
  }
  return next;
}

export function finish(s: GameState): GameState {
  let next = s.phase === 'closing' ? gameReducer(s, { type: 'finishDay' }) : s;
  if (next.phase === 'report') next = gameReducer(next, { type: 'nextDay' });
  if (next.phase === 'weekly') next = gameReducer(next, { type: 'pickGoal', id: next.goalChoices[0] });
  return next;
}

export const playDay = (s: GameState) => finish(runService(morning(s)));

/** Delegate a whole day to staff and the autopilot. */
export function autoDay(s: GameState): GameState {
  let next = s.phase === 'setup' ? act(s, { type: 'setup', name: 'Test Bakery', look: DEFAULT_LOOK }) : s;
  next = resolveEvents(next);
  if (next.phase !== 'morning') return next;
  next = gameReducer(next, { type: 'runDay' });
  return finish(next);
}
