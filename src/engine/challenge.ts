import { PRODUCTS } from '../data/catalog';
import { move } from './accounting';
import { onMenu } from './economy';
import { toast } from './helpers';
import { rngFor } from './rng';
import { twistsOn } from './twists';
import { featureOn } from './unlocks';
import type { Challenge, GameState, OpeningEventId } from './types';

/** One small task each morning, with a small reward. Guided games start on day 3. */
export const CHALLENGE = { fromDay: 3, xp: 20, cash: 8 };

/**
 * The opening week of a guided game: each of days 2 to 7 has its own twist that changes who
 * walks in (service.ts), with a goal and a bigger reward than a daily challenge. It takes the
 * daily challenge's place on those days, so the first week never plays the same twice.
 */
export const OPENING: Record<OpeningEventId, { day: number; title: string; blurb: string; target: number; xp: number; cash: number }> = {
  rush: { day: 2, title: 'Morning rush', blurb: 'The school down the lane starts late today, so a crowd of parents comes in for breakfast around 8.', target: 10, xp: 40, cash: 25 },
  tasteTest: { day: 3, title: 'Taste test', blurb: 'Word is out about Bà’s banana cake, and people are coming in just to try it. Bà left you enough for a first tray.', target: 6, xp: 40, cash: 25 },
  critic: { day: 4, title: 'The Food Critic visits', blurb: 'A food critic is coming in early, around 8:30, and she loves bánh flan. Bake it in the golden zone today and serve her quickly: she grades harder than anyone.', target: 1, xp: 50, cash: 30 },
  bigOrder: { day: 5, title: 'Big order', blurb: 'Someone from the office tower is coming before lunch to buy for the whole team. Have plenty in the case!', target: 1, xp: 45, cash: 30 },
  requests: { day: 6, title: 'Picky customers', blurb: 'No chili, extra herbs, no ice: today everyone wants it their way. Read each order and get it just right for a bigger tip.', target: 3, xp: 45, cash: 30 },
  laneParty: { day: 7, title: 'Party on the lane', blurb: 'The neighbours are throwing a street party this afternoon. Expect a big crowd after lunch: bake plenty of pastries!', target: 16, xp: 60, cash: 40 },
};
const OPENING_ORDER: OpeningEventId[] = ['rush', 'tasteTest', 'critic', 'bigOrder', 'requests', 'laneParty'];

export const isOpening = (c: Pick<Challenge, 'id'> | null | undefined): c is Challenge & { id: OpeningEventId } => !!c && c.id in OPENING;

/** The opening-week event on this day of a guided game, if any. */
export function openingOn(s: Pick<GameState, 'allUnlocked'>, day: number): OpeningEventId | null {
  if (s.allUnlocked !== false) return null;
  return OPENING_ORDER.find((id) => OPENING[id].day === day) ?? null;
}

const avg = (s: GameState, f: (h: GameState['history'][number]) => number) => {
  const h = s.history.slice(-3);
  return h.length ? h.reduce((t, x) => t + f(x), 0) / h.length : 0;
};
const clampInt = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

/** Pick today's challenge. Targets sit a little above what the player has been doing. */
export function pickChallenge(s: GameState): Challenge | null {
  const opening = openingOn(s, s.day);
  // The taste test needs the new recipe on the menu; otherwise it's an ordinary day.
  if (opening && (opening !== 'tasteTest' || onMenu(s).includes('banhChuoi'))) {
    return { id: opening, target: OPENING[opening].target, product: opening === 'tasteTest' ? 'banhChuoi' : undefined, done: false, day: s.day };
  }
  if (s.day < (s.allUnlocked === false ? CHALLENGE.fromDay : 2)) return null;
  const rand = rngFor(s.seed, s.day, 77);
  const served = avg(s, (h) => h.served) || 10;
  const pool: Challenge[] = [];
  const menu = onMenu(s).filter((p) => !PRODUCTS[p].season);
  if (menu.length) {
    const p = menu[Math.floor(rand() * menu.length)];
    pool.push({ id: 'sellItem', product: p, target: clampInt(avg(s, (h) => h.sold[p] ?? 0) * 1.15 + 1, 3, 30), done: false, day: s.day });
  }
  pool.push({ id: 'beforeNoon', target: clampInt(served * 0.5 + 1, 4, 40), done: false, day: s.day });
  pool.push({ id: 'love', target: clampInt(served * 0.3, 3, 25), done: false, day: s.day });
  pool.push({ id: 'perfect', target: 3, done: false, day: s.day });
  pool.push({ id: 'noLeave', target: 1, done: false, day: s.day });
  if (twistsOn(s)) pool.push({ id: 'twists', target: 2, done: false, day: s.day });
  if (featureOn(s, 'customers.regulars')) pool.push({ id: 'regulars', target: 2, done: false, day: s.day });
  // Never the same kind two days running.
  const fresh = pool.filter((c) => c.id !== s.challenge?.id);
  return fresh[Math.floor(rand() * fresh.length)] ?? null;
}

