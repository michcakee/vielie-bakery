import { UPGRADES } from '../data/catalog';
import type { TabId } from '../data/unlocks';
import { incomeStatement, sumBooks } from './accounting';
import { has, laborTrays, levelOf, ovenCapacity } from './economy';
import { featureOn } from './unlocks';
import type { GameState, UpgradeId } from './types';

export interface Advice {
  id: 'losing' | 'soldOut' | 'slow' | 'price';
  /** One or two plain sentences: what is going wrong and what to do about it. */
  text: string;
  tab: TabId;
  spot?: string;
}

const money0 = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** The next oven the player could buy, if any. */
function nextOven(s: GameState): UpgradeId | null {
  const level = levelOf(s.xp);
  for (const id of ['oven2', 'oven3'] as UpgradeId[]) {
    const u = UPGRADES[id];
    const owned = s.equipment.filter((e) => e.kind === id).length;
    if (owned < u.max && u.level <= level && (!u.requires || has(s, u.requires))) return id;
  }
  return null;
}

/**
 * The single most important thing holding the bakery back, from the last few days. Money first
 * (losing money ends the game), then customers turned away, then slow service, then prices.
 */
export function biggestProblem(s: GameState): Advice | null {
  const recent = s.history.slice(-3);
  if (recent.length < 2) return null;
  const n = recent.length;
  const avg = (f: (h: (typeof recent)[number]) => number) => recent.reduce((t, h) => t + f(h), 0) / n;

  // 1. Losing money, day after day.
  const losses = recent.filter((h) => h.profit < 0).length;
  const total = recent.reduce((t, h) => t + h.profit, 0);
  if (losses >= 2 && total < 0 && featureOn(s, 'finances.income')) {
    const is = incomeStatement(sumBooks(recent));
    const lines = [{ key: 'ingredients', value: is.cogs }, ...is.opexLines.map((l) => ({ key: l.key as string, value: l.value }))].sort((a, b) => b.value - a.value);
    const top = lines[0];
    const perDay = top.value / n;
    const lost = money0(-total / n);
    if (top.key === 'wages' && s.staff.length)
      return { id: 'losing', tab: 'staff', text: `You’re losing about ${lost} a day. The biggest cost is wages: ${money0(perDay)} a day for ${s.staff.length} ${s.staff.length === 1 ? 'person' : 'people'}. If nobody is giving up in the queue, you may have more help than you need.` };
    if (top.key === 'ingredients')
      return { id: 'losing', tab: 'kitchen', spot: 'price', text: `You’re losing about ${lost} a day. Ingredients cost ${money0(perDay)} a day, nearly all you take in. Raise your prices a little, or bake less of what doesn’t sell.` };
    if (top.key === 'rent')
      return { id: 'losing', tab: 'kitchen', text: `You’re losing about ${lost} a day. Rent (${money0(perDay)} a day) is the big cost: it’s the same whether you sell a lot or a little, so selling more is the fix.` };
    return { id: 'losing', tab: 'money', spot: 'profit', text: `You’re losing about ${lost} a day. The biggest cost is ${top.key === 'waste' ? 'food nobody bought' : top.key === 'spoilage' ? 'ingredients that went off' : top.key} (${money0(perDay)} a day). Open Money to see every cost.` };
  }

  // 2. Customers turned away by an empty pastry case.
  const soldOut = avg((h) => h.lostSoldOut);
  if (soldOut >= 10) {
    const ovens = ovenCapacity(s);
    const hands = laborTrays(s);
    const people = Math.round(soldOut);
    if (hands < ovens - 0.5 && featureOn(s, 'staff.hire'))
      return { id: 'soldOut', tab: 'staff', text: `About ${people} people a day found the pastry case empty. Your oven has room for ${ovens} trays, but you can only bake ${Math.floor(hands)} a morning yourself. Hire a baker to fill it.` };
    const oven = nextOven(s);
    if (oven && featureOn(s, 'growth.equipment')) {
      const u = UPGRADES[oven];
      const extra = u.trays ?? 0;
      const needBaker = hands < ovens + extra - 0.5;
      return {
        id: 'soldOut',
        tab: 'growth',
        spot: 'equipment',
        text: `About ${people} people a day found the pastry case empty: your oven is full every morning. A ${u.name.toLowerCase()} (${money0(u.cost * s.macro.priceIndex)}) adds ${extra} trays a day.${needBaker ? ' You’ll also need a baker to fill it.' : ''}`,
      };
    }
    return featureOn(s, 'kitchen.prices')
      ? { id: 'soldOut', tab: 'kitchen', spot: 'price', text: `About ${people} people a day found the pastry case empty. Fill every tray each morning with what sells out first. If the oven is already full, a slightly higher price on those earns more from the same trays.` }
      : { id: 'soldOut', tab: 'kitchen', spot: 'bake', text: `About ${people} people a day found the pastry case empty. Bake every tray you can each morning, starting with what sells out first.` };
  }

  // 3. People giving up in the queue (counting only days since the newest hire, so the help gets a fair go).
  const counter = s.staff.filter((e) => (e.branch ?? null) === null);
  const hiredOn = Math.max(0, ...counter.map((e) => e.hiredDay));
  const since = recent.filter((h) => h.day >= hiredOn);
  const slow = since.length ? since.reduce((t, h) => t + h.lostSlow, 0) / since.length : 0;
  if (slow >= 4 && featureOn(s, 'staff.hire'))
    return {
      id: 'slow',
      tab: 'staff',
      spot: 'hire-btn',
      text: counter.length
        ? `About ${Math.round(slow)} people a day still gave up waiting in line. Another helper would reach them, if the extra sales cover the wage.`
        : `About ${Math.round(slow)} people a day gave up waiting in line. A helper serves the customers you can’t reach.`,
    };

  // 4. Prices scaring people off.
  const priceShare = recent.reduce((t, h) => t + h.lostPrice, 0) / Math.max(1, recent.reduce((t, h) => t + h.customers, 0));
  if (priceShare >= 0.25 && featureOn(s, 'kitchen.prices'))
    return { id: 'price', tab: 'kitchen', spot: 'price', text: `About ${Math.round(priceShare * 10)} in 10 customers walked away because of the price. Try lowering your priciest item a little and see what happens.` };

  return null;
}
