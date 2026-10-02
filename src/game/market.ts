import {
  DEMAND_NOISE,
  EVENT_CHANCE,
  INGREDIENTS,
  INGREDIENT_ORDER,
  PREFERENCE,
  PRICE_MEAN_REVERSION,
  PRODUCT_ORDER,
  UNLOCKS,
  WEATHER,
} from '../config/balance';
import { EVENTS, SCHEDULED_EVENTS, getEvent } from './events';
import { gaussian, rngFor } from './rng';
import type { ByIngredient, ByProduct, MarketDay, Weather } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function pickWeather(rand: () => number): Weather {
  const r = rand();
  if (r < WEATHER.sunny.chance) return 'sunny';
  if (r < WEATHER.sunny.chance + WEATHER.cloudy.chance) return 'cloudy';
  return 'rainy';
}

function pickEvent(day: number, rand: () => number): string | null {
  if (SCHEDULED_EVENTS[day]) return SCHEDULED_EVENTS[day];
  if (day === 1) return null;
  if (rand() > EVENT_CHANCE) return null;
  // Scheduled events are not drawn randomly, to avoid repeats.
  const scheduled = new Set(Object.values(SCHEDULED_EVENTS));
  const pool = EVENTS.filter((e) => e.minDay <= day && !scheduled.has(e.id));
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = rand() * total;
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) return e.id;
  }
  return pool[pool.length - 1]?.id ?? null;
}

/**
 * Generate the market for `day`. Deterministic for a given seed and previous day.
 * Ingredient prices follow a mean-reverting random walk around their base price;
 * the event multiplier is applied on top for that day only.
 */
export function generateMarket(seed: number, day: number, prev: MarketDay | null): MarketDay {
  const rand = rngFor(seed, day);
  const eventId = pickEvent(day, rand);
  const event = getEvent(eventId);

  let weather = pickWeather(rand);
  if (event?.effects.forceWeather) weather = event.effects.forceWeather;

  const ingredientPrices = {} as ByIngredient<number>;
  for (const id of INGREDIENT_ORDER) {
    const cfg = INGREDIENTS[id];
    // Underlying (event-free) price is yesterday's price with yesterday's event removed.
    const prevEvent = getEvent(prev?.eventId ?? null);
    const prevUnderlying = prev
      ? prev.ingredientPrices[id] / (prevEvent?.effects.ingredientPrice?.[id] ?? 1)
      : cfg.basePrice;
    const drift = PRICE_MEAN_REVERSION * (cfg.basePrice - prevUnderlying);
    const shock = prevUnderlying * cfg.volatility * gaussian(rand);
    const underlying = clamp(prevUnderlying + drift + shock, cfg.basePrice * 0.7, cfg.basePrice * 1.4);
    const mult = event?.effects.ingredientPrice?.[id] ?? 1;
    ingredientPrices[id] = round2(underlying * mult, id === 'matcha' ? 3 : 2);
  }

  const preference = {} as ByProduct<number>;
  const noise = {} as ByProduct<number>;
  for (const id of PRODUCT_ORDER) {
    const p = prev?.preference[id] ?? 1;
    const next = p + PREFERENCE.reversion * (1 - p) + PREFERENCE.volatility * gaussian(rand);
    preference[id] = round2(clamp(next, PREFERENCE.min, PREFERENCE.max), 3);
    noise[id] = 1 + (rand() * 2 - 1) * DEMAND_NOISE;
  }

  return {
    day,
    weather,
    ingredientPrices,
    preference,
    noise,
    eventId,
    competitorActive: day >= UNLOCKS.competition,
  };
}

function round2(v: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
