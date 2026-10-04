import { UNLOCK_SCHEDULE } from '../data/catalog';
import { ALL_FEATURES, FEATURE, FEATURES, SCENARIO_START, TAB_FEATURES, type FeatureId, type TabId } from '../data/unlocks';
import { toast } from './helpers';
import type { GameState, IntroState } from './types';

/** True when the player can use this system. Saves without the field (and tests) see everything. */
export function featureOn(s: Pick<GameState, 'allUnlocked' | 'features'>, id: FeatureId): boolean {
  return s.allUnlocked !== false || (s.features ?? []).includes(id);
}

export function tabOn(s: GameState, tab: TabId): boolean {
  const need = TAB_FEATURES[tab];
  return !need || need.some((f) => featureOn(s, f));
}

export const emptyIntro = (): IntroState => ({ active: null, base: {}, done: [], later: [], startedDay: 0, replay: false });

/** Starting unlocks for a guided game in this scenario. */
export function startingFeatures(scenario: GameState['scenario']): FeatureId[] {
  return [...SCENARIO_START[scenario]];
}

/** Turn every gate off (Experienced baker). Intro quests are skipped, not owed. */
export function unlockAll(s: GameState): GameState {
  return { ...s, allUnlocked: true, features: [...ALL_FEATURES], newFeatures: [], intro: { ...(s.intro ?? emptyIntro()), active: null, later: [], replay: false } };
}

const recipeDay = (day: number) => UNLOCK_SCHEDULE.some((u) => u.kind === 'recipe' && u.day === day);

/** Which locked features are due this morning, earliest fallback first. */
export function dueFeatures(s: GameState): FeatureId[] {
  if (s.allUnlocked !== false) return [];
  const have = new Set(s.features ?? []);
  // A triggered system is due "today" at the latest; an urgent one jumps the queue.
  const key = (f: (typeof FEATURES)[number]) => (f.trigger && f.trigger(s) ? (f.urgent ? 0 : Math.min(f.fallbackDay, s.day)) : f.fallbackDay);
  return FEATURES.filter((f) => !have.has(f.id) && (f.requires ?? []).every((r) => have.has(r)) && (!f.gate || f.gate(s)) && (s.day >= f.fallbackDay || (!!f.trigger && f.trigger(s))))
    .sort((a, b) => key(a) - key(b))
    .map((f) => f.id);
}

function startIntro(s: GameState, id: FeatureId, replay = false): GameState {
  const intro = s.intro ?? emptyIntro();
  const f = FEATURE[id];
  const later = intro.active && intro.active !== id && !intro.done.includes(intro.active) ? [...new Set([...intro.later, intro.active])] : intro.later;
  return { ...s, intro: { ...intro, active: id, base: f.intro.snapshot?.(s) ?? {}, later: later.filter((x) => x !== id), startedDay: s.day, replay } };
}

/** Morning: at most one new system, never on a day a new recipe arrives. */
export function applyFeatureUnlocks(s: GameState): GameState {
  if (s.allUnlocked !== false || recipeDay(s.day) || s.lastFeatureDay === s.day || s.questProgress.recipeDay === s.day) return s;
  const [id] = dueFeatures(s);
  if (!id) return s;
  const next: GameState = { ...s, features: [...(s.features ?? []), id], newFeatures: [...(s.newFeatures ?? []), id], lastFeatureDay: s.day };
  return startIntro(next, id);
}

/** Retake the intro snapshot after the morning has settled (the special is picked after unlocks). */
export function refreshIntroBase(s: GameState): GameState {
  const intro = s.intro;
  if (!intro?.active || intro.startedDay !== s.day) return s;
  return { ...s, intro: { ...intro, base: FEATURE[intro.active].intro.snapshot?.(s) ?? {} } };
}

/** The first unfinished step of the active intro quest (index), or -1 when all are done. */
export function introStep(s: GameState): number {
  const intro = s.intro;
  if (!intro?.active) return -1;
  return FEATURE[intro.active].intro.steps.findIndex((st) => !st.done(s, intro.base ?? {}));
}

