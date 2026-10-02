import {
  DISPOSAL_FEE_PER_UNIT,
  DISPOSAL_FEE_WITH_COMPOST,
  ENERGY_PER_OVEN_MINUTE,
  INVESTMENTS,
  OVEN_CAPACITY_BONUS,
  OVEN_ENERGY_SAVING,
  PACKAGING,
  PRODUCTS,
  PRODUCT_ORDER,
  REUSABLE_DEMAND_BONUS,
  REUSABLE_PACKAGING_SAVING,
  SOLAR_ENERGY_SAVING,
} from '../config/balance';
import { ovenCapacity } from './economy';
import type { DayResult, GameState, InvestmentId } from './types';

/** Planning assumptions used before the bakery has any trading history. */
export const TYPICAL_DAY = {
  unitsSold: 170,
  unitsWasted: 18,
  ovenMinutes: 400,
  energy: 50,
  contribution: 520,
  lostOvenMinutes: 60,
};

export interface BenefitLine {
  label: string;
  perDay: number;
}

export interface InvestmentAnalysis {
  id: InvestmentId;
  cost: number;
  lines: BenefitLine[];
  dailyBenefit: number;
  annualBenefit: number;
  dailyDepreciation: number;
  /** Days until cumulative benefit equals the purchase price. */
  paybackDays: number;
  paybackYears: number;
  /** Annual benefit ÷ cost. */
  simpleAnnualReturn: number;
  basis: string;
}

interface Averages {
  unitsSold: number;
  unitsWasted: number;
  ovenMinutes: number;
  energy: number;
  contribution: number;
  lostOvenMinutes: number;
  utilisation: number;
  days: number;
}

function averages(history: DayResult[]): Averages | null {
  const recent = history.slice(-7);
  if (!recent.length) return null;
  const n = recent.length;
  const sum = (f: (d: DayResult) => number) => recent.reduce((s, d) => s + f(d), 0) / n;
  return {
    days: n,
    unitsSold: sum((d) => d.unitsSold),
    unitsWasted: sum((d) => d.unitsWasted),
    ovenMinutes: sum((d) => d.ovenMinutesUsed),
    energy: sum((d) => d.income.energy),
    contribution: sum((d) => d.income.revenue - d.income.cogs - d.income.waste - d.income.energy),
    // Minutes of oven time that would have been needed to serve customers who found empty shelves.
    lostOvenMinutes: sum((d) => PRODUCT_ORDER.reduce((s, p) => s + d.products[p].stockout * PRODUCTS[p].ovenMinutes, 0)),
    utilisation: sum((d) => d.ovenMinutesUsed / d.ovenCapacity),
  };
}

/**
 * Estimate what an investment would save or earn per day, based on the bakery's own
 * last seven days. Payback and return figures follow directly:
 *   payback (days) = cost ÷ daily benefit,  simple annual return = daily benefit × 365 ÷ cost.
 */
export function analyseInvestment(state: GameState, id: InvestmentId): InvestmentAnalysis {
  const cfg = INVESTMENTS[id];
  const avg = averages(state.history);
  const a = avg ?? { ...TYPICAL_DAY, utilisation: 0.95, days: 0 };
  const lines: BenefitLine[] = [];
  const solarMult = state.owned.includes('solar') ? 1 - SOLAR_ENERGY_SAVING : 1;

  if (id === 'oven') {
    const perMin = ENERGY_PER_OVEN_MINUTE * solarMult;
    lines.push({ label: 'Lower energy per oven minute', perDay: a.ovenMinutes * perMin * OVEN_ENERGY_SAVING });
    const contributionPerMinute = a.ovenMinutes > 0 ? a.contribution / a.ovenMinutes : 0;
    const extraMinutes = ovenCapacity([]) * OVEN_CAPACITY_BONUS;
    const usable = a.utilisation > 0.85 ? Math.min(extraMinutes, a.lostOvenMinutes) : 0;
    lines.push({ label: usable > 0 ? `Extra sales from ${Math.round(usable)} more oven minutes` : 'Extra capacity (your oven is not full yet)', perDay: Math.max(0, usable * contributionPerMinute) });
  }
  if (id === 'compost') {
    lines.push({ label: 'Cheaper disposal of wasted food', perDay: a.unitsWasted * (DISPOSAL_FEE_PER_UNIT - DISPOSAL_FEE_WITH_COMPOST) });
  }
  if (id === 'reusable') {
    lines.push({ label: 'Less packaging bought', perDay: a.unitsSold * PACKAGING[state.packaging].costPerUnit * REUSABLE_PACKAGING_SAVING });
    lines.push({ label: 'Café wholesale orders (+6% demand)', perDay: Math.max(0, a.contribution * (REUSABLE_DEMAND_BONUS - 1)) });
  }
  if (id === 'solar') {
    const current = state.owned.includes('solar') ? a.energy / (1 - SOLAR_ENERGY_SAVING) : a.energy;
    lines.push({ label: 'Lower electricity bills', perDay: current * SOLAR_ENERGY_SAVING });
  }

  const dailyBenefit = lines.reduce((s, l) => s + l.perDay, 0);
  const paybackDays = dailyBenefit > 0 ? cfg.cost / dailyBenefit : Infinity;
  return {
    id,
    cost: cfg.cost,
    lines,
    dailyBenefit,
    annualBenefit: dailyBenefit * 365,
    dailyDepreciation: cfg.cost / cfg.usefulLifeDays,
    paybackDays,
    paybackYears: paybackDays / 365,
    simpleAnnualReturn: (dailyBenefit * 365) / cfg.cost,
    basis: avg ? `Based on your last ${avg.days} day${avg.days === 1 ? '' : 's'} of trading.` : 'Based on a typical day (you have no trading history yet).',
  };
}
