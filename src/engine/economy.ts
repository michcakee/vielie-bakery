import { dreamOf } from '../data/dream';
import { BAGUETTE, DECOR, INGREDIENTS, LEVELS, LOYALTY, PACKAGING, PRODUCTS, PRODUCT_ORDER, SUPPLIERS, UPGRADES, WEATHER } from '../data/catalog';
import { DIFFICULTY, ECON } from '../data/config';
import { LOCATIONS, SEGMENTS, SEGMENT_ORDER } from '../data/world';
import { dateOf, festivalsOn, giftSeason, isTetDay, mooncakeSeason } from './calendar';
import { priceSensitivity, spendingFactor, trafficFactor } from './macro';
import { gaussian, mulberry32 } from './rng';
import { clamp, round2 } from './util';
import type { Competitor, GameState, IngredientId, ProductId, SegmentId, SupplierId, UpgradeId } from './types';

export { clamp, round2 };

// ---------------------------------------------------------------- calendar shims

export const isTet = (day: number) => isTetDay(day);
export const weekdayIndex = (day: number) => (day - 1) % 7;
export const isWeekend = (day: number) => weekdayIndex(day) >= 5;
export const competitorOpen = (day: number) => day >= 15;

// ---------------------------------------------------------------- progression

export function levelOf(xp: number): number {
  let lvl = 1;
  for (const l of LEVELS) if (xp >= l.xp) lvl = l.level;
  return lvl;
}

export function levelProgress(xp: number): { level: number; into: number; span: number } {
  const level = levelOf(xp);
  const cur = LEVELS[level - 1];
  const next = LEVELS[level];
  if (!next) return { level, into: 1, span: 1 };
  return { level, into: xp - cur.xp, span: next.xp - cur.xp };
}

export function businessStage(s: GameState): number {
  const open = s.branches.filter((b) => !b.closed).length;
  if (open >= 2 && s.staff.length >= 12) return 6;
  if (open >= 1) return 5;
  if (has(s, 'loft') || s.staff.length >= 6 || has(s, 'oven3')) return 4;
  if (s.staff.length >= 3 || has(s, 'corner')) return 3;
  if (s.staff.length >= 1) return 2;
  return 1;
}

// ---------------------------------------------------------------- equipment & capacity

export const has = (s: Pick<GameState, 'upgrades'>, id: UpgradeId) => s.upgrades.includes(id);
export const countOf = (s: Pick<GameState, 'equipment'>, id: UpgradeId) => s.equipment.filter((e) => e.kind === id).length;
const working = (s: Pick<GameState, 'equipment'>) => s.equipment.filter((e) => !e.broken);

export function ovenCapacity(s: Pick<GameState, 'equipment'>): number {
  return working(s).reduce((t, e) => t + (UPGRADES[e.kind].trays ?? 0), 0);
}

export const flagshipStaff = (s: Pick<GameState, 'staff'>) => s.staff.filter((e) => e.branch === null);

export function productivity(e: { skill: number; morale: number; trainingUntil: number }, day: number): number {
  const training = e.trainingUntil >= day ? 0.6 : 1;
  return (0.6 + 0.08 * e.skill) * (0.7 + 0.3 * (e.morale / 100)) * training;
}

/** Trays the team can physically prepare each morning. */
/** Diminishing returns: the k-th pair of hands in the same kitchen adds less than the one before. */
export function crowdingFactor(s: Pick<GameState, 'upgrades'>, k: number): number {
  const c = ECON.production.crowding * (s.upgrades.includes('renovation') ? 0.5 : 1);
  return Math.max(ECON.production.crowdingFloor, 1 - c * (k - 1));
}

export function laborTrays(s: GameState): number {
  let t = ECON.production.ownerTrays;
  const mixer = has(s, 'mixer') ? ECON.production.mixerBoost : 1;
  let hands = 0;
  for (const e of flagshipStaff(s)) {
    const d = dreamOf(e);
    if (d) {
      // The Dream team preps trays before the doors open, each by their own talent (Sang most of all).
      hands++;
      t += d.trays * productivity(e, s.day) * mixer * crowdingFactor(s, hands);
      continue;
    }
    if (e.role !== 'baker' && e.role !== 'pastryChef') continue;
    hands++;
    const crowd = crowdingFactor(s, hands);
    if (e.role === 'baker') t += (ECON.production.bakerTraysBase + ECON.production.bakerTraysPerSkill * e.skill) * productivity(e, s.day) * mixer * crowd;
    if (e.role === 'pastryChef') t += (1 + 0.4 * e.skill) * productivity(e, s.day) * mixer * crowd;
  }
  return Math.floor(t);
}

