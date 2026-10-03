import { PRODUCTS } from '../data/catalog';
import { move } from './accounting';
import { onMenu } from './economy';
import { toast } from './helpers';
import { rngFor } from './rng';
import { twistsOn } from './twists';
import { featureOn } from './unlocks';
import type { Challenge, GameState } from './types';

/** One small task each morning, with a small reward. Guided games start on day 3. */
export const CHALLENGE = { fromDay: 3, xp: 20, cash: 8 };

const avg = (s: GameState, f: (h: GameState['history'][number]) => number) => {
  const h = s.history.slice(-3);
  return h.length ? h.reduce((t, x) => t + f(x), 0) / h.length : 0;
};
const clampInt = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

/** Pick today's challenge. Targets sit a little above what the player has been doing. */
export function pickChallenge(s: GameState): Challenge | null {
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
  }
}

export function challengeProgress(s: GameState, c: Challenge): number {
  const t = s.today;
  switch (c.id) {
    case 'sellItem':
      return t.sold[c.product!] ?? 0;
    case 'beforeNoon':
      return t.servedBeforeNoon;
    case 'love':
      return t.love;
    case 'perfect':
      return t.fiveStar ?? 0;
    case 'noLeave':
      return t.lostSlow === 0 ? 1 : 0;
    case 'twists':
      return t.twistsRight ?? 0;
    case 'regulars':
      return t.regularsServed;
  }
}

function win(s: GameState, c: Challenge): GameState {
  const cash = Math.round(CHALLENGE.cash * s.macro.priceIndex);
  let next: GameState = { ...s, challenge: { ...c, done: true }, xp: s.xp + CHALLENGE.xp, lifetime: { ...s.lifetime, challenges: (s.lifetime.challenges ?? 0) + 1 } };
  next = move(next, 'cashOperatingOther', cash, { otherIncome: cash });
  return toast(next, 'quest', 'Daily challenge done!', `${challengeText(c)}: +${CHALLENGE.xp} XP and $${cash} in the tip jar.`);
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
