import type { MarketEvent } from './types';

/**
 * Market events. Every event is announced in the morning paper before you plan,
 * so a good forecast is always possible — randomness creates decisions, not lotteries.
 */
export const EVENTS: MarketEvent[] = [
  {
    id: 'rain',
    headline: 'Steady rain all day',
    body: 'Fewer people walk past the shop. Those who come in want warm bread.',
    lesson: 'Demand shifts with conditions you cannot control. Bake less on slow days rather than fight it.',
    weight: 3,
    minDay: 2,
    effects: { forceWeather: 'rainy', demand: { sourdough: 1.15, matcha: 0.85 } },
    concept: 'supplyDemand',
  },
  {
    id: 'festival',
    headline: 'Street festival on Vielie Lane',
    body: 'Stalls and music outside your door. Expect a crowd of hungry visitors.',
    lesson: 'Demand is up for everything today. If your oven fills up, bake the products that earn the most per oven minute.',
    weight: 2,
    minDay: 3,
    effects: { demandAll: 1.45 },
    concept: 'opportunityCost',
  },
  {
    id: 'butter-shortage',
    headline: 'Dairy shortage hits wholesalers',
    body: 'A supply problem at regional dairies pushes butter prices sharply up.',
    lesson: 'When supply falls, prices rise. Butter-heavy croissants are now more expensive to make — check their margin.',
    weight: 2,
    minDay: 4,
    effects: { ingredientPrice: { butter: 1.6 } },
    concept: 'supplyDemand',
  },
  {
    id: 'viral-matcha',
    headline: 'Matcha cookies go viral',
    body: 'A local food video features green cookies. Everyone wants one today.',
    lesson: 'A demand spike for one product. Customers who come for cookies will buy them even at a higher price.',
    weight: 2,
    minDay: 5,
    effects: { demand: { matcha: 1.9 } },
    concept: 'elasticity',
  },
  {
    id: 'farmers-market',
    headline: "Farmers' market weekend",
    body: 'Growers bring cheap berries to town and shoppers are out early.',
    lesson: 'More supply of berries means lower prices. A good day to stock up — but berries spoil.',
    weight: 2,
    minDay: 5,
    effects: { demandAll: 1.15, ingredientPrice: { berries: 0.7 } },
    concept: 'inventory',
  },
  {
    id: 'energy-spike',
    headline: 'Energy prices double for a day',
    body: 'A grid problem sends electricity prices up. Every oven minute costs twice as much.',
    lesson: 'Energy is a variable cost: it grows with every item you bake. Solar or an efficient oven blunt the shock.',
    weight: 2,
    minDay: 6,
    effects: { energy: 2 },
    concept: 'variableCost',
  },
  {
    id: 'tourists',
    headline: 'Tour bus stops on Vielie Lane',
    body: 'A coach of visitors looking for pastries to eat on the go.',
    lesson: 'Tourists rarely compare prices. Croissants and muffins will sell fast.',
    weight: 2,
    minDay: 3,
    effects: { demand: { croissant: 1.5, muffin: 1.3 } },
    concept: 'supplyDemand',
  },
  {
    id: 'competitor-sale',
    headline: 'Crumb & Co. runs a 20% off sale',
    body: 'The new bakery down the street has cut its prices for the day.',
    lesson: 'When a competitor gets cheaper, your price looks higher by comparison. Price-sensitive customers drift away.',
    weight: 3,
    minDay: 22,
    effects: { competitorPrice: 0.8 },
    concept: 'elasticity',
  },
  {
    id: 'holiday',
    headline: 'Bank holiday weekend',
    body: 'Families are home and planning big breakfasts. Bread is in demand.',
    lesson: 'Holiday demand is predictable. Plan production up — but not so far that you are left with trays of waste.',
    weight: 1,
    minDay: 10,
    effects: { demandAll: 1.2, demand: { sourdough: 1.4 } },
    concept: 'supplyDemand',
  },
  {
    id: 'packaging-discount',
    headline: 'Packaging supplier clears stock',
    body: 'Your packaging supplier halves its prices for one day.',
    lesson: 'A lower variable cost raises the profit on every item sold today.',
    weight: 2,
    minDay: 4,
    effects: { packaging: 0.5 },
    concept: 'variableCost',
  },
  {
    id: 'harvest',
    headline: 'Bumper wheat harvest',
    body: 'Mills have more grain than they need. Flour is cheap today.',
    lesson: 'Flour keeps. Buying extra when it is cheap saves money later — but ties up cash today.',
    weight: 2,
    minDay: 3,
    effects: { ingredientPrice: { flour: 0.75 } },
    concept: 'opportunityCost',
  },
  {
    id: 'waste-story',
    headline: 'Paper runs story on food waste',
    body: 'The Vielie Gazette asks which local shops throw food away. Readers are paying attention.',
    lesson: 'Waste affects people outside your shop — an externality. Today, customers reward green shops and avoid wasteful ones.',
    weight: 2,
    minDay: 9,
    effects: { greenSpotlight: true },
    concept: 'externality',
  },
];

/** Events that always happen on a given day, to anchor the learning arc. */
export const SCHEDULED_EVENTS: Record<number, string> = {
  6: 'farmers-market',
  13: 'festival',
  20: 'waste-story',
  27: 'holiday',
};

export function getEvent(id: string | null): MarketEvent | null {
  if (!id) return null;
  return EVENTS.find((e) => e.id === id) ?? null;
}
