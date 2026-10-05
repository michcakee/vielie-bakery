import { PRODUCTS, PRODUCT_ORDER, WEATHER } from '../data/catalog';
import { incomeStatement, productTotals, sumBooks } from './accounting';
import { dateOf } from './calendar';
import { fixedCosts, itemCost, onMenu } from './economy';
import { REGIMES } from './macro';
import type { DaySummary, Decision, GameState, ProductId } from './types';

export type Period = 'day' | 'week' | 'month' | 'year';

export interface PeriodRow {
  label: string;
  startDay: number;
  revenue: number;
  profit: number;
  cash: number;
  served: number;
  customers: number;
  lost: number;
  units: Partial<Record<ProductId, number>>;
}

/** Roll daily history up into weeks, months or years for charts. */
export function rollUp(history: DaySummary[], period: Period): PeriodRow[] {
  const key = (d: DaySummary) => {
    const g = dateOf(d.day);
    if (period === 'day') return `D${d.day}`;
    if (period === 'week') return `W${Math.ceil(d.day / 7)}`;
    if (period === 'month') return `Y${g.year} M${g.month}`;
    return `Year ${g.year}`;
  };
  const rows = new Map<string, PeriodRow>();
  for (const d of history) {
    const k = key(d);
    const r = rows.get(k) ?? { label: k, startDay: d.day, revenue: 0, profit: 0, cash: 0, served: 0, customers: 0, lost: 0, units: {} };
    r.revenue += d.revenue;
    r.profit += d.profit;
    r.cash = d.cash;
    r.served += d.served;
    r.customers += d.customers;
    r.lost += d.lost;
    for (const p of PRODUCT_ORDER) if (d.sold[p]) r.units[p] = (r.units[p] ?? 0) + d.sold[p];
    rows.set(k, r);
  }
  return [...rows.values()];
}

// ---------------------------------------------------------------- products

export interface ProductRow {
  p: ProductId;
  units: number;
  revenue: number;
  cogs: number;
  contribution: number;
  margin: number;
  perUnit: number;
  /** Contribution per oven tray: the scarce resource for baked goods. */
  perTray: number | null;
  /** Contribution per minute of counter labour: the scarce resource for made-to-order items. */
  perLaborMinute: number;
}

export function productTable(history: DaySummary[]): ProductRow[] {
  const totals = productTotals(history);
  return PRODUCT_ORDER.filter((p) => totals[p].units > 0)
    .map((p) => {
      const t = totals[p];
      const def = PRODUCTS[p];
      const contribution = t.revenue - t.cogs;
      const perUnit = t.units ? contribution / t.units : 0;
      return {
        p,
        units: t.units,
        revenue: t.revenue,
        cogs: t.cogs,
        contribution,
        margin: t.revenue ? contribution / t.revenue : 0,
        perUnit,
        perTray: def.kind === 'tray' ? perUnit * def.yield : null,
        perLaborMinute: perUnit / (def.kind === 'tray' ? def.labor / def.yield : def.labor),
      };
    })
    .sort((a, b) => b.contribution - a.contribution);
}

// ---------------------------------------------------------------- break-even

export interface BreakEven {
  fixed: number;
  avgPrice: number;
  avgVariable: number;
  contribution: number;
  units: number | null;
  revenue: number | null;
  currentUnits: number;
}

export interface BreakEvenTweaks {
  pricePct?: number;
  wagePct?: number;
  rentPct?: number;
  ingredientPct?: number;
}

/** Break-even per day with the current product mix, with optional "what if" tweaks. */
export function breakEven(s: GameState, tweaks: BreakEvenTweaks = {}): BreakEven {
  const recent = s.history.slice(-14);
  const totals = productTotals(recent);
  const menu = onMenu(s);
  let units = 0;
  let rev = 0;
  let varCost = 0;
  for (const p of PRODUCT_ORDER) {
    const u = totals[p].units || (menu.includes(p) && !recent.length ? 10 : 0);
    if (!u) continue;
    units += u;
    rev += u * s.prices[p];
    varCost += u * itemCost(s, p);
  }
  const avgPrice = units ? (rev / units) * (1 + (tweaks.pricePct ?? 0)) : 0;
  const avgVariable = units ? (varCost / units) * (1 + (tweaks.ingredientPct ?? 0)) : 0;
  const base = fixedCosts(s);
  const rentShare = s.history.length ? sumBooks(recent).rent / Math.max(1, recent.length) : 0;
  const wageShare = s.history.length ? sumBooks(recent).wages / Math.max(1, recent.length) : 0;
  const fixed = base + rentShare * (tweaks.rentPct ?? 0) + wageShare * (tweaks.wagePct ?? 0);
  const contribution = avgPrice - avgVariable;
  const beUnits = contribution > 0 ? fixed / contribution : null;
  const days = Math.max(1, recent.length);
  return { fixed, avgPrice, avgVariable, contribution, units: beUnits, revenue: beUnits !== null ? beUnits * avgPrice : null, currentUnits: units / days };
}