export function trayCapacity(s: GameState): number {
  return Math.min(ovenCapacity(s), laborTrays(s));
}

export function displayCapacity(s: Pick<GameState, 'equipment'>): number {
  return ECON.production.displayBase + working(s).reduce((t, e) => t + (UPGRADES[e.kind].display ?? 0), 0);
}

export function coldCapacity(s: Pick<GameState, 'equipment'>): number {
  return ECON.inventory.coldBase + working(s).reduce((t, e) => t + (UPGRADES[e.kind].cold ?? 0), 0);
}

export function dryCapacity(s: Pick<GameState, 'equipment'>): number {
  return ECON.inventory.dryCapacity + working(s).reduce((t, e) => t + (UPGRADES[e.kind].dry ?? 0), 0);
}

export function storageUse(s: Pick<GameState, 'pantry'>, cold: boolean): number {
  let u = 0;
  for (const [id, p] of Object.entries(s.pantry) as [IngredientId, { qty: number }][]) if (INGREDIENTS[id].cold === cold) u += p.qty;
  return u;
}

export const fridgeWorks = (s: GameState) => working(s).some((e) => e.kind === 'fridge' || e.kind === 'walkIn') && !effectActive(s, 'fridgeBroken');

export const displayUse = (s: Pick<GameState, 'display'>) => PRODUCT_ORDER.reduce((t, p) => t + s.display[p].qty, 0);

// ---------------------------------------------------------------- menu

export function seasonOk(p: ProductId, day: number): boolean {
  const season = PRODUCTS[p].season;
  if (season === 'gift') return giftSeason(day);
  if (season === 'mooncake') return mooncakeSeason(day);
  return true;
}

export function canOffer(s: GameState, p: ProductId): boolean {
  const d = PRODUCTS[p];
  if (d.season === 'gift') return giftSeason(s.day);
  if (!s.unlocked.includes(p)) return false;
  if (!seasonOk(p, s.day)) return false;
  if (d.equipment && !has(s, d.equipment)) return false;
  return true;
}

export function onMenu(s: GameState): ProductId[] {
  return PRODUCT_ORDER.filter((p) => canOffer(s, p) && (s.menu.includes(p) || !!PRODUCTS[p].season));
}

// ---------------------------------------------------------------- effects

export function effectActive(s: Pick<GameState, 'effects' | 'day'>, id: string): boolean {
  return s.effects.some((e) => e.id === id && e.until >= s.day);
}

// ---------------------------------------------------------------- buying

export function loyaltyDiscount(s: Pick<GameState, 'supplierLoyalty'>, supplier: SupplierId): number {
  return Math.min(LOYALTY.maxDiscount, Math.floor((s.supplierLoyalty[supplier] ?? 0) / LOYALTY.packsPerPoint) / 100);
}

export function bulkDiscount(packs: number): number {
  for (const [n, d] of ECON.inventory.bulkTiers) if (packs >= n) return d;
  return 0;
}

export function marketMult(s: Pick<GameState, 'market' | 'locks' | 'day'>, id: IngredientId): number {
  const lock = s.locks.find((l) => l.ingredient === id && l.until >= s.day);
  return lock ? Math.min(lock.price, s.market.prices[id]) : s.market.prices[id];
}

/** Price of one pack today, including any bulk discount for the order size. Market prices already include inflation. */
export function packPrice(s: GameState, id: IngredientId, supplier: SupplierId, packs = 1): number {
  let mult = marketMult(s, id);
  if (supplier === 'farm' && id === 'eggs' && effectActive(s, 'farmEggs')) mult = Math.min(mult, s.market.walk.eggs * s.macro.priceIndex);
  let base = INGREDIENTS[id].price * mult * SUPPLIERS[supplier].priceMult;
  if (supplier === 'premium' && effectActive(s, 'premiumSale')) base *= 0.7;
  if (supplier === 'distributor' && effectActive(s, 'distributorDeal')) base *= 0.8;
  if (supplier !== 'cho') base *= 1 + LOCATIONS[s.location].deliverySurcharge;
  return round2(base * (1 - loyaltyDiscount(s, supplier)) * (1 - bulkDiscount(packs)));
}

