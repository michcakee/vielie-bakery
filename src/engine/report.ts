import type { FeatureId } from '../data/unlocks';
import { featureOn } from './unlocks';
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
    if (at !== undefined && at < 300 && (t.made[p] > 0 || PRODUCTS[p].kind !== 'tray')) out.push(`Your ${nameOf(p)} sold out at ${clockLabel(at)}, before lunch!`);
  }
  const top = PRODUCT_ORDER.filter((p) => t.sold[p] > 0).sort((a, b) => t.sold[b] - t.sold[a])[0];
  if (top && t.sold[top] >= 5) out.push(`${nameOf(top)} was the star today: ${t.sold[top]} sold.`);
  const earner = PRODUCT_ORDER.filter((p) => t.revenueBy[p] > 0).sort((a, b) => t.revenueBy[b] - t.cogsBy[b] - (t.revenueBy[a] - t.cogsBy[a]))[0];
  if (earner && earner !== top) out.push(`But ${nameOf(earner)} earned the most after costs: $${(t.revenueBy[earner] - t.cogsBy[earner]).toFixed(0)}.`);
  for (const p of PRODUCT_ORDER) if (p !== top && t.made[p] >= 6 && t.sold[p] < t.made[p] * 0.5) out.push(`${nameOf(p)} was slower than expected: ${t.sold[p]} of ${t.made[p]} sold.`);
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
  if (reg.length) out.push(`${reg.map((r) => r.name).join(', ')} ${s.day === 1 ? (reg.length === 1 ? 'stopped by today.' : 'all stopped by today.') : reg.length === 1 ? 'came back today.' : 'all came back today.'}`);
  if (t.donatedUnits > 0) out.push(`You gave ${t.donatedUnits} leftover items to the neighbourhood food shelf.`);
  out.push(...t.notes);
  if (!out.length) out.push(`A quiet ${WEATHER[t.weather].name.toLowerCase()} day on the lane.`);
  return out.slice(0, 7);
}

/** One friendly, useful suggestion. */
export function businessTip(s: GameState, t: DayStats, profit: number): string {
  const on = (id: FeatureId) => featureOn(s, id);
  const none = PRODUCT_ORDER.find((p) => PRODUCTS[p].kind === 'tray' && t.made[p] === 0 && (t.wishedFor[p] ?? 0) >= 2);
  if (none) return `${t.wishedFor[none]} people wanted ${nameOf(none)}, but the case was empty. Bake a tray before you open tomorrow!`;
  const early = PRODUCT_ORDER.find((p) => (t.soldOutAt[p] ?? 999) < 360 && (t.made[p] > 0 || PRODUCTS[p].kind !== 'tray'));
  if (early) return `${nameOf(early)} ran out early. Bake more tomorrow: those were sales you missed!`;
  const pricey = PRODUCT_ORDER.find((p) => (t.pricey[p] ?? 0) >= 4);
  if (pricey && on('kitchen.prices')) return `Lots of people thought ${nameOf(pricey)} was too expensive. Try a small price cut in the Kitchen and watch the demand meter.`;
  if (t.wasteUnits >= 8) return `You threw away ${t.wasteUnits} items. Bake a little less tomorrow, or use Last Call near closing to sell leftovers cheaper.`;
  if (t.lostSlow >= 5) return on('staff.hire') ? 'The line got long and people left. A helper at the counter could pay for itself: check the Staff tab.' : 'The line got long and people left. Serve the oldest order first (the one with the worried face), or tap More → Let Bà help.';
  if (t.diverted >= 6 && on('customers.rivals')) return `${t.diverted} shoppers went to a rival today. Check the Customers tab: you don't have to be cheapest, just worth it.`;
  if (profit < 0 && t.revenue > 0) return `Rent and running the shop cost about $${(t.books.rent + t.books.wages + t.books.utilities).toFixed(0)} a day, busy or not. The more you sell, the easier that is to cover.`;
  if (t.lostSoldOut >= 4) return on('kitchen.menu') ? 'Several people asked for something you didn’t have. A wider menu catches more customers.' : 'Several people asked for something you ran out of. Bake a little more of it tomorrow.';
  const unsold = PRODUCT_ORDER.find((p) => t.made[p] > 0 && t.sold[p] === 0);
  if (unsold) return `Nobody bought ${nameOf(unsold)} today. Maybe bake less of it tomorrow.`;
  if (s.market.tomorrow === 'hot') return on('market.wet') ? 'Tomorrow will be hot. Cold drinks sell fast: stock up on coffee, condensed milk and kumquats.' : 'Tomorrow will be hot. Cold drinks will sell fast!';
  if (s.market.tomorrow === 'rainy') return 'Rain tomorrow means fewer customers. Bake a bit less so less goes to waste.';
  if (profit > 0 && s.safetyFund < 300 && on('finances.cash')) return 'Good day! Putting a little into the safety fund helps the bakery handle surprises.';
  return on('analytics.full') ? 'Nice work. Try one small change tomorrow, like a price or an extra tray, and check Analytics a week later to see what it did.' : 'Nice work! Try to beat today’s stars tomorrow.';
}

