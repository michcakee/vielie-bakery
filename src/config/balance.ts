/**
 * VIELIE BAKERY — BALANCE CONFIGURATION
 *
 * Every number that shapes the economy lives here. UI components never
 * hard-code economic values; they read them from this file (directly or via
 * the game modules). See docs/ECONOMIC_MODEL.md for the reasoning behind them.
 */
import type {
  IngredientId,
  InvestmentId,
  PackagingId,
  ProductId,
  SourcingId,
  Weather,
} from '../game/types';

export const GAME_LENGTH_DAYS = 30;
export const STARTING_CASH = 2500;
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Foot traffic by weekday (index 0 = Monday). Day 1 of the game is a Monday. */
export const WEEKDAY_TRAFFIC = [0.9, 0.9, 0.95, 1.0, 1.1, 1.3, 1.15];

/** Features unlock gradually so new players are not overwhelmed. */
export const UNLOCKS = {
  pricing: 8, // Week 2: pricing and demand
  finance: 15, // Week 3: investment and loans
  competition: 22, // Week 4: competitor + sourcing choice
} as const;

export const WEEK_THEMES = [
  { title: 'Week 1: Learning the ovens', focus: 'Bake enough, but not too much. Watch what goes to waste.' },
  { title: 'Week 2: Pricing and demand', focus: 'You can now set prices. Every price change moves demand.' },
  { title: 'Week 3: Investment and finance', focus: 'Equipment and loans unlock. Spend money now to save money later?' },
  { title: 'Week 4: Competition and sustainability', focus: 'Crumb & Co. opens nearby. Price, quality and reputation all matter.' },
  { title: 'Final days', focus: 'Finish strong. Your 30-day business profile is close.' },
];

// ---------------------------------------------------------------- products

export interface ProductConfig {
  id: ProductId;
  name: string;
  shortName: string;
  /** Reference price: the price customers consider "normal". Demand = baseDemand at this price. */
  refPrice: number;
  minPrice: number;
  maxPrice: number;
  /** Customers per day at the reference price on an average day. */
  baseDemand: number;
  /** Price elasticity of demand. -0.7 means a 10% price rise loses ~7% of customers. */
  elasticity: number;
  /** Oven minutes needed per unit. Oven time is the bakery's scarce resource. */
  ovenMinutes: number;
  /** Ingredient quantities per unit (in each ingredient's unit). */
  recipe: Partial<Record<IngredientId, number>>;
  /** Small pantry items (salt, sugar, oats, eggs) bought automatically, per unit. */
  pantryCost: number;
  /** Days a unit can be sold. Sourdough keeps a second day as discounted "day-old" bread. */
  shelfLifeDays: number;
  wasteRisk: 'low' | 'medium' | 'high';
  sustainability: string;
  description: string;
}

export const PRODUCTS: Record<ProductId, ProductConfig> = {
  sourdough: {
    id: 'sourdough',
    name: 'Sourdough loaf',
    shortName: 'Sourdough',
    refPrice: 7.5,
    minPrice: 4,
    maxPrice: 14,
    baseDemand: 38,
    elasticity: -0.7,
    ovenMinutes: 6,
    recipe: { flour: 0.5 },
    pantryCost: 0.3,
    shelfLifeDays: 2,
    wasteRisk: 'low',
    sustainability: 'Simple local grain. Unsold loaves sell the next day at half price instead of being thrown away.',
    description: 'A staple. Regulars buy it whatever the price, so demand barely moves when you change it.',
  },
  matcha: {
    id: 'matcha',
    name: 'Matcha cookie',
    shortName: 'Matcha',
    refPrice: 3,
    minPrice: 1.5,
    maxPrice: 6,
    baseDemand: 68,
    elasticity: -1.6,
    ovenMinutes: 1.2,
    recipe: { flour: 0.04, butter: 0.02, matcha: 2 },
    pantryCost: 0.15,
    shelfLifeDays: 1,
    wasteRisk: 'medium',
    sustainability: 'Matcha travels a long way from Japan, and its price swings more than local ingredients.',
    description: 'A treat. Customers easily skip it when it feels pricey, so demand is very price-sensitive.',
  },
  muffin: {
    id: 'muffin',
    name: 'Berry muffin',
    shortName: 'Muffin',
    refPrice: 3.75,
    minPrice: 2,
    maxPrice: 7.5,
    baseDemand: 48,
    elasticity: -1.25,
    ovenMinutes: 2.5,
    recipe: { flour: 0.06, butter: 0.025, berries: 0.05 },
    pantryCost: 0.2,
    shelfLifeDays: 1,
    wasteRisk: 'high',
    sustainability: 'Fresh berries spoil in storage. Overbuying them is a quiet source of waste.',
    description: 'Popular with the morning crowd. Fairly price-sensitive, and its berries are perishable.',
  },
  croissant: {
    id: 'croissant',
    name: 'Oat croissant',
    shortName: 'Croissant',
    refPrice: 4.25,
    minPrice: 2.25,
    maxPrice: 8.5,
    baseDemand: 44,
    elasticity: -1.05,
    ovenMinutes: 3,
    recipe: { flour: 0.06, butter: 0.05 },
    pantryCost: 0.25,
    shelfLifeDays: 1,
    wasteRisk: 'high',
    sustainability: 'Butter-heavy, so it has the largest footprint per item. Stale by evening.',
    description: 'Flaky and butter-rich. Demand is moderately price-sensitive; anything unsold is waste.',
  },
};

