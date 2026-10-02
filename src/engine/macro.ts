import { DIFFICULTY, ECON, type Difficulty } from '../data/config';
import { clamp } from './util';
import { gaussian, rngFor } from './rng';
import type { MacroState, Regime } from './types';

export const REGIMES: Record<Regime, { name: string; vi: string; blurb: string; forYou: string }> = {
  normal: { name: 'Steady economy', vi: 'Ổn định', blurb: 'Prices creep up slowly, jobs are plentiful.', forYou: 'A good time to plan, invest and grow at your own pace.' },
  boom: { name: 'Boom', vi: 'Tăng trưởng', blurb: 'People feel rich and spend freely, but workers are hard to find.', forYou: 'More customers who\'ll pay more. Wages and rents climb.' },
  recession: { name: 'Recession', vi: 'Suy thoái', blurb: 'Layoffs, careful shoppers, cheaper loans.', forYou: 'Fewer customers and more price-sensitive ones. Hiring and borrowing are cheaper.' },
  inflation: { name: 'High inflation', vi: 'Lạm phát cao', blurb: 'Prices are rising fast and the central bank is raising rates.', forYou: 'Ingredients and wages keep getting dearer. Raise prices carefully; loans cost more.' },
};

export function createMacro(regime: Regime = 'normal'): MacroState {
  const t = ECON.macro.targets[regime];
  return {
    regime,
    monthsInRegime: 0,
    inflation: t.inflation,
    rate: t.rate,
    unemployment: t.unemployment,
    confidence: t.confidence,
    priceIndex: 1,
    wageIndex: 1,
    incomeIndex: 1,
    rentIndex: 1,
    growth: t.growth,
    history: [],
  };
}

/** A Markov chain: regimes are sticky, and bad ones are likelier on harder difficulties. */
export function nextRegime(m: MacroState, rand: () => number, difficulty: Difficulty, lockedMonths = 0): Regime {
  if (m.monthsInRegime < lockedMonths) return m.regime;
  const d = DIFFICULTY[difficulty];
  if (rand() < d.regimeStay) return m.regime;
  const weights: Record<Regime, number> =
    m.regime === 'normal'
      ? { normal: 0, boom: 1, recession: 0.6 * d.badRegimeWeight, inflation: 0.5 * d.badRegimeWeight }
      : m.regime === 'boom'
        ? { normal: 1.2, boom: 0, recession: 0.3 * d.badRegimeWeight, inflation: 0.6 * d.badRegimeWeight }
        : { normal: 1.5, boom: 0.3, recession: m.regime === 'recession' ? 0 : 0.4 * d.badRegimeWeight, inflation: m.regime === 'inflation' ? 0 : 0.3 * d.badRegimeWeight };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (const [k, w] of Object.entries(weights) as [Regime, number][]) {
    r -= w;
    if (r <= 0) return k;
  }
  return 'normal';
}

/** Monthly: maybe switch regime, then pull indicators toward that regime's targets. */
export function monthlyMacro(m: MacroState, seed: number, day: number, difficulty: Difficulty, lockedMonths = 0): MacroState {
  const rand = rngFor(seed, day, 401);
  const regime = nextRegime(m, rand, difficulty, lockedMonths);
  const t = ECON.macro.targets[regime];
  const k = ECON.macro.adjust;
  const vol = DIFFICULTY[difficulty].priceVolatility;
  const noise = () => gaussian(rand) * 0.15 * vol;
  const next: MacroState = {
    ...m,
    regime,
    monthsInRegime: regime === m.regime ? m.monthsInRegime + 1 : 0,
    inflation: clamp(m.inflation + k * (t.inflation - m.inflation) + noise() * 0.01, -0.02, 0.2),
    rate: clamp(m.rate + k * (t.rate - m.rate) + noise() * 0.004, 0.005, 0.15),
    unemployment: clamp(m.unemployment + k * (t.unemployment - m.unemployment) + noise() * 0.004, 0.02, 0.15),
    confidence: clamp(m.confidence + k * (t.confidence - m.confidence) + noise() * 6, 10, 95),
    growth: clamp(m.growth + k * (t.growth - m.growth) + noise() * 0.01, -0.12, 0.12),
  };
  next.history = [...m.history, { day, regime, inflation: next.inflation, rate: next.rate, unemployment: next.unemployment, confidence: next.confidence, priceIndex: m.priceIndex }].slice(-60);
  return next;
}

/** Daily: prices, wages and incomes drift with inflation and growth. */
export function dailyMacro(m: MacroState): MacroState {
  const daily = m.inflation / 360;
  const tightness = clamp((0.05 - m.unemployment) * 2, -0.06, 0.06);
  return {
    ...m,
    priceIndex: m.priceIndex * (1 + daily),
    wageIndex: m.wageIndex * (1 + daily + tightness / 360),
    incomeIndex: m.incomeIndex * (1 + daily + m.growth / 360),
  };
}

/** How busy the streets are, from 0.7 (gloomy) to 1.3 (euphoric). */
export const trafficFactor = (m: MacroState) => 0.7 + 0.6 * (m.confidence / 100);

/** Real spending power relative to the start of the game. */
export const spendingFactor = (m: MacroState) => m.incomeIndex / Math.max(0.5, m.priceIndex);

/** Recessions make shoppers pickier about price. */
export const priceSensitivity = (m: MacroState) => (m.regime === 'recession' ? 1.2 : m.regime === 'inflation' ? 1.1 : m.regime === 'boom' ? 0.92 : 1);

export function macroHeadline(m: MacroState): string {
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  return `${REGIMES[m.regime].name}: inflation ${pct(m.inflation)}, interest ${pct(m.rate)}, unemployment ${pct(m.unemployment)}.`;
}