const TRY: { id: FeatureId; used: (s: GameState) => boolean; text: string; where: string }[] = [
  { id: 'kitchen.prices', used: (s) => (s.questProgress.priceEdits ?? 0) > 0, text: 'Change a price and see if more or fewer people buy it.', where: 'Kitchen → Prices' },
  { id: 'market.suppliers', used: (s) => s.supplierLoyalty.farm + s.supplierLoyalty.premium + s.supplierLoyalty.distributor > 0, text: 'Buy from the farm co-op: better ingredients make better food, and people pay more for it.', where: 'Market' },
  { id: 'kitchen.menu', used: (s) => (s.questProgress.menuToggles ?? 0) > 0, text: 'Put a new recipe on the menu. More choice brings more customers.', where: 'Kitchen → Menu' },
  { id: 'staff.hire', used: (s) => s.staff.length > 0, text: 'Hire a helper so fewer customers give up waiting.', where: 'Staff' },
  { id: 'eco.all', used: (s) => s.packaging !== 'plastic', text: 'Switch away from plastic packaging. The neighbours will notice!', where: 'Eco' },
  { id: 'growth.decor', used: (s) => s.decor.length > 1, text: 'Buy a decoration. Customers wait longer in a cosy shop.', where: 'Growth' },
  { id: 'finances.cash', used: (s) => s.safetyFund > 0, text: 'Put some money in the safety fund for rainy days.', where: 'Money' },
  { id: 'growth.equipment', used: (s) => s.equipment.length > 1, text: 'Buy equipment, like a second oven, to bake more every morning.', where: 'Growth' },
  { id: 'kitchen.plan', used: (s) => s.staff.length === 0 || (s.questProgress.teamDays ?? 0) > 0, text: 'Let the team run a day using your baking plan.', where: 'Today' },
  { id: 'market.contracts', used: (s) => s.locks.length + s.contracts.length + Object.keys(s.reorder).length > 0, text: 'Set an auto-reorder so you never run out of flour.', where: 'Market' },
  { id: 'kitchen.deals', used: (s) => !!s.combo || !!s.sizes, text: 'Turn on the combo deal: coffee + bánh mì together.', where: 'Kitchen → Menu' },
  { id: 'customers.marketing', used: (s) => s.campaigns.length > 0, text: 'Run an ad campaign to bring in new customers.', where: 'Customers' },
];

/** One unlocked thing the player hasn't tried yet, so every part of the bakery gets used. */
export function tryTomorrow(s: GameState): string | null {
  if (s.allUnlocked !== false || s.intro?.active) return null;
  const open = TRY.filter((x) => featureOn(s, x.id) && (s.intro?.done ?? []).includes(x.id) && !x.used(s));
  if (!open.length) return null;
  const pick = open[s.day % open.length];
  return `${pick.text} (${pick.where})`;
}