export const PRODUCT_ORDER: ProductId[] = ['sourdough', 'matcha', 'muffin', 'croissant'];
export const PRICE_STEP = 0.25;
export const DAY_OLD_PRICE_FACTOR = 0.5;
/** Share of sourdough customers happy to take a half-price day-old loaf. */
export const DAY_OLD_ACCEPTANCE = 0.4;

// ------------------------------------------------------------- ingredients

export interface IngredientConfig {
  id: IngredientId;
  name: string;
  unit: string;
  basePrice: number;
  /** Daily price volatility (std-dev of the random shock). */
  volatility: number;
  /** Purchase step in the shop. */
  step: number;
  /** Buying at least this much at once earns the bulk discount. */
  bulkQty: number;
  /** Share of stock lost overnight to spoilage. */
  spoilagePerNight: number;
  startingQty: number;
}

export const INGREDIENTS: Record<IngredientId, IngredientConfig> = {
  flour: { id: 'flour', name: 'Flour', unit: 'kg', basePrice: 1.4, volatility: 0.04, step: 5, bulkQty: 50, spoilagePerNight: 0, startingQty: 30 },
  butter: { id: 'butter', name: 'Butter & dairy', unit: 'kg', basePrice: 8.5, volatility: 0.06, step: 1, bulkQty: 10, spoilagePerNight: 0.02, startingQty: 3 },
  berries: { id: 'berries', name: 'Berries', unit: 'kg', basePrice: 9, volatility: 0.1, step: 0.5, bulkQty: 5, spoilagePerNight: 0.3, startingQty: 2 },
  matcha: { id: 'matcha', name: 'Matcha', unit: 'g', basePrice: 0.2, volatility: 0.08, step: 25, bulkQty: 250, spoilagePerNight: 0, startingQty: 100 },
};

export const INGREDIENT_ORDER: IngredientId[] = ['flour', 'butter', 'berries', 'matcha'];
export const BULK_DISCOUNT = 0.1;
/** How strongly ingredient prices drift back toward their long-run average each day. */
export const PRICE_MEAN_REVERSION = 0.25;

// ------------------------------------------------------------ fixed costs

/** Paid every day whether you bake one loaf or a thousand. */
export const FIXED_COSTS = {
  rent: 110,
  wages: 165,
  admin: 25, // insurance, card fees, licences
};
export const FIXED_COST_TOTAL = FIXED_COSTS.rent + FIXED_COSTS.wages + FIXED_COSTS.admin;

// ----------------------------------------------------------------- energy

export const OVEN_CAPACITY_MINUTES = 420;
export const ENERGY_PER_OVEN_MINUTE = 0.07;
/** Fridges, lights, coffee machine. */
export const BASE_ENERGY_COST = 22;

// ---------------------------------------------------------------- waste

export const DISPOSAL_FEE_PER_UNIT = 0.2;
export const DISPOSAL_FEE_WITH_COMPOST = 0.04;

// ------------------------------------------------------------- packaging

export interface PackagingConfig {
  id: PackagingId;
  name: string;
  costPerUnit: number;
  greenPoints: number;
  description: string;
}

export const PACKAGING: Record<PackagingId, PackagingConfig> = {
  plastic: { id: 'plastic', name: 'Plastic clamshell', costPerUnit: 0.07, greenPoints: -15, description: 'Cheapest. Ends up in landfill — a cost paid by the town, not by you.' },
  paper: { id: 'paper', name: 'Paper bag', costPerUnit: 0.14, greenPoints: 0, description: 'The middle ground. Recyclable when it stays clean.' },
  compostable: { id: 'compostable', name: 'Compostable wrap', costPerUnit: 0.24, greenPoints: 12, description: 'Costs most per item. Customers notice and reputation benefits.' },
};

// -------------------------------------------------------------- sourcing

export interface SourcingConfig {
  id: SourcingId;
  name: string;
  ingredientCostMult: number;
  demandMult: number;
  greenPoints: number;
  description: string;
}

export const SOURCING: Record<SourcingId, SourcingConfig> = {
  conventional: { id: 'conventional', name: 'Wholesale supplier', ingredientCostMult: 1, demandMult: 1, greenPoints: 0, description: 'Standard prices from a national wholesaler.' },
  local: { id: 'local', name: 'Local farms', ingredientCostMult: 1.2, demandMult: 1.05, greenPoints: 12, description: 'Ingredients cost 20% more. Shorter supply chain; customers will pay a little more attention.' },
};

