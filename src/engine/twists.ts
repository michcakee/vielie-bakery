import { PRODUCTS } from '../data/catalog';
import type { GameState, ProductId, Twist, Visit } from './types';

/** Order twists: "no chili", "extra herbs", "I'm in a hurry". Only on made-to-order items. */
export const TWIST = {
  /** Share of bánh mì and drink orders that come with a twist. */
  chance: 0.3,
  /** Guided games keep orders plain for the first few days. */
  fromDay: 5,
  /** Extra tip for getting a twist exactly right. */
  tip: 0.75,
  /** A rush order pays this extra tip when served within this share of the customer's patience. */
  rushTip: 1,
  rushWithin: 0.45,
};

const SKIP: Record<string, string> = {
  sauce: 'No chili, please!',
  pickles: 'No pickles, please!',
  herbs: 'No herbs, please!',
  ice: 'No ice, please!',
  sugar: 'No sugar, please!',
  cream: 'No cream, please!',
};
const DOUBLE: Record<string, string> = {
  chaLua: 'Extra chả lụa, please!',
  herbs: 'Extra herbs, please!',
  sauce: 'Extra chili, make it spicy!',
  milk: 'Extra milk, make it sweet!',
  ice: 'Extra ice, please!',
};
const RUSH = 'Quick, please, I’m running late!';

export function twistsOn(s: Pick<GameState, 'allUnlocked' | 'day'>): boolean {
  return s.allUnlocked !== false || s.day >= TWIST.fromDay;
}

/** Pick a twist for an order of `p`, or none. `rand` is the day's twist stream. */
export function rollTwist(p: ProductId, rand: () => number, chance = TWIST.chance): Twist | undefined {
  const steps = PRODUCTS[p].steps;
  if (!steps?.length || rand() > chance) return undefined;
  const r = rand();
  if (r < 0.25) return { kind: 'rush' };
  // The first step is the base (bread, tea, milk): never skipped.
  const skips = steps.slice(1).filter((st) => SKIP[st.id]);
  const doubles = steps.filter((st) => DOUBLE[st.id]);
  const wantSkip = r < 0.65;
  const pool = wantSkip ? (skips.length ? skips : doubles) : doubles.length ? doubles : skips;
  if (!pool.length) return { kind: 'rush' };
  const step = pool[Math.floor(rand() * pool.length)].id;
  return { kind: pool === skips ? 'skip' : 'double', step };
}

export function twistLine(t: Twist): string {
  if (t.kind === 'skip') return SKIP[t.step!] ?? RUSH;
  if (t.kind === 'double') return DOUBLE[t.step!] ?? RUSH;
  return RUSH;
}

/** Short label for the order card and the ticket. */
export function twistLabel(t: Twist): string {
  return twistLine(t).replace(/, please!$|, make it \w+!$|!$/, '').replace('Quick, please, I’m running late', 'In a hurry');
}

/** The steps to tap for this order: a skipped step is left out, a doubled one appears twice. */
export function twistSteps<T extends { id: string }>(steps: T[], t: Twist | undefined): T[] {
  if (!t || t.kind === 'rush') return steps;
  if (t.kind === 'skip') return steps.filter((st) => st.id !== t.step);
  return steps.flatMap((st) => (st.id === t.step ? [st, st] : [st]));
}

/** Extra tip for a twist handled well by the player. */
export function twistBonus(v: Visit, process: number | undefined, waited: number): number {
  if (!v.twist) return 0;
  if (v.twist.kind === 'rush') return waited <= v.patience * TWIST.rushWithin ? TWIST.rushTip : 0;
  return process === 100 ? TWIST.tip : 0;
}
