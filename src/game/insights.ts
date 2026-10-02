import { FIXED_COST_TOTAL, PRODUCTS, PRODUCT_ORDER } from '../config/balance';
import { margin, sumIncome } from './finance';
import type { ConceptId, DayResult, GameState, ProductId } from './types';

export interface Insight {
  title: string;
  body: string;
  concept: ConceptId;
  /** Higher = more important; the report shows the top two. */
  weight: number;
}

const money = (v: number) => `$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

/**
 * Observed price elasticity for a product, comparing two periods.
 * Customer counts are divided by the recorded non-price multiplier (weather, events,
 * reputation, competition…) so only the price effect remains. Arc (midpoint) formula.
 */
export function observedElasticity(before: DayResult[], after: DayResult[], product: ProductId): { elasticity: number; priceChange: number } | null {
  const avg = (days: DayResult[], f: (d: DayResult) => number) => days.reduce((s, d) => s + f(d), 0) / days.length;
  if (!before.length || !after.length) return null;
  const p0 = avg(before, (d) => d.products[product].price);
  const p1 = avg(after, (d) => d.products[product].price);
  if (Math.abs(p1 - p0) / p0 < 0.05) return null;
  const adj = (d: DayResult) => d.products[product].customers / Math.max(0.05, d.products[product].nonPriceMultiplier);
  const q0 = avg(before, adj);
  const q1 = avg(after, adj);
  if (q0 <= 0 || q1 <= 0) return null;
  const dq = (q1 - q0) / ((q1 + q0) / 2);
  const dp = (p1 - p0) / ((p1 + p0) / 2);
  return { elasticity: dq / dp, priceChange: (p1 - p0) / p0 };
}

export function weeklyInsights(state: GameState, week: DayResult[], previous: DayResult[]): Insight[] {
  const out: Insight[] = [];
  const inc = sumIncome(week);

  // 1. Price experiments, using actual observed demand.
  for (const p of PRODUCT_ORDER) {
    const obs = observedElasticity(previous, week, p);
    if (!obs) continue;
    const name = PRODUCTS[p].name.toLowerCase();
    const revBefore = previous.reduce((s, d) => s + d.products[p].revenue, 0) / previous.length;
    const revAfter = week.reduce((s, d) => s + d.products[p].revenue, 0) / week.length;
    const elastic = Math.abs(obs.elasticity) > 1;
    const direction = obs.priceChange > 0 ? 'raised' : 'lowered';
    const revenueMove = revAfter > revBefore ? 'rose' : 'fell';
    out.push({
      title: `Your ${name} price test`,
      body:
        `You ${direction} the ${name} price by ${pct(Math.abs(obs.priceChange))} and average daily ${name} revenue ${revenueMove} (${money(revBefore)} → ${money(revAfter)}). ` +
        `After allowing for weather, events and reputation, customer numbers moved about ${Math.abs(obs.elasticity).toFixed(1)}% for each 1% price change — ` +
        (elastic ? 'demand looks price-sensitive (elastic).' : 'demand looks fairly insensitive to price (inelastic).'),
      concept: 'elasticity',
      weight: 9,
    });
  }

  // 2. Waste by product.
  let worst: { p: ProductId; rate: number; cost: number } | null = null;
  for (const p of PRODUCT_ORDER) {
    const baked = week.reduce((s, d) => s + d.products[p].baked, 0);
    const wasted = week.reduce((s, d) => s + d.products[p].wasted, 0);
    const cost = week.reduce((s, d) => s + d.products[p].wasteCost, 0);
    const rate = baked > 0 ? wasted / baked : 0;
    if (rate > 0.12 && (!worst || cost > worst.cost)) worst = { p, rate, cost };
  }
  if (worst) {
    out.push({
      title: 'Where the waste came from',
      body: `${pct(worst.rate)} of the ${PRODUCTS[worst.p].name.toLowerCase()}s you baked were thrown away this week, costing ${money(worst.cost)} in ingredients alone. Each extra unit has a marginal cost; it only pays if someone buys it.`,
      concept: 'marginalCost',
      weight: 6 + worst.rate * 10,
    });
  }

  // 3. Missed sales.
  let missedRevenue = 0;
  let missedUnits = 0;
  let topMiss: ProductId = 'sourdough';
  let topMissValue = 0;
  for (const p of PRODUCT_ORDER) {
    const value = week.reduce((s, d) => s + d.products[p].stockout * d.products[p].price, 0);
    missedRevenue += value;
    missedUnits += week.reduce((s, d) => s + d.products[p].stockout, 0);
    if (value > topMissValue) {
      topMissValue = value;
      topMiss = p;
    }
  }
  if (missedRevenue > 150) {
    const fullOven = week.filter((d) => d.ovenMinutesUsed >= d.ovenCapacity * 0.95).length;
    out.push({
      title: 'Customers you turned away',
      body:
        `${missedUnits} customers found empty shelves — about ${money(missedRevenue)} of sales, mostly ${PRODUCTS[topMiss].name.toLowerCase()}s. ` +
        (fullOven >= 3
          ? `Your oven was full on ${fullOven} days, so baking more of one product means less of another: that is opportunity cost.`
          : 'Your oven still had spare minutes on most days, so baking a little more was possible.'),
      concept: 'opportunityCost',
      weight: 5 + missedRevenue / 200,
    });
  }

  // 4. Profitability / break-even.
  if (inc.operatingProfit < 0) {
    const days = week.length;
    out.push({
      title: 'Below break-even',
      body: `Fixed costs of ${money(FIXED_COST_TOTAL)} a day (${money(FIXED_COST_TOTAL * days)} this week) were not covered: operating loss of ${money(inc.operatingProfit)}. Selling more of your highest-margin items, or pricing slightly higher where demand is inelastic, closes the gap.`,
      concept: 'breakEven',
      weight: 8,
    });
  } else {
    const m = margin(inc.operatingProfit, inc.revenue);
    out.push({
      title: 'Where each dollar went',
      body: `From every $1 of sales, ${pct(inc.cogs / inc.revenue)} went on ingredients and packaging, ${pct((inc.wages + inc.rent + inc.admin) / inc.revenue)} on fixed costs, and ${pct(m)} was left as operating profit.`,
      concept: 'margin',
      weight: 3,
    });
  }

  // 5. Liquidity.
  const runway = state.cash / FIXED_COST_TOTAL;
  if (runway < 3 || week.some((d) => d.overdraftDrawn > 0)) {
    out.push({
      title: 'Thin cash cushion',
      body: `You could cover only ${runway.toFixed(1)} days of fixed costs from cash. Profit is not the same as cash: money in ingredient stock or equipment cannot pay wages tomorrow.`,
      concept: 'liquidity',
      weight: 7,
    });
  }

  return out.sort((a, b) => b.weight - a.weight).slice(0, 2);
}
