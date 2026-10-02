import { FIXED_COST_TOTAL, INVESTMENTS, PRODUCTS, PRODUCT_ORDER } from '../config/balance';
import { balanceSheet, margin, sumIncome } from './finance';
import { analyseInvestment } from './investments';
import type { GameState } from './types';

export interface FinalSummary {
  totalRevenue: number;
  totalNetProfit: number;
  operatingMargin: number;
  finalCash: number;
  netWorth: number;
  netWorthChange: number;
  debt: number;
  greenStart: number;
  greenEnd: number;
  wasteRateFirstWeek: number;
  wasteRateLastWeek: number;
  avgSatisfaction: number;
  reputation: number;
  invested: number;
  investmentDailyBenefit: number;
  runwayDays: number;
  avgPriceIndex: number;
  bestDay: { day: number; profit: number } | null;
}

export interface Trait {
  name: string;
  description: string;
}

export interface BusinessProfile {
  title: string;
  summary: string;
  traits: Trait[];
  reflections: string[];
}

function wasteRate(days: GameState['history']) {
  const produced = days.reduce((s, d) => s + d.unitsProduced, 0);
  return produced ? days.reduce((s, d) => s + d.unitsWasted, 0) / produced : 0;
}

export function finalSummary(state: GameState): FinalSummary {
  const inc = sumIncome(state.history);
  const bs = balanceSheet(state);
  const invested = state.owned.reduce((s, id) => s + INVESTMENTS[id].cost, 0);
  const priceIdx = state.history.length
    ? state.history.reduce((s, d) => s + PRODUCT_ORDER.reduce((t, p) => t + d.products[p].price / PRODUCTS[p].refPrice, 0) / PRODUCT_ORDER.length, 0) / state.history.length
    : 1;
  const best = state.history.reduce<FinalSummary['bestDay']>((b, d) => (!b || d.income.netProfit > b.profit ? { day: d.day, profit: d.income.netProfit } : b), null);
  return {
    totalRevenue: inc.revenue,
    totalNetProfit: inc.netProfit,
    operatingMargin: margin(inc.operatingProfit, inc.revenue),
    finalCash: state.cash,
    netWorth: bs.equity,
    netWorthChange: bs.equity - state.startingCapital,
    debt: state.loan + state.overdraft,
    greenStart: state.history[0]?.greenScore ?? state.greenScore,
    greenEnd: state.greenScore,
    wasteRateFirstWeek: wasteRate(state.history.slice(0, 7)),
    wasteRateLastWeek: wasteRate(state.history.slice(-7)),
    avgSatisfaction: state.history.length ? state.history.reduce((s, d) => s + d.satisfaction, 0) / state.history.length : 0,
    reputation: state.reputation,
    invested,
    investmentDailyBenefit: state.owned.reduce((s, id) => s + analyseInvestment(state, id).dailyBenefit, 0),
    runwayDays: state.cash / FIXED_COST_TOTAL,
    avgPriceIndex: priceIdx,
    bestDay: best,
  };
}

/**
 * A descriptive profile instead of a grade: which strategy did the player actually follow,
 * and what did it cost or earn them? Traits are chosen only from measured behaviour.
 */
