import { DAY_OLD_PRICE_FACTOR, DEMAND_NOISE, DISPOSAL_FEE_PER_UNIT, DISPOSAL_FEE_WITH_COMPOST, FIXED_COST_TOTAL, INVESTMENTS, PRODUCT_ORDER } from '../config/balance';
import { demandBreakdown, energyCost, ovenMinutesFor, unitEconomics } from './economy';
import { dailyInterest } from './finance';
import type { ByProduct, GameState } from './types';

export interface ProductForecast {
  expected: number;
  low: number;
  high: number;
  expectedSales: number;
  expectedWaste: number;
}

export interface DayProjection {
  products: ByProduct<ProductForecast>;
  revenue: number;
  variableCosts: number;
  fixedCosts: number;
  operatingProfit: number;
  netProfit: number;
}

/**
 * What the plan is expected to earn if demand matches the forecast exactly.
 * Uses the same model as the simulation, minus the hidden ±12% daily noise.
 */
export function projectDay(state: GameState): DayProjection {
  const m = state.market;
  const products = {} as ByProduct<ProductForecast>;
  let revenue = 0;
  let variable = 0;
  let wastedUnits = 0;
  for (const p of PRODUCT_ORDER) {
    const price = state.prices[p];
    const expected = demandBreakdown(state, m, p, price).expected;
    const ue = unitEconomics(state, m, p);
    const baked = state.plan[p];
    let sales = Math.min(baked, expected);
    let waste = Math.max(0, baked - expected);
    if (p === 'sourdough' && state.dayOld.qty > 0) {
      const dayOld = Math.min(state.dayOld.qty, expected);
      sales = Math.min(baked, expected - dayOld);
      revenue += dayOld * price * DAY_OLD_PRICE_FACTOR;
      variable += dayOld * (ue.packaging + state.dayOld.unitCost);
      // Unsold fresh loaves carry over rather than becoming waste.
      waste = 0;
    }
    revenue += sales * price;
    // Every unit baked costs ingredients; only sold units need packaging.
    variable += baked * ue.ingredients + sales * ue.packaging;
    wastedUnits += waste;
    products[p] = {
      expected,
      low: expected * (1 - DEMAND_NOISE),
      high: expected * (1 + DEMAND_NOISE),
      expectedSales: sales,
      expectedWaste: waste,
    };
  }
  variable += energyCost(state.owned, m, ovenMinutesFor(state.plan));
  variable += wastedUnits * (state.owned.includes('compost') ? DISPOSAL_FEE_WITH_COMPOST : DISPOSAL_FEE_PER_UNIT);
  const depreciation = state.owned.reduce((s, id) => s + INVESTMENTS[id].cost / INVESTMENTS[id].usefulLifeDays, 0);
  const fixedCosts = FIXED_COST_TOTAL + depreciation;
  const operatingProfit = revenue - variable - fixedCosts;
  return {
    products,
    revenue,
    variableCosts: variable,
    fixedCosts,
    operatingProfit,
    netProfit: operatingProfit - dailyInterest(state.loan, state.overdraft),
  };
}
