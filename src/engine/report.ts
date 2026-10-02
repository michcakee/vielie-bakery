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
  for (const p of PRODUCT_ORDER) {
    if (t.made[p] >= 6 && t.sold[p] < t.made[p] * 0.5) out.push(`${nameOf(p)} was slower than expected: ${t.sold[p]} of ${t.made[p]} sold.`);
  }
  for (const p of PRODUCT_ORDER) {
    const n = t.pricey[p] ?? 0;
    if (n >= 3) out.push(`${n} people looked at the ${nameOf(p)} price and said "Đắt quá…"`);
  }
  if (t.savedOnSupplies >= 1) out.push(`You saved $${t.savedOnSupplies.toFixed(2)} on supplies by shopping smart.`);
  if (t.diverted > 0) out.push(`${t.diverted} ${t.diverted === 1 ? 'person' : 'people'} tried Bánh Mì Cô Tư across the street instead.`);
  if (t.lostSlow >= 3) out.push(`${t.lostSlow} customers gave up waiting in the queue.`);
  const reg = REGULARS.filter((r) => s.service?.visits.some((v) => v.who === r.id && v.mood && ['love', 'happy', 'ok'].includes(v.mood)));
  if (reg.length) out.push(`${reg.map((r) => r.name).join(', ')} ${reg.length === 1 ? 'came' : 'all came'} back today.`);
  if (t.donatedUnits > 0) out.push(`You gave ${t.donatedUnits} leftover items to the neighbourhood food shelf.`);
  out.push(...t.notes);
  if (!out.length) out.push(`A quiet ${WEATHER[t.weather].name.toLowerCase()} day on the lane.`);
  return out.slice(0, 6);
}

/** One friendly, useful suggestion. */
export function businessTip(s: GameState, t: DayStats, profit: number): string {
  const early = PRODUCT_ORDER.find((p) => (t.soldOutAt[p] ?? 999) < 360);
  if (early) return `${nameOf(early)} ran out early. Tomorrow, you could make a few more: those were sales you missed.`;
  const pricey = PRODUCT_ORDER.find((p) => (t.pricey[p] ?? 0) >= 4);
  if (pricey) return `Lots of people thought ${nameOf(pricey)} was too expensive. Try a small price cut and watch the demand meter.`;
  if (t.wasteUnits >= 6) return `You threw away ${t.wasteUnits} items. Bake a little less, or turn on Last Call near closing to sell leftovers at a discount.`;
  if (t.lostSlow >= 4) return 'The queue got long. Make sandwiches and drinks a bit faster, or look at Cô Ba and the coffee station in Build.';
  if (profit < 0 && t.revenue > 0) return `Rent and wages cost $${(t.rent + t.wages).toFixed(0)} whether you sell 1 item or 100. Selling more each day spreads that fixed cost thinner.`;
  if (t.lostSoldOut >= 4) return 'Several people asked for something you didn\'t have. A wider menu catches more customers.';
  const unsold = PRODUCT_ORDER.find((p) => t.made[p] > 0 && t.sold[p] === 0);
  if (unsold) return `Nobody bought ${nameOf(unsold)} today. Check its price and the time of day people want it.`;
  if (s.market.tomorrow === 'hot') return 'Tomorrow will be hot. Cold drinks will be in demand: stock up on coffee, condensed milk and kumquats.';
  if (s.market.tomorrow === 'rainy') return 'Rain tomorrow means fewer walk-ins. A smaller bake keeps waste down.';
  if (profit > 0 && s.safetyFund < 50) return 'Good day! Putting a little into the safety fund helps the bakery handle surprises.';
  return 'Nice work. Try one small change tomorrow, like a price or an extra tray, and see what happens.';
}
