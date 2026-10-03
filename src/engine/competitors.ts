import { PRODUCTS, PRODUCT_ORDER } from '../data/catalog';
import { DIFFICULTY, ECON } from '../data/config';
import { COMPETITOR_SEEDS, LOCATIONS } from '../data/world';
import { incomeStatement, sumBooks } from './accounting';
import { activeRivals, expectedQuality, marketTraffic, playerShare } from './economy';
import { rngFor } from './rng';
import { round2 } from './util';
import type { Competitor, GameState, LocationId, ProductId } from './types';

export function seedCompetitors(location: LocationId, extra: string[] = []): Competitor[] {
  return COMPETITOR_SEEDS.filter((c) => c.location === location || extra.includes(c.id) || c.location !== location).map((c) => ({
    id: c.id,
    name: c.name,
    location: extra.includes(c.id) ? location : c.location,
    strategy: c.strategy,
    prices: { ...c.products },
    quality: c.quality,
    reputation: c.reputation,
    marketing: c.marketing,
    cash: c.cash,
    openedDay: extra.includes(c.id) ? 0 : c.opensDay,
    closedDay: null,
    share: 0,
    lastMove: c.blurb,
  }));
}

const NEW_NAMES = ['Two Brothers Bánh Mì', 'The New Bakery', 'Phin & Bánh', 'Lucky Bakery', 'Bánh Mì 24h', 'Golden Lotus Café'];

/** A rival's share of shoppers for one product (the mirror of the player's logit share). */
export function rivalShare(s: GameState, c: Competitor, p: ProductId): number {
  if (c.prices[p] === undefined) return 0;
  const rivals = activeRivals(s, c.location).filter((r) => r.prices[p] !== undefined);
  const mine = s.location === c.location ? playerShare(s, p, { walkIn: false }) : 0;
  return rivals.length ? (1 - mine) / rivals.length : 0;
}

function topSeller(s: GameState): ProductId | null {
  const totals = PRODUCT_ORDER.map((p) => ({ p, n: s.history.slice(-14).reduce((t, h) => t + (h.sold[p] ?? 0), 0) }));
  totals.sort((a, b) => b.n - a.n);
  return totals[0]?.n > 0 ? totals[0].p : null;
}

/** Weekly: rivals near you respond to your prices and products. */
export function reactWeekly(s: GameState): { competitors: Competitor[]; news: string[] } {
  const rand = rngFor(s.seed, s.day, 601);
  const aggression = DIFFICULTY[s.difficulty].competitorAggression;
  const news: string[] = [];
  const competitors = s.competitors.map((c) => {
    if (c.closedDay !== null || c.openedDay > s.day || c.location !== s.location) return c;
    const next: Competitor = { ...c, prices: { ...c.prices } };
    const floor = (p: ProductId) => round2(PRODUCTS[p].ref * s.macro.priceIndex * 0.55);
    if (rand() > 0.35 * aggression + 0.25) return next;
    const overlap = (Object.keys(c.prices) as ProductId[]).filter((p) => s.menu.includes(p));
    switch (c.strategy) {
      case 'discount': {
        for (const p of overlap) {
          if (s.prices[p] < c.prices[p]! * 1.02) {
            next.prices[p] = Math.max(floor(p), round2(s.prices[p] * 0.96));
            news.push(`${c.name} cut ${PRODUCTS[p].name} to $${next.prices[p]!.toFixed(2)} to match you.`);
          }
        }
        break;
      }
      case 'matcher':
        for (const p of overlap) {
          if (Math.abs(s.prices[p] - c.prices[p]!) > 0.2) {
            next.prices[p] = Math.max(floor(p), round2(s.prices[p]));
            news.push(`${c.name} changed ${PRODUCTS[p].name} to $${next.prices[p]!.toFixed(2)}, the same as you.`);
          }
        }
        break;
      case 'premium': {
        const mine = overlap.length ? overlap.reduce((t, p) => t + expectedQuality(s, p), 0) / overlap.length : 0;
        if (mine > next.quality && next.cash > 0) {
          next.quality = Math.min(95, next.quality + 2);
          next.cash -= 1500;
          news.push(`${c.name} is investing in better ingredients.`);
        }
        break;
      }
      case 'copycat': {
        const top = topSeller(s);
        if (top && c.prices[top] === undefined && !PRODUCTS[top].season) {
          next.prices[top] = round2(Math.max(floor(top), s.prices[top] * 0.94));
          news.push(`${c.name} started selling ${PRODUCTS[top].name}, just below your price.`);
        }
        break;
      }
      case 'chain':
        next.marketing = Math.min(1, next.marketing + 0.02);
        break;
    }
    if (news.length) next.lastMove = news[news.length - 1];
    return next;
  });
  return { competitors, news };
}

/** Monthly: rivals earn or lose money, follow inflation, and may close. New ones may open where profits are fat. */
export function monthlyCompetition(s: GameState): { competitors: Competitor[]; news: string[] } {
  const rand = rngFor(s.seed, s.day, 603);
  const news: string[] = [];
  const monthlyInfl = s.macro.inflation / 12;
  let competitors = s.competitors.map((c) => {
    if (c.closedDay !== null || c.openedDay > s.day) return c;
    const traffic = marketTraffic(s, c.location);
    const products = Object.keys(c.prices) as ProductId[];
    const share = products.length ? products.reduce((t, p) => t + rivalShare(s, c, p), 0) / products.length : 0;
    const avgPrice = products.length ? products.reduce((t, p) => t + c.prices[p]!, 0) / products.length : 5;
    const profit = 30 * (traffic * share * avgPrice * 0.3 - LOCATIONS[c.location].rent * 0.9);
    const prices: Competitor['prices'] = {};
    for (const p of products) prices[p] = round2(c.prices[p]! * (1 + monthlyInfl));
    const next: Competitor = { ...c, prices, share, cash: c.cash + profit };
    if (next.cash < ECON.competition.exitCash) {
      next.closedDay = s.day;
      news.push(`${c.name} has closed down. Their customers are looking for a new favourite.`);
    }
    return next;
  });

  const last30 = s.history.slice(-30);
  if (last30.length >= 20) {
    const is = incomeStatement(sumBooks(last30));
    const margin = is.revenue > 0 ? is.operatingProfit / is.revenue : 0;
    const shareNow = last30.reduce((t, h) => t + h.share, 0) / last30.length;
    const rivalsHere = competitors.filter((c) => c.location === s.location && c.closedDay === null && c.openedDay <= s.day).length;
    if (margin > ECON.competition.entryMargin && shareNow > ECON.competition.entryShare && rivalsHere < 4 && rand() < ECON.competition.entryChance * DIFFICULTY[s.difficulty].competitorAggression) {
      const top = topSeller(s) ?? 'banhMi';
      const name = NEW_NAMES[Math.floor(rand() * NEW_NAMES.length)];
      if (!competitors.some((c) => c.name === name && c.closedDay === null)) {
        competitors = [
          ...competitors,
          {
            id: `new${s.day}`,
            name,
            location: s.location,
            strategy: rand() < 0.5 ? 'discount' : 'copycat',
            prices: { [top]: round2(s.prices[top] * 0.92), caPhe: round2(s.prices.caPhe * 0.95) },
            quality: 60,
            reputation: 45,
            marketing: 0.5,
            cash: 12000,
            openedDay: s.day,
            closedDay: null,
            share: 0,
            lastMove: 'Saw how well you were doing and opened nearby.',
          },
        ];
        news.push(`${name} opened near you. Your profits attracted competition.`);
      }
    }
  }
  return { competitors, news };
}
