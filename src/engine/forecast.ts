import { BAGUETTE, INGREDIENT_ORDER, PRODUCTS } from '../data/catalog';
import { DIFFICULTY } from '../data/config';
import { festivalsOn } from './calendar';
import { expectedUnits, fixedCosts, itemCost, onMenu, weekdayIndex } from './economy';
import { weatherFor } from './market';
import { rngFor } from './rng';
import type { GameState, IngredientId, ProductId } from './types';

export interface DayForecast {
  day: number;
  weather: ReturnType<typeof weatherFor>;
  festivals: string[];
  units: Partial<Record<ProductId, { mid: number; low: number; high: number }>>;
  revenue: number;
  profit: number;
}

/** Demand history for a product: what sold plus what people asked for and couldn't get (sales alone undercount demand). */
function demandHistory(s: GameState, p: ProductId): number[] {
  return s.history.slice(-14).map((h) => (h.sold[p] ?? 0) + (h.wished?.[p] ?? 0));
}

/**
 * Forecast the next `n` days by blending the model's expectation with recent history,
 * adjusted for weekday and known weather and festivals. The error band grows with difficulty.
 */
export function forecast(s: GameState, n = 7): DayForecast[] {
  const menu = onMenu(s);
  const err = DIFFICULTY[s.difficulty].forecastError;
  const out: DayForecast[] = [];
  const rand = rngFor(s.seed, s.day, 1201);
  for (let i = 0; i < n; i++) {
    const day = s.day + i;
    const weather = weatherFor(s.seed, day);
    const view: GameState = { ...s, day, market: { ...s.market, weather } };
    const fest = festivalsOn(day);
    const units: DayForecast['units'] = {};
    let revenue = 0;
    let contribution = 0;
    for (const p of onMenu(view)) {
      const model = expectedUnits(view, p, s.prices[p], onMenu(view));
      const hist = demandHistory(s, p);
      const sameWeekday = s.history.filter((h) => weekdayIndex(h.day) === weekdayIndex(day)).slice(-3);
      const histAvg = hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length : model;
      const wdAvg = sameWeekday.length ? sameWeekday.reduce((t, h) => t + (h.sold[p] ?? 0) + (h.wished?.[p] ?? 0), 0) / sameWeekday.length : histAvg;
      const w = Math.min(0.6, hist.length / 20);
      let mid = (1 - w) * model + w * (0.6 * histAvg + 0.4 * wdAvg);
      mid *= 1 + (rand() - 0.5) * err;
      const band = Math.max(1, mid * (err + 0.1));
      units[p] = { mid: Math.max(0, mid), low: Math.max(0, mid - band), high: mid + band };
      revenue += mid * s.prices[p];
      contribution += mid * (s.prices[p] - itemCost(s, p));
    }
    void menu;
    out.push({ day, weather, festivals: fest, units, revenue, profit: contribution - fixedCosts(s) });
  }
  return out;
}

/** Ingredients needed to cover a forecast, minus what's already in the pantry. */
export function ingredientsNeeded(s: GameState, f: DayForecast[]): Partial<Record<IngredientId, { need: number; have: number; short: number }>> {
  const need: Partial<Record<IngredientId, number>> = {};
  const add = (id: IngredientId, n: number) => (need[id] = (need[id] ?? 0) + n);
  for (const d of f) {
    for (const [p, u] of Object.entries(d.units) as [ProductId, { mid: number }][]) {
      const def = PRODUCTS[p];
      const items = Math.ceil(u.mid);
      if (def.kind === 'tray') {
        const trays = Math.ceil(items / def.yield);
        for (const [id, k] of Object.entries(def.recipe) as [IngredientId, number][]) add(id, k * trays);
      } else {
        for (const [id, k] of Object.entries(def.recipe) as [IngredientId, number][]) add(id, k * items);
        if (p === 'banhMi') for (const [id, k] of Object.entries(BAGUETTE.recipe) as [IngredientId, number][]) add(id, (k * items) / BAGUETTE.yield);
      }
    }
  }
  const out: ReturnType<typeof ingredientsNeeded> = {};
  for (const id of INGREDIENT_ORDER) {
    const n = need[id];
    if (!n) continue;
    const have = s.pantry[id].qty + s.deliveries.filter((d) => d.ingredient === id).reduce((t, d) => t + d.packs, 0);
    out[id] = { need: Math.ceil(n), have, short: Math.max(0, Math.ceil(n - have)) };
  }
  return out;
}

/** Trays to bake today so the case roughly matches tomorrow's forecast (used by the autopilot). */
export function suggestedTrays(s: GameState): Partial<Record<ProductId | 'baguette', number>> {
  const f = forecast(s, 1)[0];
  const out: Partial<Record<ProductId | 'baguette', number>> = {};
  for (const [p, u] of Object.entries(f.units) as [ProductId, { mid: number }][]) {
    const def = PRODUCTS[p];
    if (def.kind === 'tray') out[p] = Math.max(0, Math.ceil((u.mid * 1.05 - s.display[p].qty) / def.yield));
    if (p === 'banhMi') out.baguette = Math.max(0, Math.ceil((u.mid * 1.1 - s.baguettes.qty) / BAGUETTE.yield));
  }
  return out;
}