/** What a pack would cost at a normal market price, for "you saved" messages. */
export const normalPackPrice = (s: GameState, id: IngredientId) => INGREDIENTS[id].price * s.macro.priceIndex;

export function inStock(s: Pick<GameState, 'market'>, id: IngredientId, supplier: SupplierId): boolean {
  return !s.market.outOfStock.some((o) => o.ingredient === id && o.supplier === supplier);
}

// ---------------------------------------------------------------- costs

export function unitCost(s: Pick<GameState, 'pantry' | 'macro'>, id: IngredientId): number {
  const p = s.pantry[id];
  return p.qty > 0 ? p.avgCost : (INGREDIENTS[id].price / INGREDIENTS[id].pack) * s.macro.priceIndex;
}

export function recipeCost(s: Pick<GameState, 'pantry' | 'macro'>, recipe: Partial<Record<IngredientId, number>>): number {
  let c = 0;
  for (const [id, n] of Object.entries(recipe) as [IngredientId, number][]) c += n * unitCost(s, id);
  return c;
}

export function packagingCost(s: Pick<GameState, 'packaging' | 'macro'>, p: ProductId): number {
  return (PACKAGING[s.packaging].cost + (PRODUCTS[p].boxCost ?? 0)) * s.macro.priceIndex;
}

/** Variable cost to make and sell one item. */
export function itemCost(s: GameState, p: ProductId): number {
  const def = PRODUCTS[p];
  let c = recipeCost(s, def.recipe) / def.yield;
  if (p === 'banhMi') c += s.baguettes.qty > 0 ? s.baguettes.unitCost : recipeCost(s, BAGUETTE.recipe) / BAGUETTE.yield;
  if (def.kind === 'tray' && s.display[p].qty > 0) c = s.display[p].unitCost;
  return c + packagingCost(s, p);
}

export function canMake(s: Pick<GameState, 'pantry' | 'baguettes'>, p: ProductId, times = 1): boolean {
  const def = PRODUCTS[p];
  if (p === 'banhMi' && s.baguettes.qty < times) return false;
  for (const [id, n] of Object.entries(def.recipe) as [IngredientId, number][]) if (s.pantry[id].qty < n * times) return false;
  return true;
}

export function canBakeTray(s: Pick<GameState, 'pantry'>, recipe: Partial<Record<IngredientId, number>>): boolean {
  return (Object.entries(recipe) as [IngredientId, number][]).every(([id, n]) => s.pantry[id].qty >= n);
}

export function missingFor(s: Pick<GameState, 'pantry'>, recipe: Partial<Record<IngredientId, number>>): IngredientId[] {
  return (Object.entries(recipe) as [IngredientId, number][]).filter(([id, n]) => s.pantry[id].qty < n).map(([id]) => id);
}

export function available(s: Pick<GameState, 'pantry' | 'baguettes' | 'display'>, p: ProductId, qty = 1): boolean {
  return PRODUCTS[p].kind === 'tray' ? s.display[p].qty >= qty : canMake(s, p, qty);
}

export function makeable(s: Pick<GameState, 'pantry' | 'baguettes'>, p: ProductId): number {
  const def = PRODUCTS[p];
  let n = Infinity;
  if (p === 'banhMi') n = s.baguettes.qty;
  for (const [id, k] of Object.entries(def.recipe) as [IngredientId, number][]) if (k > 0) n = Math.min(n, Math.floor(s.pantry[id].qty / k));
  return Number.isFinite(n) ? n : 0;
}

export function rent(s: GameState): number {
  const rooms = s.equipment.reduce((t, e) => t + (UPGRADES[e.kind].rent ?? 0), 0);
  return (LOCATIONS[s.location].rent + rooms) * s.macro.rentIndex * DIFFICULTY[s.difficulty].costMult;
}

export function wages(s: GameState, branch: number | null = null): number {
  return s.staff.filter((e) => e.branch === branch).reduce((t, e) => t + e.wage * ECON.labor.hoursPerShift, 0) * (1 + ECON.labor.payrollOverhead);
}

export function utilities(s: GameState, trays: number): number {
  const equip = s.equipment.reduce((t, e) => t + (UPGRADES[e.kind].utilities ?? 0), 0);
  const raw = ECON.costs.utilitiesBase + ECON.costs.utilitiesPerTray * trays + equip;
  return raw * (has(s, 'solar') ? 0.4 : 1) * s.macro.priceIndex * DIFFICULTY[s.difficulty].costMult;
}

