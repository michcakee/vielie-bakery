import { BAGUETTE, CONFIG, DECOR, GIFT_BOX_COST, INGREDIENTS, LEVELS, LOYALTY, PACKAGING, PRODUCTS, SUPPLIERS, UPGRADES, WEATHER } from '../data/catalog';
import { gaussian, mulberry32 } from './rng';
import type { GameState, IngredientId, ProductId, SupplierId } from './types';

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const round2 = (v: number) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------- calendar

export const yearDay = (day: number) => ((day - 1) % CONFIG.yearLength) + 1;
export const weekdayIndex = (day: number) => (day - 1) % 7;
export const isWeekend = (day: number) => weekdayIndex(day) >= 5;
export const isTet = (day: number) => {
  const y = yearDay(day);
  return y >= CONFIG.tetStart && y <= CONFIG.tetEnd;
};
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

export const has = (s: Pick<GameState, 'upgrades'>, id: keyof typeof UPGRADES) => s.upgrades.includes(id);

export function ovenCapacity(s: Pick<GameState, 'upgrades'>): number {
  if (has(s, 'oven3')) return CONFIG.ovenTrays[2];
  if (has(s, 'oven2')) return CONFIG.ovenTrays[1];
  return CONFIG.ovenTrays[0];
}

export function onMenu(s: Pick<GameState, 'unlocked' | 'day'>): ProductId[] {
  const list: ProductId[] = s.unlocked.filter((p) => p !== 'mutDua');
  if (isTet(s.day)) list.push('mutDua');
  return list;
}

// ---------------------------------------------------------------- buying

export function effectActive(s: Pick<GameState, 'effects' | 'day'>, id: string): boolean {
  return s.effects.some((e) => e.id === id && e.until >= s.day);
}

export function loyaltyDiscount(s: Pick<GameState, 'supplierLoyalty'>, supplier: SupplierId): number {
  return Math.min(LOYALTY.maxDiscount, Math.floor((s.supplierLoyalty[supplier] ?? 0) / LOYALTY.packsPerPoint) / 100);
}

/** Today's market multiplier for an ingredient, after any price lock. */
export function marketMult(s: Pick<GameState, 'market' | 'locks' | 'day'>, id: IngredientId): number {
  const lock = s.locks.find((l) => l.ingredient === id && l.until >= s.day);
  return lock ? Math.min(lock.price, s.market.prices[id]) : s.market.prices[id];
}

export function packPrice(s: Pick<GameState, 'market' | 'locks' | 'day' | 'supplierLoyalty' | 'effects'>, id: IngredientId, supplier: SupplierId): number {
  let mult = marketMult(s, id);
  if (supplier === 'farm' && id === 'eggs' && effectActive(s, 'farmEggs')) mult = Math.min(mult, s.market.walk.eggs);
  let base = INGREDIENTS[id].price * mult * SUPPLIERS[supplier].priceMult;
  if (supplier === 'premium' && effectActive(s, 'premiumSale')) base *= 0.7;
  return round2(base * (1 - loyaltyDiscount(s, supplier)));
}

/** What the same pack would cost at an ordinary market price, for "you saved" messages. */
export const normalPackPrice = (id: IngredientId) => INGREDIENTS[id].price;

export function inStock(s: Pick<GameState, 'market'>, id: IngredientId, supplier: SupplierId): boolean {
  return !s.market.outOfStock.some((o) => o.ingredient === id && o.supplier === supplier);
}

// ---------------------------------------------------------------- costs

export function unitCost(s: Pick<GameState, 'pantry'>, id: IngredientId): number {
  const p = s.pantry[id];
  return p.qty > 0 ? p.avgCost : INGREDIENTS[id].price / INGREDIENTS[id].pack;
}

export function recipeCost(s: Pick<GameState, 'pantry'>, recipe: Partial<Record<IngredientId, number>>): number {
  let c = 0;
  for (const [id, n] of Object.entries(recipe) as [IngredientId, number][]) c += n * unitCost(s, id);
  return c;
}

export function packagingCost(s: Pick<GameState, 'packaging'>, p: ProductId): number {
  return PACKAGING[s.packaging].cost + (p === 'mutDua' ? GIFT_BOX_COST : 0);
}

