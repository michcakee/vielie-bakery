import { FIXED_COST_TOTAL, INGREDIENT_ORDER, LOAN } from '../config/balance';
import type { DayResult, GameState, IncomeStatement } from './types';

export const emptyIncome = (): IncomeStatement => ({
  revenue: 0,
  cogs: 0,
  grossProfit: 0,
  wages: 0,
  rent: 0,
  admin: 0,
  energy: 0,
  waste: 0,
  depreciation: 0,
  operatingExpenses: 0,
  operatingProfit: 0,
  interest: 0,
  netProfit: 0,
});

/** Sum income statements across days. */
export function sumIncome(days: DayResult[]): IncomeStatement {
  const total = emptyIncome();
  for (const d of days) {
    for (const k of Object.keys(total) as (keyof IncomeStatement)[]) total[k] += d.income[k];
  }
  return total;
}

export function margin(profit: number, revenue: number): number {
  return revenue > 0 ? profit / revenue : 0;
}

export function inventoryValue(state: Pick<GameState, 'ingredients' | 'dayOld'>): number {
  const ingredients = INGREDIENT_ORDER.reduce((s, id) => s + state.ingredients[id].qty * state.ingredients[id].avgCost, 0);
  return ingredients + state.dayOld.qty * state.dayOld.unitCost;
}

export interface BalanceSheet {
  cash: number;
  inventory: number;
  equipment: number;
  totalAssets: number;
  loan: number;
  overdraft: number;
  totalLiabilities: number;
  ownerCapital: number;
  retainedEarnings: number;
  equity: number;
}

/**
 * Simplified balance sheet. Assets = Liabilities + Equity must always hold;
 * tests/finance.test.ts verifies it after a full 30-day run.
 */
export function balanceSheet(state: GameState): BalanceSheet {
  const inventory = inventoryValue(state);
  const equipment = state.equipmentCost - state.accumulatedDepreciation;
  const totalAssets = state.cash + inventory + equipment;
  const totalLiabilities = state.loan + state.overdraft;
  const retainedEarnings = state.history.reduce((s, d) => s + d.income.netProfit, 0);
  return {
    cash: state.cash,
    inventory,
    equipment,
    totalAssets,
    loan: state.loan,
    overdraft: state.overdraft,
    totalLiabilities,
    ownerCapital: state.startingCapital,
    retainedEarnings,
    equity: totalAssets - totalLiabilities,
  };
}

export function dailyInterest(loan: number, overdraft: number): number {
  return (loan * LOAN.apr + overdraft * LOAN.overdraftApr) / 365;
}

export interface BreakEven {
  fixedPerDay: number;
  contributionRatio: number;
  revenueNeeded: number;
}

/**
 * Break-even revenue = daily fixed costs ÷ contribution margin ratio,
 * using the average contribution ratio of recent days (or a planning estimate).
 */
export function breakEven(state: GameState, fallbackRatio: number): BreakEven {
  const recent = state.history.slice(-7);
  const inc = sumIncome(recent);
  // Variable costs: ingredients/packaging sold, waste, and the oven share of energy (approximated as all energy).
  const variable = inc.cogs + inc.waste + inc.energy;
  const ratio = inc.revenue > 0 ? (inc.revenue - variable) / inc.revenue : fallbackRatio;
  const depreciation = recent.length ? inc.depreciation / recent.length : 0;
  const fixedPerDay = FIXED_COST_TOTAL + depreciation + dailyInterest(state.loan, state.overdraft);
  return { fixedPerDay, contributionRatio: ratio, revenueNeeded: ratio > 0 ? fixedPerDay / ratio : Infinity };
}

/** Days the bakery could cover fixed costs from cash alone, if it sold nothing. */
export function cashRunwayDays(state: GameState): number {
  return state.cash / FIXED_COST_TOTAL;
}