export const energyCost = utilities;

export function maintenance(s: GameState): number {
  return s.equipment.reduce((t, e) => t + (UPGRADES[e.kind].maintenance ?? 0), 0) * s.macro.priceIndex * DIFFICULTY[s.difficulty].costMult;
}

export function depreciationPerDay(cost: number, years: number): number {
  return cost / (years * 360);
}

export function dailyDepreciation(s: GameState): number {
  let d = 0;
  for (const e of s.equipment) if (e.depreciated < e.cost) d += Math.min(e.cost - e.depreciated, depreciationPerDay(e.cost, UPGRADES[e.kind].life));
  return d;
}

export const creditLineRate = (s: GameState) => s.macro.rate + ECON.finance.creditLineSpread;

export function dailyInterest(s: GameState): number {
  const loans = s.loans.reduce((t, l) => t + (l.balance * l.rate) / 360, 0);
  const line = (s.creditLine.balance * creditLineRate(s)) / 360;
  const bonds = s.bonds.reduce((t, b) => t + (b.amount * b.rate) / 360, 0);
  return loans + line + bonds;
}

/** Costs that arrive every day whether you sell anything or not. */
export function fixedCosts(s: GameState): number {
  return rent(s) + wages(s) + ECON.costs.utilitiesBase * s.macro.priceIndex * (has(s, 'solar') ? 0.4 : 1) + maintenance(s) + dailyDepreciation(s) + dailyInterest(s);
}

// ---------------------------------------------------------------- willingness to pay

/** A fixed panel of shoppers (standard-normal draws) shared by the meter and real customers. */
const PANEL: number[] = (() => {
  const r = mulberry32(20240607);
  return Array.from({ length: 300 }, () => gaussian(r));
})();

/** Spread of willingness to pay: price-sensitive segments and hard times bunch shoppers near the price. */
export function sigmaFor(s: GameState, p: ProductId, seg: SegmentId): number {
  return ECON.demand.budgetSigma / (Math.sqrt(PRODUCTS[p].elasticity) * SEGMENTS[seg].sensitivity * priceSensitivity(s.macro));
}

/**
 * Habit goods (coffee) sit well above their price for most shoppers, so a price rise loses few of them;
 * treats (cake) sit close to it, so small rises lose many. This is where product elasticity comes from.
 */
export const habitFactor = (p: ProductId) => 1 + 0.45 * (1 - PRODUCTS[p].elasticity);

export function budgetFromZ(z: number, sigma: number): number {
  return ECON.demand.budgetMean * Math.exp(sigma * z - (sigma * sigma) / 2);
}

export const qualityFactor = (q: number) => 0.8 + 0.4 * clamp(q, 0, 100) / 100;

export function reputationFactor(rep: number): number {
  const [lo, hi] = ECON.demand.reputationWTP;
  return lo + (hi - lo) * clamp(rep, 0, 100) / 100;
}

export function festivalWTP(s: GameState, p: ProductId, seg: SegmentId): number {
  const f = festivalsOn(s.day);
  let m = 1;
  if (f.includes('tet')) m *= 1 + 0.15 * SEGMENTS[seg].heritage;
  if (f.includes('trungThu') && p === 'banhTrungThu') m *= 1.15;
  if (effectActive(s, 'festival')) m *= 1.08;
  return m;
}

/** The highest price one shopper will pay today. */
export function willingToPay(s: GameState, p: ProductId, budget: number, quality: number, ecoMinded: boolean, seg: SegmentId = 'vnFamilies', loyal = false): number {
  const def = PRODUCTS[p];
  const sd = SEGMENTS[seg];
  let w = def.ref * habitFactor(p) * s.macro.priceIndex * budget * sd.income * Math.sqrt(LOCATIONS[s.location].income) * spendingFactor(s.macro) * qualityFactor(quality) * reputationFactor(s.reputation);
  if (sd.heritage > 1 && def.heritage > 0.8) w *= 1 + (0.1 * (quality - 70)) / 30;
  if (def.kind === 'tray' && has(s, 'display')) w *= 1.08;
  if (ecoMinded) w *= 0.85 + (0.35 * ecoScore(s)) / 100;
  if (loyal) w *= ECON.demand.loyalWTP;
  // The daily special is a treat people came for: they pay its higher price as readily as the usual one.
  return w * festivalWTP(s, p, seg) * specialMult(s, p) * openingWeek(s);
}