// ---------------------------------------------------------------- why did this happen?

export function explainChange(now: DaySummary[], before: DaySummary[]): string[] {
  if (!now.length || !before.length) return [];
  const avg = (xs: DaySummary[], f: (d: DaySummary) => number) => xs.reduce((t, d) => t + f(d), 0) / xs.length;
  const revNow = avg(now, (d) => d.revenue);
  const revBefore = avg(before, (d) => d.revenue);
  const change = revBefore ? revNow / revBefore - 1 : 0;
  const out: { size: number; text: string }[] = [];
  const pct = (v: number) => `${Math.abs(v * 100).toFixed(0)}%`;
  out.push({ size: Infinity, text: `Sales ${change >= 0 ? 'rose' : 'fell'} ${pct(change)}: $${revBefore.toFixed(0)} → $${revNow.toFixed(0)} a day.` });

  const custNow = avg(now, (d) => d.customers + d.diverted);
  const custBefore = avg(before, (d) => d.customers + d.diverted);
  if (custBefore && Math.abs(custNow / custBefore - 1) > 0.05) {
    // Only name the causes that push the same way as the change.
    const up = custNow > custBefore;
    const rain = now.filter((d) => d.weather === 'rainy').length - before.filter((d) => d.weather === 'rainy').length;
    const weather = avg(now, (d) => WEATHER[d.weather]?.traffic ?? 1) / Math.max(0.01, avg(before, (d) => WEATHER[d.weather]?.traffic ?? 1)) - 1;
    const conf = avg(now, (d) => d.confidence) - avg(before, (d) => d.confidence);
    const repDiff = avg(now, (d) => d.reputation) - avg(before, (d) => d.reputation);
    const reasons: string[] = [];
    if (Math.abs(weather) > 0.03 && (weather > 0) === up) reasons.push(up ? 'better weather' : rain > 0 ? `${rain} more rainy day${rain > 1 ? 's' : ''}` : 'worse weather');
    if (Math.abs(conf) > 3 && (conf > 0) === up) reasons.push(up ? 'a more confident economy' : 'shoppers feeling less confident about the economy');
    if (Math.abs(repDiff) > 2 && (repDiff > 0) === up) reasons.push(up ? 'a better reputation' : 'a weaker reputation');
    out.push({ size: Math.abs(custNow - custBefore) * 5, text: `Foot traffic ${custNow > custBefore ? 'up' : 'down'} ${pct(custNow / custBefore - 1)}${reasons.length ? `, from ${reasons.join(', ')}` : ''}.` });
  }
  const divNow = avg(now, (d) => d.diverted);
  const divBefore = avg(before, (d) => d.diverted);
  if (Math.abs(divNow - divBefore) >= 1) out.push({ size: Math.abs(divNow - divBefore) * 6, text: `${divNow > divBefore ? 'More' : 'Fewer'} shoppers went to rival bakeries: ${divBefore.toFixed(1)} → ${divNow.toFixed(1)} a day.` });

  for (const p of PRODUCT_ORDER) {
    const uNow = avg(now, (d) => d.sold[p] ?? 0);
    const uBefore = avg(before, (d) => d.sold[p] ?? 0);
    const priceNow = avg(now, (d) => d.prices?.[p] ?? 0);
    const priceBefore = avg(before, (d) => d.prices?.[p] ?? 0);
    const volumeEffect = (uNow - uBefore) * priceBefore;
    const priceEffect = (priceNow - priceBefore) * uNow;
    if (Math.abs(volumeEffect) + Math.abs(priceEffect) < Math.max(4, revBefore * 0.03)) continue;
    let text = `${PRODUCTS[p].name}: ${uBefore.toFixed(1)} → ${uNow.toFixed(1)} sold a day`;
    if (Math.abs(priceNow - priceBefore) > 0.01) text += ` after you moved the price from $${priceBefore.toFixed(2)} to $${priceNow.toFixed(2)} (price effect ${priceEffect >= 0 ? '+' : '−'}$${Math.abs(priceEffect).toFixed(0)}/day, volume effect ${volumeEffect >= 0 ? '+' : '−'}$${Math.abs(volumeEffect).toFixed(0)}/day)`;
    out.push({ size: Math.abs(volumeEffect) + Math.abs(priceEffect), text: `${text}.` });
  }
  const lostNow = avg(now, (d) => d.lostSoldOut);
  const lostBefore = avg(before, (d) => d.lostSoldOut);
  if (lostNow - lostBefore > 1) out.push({ size: (lostNow - lostBefore) * 6, text: `More empty shelves: ${lostNow.toFixed(1)} people a day asked for something you'd run out of.` });
  const slowNow = avg(now, (d) => d.lostSlow);
  const slowBefore = avg(before, (d) => d.lostSlow);
  if (slowNow - slowBefore > 1) out.push({ size: (slowNow - slowBefore) * 6, text: `Longer queues: ${slowNow.toFixed(1)} people a day gave up waiting.` });
  if (now[now.length - 1].priceIndex / before[0].priceIndex > 1.01) out.push({ size: 1, text: `Prices across the economy rose ${pct(now[now.length - 1].priceIndex / before[0].priceIndex - 1)} (inflation), so ingredients cost more.` });
  return out
    .sort((a, b) => b.size - a.size)
    .slice(0, 6)
    .map((o) => o.text);
}