export function businessProfile(state: GameState, s: FinalSummary): BusinessProfile {
  const traits: Trait[] = [];
  if (s.avgPriceIndex > 1.08) traits.push({ name: 'Premium pricer', description: `Your prices averaged ${((s.avgPriceIndex - 1) * 100).toFixed(0)}% above the usual level. You traded customer numbers for a higher margin on each sale.` });
  else if (s.avgPriceIndex < 0.94) traits.push({ name: 'Value champion', description: `Your prices averaged ${((1 - s.avgPriceIndex) * 100).toFixed(0)}% below the usual level, winning volume and goodwill at the cost of margin per item.` });
  if (s.invested >= 3000) traits.push({ name: 'Builder', description: `You put $${s.invested.toLocaleString('en-US')} into equipment — money spent now for savings that keep arriving long after day 30.` });
  else if (s.invested === 0) traits.push({ name: 'Cash keeper', description: 'You bought no equipment, keeping cash flexible but leaving long-term savings on the table.' });
  if (s.debt > 0 || state.decisions.some((d) => d.kind === 'loan')) traits.push({ name: 'Borrower', description: 'You used borrowed money. That works when the investment earns more than the interest rate.' });
  if (s.greenEnd >= 70) traits.push({ name: 'Green operator', description: `Your green score finished at ${s.greenEnd}. Packaging, sourcing and waste choices paid off in reputation.` });
  if (s.wasteRateLastWeek < s.wasteRateFirstWeek * 0.6 && s.wasteRateFirstWeek > 0.05) traits.push({ name: 'Waste cutter', description: `Waste fell from ${(s.wasteRateFirstWeek * 100).toFixed(0)}% of output in week 1 to ${(s.wasteRateLastWeek * 100).toFixed(0)}% in the final week.` });
  if (s.avgSatisfaction >= 85) traits.push({ name: 'Crowd pleaser', description: `Customers left satisfied — average satisfaction ${s.avgSatisfaction.toFixed(0)} out of 100.` });
  if (s.runwayDays < 3) traits.push({ name: 'Lean operator', description: `You finished with ${s.runwayDays.toFixed(1)} days of fixed costs in cash — little room for a bad week.` });

  let title: string;
  if (s.totalNetProfit > 4000 && s.greenEnd >= 65) title = 'The balanced bakery';
  else if (s.totalNetProfit > 4000) title = 'The profit engine';
  else if (s.greenEnd >= 70) title = 'The neighbourhood idealist';
  else if (s.invested >= 3000) title = 'The long-game builder';
  else if (s.totalNetProfit > 0) title = 'The steady corner shop';
  else title = 'The hard-learned season';

  const reflections: string[] = [];
  reflections.push(
    s.netWorthChange >= 0
      ? `The bakery is worth $${s.netWorthChange.toLocaleString('en-US', { maximumFractionDigits: 0 })} more than when you started (assets minus debts).`
      : `The bakery is worth $${Math.abs(s.netWorthChange).toLocaleString('en-US', { maximumFractionDigits: 0 })} less than when you started (assets minus debts).`,
  );
  if (s.investmentDailyBenefit > 0) reflections.push(`Your equipment now saves or earns about $${s.investmentDailyBenefit.toFixed(0)} a day — roughly $${(s.investmentDailyBenefit * 365).toLocaleString('en-US', { maximumFractionDigits: 0 })} a year if trading continued like this.`);
  const ovenDay = state.decisions.find((d) => d.kind === 'investment' && d.text.toLowerCase().includes('oven'))?.day;
  if (ovenDay) {
    const after = state.history.filter((d) => d.day >= ovenDay);
    const used = after.length ? after.reduce((t, d) => t + d.ovenMinutesUsed / d.ovenCapacity, 0) / after.length : 1;
    if (used < 0.85)
      reflections.push(`After buying the efficient oven you used only ${(used * 100).toFixed(0)}% of its minutes on average. Extra capacity only earns money when you bake more to fill it.`);
  }
  if (s.operatingMargin > 0) reflections.push(`Operating margin over 30 days: ${(s.operatingMargin * 100).toFixed(1)}%. Many real food businesses keep far less of each sale once owner pay, taxes and repairs are counted.`);
  if (s.debt > 0) reflections.push(`You still owe $${s.debt.toLocaleString('en-US', { maximumFractionDigits: 0 })}. Debt is not a failure — the question is whether what it bought earns more than its interest.`);

  const summary = traits.length ? traits.slice(0, 2).map((t) => t.name.toLowerCase()).join(' and ') : 'a cautious, steady approach';
  return {
    title,
    summary: `Over 30 days you ran Vielie as ${traits.length ? 'a' : ''} ${summary}. There is no single right strategy — here is what yours produced.`.replace('  ', ' '),
    traits,
    reflections,
  };
}