/** A brand-new guided bakery: neighbours are curious and a little more forgiving on price for the first days. */
export function openingWeek(s: Pick<GameState, 'day' | 'allUnlocked'>): number {
  if (s.allUnlocked !== false) return 1;
  return s.day <= 3 ? 1.12 : s.day <= 5 ? 1.06 : 1;
}

export const specialMult = (s: Pick<GameState, 'special'>, p: ProductId) => (s.special === p ? ECON.service.dailySpecial.mult : 1);

/** A kept tray from an earlier day sells as day-old at a discount. */
export const isDayOld = (s: Pick<GameState, 'display' | 'day'>, p: ProductId) => PRODUCTS[p].kind === 'tray' && s.display[p].qty > 0 && s.display[p].madeDay !== undefined && s.display[p].madeDay! < s.day;

export function effectivePrice(s: GameState, p: ProductId): number {
  let base = s.prices[p] * specialMult(s, p);
  if (isDayOld(s, p)) base *= 1 - ECON.service.dayOld.discount;
  return s.service?.lastCall && PRODUCTS[p].kind === 'tray' ? round2(base * (1 - ECON.service.lastCallDiscount)) : round2(base);
}

export function expectedQuality(s: GameState, p: ProductId): number {
  if (PRODUCTS[p].kind === 'tray') return s.display[p].qty > 0 ? s.display[p].quality : 72 + staffQualityBonus(s);
  return madeToOrderQuality(s, p, 85);
}

export function segmentMix(s: GameState, location = s.location): Record<SegmentId, number> {
  const loc = LOCATIONS[location];
  const f = festivalsOn(s.day);
  const out = {} as Record<SegmentId, number>;
  let total = 0;
  for (const seg of SEGMENT_ORDER) {
    let w = loc.segments[seg] ?? 0;
    if ((f.includes('tet') || f.includes('preTet') || f.includes('trungThu')) && SEGMENTS[seg].heritage > 1) w *= 1.5;
    if (seg === 'event' && (f.length || isWeekend(s.day))) w *= 2;
    if (seg === 'tourists' && dateOf(s.day).season === 'hot') w *= 1.3;
    if (seg === 'budget' && s.macro.regime === 'recession') w *= 1.4;
    if (seg === 'premium' && s.macro.regime === 'recession') w *= 0.6;
    w *= 1 + ECON.demand.favouriteDraw * favouritesOnMenu(s, seg);
    out[seg] = w;
    total += w;
  }
  for (const seg of SEGMENT_ORDER) out[seg] = total ? out[seg] / total : 0;
  return out;
}

/** Share of shoppers who'd accept this price (ignoring rivals): the demand meter. */
export function acceptance(s: GameState, p: ProductId, price = s.prices[p], quality = expectedQuality(s, p)): number {
  const mix = segmentMix(s);
  let yes = 0;
  for (const seg of SEGMENT_ORDER) {
    if (!mix[seg]) continue;
    const sigma = sigmaFor(s, p, seg);
    let n = 0;
    for (const z of PANEL) if (willingToPay(s, p, budgetFromZ(z, sigma), quality, false, seg) >= price - 1e-9) n++;
    yes += mix[seg] * (n / PANEL.length);
  }
  return yes;
}

export function demandLabel(a: number): { text: string; tone: 'great' | 'good' | 'meh' | 'bad' } {
  if (a >= 0.85) return { text: 'Lots of interest!', tone: 'great' };
  if (a >= 0.6) return { text: 'Looks affordable.', tone: 'good' };
  if (a >= 0.35) return { text: 'Some customers may hesitate.', tone: 'meh' };
  return { text: 'Most people will say "Đắt quá…"', tone: 'bad' };
}

export function priceBounds(s: GameState, p: ProductId): [number, number] {
  const ref = PRODUCTS[p].ref * s.macro.priceIndex;
  return [Math.max(0.25, round2(ref * ECON.service.minPriceFactor)), round2(ref * ECON.service.maxPriceFactor)];
}

// ---------------------------------------------------------------- quality

export function ingredientQuality(s: Pick<GameState, 'pantry'>, recipe: Partial<Record<IngredientId, number>>): number {
  let q = 0;
  let n = 0;
  for (const [id, k] of Object.entries(recipe) as [IngredientId, number][]) {
    if (!k) continue;
    q += s.pantry[id].quality * k;
    n += k;
  }
  return n ? q / n : 70;
}

