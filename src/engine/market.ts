import { INGREDIENT_ORDER, SUPPLIER_ORDER, SUPPLIERS } from '../data/catalog';
import { clamp, isTet, yearDay } from './economy';
import { gaussian, rngFor } from './rng';
import type { ByIngredient, CoopId, IngredientId, MarketToday, Weather } from './types';

/** Calendar-driven weather so forecasts match what really happens. */
export function weatherFor(seed: number, day: number): Weather {
  if (day === 1) return 'sunny';
  const y = yearDay(day);
  if (y >= 5 && y <= 7) return 'rainy';
  if (y >= 14 && y <= 16) return 'hot';
  if (isTet(day)) return y % 2 ? 'sunny' : 'cool';
  const r = rngFor(seed, day, 3)();
  if (r < 0.32) return 'sunny';
  if (r < 0.58) return 'cloudy';
  if (r < 0.74) return 'rainy';
  if (r < 0.88) return 'hot';
  return 'cool';
}

/** Known price shocks in the calendar (relative to the normal market). */
export function shock(day: number, id: IngredientId): number {
  const y = yearDay(day);
  if ((id === 'coffee' || id === 'condensed') && y >= 6 && y <= 9) return id === 'coffee' ? 1.55 : 1.2;
  if (id === 'eggs' && y >= 8 && y <= 10) return 1.7;
  if (id === 'milk' && y >= 8 && y <= 10) return 1.15;
  if ((id === 'banana' || id === 'cream') && y >= 17 && y <= 19) return 0.78;
  if ((id === 'sugar' || id === 'coconut') && isTet(day)) return 1.2;
  return 1;
}

const COOP_LINK: Record<CoopId, IngredientId[]> = { coffee: ['coffee'], dairy: ['eggs', 'milk', 'butter', 'cream'], fruit: ['banana', 'kumquat', 'coconut'] };

export const COOPS: Record<CoopId, { name: string; vi: string; blurb: string }> = {
  coffee: { name: 'Highland Coffee Co-op', vi: 'HTX Cà phê', blurb: 'Earns more when coffee prices are high.' },
  dairy: { name: 'Mekong Dairy & Eggs', vi: 'HTX Sữa', blurb: 'Does well when eggs and milk are scarce.' },
  fruit: { name: 'Southern Fruit Growers', vi: 'HTX Trái cây', blurb: 'Steady, with good harvest years.' },
};

export function generateMarket(seed: number, day: number, prev: MarketToday | null): MarketToday {
  const rand = rngFor(seed, day, 5);
  const walk = {} as ByIngredient<number>;
  const prices = {} as ByIngredient<number>;
  for (const id of INGREDIENT_ORDER) {
    const before = prev?.walk[id] ?? 1;
    walk[id] = day === 1 ? 1 : clamp(before + 0.35 * (1 - before) + 0.045 * gaussian(rand), 0.82, 1.25);
    prices[id] = Math.round(walk[id] * shock(day, id) * 1000) / 1000;
  }
  const outOfStock: MarketToday['outOfStock'] = [];
  const stockRand = rngFor(seed, day, 9);
  for (const sup of SUPPLIER_ORDER) {
    for (const id of INGREDIENT_ORDER) if (stockRand() > SUPPLIERS[sup].reliability && day > 1) outOfStock.push({ supplier: sup, ingredient: id });
  }
  const coop = {} as Record<CoopId, number>;
  const cr = rngFor(seed, day, 13);
  for (const c of Object.keys(COOP_LINK) as CoopId[]) {
    const before = prev?.coop[c] ?? 20;
    const links = COOP_LINK[c];
    const priceMove = links.reduce((t, id) => t + (prices[id] - (prev?.prices[id] ?? prices[id])), 0) / links.length;
    const ret = day === 1 ? 0 : 0.003 + 0.03 * gaussian(cr) + 0.45 * priceMove;
    coop[c] = Math.round(clamp(before * (1 + ret), 6, 80) * 100) / 100;
  }
  const weather = weatherFor(seed, day);
  return { weather, tomorrow: weatherFor(seed, day + 1), prices, walk, outOfStock, coop, headline: headlineFor(day, weather) };
}

export function headlineFor(day: number, weather: Weather): string {
  const y = yearDay(day);
  if (y === 3 || y === 4 || y === 5) return 'Rumour at the market: the highland coffee harvest was poor.';
  if (y >= 6 && y <= 9) return 'Coffee beans cost a lot more this week.';
  if (y === 7) return 'Farmers up north worry about their hens.';
  if (y >= 8 && y <= 10) return 'Egg shortage! Prices are up about 70%.';
  if (y >= 17 && y <= 19) return 'Fruit season: bananas and cream are cheap.';
  if (y === 23) return 'Tết is tomorrow. The whole city is shopping.';
  if (isTet(day)) return 'Chúc mừng năm mới! Happy Lunar New Year.';
  if (day >= 15 && day <= 16) return 'A new bánh mì stand opened across the street.';
  if (weather === 'rainy') return 'Rain all day. Fewer people out walking.';
  if (weather === 'hot') return 'Scorcher today. Cold drinks will sell.';
  return 'A normal day on the lane.';
}