export function checkIntro(s: GameState): GameState {
  const intro = s.intro;
  if (!intro?.active || introStep(s) !== -1) return s;
  const f = FEATURE[intro.active];
  const first = !intro.done.includes(f.id);
  let next: GameState = { ...s, intro: { ...intro, active: null, done: first ? [...intro.done, f.id] : intro.done, replay: false } };
  if (first && !intro.replay) next = { ...next, xp: next.xp + f.intro.xp };
  return toast(next, 'quest', `${f.name}: done!`, f.intro.after);
}

export function introLater(s: GameState): GameState {
  const intro = s.intro;
  if (!intro?.active) return s;
  const keep = intro.done.includes(intro.active) ? intro.later : [...new Set([...intro.later, intro.active])];
  return { ...s, intro: { ...intro, active: null, later: keep, replay: false } };
}

/** Start a deferred intro quest, or replay one already done ("Show me again"). */
export function introStart(s: GameState, id: FeatureId): GameState {
  if (!featureOn(s, id) || !FEATURE[id]) return s;
  const intro = s.intro ?? emptyIntro();
  // A replay starts clean: "looked at it" steps have to be looked at again.
  const hints = s.hints.filter((h) => h !== `visit:${id}`);
  return startIntro({ ...s, hints }, id, intro.done.includes(id));
}

/** Opening a tab clears its NEW badges. */
export function seeTab(s: GameState, tab: string): GameState {
  const nf = (s.newFeatures ?? []).filter((f) => FEATURE[f].tab !== tab);
  return nf.length === (s.newFeatures ?? []).length ? s : { ...s, newFeatures: nf };
}

/** The next locked feature and roughly when it arrives, for the Next up card and the report tease. */
export function nextFeature(s: GameState): { id: FeatureId; teaser: string; day: number } | null {
  if (s.allUnlocked !== false) return null;
  const have = new Set(s.features ?? []);
  const f = FEATURES.filter((x) => !have.has(x.id) && x.fallbackDay < 999).sort((a, b) => a.fallbackDay - b.fallbackDay)[0];
  if (!f) return null;
  let day = Math.max(f.fallbackDay, s.day + 1);
  while (recipeDay(day)) day++;
  return { id: f.id, teaser: f.teaser, day };
}

/**
 * v3 saves: everything whose fallback day has passed, plus anything the save already uses,
 * so returning players lose nothing. Their intro quests count as done.
 */
export function migrateFeatures(s: GameState): GameState {
  const inUse: FeatureId[] = [];
  if (s.day > 1) inUse.push('market.wet', 'kitchen.prices', 'today.teamDay');
  if (s.staff.length) inUse.push('staff.hire', 'staff.manage');
  if (s.loans.length || s.creditLine.balance > 0) inUse.push('finances.loans');
  if (s.investors.length || s.bonds.length || Object.values(s.shares).some((n) => n > 0)) inUse.push('finances.capital');
  if (s.contracts.length || s.locks.length || Object.keys(s.reorder).length) inUse.push('market.contracts');
  if (s.deliveries.length || s.supplierLoyalty.farm || s.supplierLoyalty.premium || s.supplierLoyalty.distributor) inUse.push('market.suppliers');
  if (s.campaigns.length) inUse.push('customers.marketing');
  if (s.branches.length) inUse.push('growth.branches');
  if (s.safetyFund > 0) inUse.push('finances.cash');
  if (s.equipment.length > 1) inUse.push('growth.equipment');
  if (s.combo || s.sizes) inUse.push('kitchen.deals');
  if (Object.keys(s.plan.trays).length) inUse.push('kitchen.plan');
  const features = FEATURES.filter((f) => f.fallbackDay <= s.day || inUse.includes(f.id)).map((f) => f.id);
  // Keep prerequisites consistent.
  const set = new Set(features);
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of [...set]) for (const r of FEATURE[id].requires ?? []) if (!set.has(r)) (set.add(r), (grew = true));
  }
  const list = ALL_FEATURES.filter((f) => set.has(f));
  return { ...s, allUnlocked: list.length === ALL_FEATURES.length, features: list, newFeatures: [], intro: { ...emptyIntro(), done: list }, lastFeatureDay: s.day };
}
