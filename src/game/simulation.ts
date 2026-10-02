import {
  DAY_OLD_ACCEPTANCE,
  DAY_OLD_PRICE_FACTOR,
  DISPOSAL_FEE_PER_UNIT,
  DISPOSAL_FEE_WITH_COMPOST,
  FIXED_COSTS,
  INGREDIENTS,
  INGREDIENT_ORDER,
  INVESTMENTS,
  PRODUCTS,
  PRODUCT_ORDER,
  REPUTATION,
} from '../config/balance';
import {
  demandBreakdown,
  energyCost,
  ingredientNeeds,
  ovenCapacity,
  ovenMinutesFor,
  packagingUnitCost,
} from './economy';
import { dailyInterest } from './finance';
import { computeGreenScore } from './sustainability';
import type { ByIngredient, ByProduct, DayResult, GameState, IngredientStock, ProductResult } from './types';

const EPS = 1e-6;

export interface BakeCheck {
  ok: boolean;
  reasons: string[];
  shortfall: ByIngredient<number>;
  minutes: number;
  capacity: number;
}

/** Validate a production plan before baking. The UI uses this to explain why baking is blocked. */
export function checkPlan(state: GameState): BakeCheck {
  const reasons: string[] = [];
  const capacity = ovenCapacity(state.owned);
  const minutes = ovenMinutesFor(state.plan);
  if (minutes > capacity + EPS) reasons.push(`The plan needs ${Math.ceil(minutes)} oven minutes but you only have ${capacity}.`);
  const need = ingredientNeeds(state.plan);
  const shortfall = { flour: 0, butter: 0, berries: 0, matcha: 0 } as ByIngredient<number>;
  for (const id of INGREDIENT_ORDER) {
    shortfall[id] = Math.max(0, need[id] - state.ingredients[id].qty);
    if (shortfall[id] > EPS) reasons.push(`Not enough ${INGREDIENTS[id].name.toLowerCase()}: need ${fmtQty(need[id])} ${INGREDIENTS[id].unit}, have ${fmtQty(state.ingredients[id].qty)}.`);
  }
  for (const p of PRODUCT_ORDER) {
    if (state.plan[p] < 0 || !Number.isInteger(state.plan[p])) reasons.push(`Invalid quantity for ${PRODUCTS[p].name}.`);
  }
  if (state.phase !== 'morning') reasons.push('The shop is closed. Continue to the next morning first.');
  return { ok: reasons.length === 0, reasons, shortfall, minutes, capacity };
}