export function explainProfit(now: DaySummary[], before: DaySummary[]): string[] {
  if (!now.length || !before.length) return [];
  const a = incomeStatement(sumBooks(now));
  const b = incomeStatement(sumBooks(before));
  const per = (v: number, n: number) => v / n;
  const lines: { size: number; text: string }[] = [];
  const diff = (label: string, x: number, y: number, cost = false) => {
    const d = per(x, now.length) - per(y, before.length);
    if (Math.abs(d) < 2) return;
    const good = cost ? d < 0 : d > 0;
    lines.push({ size: Math.abs(d), text: `${label} ${d > 0 ? 'up' : 'down'} $${Math.abs(d).toFixed(0)} a day (${good ? 'helps' : 'hurts'} profit).` });
  };
  diff('Gross profit', a.grossProfit, b.grossProfit);
  for (const l of a.opexLines) {
    const prev = b.opexLines.find((x) => x.key === l.key)?.value ?? 0;
    diff(l.label, l.value, prev, true);
  }
  diff('Interest', a.interest, b.interest, true);
  return lines.sort((x, y) => y.size - x.size).slice(0, 5).map((l) => l.text);
}

// ---------------------------------------------------------------- decision journal

export function metricFor(history: DaySummary[], d: Decision): number {
  if (!history.length) return 0;
  const avg = (f: (h: DaySummary) => number) => history.reduce((t, h) => t + f(h), 0) / history.length;
  switch (d.metric) {
    case 'units':
      return d.product ? avg((h) => h.sold[d.product!] ?? 0) : avg((h) => h.served);
    case 'revenue':
      return d.product ? avg((h) => h.revenueBy?.[d.product!] ?? 0) : avg((h) => h.revenue);
    case 'profit':
      return avg((h) => h.profit);
    case 'customers':
      return avg((h) => h.served);
    case 'cash':
      return history[history.length - 1].cash;
  }
}

/** A week after each decision, compare the metric it was meant to move. */
export function settleDecisions(s: GameState): Decision[] {
  return s.decisions.map((d) => {
    if (d.after !== undefined || s.day - d.day < 7) return d;
    const window = s.history.filter((h) => h.day >= d.day && h.day < d.day + 7);
    if (window.length < 5) return d;
    const after = metricFor(window, d);
    const change = d.before ? after / d.before - 1 : 0;
    const label = d.metric === 'units' ? 'units a day' : d.metric === 'customers' ? 'customers a day' : `${d.metric} a day`;
    const fmt = (v: number) => (d.metric === 'units' || d.metric === 'customers' ? v.toFixed(1) : `$${v.toFixed(0)}`);
    const verdict = Math.abs(change) < 0.03 ? `Little change: ${label} ${fmt(d.before)} → ${fmt(after)}.` : `${label.charAt(0).toUpperCase()}${label.slice(1)} ${change > 0 ? 'rose' : 'fell'} ${Math.abs(change * 100).toFixed(0)}%: ${fmt(d.before)} → ${fmt(after)}.`;
    return { ...d, after, verdict };
  });
}

export function marketCondition(s: GameState): { title: string; text: string } {
  const r = REGIMES[s.macro.regime];
  return { title: r.name, text: r.forYou };
}

export const weatherName = (w: DaySummary['weather']) => WEATHER[w].name;
