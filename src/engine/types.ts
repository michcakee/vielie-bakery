export type ProductId = 'banhMi' | 'caPhe' | 'flan' | 'pateChaud' | 'traTac' | 'banhChuoi' | 'banhBo' | 'banhKem' | 'mutDua';

export type IngredientId =
  | 'flour'
  | 'riceFlour'
  | 'eggs'
  | 'milk'
  | 'condensed'
  | 'sugar'
  | 'butter'
  | 'coffee'
  | 'chaLua'
  | 'veg'
  | 'banana'
  | 'coconut'
  | 'kumquat'
  | 'cream';

export type SupplierId = 'cho' | 'farm' | 'premium';
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'hot' | 'cool';
export type PackagingId = 'plastic' | 'paper' | 'reusable';
export type Phase = 'setup' | 'morning' | 'service' | 'closing' | 'report' | 'weekly';
export type Mood = 'love' | 'happy' | 'ok' | 'pricey' | 'sad' | 'slow' | 'thinking';
export type LeftoverChoice = 'donate' | 'bin' | 'keep';
export type CoopId = 'coffee' | 'dairy' | 'fruit';

export type UpgradeId =
  | 'oven2'
  | 'oven3'
  | 'fridge'
  | 'display'
  | 'coffeeBar'
  | 'helper'
  | 'fan'
  | 'solar'
  | 'compost'
  | 'corner'
  | 'garden'
  | 'loft';

export type DecorId = 'plant' | 'lanterns' | 'stringLights' | 'stools' | 'art' | 'rug' | 'birdcage' | 'radio' | 'bike' | 'flowers' | 'hoaMai' | 'sign';

export type ByProduct<T> = Record<ProductId, T>;
export type ByIngredient<T> = Record<IngredientId, T>;

export interface Look {
  skin: number;
  hair: number;
  hairColor: number;
  shirt: number;
  apron: number;
  accessory: number;
}

export interface PantryItem {
  qty: number;
  avgCost: number;
  quality: number;
  eco: number;
}

export interface StockItem {
  qty: number;
  quality: number;
  unitCost: number;
  fresh?: number;
}

export interface Visit {
  id: number;
  who: string;
  name: string;
  look: Look;
  wants: ProductId;
  alt: ProductId | null;
  qty: number;
  budget: number;
  patience: number;
  arrive: number;
  lastCallOnly: boolean;
  divertedTo?: string;
  status: 'coming' | 'walking' | 'waiting' | 'done';
  walkStart?: number;
  waitStart?: number;
  doneAt?: number;
  mood?: Mood;
  line?: string;
  paid?: number;
  tip?: number;
  ecoMinded: boolean;
}

export interface Fx {
  id: number;
  kind: 'coin' | 'heart' | 'sad' | 'sparkle' | 'star';
  at: number;
  amount?: number;
  visitId?: number;
}

export interface ServiceState {
  clock: number;
  visits: Visit[];
  lastCall: boolean;
  fx: Fx[];
  nextFx: number;
  cateringDone: boolean;
}

export interface DayStats {
  day: number;
  weather: Weather;
  revenue: number;
  tips: number;
  cogs: number;
  packaging: number;
  rent: number;
  energy: number;
  wages: number;
  interest: number;
  spoilage: number;
  other: number;
  customers: number;
  served: number;
  love: number;
  lostSoldOut: number;
  lostPrice: number;
  lostSlow: number;
  diverted: number;
  regularsServed: number;
  sold: ByProduct<number>;
  made: ByProduct<number>;
  soldOutAt: Partial<ByProduct<number>>;
  wishedFor: Partial<ByProduct<number>>;
  pricey: Partial<ByProduct<number>>;
  wasteUnits: number;
  wasteCost: number;
  donatedUnits: number;
  keptUnits: number;
  servedBeforeNoon: number;
  community: number;
  reputation: number;
  xp: number;
  savedOnSupplies: number;
  notes: string[];
}

export interface DaySummary {
  day: number;
  weather: Weather;
  revenue: number;
  expenses: number;
  profit: number;
  customers: number;
  served: number;
  wasteRate: number;
  eco: number;
  reputation: number;
}

export interface PendingEvent {
  id: string;
  day: number;
}

export interface ActiveEffect {
  id: string;
  until: number;
  data?: Record<string, number | string>;
}

export interface PriceLock {
  ingredient: IngredientId;
  price: number;
  until: number;
}

export interface Loan {
  principal: number;
  remaining: number;
  daily: number;
  fee: number;
}

export interface MarketToday {
  weather: Weather;
  tomorrow: Weather;
  prices: ByIngredient<number>;
  walk: ByIngredient<number>;
  outOfStock: { supplier: SupplierId; ingredient: IngredientId }[];
  coop: Record<CoopId, number>;
  headline: string;
}

export interface WeeklyGoal {
  id: string;
  target: number;
  startDay: number;
  baseline: number;
}

export interface GameState {
  version: number;
  seed: number;
  bakeryName: string;
  look: Look;
  day: number;
  phase: Phase;
  cash: number;
  safetyFund: number;
  reputation: number;
  community: number;
  xp: number;
  pantry: ByIngredient<PantryItem>;
  display: ByProduct<StockItem>;
  baguettes: StockItem;
  prices: ByProduct<number>;
  traysToday: number;
  bakedToday: ByProduct<number>;
  packaging: PackagingId;
  upgrades: UpgradeId[];
  decor: DecorId[];
  unlocked: ProductId[];
  market: MarketToday;
  service: ServiceState | null;
  today: DayStats;
  history: DaySummary[];
  leftoverPlan: Partial<Record<ProductId | 'baguette', LeftoverChoice>>;
  events: PendingEvent[];
  effects: ActiveEffect[];
  locks: PriceLock[];
  loan: Loan | null;
  shares: Record<CoopId, number>;
  shareCost: Record<CoopId, number>;
  supplierLoyalty: Record<SupplierId, number>;
  hearts: Record<string, number>;
  visitsByRegular: Record<string, number>;
  quests: string[];
  questProgress: Record<string, number>;
  achievements: string[];
  lifetime: {
    served: number;
    sold: ByProduct<number>;
    revenue: number;
    profit: number;
    donated: number;
    zeroWasteDays: number;
    returning: number;
    tetSold: number;
    marketingSpent: number;
  };
  weeklyGoal: WeeklyGoal | null;
  goalChoices: string[];
  savingsRate: number;
  ecoHistory: { day: number; sourcingEco: number; wasteRate: number }[];
  learned: string[];
  hints: string[];
  toasts: Toast[];
  nextToast: number;
  lastReport: Report | null;
}

export interface Toast {
  id: number;
  kind: 'unlock' | 'quest' | 'achievement' | 'level' | 'info';
  title: string;
  text: string;
}

export interface Report {
  day: number;
  stats: DayStats;
  expenses: number;
  profit: number;
  cashBefore: number;
  cashAfter: number;
  recap: string[];
  tip: string;
  ecoBefore: number;
  ecoAfter: number;
  levelBefore: number;
  levelAfter: number;
  newUnlocks: string[];
  loanPaid: number;
  savedToFund: number;
}
