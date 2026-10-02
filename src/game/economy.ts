import {
  BASE_ENERGY_COST,
  COMPETITOR,
  ENERGY_PER_OVEN_MINUTE,
  GREEN,
  INGREDIENTS,
  INGREDIENT_ORDER,
  OVEN_CAPACITY_BONUS,
  OVEN_CAPACITY_MINUTES,
  OVEN_ENERGY_SAVING,
  PACKAGING,
  PRODUCTS,
  PRODUCT_ORDER,
  REPUTATION,
  REUSABLE_DEMAND_BONUS,
  REUSABLE_PACKAGING_SAVING,
  SOLAR_ENERGY_SAVING,
  SOURCING,
  WEATHER,
  WEEKDAY_TRAFFIC,
  BULK_DISCOUNT,
} from '../config/balance';
import { getEvent } from './events';
import type { ByIngredient, ByProduct, GameState, IngredientId, MarketDay, ProductId } from './types';

export const weekdayIndex = (day: number) => (day - 1) % 7;

export interface DemandFactor {
  label: string;
  value: number;
}

export interface DemandBreakdown {
  base: number;
  priceFactor: number;
  factors: DemandFactor[];
  nonPriceMultiplier: number;
  competitorShare: number;
  expected: number;
}

export function competitorPrice(product: ProductId, market: MarketDay): number {
  const event = getEvent(market.eventId);
  return PRODUCTS[product].refPrice * COMPETITOR.priceFactor * (event?.effects.competitorPrice ?? 1);
}

/** Share of customers lost to the competitor. Rises the further your price sits above theirs. */
export function competitorShare(product: ProductId, price: number, market: MarketDay, reputation: number): number {
  if (!market.competitorActive) return 0;
  const ratio = price / competitorPrice(product, market);
  const share =
    COMPETITOR.baseShare +
    COMPETITOR.sharePerTenPct * ((ratio - 1) / 0.1) -
    COMPETITOR.loyaltyPerRepPoint * (reputation - 50);
  return Math.min(COMPETITOR.maxShare, Math.max(COMPETITOR.minShare, share));
}

export function reputationMultiplier(reputation: number): number {
  return 0.85 + reputation * REPUTATION.demandSlope;
}

export function greenMultiplier(greenScore: number, spotlight: boolean): number {
  const base = 1 + (greenScore - 50) / GREEN.demandDivisor;
  // When the paper covers food waste, the green effect is three times as strong.
  return spotlight ? 1 + (base - 1) * 3 : base;
}

/**
 * The demand model:
 *   expected = baseDemand × (price / refPrice)^elasticity × Π(non-price factors) × (1 − competitor share)
 */
export function demandBreakdown(
  state: Pick<GameState, 'reputation' | 'greenScore' | 'sourcing' | 'owned'>,
  market: MarketDay,
  product: ProductId,
  price: number,
): DemandBreakdown {
  const cfg = PRODUCTS[product];
  const event = getEvent(market.eventId);
  const priceFactor = Math.pow(price / cfg.refPrice, cfg.elasticity);

  const factors: DemandFactor[] = [
    { label: 'Day of week', value: WEEKDAY_TRAFFIC[weekdayIndex(market.day)] },
    { label: 'Weather', value: WEATHER[market.weather].traffic },
    { label: 'Customer taste', value: market.preference[product] },
    { label: 'Reputation', value: reputationMultiplier(state.reputation) },
    { label: 'Green image', value: greenMultiplier(state.greenScore, !!event?.effects.greenSpotlight) },
  ];
  const eventMult = (event?.effects.demandAll ?? 1) * (event?.effects.demand?.[product] ?? 1);
  if (eventMult !== 1) factors.push({ label: event!.headline, value: eventMult });
  if (state.sourcing === 'local') factors.push({ label: 'Local sourcing', value: SOURCING.local.demandMult });
  if (state.owned.includes('reusable')) factors.push({ label: 'Café wholesale', value: REUSABLE_DEMAND_BONUS });

  const nonPriceMultiplier = factors.reduce((m, f) => m * f.value, 1);
  const share = competitorShare(product, price, market, state.reputation);
  const expected = cfg.baseDemand * priceFactor * nonPriceMultiplier * (1 - share);
  return { base: cfg.baseDemand, priceFactor, factors, nonPriceMultiplier, competitorShare: share, expected };
}