function fmtQty(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/**
 * Run one trading day. Pure: returns a new state (phase = 'report') and never mutates input.
 * Order of operations: bake → serve customers → spoil → pay running costs → update reputation.
 */
export function runDay(state: GameState): GameState {
  const check = checkPlan(state);
  if (!check.ok) return state;

  const market = state.market;
  const capacity = ovenCapacity(state.owned);
  const ovenMinutesUsed = ovenMinutesFor(state.plan);
  const ingredients: ByIngredient<IngredientStock> = structuredClone(state.ingredients);
  const notes: string[] = [];

  // 1. Bake: consume ingredients at their weighted-average cost.
  const unitCost = {} as ByProduct<number>;
  let pantryPaid = 0;
  for (const p of PRODUCT_ORDER) {
    const cfg = PRODUCTS[p];
    let c = cfg.pantryCost;
    for (const i of INGREDIENT_ORDER) c += (cfg.recipe[i] ?? 0) * ingredients[i].avgCost;
    unitCost[p] = c;
    pantryPaid += cfg.pantryCost * state.plan[p];
  }
  const need = ingredientNeeds(state.plan);
  for (const i of INGREDIENT_ORDER) ingredients[i].qty = Math.max(0, ingredients[i].qty - need[i]);

  // 2. Serve customers.
  const pkgUnit = packagingUnitCost(state, market);
  const products = {} as ByProduct<ProductResult>;
  let newDayOld = { qty: 0, unitCost: 0 };
  for (const p of PRODUCT_ORDER) {
    const price = state.prices[p];
    const baked = state.plan[p];
    const demand = demandBreakdown(state, market, p, price);
    const customers = Math.max(0, Math.round(demand.expected * market.noise[p]));
    let freshSold: number;
    let dayOldSold = 0;
    let wasted: number;
    let wasteCost: number;
    let carriedOver = 0;
    let ingredientCostSold: number;

    if (PRODUCTS[p].shelfLifeDays > 1) {
      const dayOld = state.dayOld;
      dayOldSold = Math.min(dayOld.qty, Math.round(customers * DAY_OLD_ACCEPTANCE));
      freshSold = Math.min(baked, customers - dayOldSold);
      // If fresh loaves run out, remaining customers take day-old ones too.
      dayOldSold += Math.min(dayOld.qty - dayOldSold, customers - dayOldSold - freshSold);
      carriedOver = baked - freshSold;
      wasted = dayOld.qty - dayOldSold;
      wasteCost = wasted * dayOld.unitCost;
      ingredientCostSold = freshSold * unitCost[p] + dayOldSold * dayOld.unitCost;
      newDayOld = { qty: carriedOver, unitCost: unitCost[p] };
    } else {
      freshSold = Math.min(baked, customers);
      wasted = baked - freshSold;
      wasteCost = wasted * unitCost[p];
      ingredientCostSold = freshSold * unitCost[p];
    }
    const totalSold = freshSold + dayOldSold;
    products[p] = {
      planned: baked,
      baked,
      expectedDemand: demand.expected,
      customers,
      sold: freshSold,
      dayOldSold,
      price,
      revenue: freshSold * price + dayOldSold * price * DAY_OLD_PRICE_FACTOR,
      unitCost: unitCost[p],
      ingredientCostSold,
      packagingCost: totalSold * pkgUnit,
      wasted,
      wasteCost,
      carriedOver,
      stockout: Math.max(0, customers - totalSold),
      nonPriceMultiplier: demand.nonPriceMultiplier * (1 - demand.competitorShare),
    };
  }

  // 3. Overnight spoilage of perishable ingredients.
  let spoiledIngredientCost = 0;
  for (const i of INGREDIENT_ORDER) {
    const lost = ingredients[i].qty * INGREDIENTS[i].spoilagePerNight;
    if (lost > EPS) {
      spoiledIngredientCost += lost * ingredients[i].avgCost;
      ingredients[i].qty -= lost;
    }
  }
  if (spoiledIngredientCost > 1) notes.push(`$${spoiledIngredientCost.toFixed(2)} of stored ingredients spoiled overnight.`);

  // 4. Running costs.
  const unitsWasted = PRODUCT_ORDER.reduce((s, p) => s + products[p].wasted, 0);
  const disposalFees = unitsWasted * (state.owned.includes('compost') ? DISPOSAL_FEE_WITH_COMPOST : DISPOSAL_FEE_PER_UNIT);
  const energy = energyCost(state.owned, market, ovenMinutesUsed);
  const depreciation = state.owned.reduce((s, id) => s + INVESTMENTS[id].cost / INVESTMENTS[id].usefulLifeDays, 0);
  const interest = dailyInterest(state.loan, state.overdraft);

  const revenue = sum(products, (r) => r.revenue);
  const packaging = sum(products, (r) => r.packagingCost);
  const cogs = sum(products, (r) => r.ingredientCostSold) + packaging;
  const waste = sum(products, (r) => r.wasteCost) + spoiledIngredientCost + disposalFees;
  const grossProfit = revenue - cogs;
  const operatingExpenses = FIXED_COSTS.wages + FIXED_COSTS.rent + FIXED_COSTS.admin + energy + waste + depreciation;
  const operatingProfit = grossProfit - operatingExpenses;
  const netProfit = operatingProfit - interest;

  // Cash: ingredients were paid for when bought; pantry items, packaging, energy,
  // disposal, fixed costs and interest are paid now. Depreciation is not a cash cost.
  const cashOut = pantryPaid + packaging + energy + disposalFees + FIXED_COSTS.wages + FIXED_COSTS.rent + FIXED_COSTS.admin + interest;
  let cash = state.cash + revenue - cashOut;
  let overdraft = state.overdraft;
  let overdraftDrawn = 0;
  if (cash < 0) {
    overdraftDrawn = -cash;
    overdraft += overdraftDrawn;
    cash = 0;
    notes.push(`Cash ran out at closing. The bank covered $${overdraftDrawn.toFixed(2)} with an expensive overdraft.`);
  }

  // 5. Customer satisfaction and reputation.
  const customers = sum(products, (r) => r.customers);
  const unitsSold = sum(products, (r) => r.sold + r.dayOldSold);
  const served = customers > 0 ? unitsSold / customers : 1;
  const priceRatio = revenue > 0 ? PRODUCT_ORDER.reduce((s, p) => s + (products[p].price / PRODUCTS[p].refPrice) * products[p].revenue, 0) / revenue : 1;
  const fairness = Math.min(1, Math.max(0, 1 - (priceRatio - 1) * 0.8));
  const satisfaction = Math.round(100 * (0.6 * served + 0.4 * fairness));

  const unitsProduced = PRODUCT_ORDER.reduce((s, p) => s + state.plan[p], 0);
  const partial: DayResult = {
    day: state.day,
    weather: market.weather,
    eventId: market.eventId,
    products,
    income: {
      revenue,
      cogs,
      grossProfit,
      wages: FIXED_COSTS.wages,
      rent: FIXED_COSTS.rent,
      admin: FIXED_COSTS.admin,
      energy,
      waste,
      depreciation,
      operatingExpenses,
      operatingProfit,
      interest,
      netProfit,
    },
    ovenMinutesUsed,
    ovenCapacity: capacity,
    spoiledIngredientCost,
    disposalFees,
    unitsProduced,
    unitsWasted,
    customers,
    unitsSold,
    satisfaction,
    reputationBefore: state.reputation,
    reputationAfter: state.reputation,
    greenScore: state.greenScore,
    cashBefore: state.cashAtDayStart,
    cashAfter: cash,
    morningCashFlow: state.cash - state.cashAtDayStart,
    overdraftDrawn,
    notes,
  };
  const history = [...state.history, partial];
  const greenScore = computeGreenScore({ ...state, history });
  const target = REPUTATION.satisfactionWeight * satisfaction + REPUTATION.greenWeight * greenScore;
  const reputation = Math.min(100, Math.max(0, state.reputation + REPUTATION.adjustSpeed * (target - state.reputation)));
  partial.reputationAfter = reputation;
  partial.greenScore = greenScore;

  const stockoutUnits = sum(products, (r) => r.stockout);
  if (stockoutUnits > 0) notes.push(`${stockoutUnits} customer${stockoutUnits === 1 ? '' : 's'} left without what they wanted.`);

  return {
    ...state,
    phase: 'report',
    cash,
    overdraft,
    ingredients,
    dayOld: newDayOld,
    accumulatedDepreciation: state.accumulatedDepreciation + depreciation,
    reputation,
    greenScore,
    history,
    lastResult: partial,
  };
}

function sum(products: ByProduct<ProductResult>, f: (r: ProductResult) => number): number {
  return PRODUCT_ORDER.reduce((s, p) => s + f(products[p]), 0);
}