export function challengeText(c: Challenge): string {
  switch (c.id) {
    case 'sellItem':
      return `Sell ${c.target} ${PRODUCTS[c.product!].name}`;
    case 'beforeNoon':
      return `Serve ${c.target} customers before lunch`;
    case 'love':
      return `Make ${c.target} customers love their order`;
    case 'perfect':
      return `Make ${c.target} perfect orders yourself (5 stars)`;
    case 'noLeave':
      return 'Nobody gives up waiting today';
    case 'twists':
      return `Get ${c.target} special requests just right`;
    case 'regulars':
      return `Serve ${c.target} neighbours you know by name`;
    case 'rush':
      return `Serve ${c.target} customers before lunch`;
    case 'tasteTest':
      return `Sell ${c.target} ${PRODUCTS.banhChuoi.name}`;
    case 'critic':
      return 'Give the Food Critic a 4- or 5-star order';
    case 'bigOrder':
      return 'Serve the big order';
    case 'requests':
      return `Get ${c.target} special requests just right`;
    case 'laneParty':
      return `Sell ${c.target} pastries from the glass case`;
  }
}

/** XP and cash for finishing this challenge. */
export function challengeReward(s: Pick<GameState, 'macro'>, c: Challenge): { xp: number; cash: number } {
  const base = isOpening(c) ? OPENING[c.id] : CHALLENGE;
  return { xp: base.xp, cash: Math.round(base.cash * s.macro.priceIndex) };
}

export function challengeProgress(s: GameState, c: Challenge): number {
  const t = s.today;
  switch (c.id) {
    case 'sellItem':
    case 'tasteTest':
      return t.sold[c.product!] ?? 0;
    case 'beforeNoon':
    case 'rush':
      return t.servedBeforeNoon;
    case 'love':
      return t.love;
    case 'perfect':
      return t.fiveStar ?? 0;
    case 'noLeave':
      return t.lostSlow === 0 ? 1 : 0;
    case 'twists':
    case 'requests':
      return t.twistsRight ?? 0;
    case 'regulars':
      return t.regularsServed;
    case 'critic':
      return t.criticPleased ?? 0;
    case 'bigOrder':
      return t.bigOrders ?? 0;
    case 'laneParty':
      return (Object.keys(t.sold) as (keyof typeof t.sold)[]).reduce((n, p) => n + (PRODUCTS[p]?.kind === 'tray' ? t.sold[p] ?? 0 : 0), 0);
  }
}

function win(s: GameState, c: Challenge): GameState {
  const { xp, cash } = challengeReward(s, c);
  let next: GameState = { ...s, challenge: { ...c, done: true }, xp: s.xp + xp, lifetime: { ...s.lifetime, challenges: (s.lifetime.challenges ?? 0) + 1 } };
  next = move(next, 'cashOperatingOther', cash, { otherIncome: cash });
  return isOpening(c) ? toast(next, 'quest', `${OPENING[c.id].title}: done!`, `${challengeText(c)}: +${xp} XP and $${cash} in the tip jar.`) : toast(next, 'quest', 'Daily challenge done!', `${challengeText(c)}: +${xp} XP and $${cash} in the tip jar.`);
}

/** During the day: counted challenges finish the moment the number is reached. */
export function checkChallenge(s: GameState): GameState {
  const c = s.challenge;
  if (!c || c.done || c.day !== s.day || c.id === 'noLeave') return s;
  return challengeProgress(s, c) >= c.target ? win(s, c) : s;
}

/** Closing time: "nobody gave up waiting" can only be judged once the doors are shut. */
export function settleChallenge(s: GameState): GameState {
  const c = s.challenge;
  if (!c || c.done || c.day !== s.day || c.id !== 'noLeave') return s;
  return s.today.lostSlow === 0 && s.today.served >= 5 ? win(s, c) : s;
}