export function ovenCapacity(owned: GameState['owned']): number {
  return Math.round(OVEN_CAPACITY_MINUTES * (owned.includes('oven') ? 1 + OVEN_CAPACITY_BONUS : 1));
}

export function ovenMinutesFor(plan: ByProduct<number>): number {
  return PRODUCT_ORDER.reduce((s, id) => s + plan[id] * PRODUCTS[id].ovenMinutes, 0);
}

export function energyMultiplier(owned: GameState['owned'], market: MarketDay): number {
  const event = getEvent(market.eventId);
  const spike = event?.effects.energy ?? 1;
  const solar = owned.includes('solar') ? 1 - SOLAR_ENERGY_SAVING : 1;
  return spike * solar;
}

/** Energy cost for the day: base load + oven minutes. */
export function energyCost(owned: GameState['owned'], market: MarketDay, ovenMinutes: number): number {
  const perMinute = ENERGY_PER_OVEN_MINUTE * (owned.includes('oven') ? 1 - OVEN_ENERGY_SAVING : 1);
  return (BASE_ENERGY_COST + ovenMinutes * perMinute) * energyMultiplier(owned, market);
}

export function packagingUnitCost(state: Pick<GameState, 'packaging' | 'owned'>, market: MarketDay): number {
  const event = getEvent(market.eventId);
  const reuse = state.owned.includes('reusable') ? 1 - REUSABLE_PACKAGING_SAVING : 1;
  return PACKAGING[state.packaging].costPerUnit * reuse * (event?.effects.packaging ?? 1);
}

/** Price you pay per ingredient unit today (sourcing premium included, bulk discount optional). */
export function ingredientBuyPrice(state: Pick<GameState, 'sourcing'>, market: MarketDay, id: IngredientId, qty = 0): number {
  const bulk = qty >= INGREDIENTS[id].bulkQty ? 1 - BULK_DISCOUNT : 1;
  return market.ingredientPrices[id] * SOURCING[state.sourcing].ingredientCostMult * bulk;
}

export function ingredientNeeds(plan: ByProduct<number>): ByIngredient<number> {
  const need = { flour: 0, butter: 0, berries: 0, matcha: 0 } as ByIngredient<number>;
  for (const p of PRODUCT_ORDER) {
    const recipe = PRODUCTS[p].recipe;
    for (const i of INGREDIENT_ORDER) need[i] += (recipe[i] ?? 0) * plan[p];
  }
  return need;
}

/** Ingredient cost per unit using current inventory average cost (falls back to today's price). */
export function unitIngredientCost(state: Pick<GameState, 'ingredients' | 'sourcing'>, market: MarketDay, product: ProductId): number {
  const recipe = PRODUCTS[product].recipe;
  let cost = PRODUCTS[product].pantryCost;
  for (const i of INGREDIENT_ORDER) {
    const q = recipe[i] ?? 0;
    if (!q) continue;
    const stock = state.ingredients[i];
    const unit = stock.qty > 0 ? stock.avgCost : ingredientBuyPrice(state, market, i);
    cost += q * unit;
  }
  return cost;
}

export interface UnitEconomics {
  price: number;
  ingredients: number;
  packaging: number;
  energy: number;
  marginalCost: number;
  contribution: number;
  contributionPerMinute: number;
  marginPct: number;
}

/** Marginal cost and contribution per unit — the core of the planner's "is it worth baking?" view. */
export function unitEconomics(state: GameState, market: MarketDay, product: ProductId, price = state.prices[product]): UnitEconomics {
  const ingredients = unitIngredientCost(state, market, product);
  const packaging = packagingUnitCost(state, market);
  const perMinute = ENERGY_PER_OVEN_MINUTE * (state.owned.includes('oven') ? 1 - OVEN_ENERGY_SAVING : 1);
  const energy = PRODUCTS[product].ovenMinutes * perMinute * energyMultiplier(state.owned, market);
  const marginalCost = ingredients + packaging + energy;
  const contribution = price - marginalCost;
  return {
    price,
    ingredients,
    packaging,
    energy,
    marginalCost,
    contribution,
    contributionPerMinute: contribution / PRODUCTS[product].ovenMinutes,
    marginPct: price > 0 ? contribution / price : 0,
  };
}