export function masteryBonus(s: Pick<GameState, 'lifetime'>, p: ProductId): number {
  const sold = s.lifetime.sold[p] ?? 0;
  return sold >= 300 ? 12 : sold >= 120 ? 8 : sold >= 40 ? 4 : 0;
}

export function staffQualityBonus(s: GameState): number {
  let b = has(s, 'renovation') ? 5 : 0;
  let dream = 0;
  for (const e of flagshipStaff(s)) {
    const d = dreamOf(e);
    if (d) dream += d.bakeQuality;
    else if (e.role === 'pastryChef') b += (ECON.production.pastryChefQuality * e.skill) / 3;
  }
  // The Dream team's touch goes on top of the usual cap.
  return Math.min(15, b) + Math.min(15, dream);
}

export function blendQuality(process: number, ingredients: number, bonus: number): number {
  return Math.round(clamp(0.5 * process + 0.4 * ingredients + 6 + bonus, 5, 100));
}

export function madeToOrderQuality(s: GameState, p: ProductId, process: number): number {
  let ing = ingredientQuality(s, PRODUCTS[p].recipe);
  if (p === 'banhMi') ing = (ing * 2 + (s.baguettes.qty > 0 ? s.baguettes.quality : 70)) / 3;
  return blendQuality(process, ing, masteryBonus(s, p) + (p !== 'banhMi' && has(s, 'coffeeBar') ? 4 : 0) + (has(s, 'renovation') ? 5 : 0));
}

// ---------------------------------------------------------------- eco

export function ecoScore(s: Pick<GameState, 'ecoHistory' | 'packaging' | 'upgrades' | 'decor'>): number {
  const recent = s.ecoHistory.slice(-7);
  const sourcing = recent.length ? recent.reduce((t, e) => t + e.sourcingEco, 0) / recent.length : 50;
  const waste = recent.length ? recent.reduce((t, e) => t + e.wasteRate, 0) / recent.length : 0.05;
  const wasteScore = 100 * (1 - clamp(waste * (has(s, 'compost') ? 2.5 : 4), 0, 1));
  let score = 0.4 * sourcing + 0.3 * wasteScore + 0.3 * PACKAGING[s.packaging].eco;
  for (const u of s.upgrades) score += UPGRADES[u].eco ?? 0;
  for (const d of s.decor) score += DECOR[d].eco ?? 0;
  return Math.round(clamp(score, 0, 100));
}

export function ecoBreakdown(s: Pick<GameState, 'ecoHistory' | 'packaging' | 'upgrades' | 'decor'>) {
  const recent = s.ecoHistory.slice(-7);
  const sourcing = recent.length ? recent.reduce((t, e) => t + e.sourcingEco, 0) / recent.length : 50;
  const waste = recent.length ? recent.reduce((t, e) => t + e.wasteRate, 0) / recent.length : 0.05;
  const extras = s.upgrades.reduce((t, u) => t + (UPGRADES[u].eco ?? 0), 0) + s.decor.reduce((t, d) => t + (DECOR[d].eco ?? 0), 0);
  return { sourcing: Math.round(sourcing), wasteRate: waste, packaging: PACKAGING[s.packaging].eco, extras };
}

// ---------------------------------------------------------------- traffic

export function momentum(s: Pick<GameState, 'history'>): number {
  const recent = s.history.slice(-3);
  if (!recent.length) return 1;
  const served = recent.reduce((t, h) => t + h.served, 0);
  const customers = recent.reduce((t, h) => t + h.customers, 0);
  const ratio = customers ? served / customers : 0.8;
  return clamp(0.85 + 0.3 * ratio, 0.88, 1.12);
}

export function campaignBoost(s: GameState): number {
  let extra = 0;
  for (const c of s.campaigns) if (c.endDay >= s.day && c.startDay <= s.day) extra += (c.reach * c.conversion) / Math.max(1, c.endDay - c.startDay + 1);
  for (const e of s.effects) if (e.id === 'marketing' && e.until >= s.day) extra += Number(e.data?.perDay ?? 0);
  return extra;
}