/** Cost to make one item: ingredients (and its share of a baguette) plus packaging. */
export function itemCost(s: Pick<GameState, 'pantry' | 'packaging' | 'baguettes' | 'display'>, p: ProductId): number {
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

/** How many more of a made-to-order item the pantry supports right now. */
export function makeable(s: Pick<GameState, 'pantry' | 'baguettes'>, p: ProductId): number {
  const def = PRODUCTS[p];
  let n = Infinity;
  if (p === 'banhMi') n = s.baguettes.qty;
  for (const [id, k] of Object.entries(def.recipe) as [IngredientId, number][]) if (k > 0) n = Math.min(n, Math.floor(s.pantry[id].qty / k));
  return Number.isFinite(n) ? n : 0;
}

export function rent(s: Pick<GameState, 'upgrades'>): number {
  return CONFIG.rentPerDay + s.upgrades.reduce((t, u) => t + (UPGRADES[u].rent ?? 0), 0);
}

export function wages(s: Pick<GameState, 'upgrades'>): number {
  return s.upgrades.reduce((t, u) => t + (UPGRADES[u].wage ?? 0), 0);
}

export function energyCost(s: Pick<GameState, 'upgrades'>, trays: number): number {
  const perTray = CONFIG.energyPerTray * (has(s, 'oven3') ? 1.2 : 1) * (has(s, 'solar') ? 0.4 : 1);
  return trays * perTray + 1;
}

export function fixedCosts(s: Pick<GameState, 'upgrades' | 'loan'>): number {
  return rent(s) + wages(s) + (s.loan ? s.loan.fee / CONFIG.loanDays : 0);
}

// ---------------------------------------------------------------- demand

/** A fixed panel of shoppers' budgets: the same one drives the demand meter and real customers. */
const BUDGETS: number[] = (() => {
  const r = mulberry32(20240607);
  return Array.from({ length: 400 }, () => sampleBudget(r));
})();

export function sampleBudget(rand: () => number): number {
  return clamp(1.12 + 0.22 * gaussian(rand), 0.6, 1.8);
}

export function qualityFactor(q: number): number {
  return 0.8 + 0.4 * clamp(q, 0, 100) / 100;
}

/** The highest price a shopper with this budget will pay today. */
export function willingToPay(s: GameState, p: ProductId, budget: number, quality: number, ecoMinded: boolean): number {
  const def = PRODUCTS[p];
  let w = def.ref * budget * qualityFactor(quality);
  if (def.kind === 'tray' && has(s, 'display')) w *= 1.08;
  if (ecoMinded) w *= 0.85 + 0.35 * ecoScore(s) / 100;
  if (isTet(s.day)) w *= 1.15;
  if (effectActive(s, 'festival')) w *= 1.08;
  return w;
}

export function effectivePrice(s: GameState, p: ProductId): number {
  const base = s.prices[p];
  return s.service?.lastCall && PRODUCTS[p].kind === 'tray' ? round2(base * (1 - CONFIG.lastCallDiscount)) : base;
}

export function expectedQuality(s: GameState, p: ProductId): number {
  if (PRODUCTS[p].kind === 'tray') return s.display[p].qty > 0 ? s.display[p].quality : 75;
  return madeToOrderQuality(s, p, 85);
}

/** Share of shoppers who would buy at this price: the demand meter. */
export function acceptance(s: GameState, p: ProductId, price = s.prices[p], quality = expectedQuality(s, p)): number {
  let yes = 0;
  for (const b of BUDGETS) if (willingToPay(s, p, b, quality, false) >= price - 1e-9) yes++;
  return yes / BUDGETS.length;
}

export function demandLabel(a: number): { text: string; tone: 'great' | 'good' | 'meh' | 'bad' } {
  if (a >= 0.85) return { text: 'Lots of interest!', tone: 'great' };
  if (a >= 0.6) return { text: 'Looks affordable.', tone: 'good' };
  if (a >= 0.35) return { text: 'Some customers may hesitate.', tone: 'meh' };
  return { text: 'Most people will say "Đắt quá…"', tone: 'bad' };
}

export function priceBounds(p: ProductId): [number, number] {
  const ref = PRODUCTS[p].ref;
  return [Math.max(0.25, round2(ref * CONFIG.minPriceFactor)), round2(ref * CONFIG.maxPriceFactor)];
}

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
  return sold >= 150 ? 12 : sold >= 60 ? 8 : sold >= 20 ? 4 : 0;
}

export function blendQuality(process: number, ingredients: number, bonus: number): number {
  return Math.round(clamp(0.5 * process + 0.4 * ingredients + 6 + bonus, 5, 100));
}

export function madeToOrderQuality(s: GameState, p: ProductId, process: number): number {
  let ing = ingredientQuality(s, PRODUCTS[p].recipe);
  if (p === 'banhMi') ing = (ing * 2 + (s.baguettes.qty > 0 ? s.baguettes.quality : 70)) / 3;
  return blendQuality(process, ing, masteryBonus(s, p) + (p !== 'banhMi' && has(s, 'coffeeBar') ? 4 : 0));
}

// ---------------------------------------------------------------- eco & community

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

export function expectedWalkIns(s: GameState): number {
  if (s.day === 1) return 6;
  const level = levelOf(s.xp);
  let n = CONFIG.baseWalkIns + 4 * (level - 1) + Math.min(6, (s.day - 1) * 0.5);
  n *= WEATHER[s.market.weather].traffic;
  n *= weekdayIndex(s.day) >= 5 ? 1.2 : weekdayIndex(s.day) === 4 ? 1.08 : 1;
  n *= 0.72 + 0.56 * s.reputation / 100;
  n *= momentum(s);
  if (has(s, 'corner')) n *= 1.2;
  if (has(s, 'loft')) n *= 1.25;
  if (s.decor.includes('stools')) n *= 1.03;
  if (s.decor.includes('sign')) n *= 1.04;
  if (effectActive(s, 'festival')) n *= 1.6;
  if (effectActive(s, 'stall')) n *= 1.35;
  if (isTet(s.day)) n *= s.decor.includes('hoaMai') ? 1.47 : 1.4;
  for (const e of s.effects) if (e.id === 'marketing' && e.until >= s.day) n += Number(e.data?.perDay ?? 0);
  return n;
}

export function patienceMult(s: GameState): number {
  let m = 1;
  if (effectActive(s, 'awning')) m *= 1.25;
  if (effectActive(s, 'cooler')) m *= 1.2;
  if (s.market.weather === 'hot') m *= has(s, 'fan') ? 1.05 : 0.8;
  for (const d of s.decor) m += DECOR[d].patience ?? 0;
  return m;
}

export const COMPETITOR = { name: 'Bánh Mì Cô Tư', prices: { banhMi: 2.5, caPhe: 2.1 } as Partial<Record<ProductId, number>> };

/** Chance a shopper who wants this item goes across the street instead. */
export function divertChance(s: GameState, p: ProductId): number {
  const theirs = COMPETITOR.prices[p];
  if (!competitorOpen(s.day) || theirs === undefined) return 0;
  const q = expectedQuality(s, p);
  const gap = (s.prices[p] - theirs) / theirs;
  return clamp(0.12 + 0.8 * gap - (q - 60) / 220, 0.03, 0.6);
}
