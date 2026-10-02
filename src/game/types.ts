export type ProductId = 'sourdough' | 'matcha' | 'muffin' | 'croissant';
export type IngredientId = 'flour' | 'butter' | 'berries' | 'matcha';
export type PackagingId = 'plastic' | 'paper' | 'compostable';
export type SourcingId = 'conventional' | 'local';
export type InvestmentId = 'oven' | 'compost' | 'reusable' | 'solar';
export type Weather = 'sunny' | 'cloudy' | 'rainy';
export type Phase = 'morning' | 'report' | 'weekly' | 'final';

export type ConceptId =
  | 'revenue'
  | 'profit'
  | 'margin'
  | 'fixedCost'
  | 'variableCost'
  | 'marginalCost'
  | 'elasticity'
  | 'roi'
  | 'interest'
  | 'liquidity'
  | 'opportunityCost'
  | 'externality'
  | 'breakEven'
  | 'inventory'
  | 'depreciation'
  | 'supplyDemand';

export type ByProduct<T> = Record<ProductId, T>;
export type ByIngredient<T> = Record<IngredientId, T>;

export interface EventEffects {
  /** Multiplies demand for every product. */
  demandAll?: number;
  demand?: Partial<ByProduct<number>>;
  ingredientPrice?: Partial<ByIngredient<number>>;
  energy?: number;
  packaging?: number;
  competitorPrice?: number;
  forceWeather?: Weather;
  /** Demand bonus/penalty that depends on the green score (the "news story" event). */
  greenSpotlight?: boolean;
}

export interface MarketEvent {
  id: string;
  headline: string;
  body: string;
  lesson: string;
  weight: number;
  minDay: number;
  effects: EventEffects;
  concept?: ConceptId;
}

export interface MarketDay {
  day: number;
  weather: Weather;
  /** Ingredient prices today (before sourcing multiplier and bulk discount). */
  ingredientPrices: ByIngredient<number>;
  /** Slow-moving customer taste for each product. */
  preference: ByProduct<number>;
  /** Hidden random draw that turns the forecast into actual customers. */
  noise: ByProduct<number>;
  eventId: string | null;
  competitorActive: boolean;
}

export interface IngredientStock {
  qty: number;
  /** Weighted-average cost per unit, used to value inventory. */
  avgCost: number;
}

export interface ProductResult {
  planned: number;
  baked: number;
  expectedDemand: number;
  customers: number;
  sold: number;
  dayOldSold: number;
  price: number;
  revenue: number;
  unitCost: number;
  ingredientCostSold: number;
  packagingCost: number;
  wasted: number;
  wasteCost: number;
  carriedOver: number;
  stockout: number;
  /** Non-price demand multiplier, recorded so weekly insights can isolate the price effect. */
  nonPriceMultiplier: number;
}

export interface IncomeStatement {
  revenue: number;
  cogs: number; // ingredients + packaging of items sold
  grossProfit: number;
  wages: number;
  rent: number;
  admin: number;
  energy: number;
  waste: number; // cost of discarded food + spoiled ingredients + disposal fees
  depreciation: number;
  operatingExpenses: number;
  operatingProfit: number;
  interest: number;
  netProfit: number;
}

export interface DayResult {
  day: number;
  weather: Weather;
  eventId: string | null;
  products: ByProduct<ProductResult>;
  income: IncomeStatement;
  ovenMinutesUsed: number;
  ovenCapacity: number;
  spoiledIngredientCost: number;
  disposalFees: number;
  unitsProduced: number;
  unitsWasted: number;
  customers: number;
  unitsSold: number;
  satisfaction: number;
  reputationBefore: number;
  reputationAfter: number;
  greenScore: number;
  cashBefore: number;
  cashAfter: number;
  /** Cash spent on ingredients, investments and loan moves during the morning. */
  morningCashFlow: number;
  overdraftDrawn: number;
  notes: string[];
}

export interface Decision {
  day: number;
  kind: 'price' | 'investment' | 'loan' | 'repay' | 'packaging' | 'sourcing';
  text: string;
}

export interface GameState {
  version: number;
  seed: number;
  day: number;
  phase: Phase;
  cash: number;
  cashAtDayStart: number;
  ingredients: ByIngredient<IngredientStock>;
  /** Sourdough baked yesterday, sellable today at half price. */
  dayOld: { qty: number; unitCost: number };
  prices: ByProduct<number>;
  plan: ByProduct<number>;
  packaging: PackagingId;
  sourcing: SourcingId;
  owned: InvestmentId[];
  /** Gross cost of equipment bought (capitalized, not expensed). */
  equipmentCost: number;
  accumulatedDepreciation: number;
  loan: number;
  overdraft: number;
  reputation: number;
  greenScore: number;
  market: MarketDay;
  marketHistory: MarketDay[];
  history: DayResult[];
  lastResult: DayResult | null;
  decisions: Decision[];
  learned: ConceptId[];
  tutorialDone: boolean;
  sandbox: boolean;
  startingCapital: number;
}