/** Everyone who passes by and might come in today, before rivals take their share. */
export function marketTraffic(s: GameState, location = s.location): number {
  const loc = LOCATIONS[location];
  const d = dateOf(s.day);
  const level = levelOf(s.xp);
  let n = ECON.demand.baseWalkIns + ECON.demand.walkInsPerLevel * (level - 1);
  n *= loc.traffic * loc.week[d.weekday] * (loc.seasonal[d.season] ?? 1);
  n *= WEATHER[s.market.weather].traffic;
  n *= trafficFactor(s.macro);
  if (festivalsOn(s.day).length) n *= loc.festivalBoost;
  if (effectActive(s, 'festival')) n *= 1.6;
  if (effectActive(s, 'construction')) n *= Number(s.effects.find((e) => e.id === 'construction')?.data?.mult ?? 0.75);
  if (effectActive(s, 'viral')) n *= 1.4;
  if (effectActive(s, 'tourism')) n *= 1.2;
  return n;
}

/** How many of a customer group's three favourite items are on your menu (0–3). */
export function favouritesOnMenu(s: Pick<GameState, 'menu'>, seg: SegmentId): number {
  return topFavourites(seg).filter((p) => s.menu.includes(p)).length;
}

export function topFavourites(seg: SegmentId): ProductId[] {
  return (Object.entries(SEGMENTS[seg].prefs) as [ProductId, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([p]) => p);
}

/** More of the street comes in when your menu has what they love (1 = an average menu). */
export function favouritesPull(s: GameState): number {
  const loc = LOCATIONS[s.location];
  let total = 0;
  let share = 0;
  for (const seg of SEGMENT_ORDER) {
    const w = loc.segments[seg] ?? 0;
    total += w;
    share += w * (favouritesOnMenu(s, seg) / 3);
  }
  const avg = total ? share / total : 0;
  return 1 + ECON.demand.favouritePull * (avg - ECON.demand.favouriteBaseline);
}

export function expectedWalkIns(s: GameState): number {
  if (s.day === 1 && s.scenario === 'family') return 7;
  let n = marketTraffic(s);
  n *= favouritesPull(s);
  n *= 0.72 + (0.56 * s.reputation) / 100;
  n *= momentum(s);
  if (has(s, 'corner')) n *= 1.2;
  if (has(s, 'loft')) n *= 1.25;
  if (has(s, 'website')) n *= 1.08;
  if (s.decor.includes('stools')) n *= 1.03;
  if (s.decor.includes('sign')) n *= 1.04;
  if (effectActive(s, 'stall')) n *= 1.35;
  if (isTet(s.day) && s.decor.includes('hoaMai')) n *= 1.05;
  return n + campaignBoost(s);
}

/** How many regulars the neighbourhood can support (foot traffic × ECON.demand.loyalCapDays). */
export function loyalCap(s: GameState): number {
  return Math.max(20, marketTraffic(s) * ECON.demand.loyalCapDays);
}

export const loyalTotal = (s: Pick<GameState, 'loyal'>) => Object.values(s.loyal).reduce((t, n) => t + (n ?? 0), 0);

/** Daily share of regulars who drift away; higher when yesterday's customers were unhappy. */
export function loyalChurnRate(s: GameState): number {
  const sat = s.history[s.history.length - 1]?.satisfaction ?? 0.8;
  return (ECON.demand.loyalChurn + ECON.demand.loyalChurnUnhappy * Math.max(0, 0.75 - sat)) * DIFFICULTY[s.difficulty].churnMult;
}

/** Loyal customers who come back on a typical day. */
export function loyalVisits(s: GameState): number {
  return Object.values(s.loyal).reduce((t, n) => t + (n ?? 0), 0) * 0.22;
}

export function patienceMult(s: GameState): number {
  let m = DIFFICULTY[s.difficulty].patience;
  if (s.market.weather === 'hot') m *= has(s, 'fan') ? 1.05 : 0.8;
  if (effectActive(s, 'awning')) m *= 1.25;
  if (effectActive(s, 'cooler')) m *= 1.2;
  for (const d of s.decor) m += DECOR[d].patience ?? 0;
  // Guided games: customers are extra patient while the player is still learning the counter.
  if (s.allUnlocked === false) m *= 1 + 0.8 * Math.max(0, 21 - s.day) / 21;
  return m;
}

// ---------------------------------------------------------------- competition

export const activeRivals = (s: GameState, location = s.location): Competitor[] =>
  s.competitors.filter((c) => c.location === location && c.closedDay === null && c.openedDay <= s.day);

function utility(price: number, ref: number, quality: number, reputation: number, marketing: number): number {
  const w = ECON.demand.choice;
  return -w.price * Math.log(Math.max(0.05, price / ref)) + (w.quality * (quality - 60)) / 40 + (w.reputation * (reputation - 50)) / 50 + w.marketing * marketing;
}

/** Chance a shopper who wants this item picks you over the rivals nearby (logit choice). */
export function playerShare(s: GameState, p: ProductId, opts: { price?: number; quality?: number; loyal?: boolean; walkIn?: boolean } = {}): number {
  const rivals = activeRivals(s).filter((c) => c.prices[p] !== undefined);
  if (!rivals.length) return 1;
  const ref = PRODUCTS[p].ref * s.macro.priceIndex;
  const w = ECON.demand.choice;
  const mine =
    utility(opts.price ?? s.prices[p], ref, opts.quality ?? expectedQuality(s, p), s.reputation, Math.min(1, campaignBoost(s) / 20)) +
    (opts.walkIn === false ? 0 : w.homeAdvantage) +
    (opts.loyal ? w.loyalty * 2 : 0);
  const aggression = DIFFICULTY[s.difficulty].competitorAggression;
  let denom = Math.exp(mine);
  for (const c of rivals) denom += Math.exp(utility(c.prices[p]!, ref, c.quality, c.reputation, c.marketing) + 0.25 * (aggression - 1));
  return Math.exp(mine) / denom;
}

export function divertChance(s: GameState, p: ProductId): number {
  return 1 - playerShare(s, p);
}

// ---------------------------------------------------------------- expected demand (forecasts, branches, demand curves)

export function productAppeal(s: GameState, p: ProductId, mix: Record<SegmentId, number>): number {
  const def = PRODUCTS[p];
  let w = 0;
  for (const seg of SEGMENT_ORDER) {
    if (!mix[seg]) continue;
    const t = SEGMENTS[seg].times;
    const daypart = (def.times[0] * t[0] + def.times[1] * t[1] + def.times[2] * t[2] + def.times[3] * t[3]) / 4;
    w += mix[seg] * (SEGMENTS[seg].prefs[p] ?? 1) * daypart;
  }
  w *= def.popularity * (def.weather[s.market.weather] ?? 1);
  if (def.season) w *= 2.2;
  if (p === 'banhKem' && (isWeekend(s.day) || festivalsOn(s.day).length)) w *= 1.8;
  if (effectActive(s, 'fruitFest') && (p === 'banhChuoi' || p === 'banhKem')) w *= 1.4;
  return w;
}

/** Expected units per day at a price, given today's traffic, menu, rivals and quality. */
export function expectedUnits(s: GameState, p: ProductId, price = s.prices[p], menu = onMenu(s)): number {
  if (!menu.includes(p)) return 0;
  const mix = segmentMix(s);
  const total = menu.reduce((t, q) => t + productAppeal(s, q, mix), 0);
  if (!total) return 0;
  const want = (expectedWalkIns(s) + loyalVisits(s)) * (productAppeal(s, p, mix) / total);
  const avgQty = SEGMENT_ORDER.reduce((t, seg) => t + mix[seg] * (PRODUCTS[p].kind === 'tray' ? Math.min(2, SEGMENTS[seg].qty) : 1), 0);
  return want * acceptance(s, p, price) * playerShare(s, p, { price }) * avgQty;
}

/** Demand curve for charts: price → units, revenue, contribution. */
export function demandCurve(s: GameState, p: ProductId, points = 13) {
  const [lo, hi] = priceBounds(s, p);
  const cost = itemCost(s, p);
  const out: { price: number; units: number; revenue: number; contribution: number }[] = [];
  for (let i = 0; i < points; i++) {
    const price = round2(lo + ((hi - lo) * i) / (points - 1));
    const units = expectedUnits(s, p, price);
    out.push({ price, units, revenue: units * price, contribution: units * (price - cost) });
  }
  return out;
}

/** Point elasticity at the current price: % change in units for a 1% change in price. */
export function elasticityAt(s: GameState, p: ProductId, price = s.prices[p]): number {
  const up = expectedUnits(s, p, price * 1.05);
  const down = expectedUnits(s, p, price * 0.95);
  const mid = (up + down) / 2;
  if (mid < 1e-6) return 0;
  return (up - down) / mid / 0.1;
}
