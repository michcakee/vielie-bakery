import { INGREDIENT_ORDER, SUPPLIER_ORDER, SUPPLIERS } from '../data/catalog';
import { dateOf, festivalsOn, isTetDay, type Season } from './calendar';
import { gaussian, rngFor } from './rng';
import { clamp } from './util';
import type { ActiveEffect, ByIngredient, CoopId, IngredientId, MarketToday, Weather } from './types';

const WEATHER_ODDS: Record<Season, [Weather, number][]> = {
  cool: [['sunny', 0.35], ['cloudy', 0.3], ['rainy', 0.1], ['hot', 0.05], ['cool', 0.2]],
  warm: [['sunny', 0.4], ['cloudy', 0.25], ['rainy', 0.12], ['hot', 0.18], ['cool', 0.05]],
  hot: [['sunny', 0.3], ['cloudy', 0.15], ['rainy', 0.25], ['hot', 0.3], ['cool', 0]],
  rainy: [['sunny', 0.2], ['cloudy', 0.25], ['rainy', 0.45], ['hot', 0.05], ['cool', 0.05]],
};

/** Seasonal weather, with the first year's story days fixed so forecasts match events. */
export function weatherFor(seed: number, day: number): Weather {
  if (day === 1) return 'sunny';
  if (day <= 35) {
    if (day >= 5 && day <= 7) return 'rainy';
    if (day >= 14 && day <= 16) return 'hot';
  }
  if (isTetDay(day)) return day % 2 ? 'sunny' : 'cool';
  const r = rngFor(seed, day, 3)();
  let acc = 0;
  for (const [w, p] of WEATHER_ODDS[dateOf(day).season]) {
    acc += p;
    if (r < acc) return w;
  }
  return 'cloudy';
}

/** Known price shocks: the first-year story, festival demand and event effects. */
export function shock(day: number, id: IngredientId, effects: ActiveEffect[] = []): number {
  let m = 1;
  if (day <= 35) {
    if (id === 'coffee' && day >= 6 && day <= 9) m *= 1.55;
    if (id === 'condensed' && day >= 6 && day <= 9) m *= 1.2;
    if (id === 'eggs' && day >= 8 && day <= 10) m *= 1.7;
    if (id === 'milk' && day >= 8 && day <= 10) m *= 1.15;
    if ((id === 'banana' || id === 'cream') && day >= 17 && day <= 19) m *= 0.78;
  }
  const f = festivalsOn(day);
  if ((id === 'sugar' || id === 'coconut') && (f.includes('tet') || f.includes('preTet'))) m *= 1.2;
  if (id === 'lotus' && f.includes('trungThu')) m *= 1.3;
  for (const e of effects) if (e.id === 'shock' && e.until >= day && e.data?.ingredient === id) m *= Number(e.data.mult ?? 1);
  return m;
}

const COOP_LINK: Record<CoopId, IngredientId[]> = { coffee: ['coffee'], dairy: ['eggs', 'milk', 'butter', 'cream'], fruit: ['banana', 'kumquat', 'coconut'] };

export const COOPS: Record<CoopId, { name: string; vi: string; blurb: string }> = {
  coffee: { name: 'Highland Coffee Co-op', vi: 'HTX Cà phê', blurb: 'Earns more when coffee prices are high.' },
  dairy: { name: 'Mekong Dairy & Eggs', vi: 'HTX Sữa', blurb: 'Does well when eggs and milk are scarce.' },
  fruit: { name: 'Southern Fruit Growers', vi: 'HTX Trái cây', blurb: 'Steady, with good harvest years.' },
};

export interface MarketOpts {
  priceIndex?: number;
  volatility?: number;
  effects?: ActiveEffect[];
}

export function generateMarket(seed: number, day: number, prev: MarketToday | null, opts: MarketOpts = {}): MarketToday {
  const priceIndex = opts.priceIndex ?? 1;
  const vol = opts.volatility ?? 1;
  const effects = opts.effects ?? [];
  const rand = rngFor(seed, day, 5);
  const walk = {} as ByIngredient<number>;
  const prices = {} as ByIngredient<number>;
  for (const id of INGREDIENT_ORDER) {
    const before = prev?.walk[id] ?? 1;
    walk[id] = day === 1 ? 1 : clamp(before + 0.35 * (1 - before) + 0.045 * vol * gaussian(rand), 0.78, 1.3);
    prices[id] = Math.round(walk[id] * shock(day, id, effects) * priceIndex * 1000) / 1000;
  }
  const outOfStock: MarketToday['outOfStock'] = [];
  const stockRand = rngFor(seed, day, 9);
  const disrupted = effects.some((e) => e.id === 'disruption' && e.until >= day);
  for (const sup of SUPPLIER_ORDER) {
    for (const id of INGREDIENT_ORDER) {
      const roll = stockRand();
      if (day > 1 && (roll > SUPPLIERS[sup].reliability || (disrupted && sup !== 'cho' && roll > 0.4))) outOfStock.push({ supplier: sup, ingredient: id });
    }
  }
  const coop = {} as Record<CoopId, number>;
  const cr = rngFor(seed, day, 13);
  for (const c of Object.keys(COOP_LINK) as CoopId[]) {
    const before = prev?.coop[c] ?? 20;
    const links = COOP_LINK[c];
    const priceMove = links.reduce((t, id) => t + (prices[id] - (prev?.prices[id] ?? prices[id])) / Math.max(0.5, priceIndex), 0) / links.length;
    const ret = day === 1 ? 0 : 0.0003 + 0.025 * vol * gaussian(cr) + 0.45 * priceMove;
    coop[c] = Math.round(clamp(before * (1 + ret), 4, 400) * 100) / 100;
  }
  const weather = weatherFor(seed, day);
  return { weather, tomorrow: weatherFor(seed, day + 1), prices, walk, outOfStock, coop, headline: headlineFor(day, weather, effects) };
}

export function headlineFor(day: number, weather: Weather, effects: ActiveEffect[] = []): string {
  if (day <= 35) {
    if (day >= 3 && day <= 5) return 'Rumour at the market: the highland coffee harvest was poor.';
    if (day >= 6 && day <= 9) return 'Coffee beans cost a lot more this week.';
    if (day >= 8 && day <= 10) return 'Egg shortage! Prices are up about 70%.';
    if (day >= 17 && day <= 19) return 'Fruit season: bananas and cream are cheap.';
    if (day >= 15 && day <= 16) return 'A new bánh mì stand opened across the street.';
  }
  const shockFx = effects.find((e) => e.id === 'shock' && e.until >= day);
  if (shockFx) return String(shockFx.data?.headline ?? 'Prices are jumping at the market.');
  if (effects.some((e) => e.id === 'disruption' && e.until >= day)) return 'Trucks are stuck: deliveries are patchy this week.';
  const f = festivalsOn(day);
  if (f.includes('preTet')) return 'Tết is coming. Everyone is shopping for gifts.';
  if (f.includes('tet')) return 'Chúc mừng năm mới! Happy Lunar New Year.';
  if (f.includes('trungThu')) return 'Mid-Autumn season: lanterns everywhere, and everyone wants mooncakes.';
  if (f.includes('vuLan')) return 'Vu Lan: families gather to honour their parents.';
  if (f.includes('nightMarket')) return 'The summer night market is on tonight.';
  if (weather === 'rainy') return 'Rain all day. Fewer people out walking.';
  if (weather === 'hot') return 'Scorcher today. Cold drinks will sell.';
  return 'A normal day on the lane.';
}
