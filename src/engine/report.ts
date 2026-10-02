import { PRODUCTS, PRODUCT_ORDER, WEATHER } from '../data/catalog';
import { REGULARS } from '../data/people';
import { clockLabel } from './time';
import type { DayStats, GameState, ProductId } from './types';

const nameOf = (p: ProductId) => PRODUCTS[p].name;

/** A short story of the day, most interesting first. */
export function recap(s: GameState, t: DayStats): string[] {
  const out: string[] = [];
  for (const p of PRODUCT_ORDER) {
    const at = t.soldOutAt[p];
    if (at !== undefined && at < 300) out.push(`Your ${nameOf(p)} sold out at ${clockLabel(at)}, before lunch!`);
  }
  const top = PRODUCT_ORDER.filter((p) => t.sold[p] > 0).sort((a, b) => t.sold[b] - t.sold[a])[0];
  if (top) out.push(`${nameOf(top)} was the star today: ${t.sold[top]} sold.`);
  const earner = PRODUCT_ORDER.filter((p) => t.revenueBy[p] > 0).sort((a, b) => t.revenueBy[b] - t.cogsBy[b] - (t.revenueBy[a] - t.cogsBy[a]))[0];
  if (earner && earner !== top) out.push(`But ${nameOf(earner)} earned the most after costs: $${(t.revenueBy[earner] - t.cogsBy[earner]).toFixed(0)}.`);
  for (const p of PRODUCT_ORDER) if (t.made[p] >= 6 && t.sold[p] < t.made[p] * 0.5) out.push(`${nameOf(p)} was slower than expected: ${t.sold[p]} of ${t.made[p]} sold.`);
  for (const p of PRODUCT_ORDER) {
    const n = t.pricey[p] ?? 0;
    if (n >= 3) out.push(`${n} people looked at the ${nameOf(p)} price and said "Đắt quá…"`);
  }
  if ((t.lockSaved ?? 0) >= 0.5) out.push(`Your price lock saved $${t.lockSaved!.toFixed(2)} compared with today's market price. Hedging paid off!`);
  if (t.savedOnSupplies >= 3) out.push(`You saved $${t.savedOnSupplies.toFixed(2)} on supplies by shopping smart.`);
  const rivals = Object.entries(t.divertedTo).sort((a, b) => b[1] - a[1]);
  if (rivals.length) out.push(`${t.diverted} ${t.diverted === 1 ? 'person' : 'people'} chose a rival instead${rivals[0] ? `, mostly ${rivals[0][0]}` : ''}.`);
  if (t.lostSlow >= 3) out.push(`${t.lostSlow} customers gave up waiting in the queue.`);
  if (t.staffServed > 0) out.push(`Your team served ${t.staffServed} customers${t.ownerServed ? `; you served ${t.ownerServed}` : ''}.`);
  if (t.deliveries > 0) out.push(`Riders delivered ${t.deliveries} orders around the neighbourhood.`);
  const reg = REGULARS.filter((r) => s.service?.visits.some((v) => v.who === r.id && v.mood && ['love', 'happy', 'ok'].includes(v.mood)));
  if (reg.length) out.push(`${reg.map((r) => r.name).join(', ')} ${reg.length === 1 ? 'came' : 'all came'} back today.`);
  if (t.donatedUnits > 0) out.push(`You gave ${t.donatedUnits} leftover items to the neighbourhood food shelf.`);
  out.push(...t.notes);
  if (!out.length) out.push(`A quiet ${WEATHER[t.weather].name.toLowerCase()} day on the lane.`);
  return out.slice(0, 7);
}

/** One friendly, useful suggestion. */
export function businessTip(s: GameState, t: DayStats, profit: number): string {
  const early = PRODUCT_ORDER.find((p) => (t.soldOutAt[p] ?? 999) < 360);
  if (early) return `${nameOf(early)} ran out early. Tomorrow you could make a few more: those were sales you missed.`;
  const pricey = PRODUCT_ORDER.find((p) => (t.pricey[p] ?? 0) >= 4);
  if (pricey) return `Lots of people thought ${nameOf(pricey)} was too expensive. Try a small price cut and watch the demand meter.`;
  if (t.wasteUnits >= 8) return `You threw away ${t.wasteUnits} items. Bake a little less, or turn on Last Call near closing to sell leftovers at a discount.`;
  if (t.lostSlow >= 5) return 'The queue got long and people left. Adding one more person at the counter could pay for itself: check the Staff tab for the numbers.';
  if (t.diverted >= 6) return `${t.diverted} shoppers went to rivals today. Compare prices and quality in the Market tab; you don't have to be cheapest, just worth it.`;
  if (profit < 0 && t.revenue > 0) return `Rent, wages and power cost about $${(t.books.rent + t.books.wages + t.books.utilities).toFixed(0)} a day whether you sell 1 item or 100. Selling more each day spreads that fixed cost thinner.`;
  if (t.lostSoldOut >= 4) return 'Several people asked for something you didn\'t have. A wider menu catches more customers.';
  const unsold = PRODUCT_ORDER.find((p) => t.made[p] > 0 && t.sold[p] === 0);
  if (unsold) return `Nobody bought ${nameOf(unsold)} today. Check its price and the time of day people want it.`;
  if (s.market.tomorrow === 'hot') return 'Tomorrow will be hot. Cold drinks will be in demand: stock up on coffee, condensed milk and kumquats.';
  if (s.market.tomorrow === 'rainy') return 'Rain tomorrow means fewer walk-ins. A smaller bake keeps waste down.';
  if (profit > 0 && s.safetyFund < 300) return 'Good day! Putting a little into the safety fund helps the bakery handle surprises.';
  return 'Nice work. Try one small change tomorrow, like a price or an extra tray, and check the Analytics tab a week later to see what it did.';
}