// ----------------------------------------------------------- investments

export interface InvestmentConfig {
  id: InvestmentId;
  name: string;
  cost: number;
  /** Straight-line depreciation period in days (5 years). */
  usefulLifeDays: number;
  effects: string[];
  tradeoff: string;
  greenPoints: number;
}

export const INVESTMENTS: Record<InvestmentId, InvestmentConfig> = {
  oven: {
    id: 'oven',
    name: 'Efficient oven',
    cost: 4200,
    usefulLifeDays: 1825,
    effects: ['+30% oven capacity (420 → 546 minutes)', '−30% energy per oven minute'],
    tradeoff: 'Only pays off quickly if you can sell what the extra capacity bakes.',
    greenPoints: 5,
  },
  compost: {
    id: 'compost',
    name: 'Compost station',
    cost: 700,
    usefulLifeDays: 1825,
    effects: ['Disposal fee per wasted item falls from $0.20 to $0.04', 'Wasted food hurts the green score half as much'],
    tradeoff: 'Makes waste cheaper — which can make it easier to ignore waste.',
    greenPoints: 8,
  },
  reusable: {
    id: 'reusable',
    name: 'Reusable delivery crates',
    cost: 1400,
    usefulLifeDays: 1825,
    effects: ['−60% packaging cost', '+6% demand from café wholesale orders'],
    tradeoff: 'Large upfront cost for savings that arrive a few cents at a time.',
    greenPoints: 10,
  },
  solar: {
    id: 'solar',
    name: 'Solar roof',
    cost: 5200,
    usefulLifeDays: 1825,
    effects: ['−55% of all energy costs', 'Shields you from energy price spikes'],
    tradeoff: 'Pays back over months, not weeks. Ties up cash you might need.',
    greenPoints: 15,
  },
};

export const INVESTMENT_ORDER: InvestmentId[] = ['oven', 'compost', 'reusable', 'solar'];
export const OVEN_CAPACITY_BONUS = 0.3;
export const OVEN_ENERGY_SAVING = 0.3;
export const REUSABLE_PACKAGING_SAVING = 0.6;
export const REUSABLE_DEMAND_BONUS = 1.06;
export const SOLAR_ENERGY_SAVING = 0.55;

// ----------------------------------------------------------------- debt

/** Forward contracts (commodity futures, simplified). */
export const FUTURES = {
  /** Price premium over today's market price for the certainty of a fixed price. */
  premium: 0.04,
  /** Number of daily deliveries in one contract. */
  days: 7,
  /** Largest daily delivery, in purchase steps of each ingredient. */
  maxSteps: 12,
} as const;

export const LOAN = {
  apr: 0.14,
  maxPrincipal: 6000,
  step: 500,
  /** Unplanned overdraft when cash falls below zero at closing — far more expensive. */
  overdraftApr: 0.36,
};

// --------------------------------------------------- reputation and green

export const REPUTATION = {
  start: 50,
  /** Share of the gap to the target closed each day. */
  adjustSpeed: 0.25,
  satisfactionWeight: 0.7,
  greenWeight: 0.3,
  /** Demand multiplier = 0.85 + reputation * slope  (50 → 1.0, 100 → 1.15). */
  demandSlope: 0.003,
};

export const GREEN = {
  base: 45,
  /** Points lost per 1% of production wasted (7-day average). */
  wastePenaltyPerPct: 0.9,
  /** Demand multiplier = 1 + (green − 50) / divisor  (100 → +10%, 0 → −10%). */
  demandDivisor: 500,
};

// ---------------------------------------------------------------- market

export const WEATHER: Record<Weather, { label: string; traffic: number; chance: number }> = {
  sunny: { label: 'Sunny', traffic: 1.06, chance: 0.4 },
  cloudy: { label: 'Cloudy', traffic: 1.0, chance: 0.4 },
  rainy: { label: 'Rain', traffic: 0.86, chance: 0.2 },
};

/** Customer taste drifts: each product's preference follows a mean-reverting walk. */
export const PREFERENCE = { volatility: 0.05, reversion: 0.3, min: 0.8, max: 1.2 };

/** Hidden day-to-day noise on top of the forecast (±12%). The forecast is honest on average. */
export const DEMAND_NOISE = 0.12;

/** Chance that a random event fills the morning paper (scheduled events always happen). */
export const EVENT_CHANCE = 0.38;

export const COMPETITOR = {
  name: 'Crumb & Co.',
  /** Competitor charges this fraction of your reference price. */
  priceFactor: 0.92,
  /** Share of customers lost when your price equals theirs. */
  baseShare: 0.1,
  /** Extra share lost per 10% you are above their price. */
  sharePerTenPct: 0.06,
  maxShare: 0.4,
  minShare: 0.02,
  /** Each reputation point above 50 protects 0.2 percentage points of share. */
  loyaltyPerRepPoint: 0.002,
};
