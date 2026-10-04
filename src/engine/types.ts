import type { DreamId } from '../data/dream';
import type { FeatureId } from '../data/unlocks';
export type ProductId =
  | 'banhMi'
  | 'caPhe'
  | 'flan'
  | 'banhMiQue'
  | 'pateChaud'
  | 'traTac'
  | 'banhBao'
  | 'banhChuoi'
  | 'banhBo'
  | 'che'
  | 'banhKem'
  | 'mutDua'
  | 'banhTrungThu'
  | 'michcake';

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
  | 'pork'
  | 'veg'
  | 'banana'
  | 'coconut'
  | 'kumquat'
  | 'cream'
  | 'beans'
  | 'pandan'
  | 'lotus';

export type SupplierId = 'cho' | 'farm' | 'premium' | 'distributor';
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'hot' | 'cool';
export type PackagingId = 'plastic' | 'paper' | 'reusable';
export type Phase = 'setup' | 'morning' | 'service' | 'closing' | 'report' | 'weekly' | 'ended';
export type Mood = 'love' | 'happy' | 'ok' | 'pricey' | 'sad' | 'slow' | 'thinking';
export type LeftoverChoice = 'donate' | 'bin' | 'keep';
export type CoopId = 'coffee' | 'dairy' | 'fruit';
export type LocationId = 'oldLane' | 'littleSaigon' | 'university' | 'downtown' | 'riverside' | 'suburb';
export type SegmentId = 'students' | 'families' | 'office' | 'tourists' | 'vnElders' | 'vnFamilies' | 'budget' | 'premium' | 'coffee' | 'event';
export type RoleId = 'helper' | 'baker' | 'cashier' | 'barista' | 'cook' | 'pastryChef' | 'delivery' | 'manager' | 'marketer';
export type ScenarioId = 'family' | 'startup' | 'recession' | 'expansion' | 'community' | 'competitive';
export type Regime = 'normal' | 'boom' | 'recession' | 'inflation';
export type CampaignKind = 'flyers' | 'social' | 'community' | 'influencer' | 'loyalty' | 'partnership';

export type UpgradeId =
  | 'ovenBasic'
  | 'oven2'
  | 'oven3'
  | 'mixer'
  | 'steamer'
  | 'fridge'
  | 'walkIn'
  | 'storage'
  | 'display'
  | 'coffeeBar'
  | 'pos'
  | 'fan'
  | 'solar'
  | 'compost'
  | 'bike'
  | 'van'
  | 'website'
  | 'corner'
  | 'garden'
  | 'renovation'
  | 'loft';

export type DecorId = 'plant' | 'lanterns' | 'stringLights' | 'stools' | 'art' | 'rug' | 'birdcage' | 'radio' | 'bike' | 'flowers' | 'hoaMai' | 'sign' | 'trophy';

export type ByProduct<T> = Record<ProductId, T>;
export type ByIngredient<T> = Record<IngredientId, T>;

export interface Look {
  skin: number;
  hair: number;
  hairColor: number;
  shirt: number;
  apron: number;
  accessory: number;
  /** 0 or missing: eyes to suit the hair; otherwise a chosen colour. */
  eyes?: number;
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
  /** Day the oldest unit in stock was made, for shelf life. */
  madeDay?: number;
}

export interface Visit {
  id: number;
  who: string;
  name: string;
  look: Look;
  segment: SegmentId;
  loyal: boolean;
  wants: ProductId;
  alt: ProductId | null;
  qty: number;
  budget: number;
  patience: number;
  arrive: number;
  lastCallOnly: boolean;
  source?: string;
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
  servedBy?: string;
  grade?: OrderGrade;
  /** A critic grades harder and pays more. */
  critic?: boolean;
  /** A big order with a generous tip on top of the grade's. */
  specialOrder?: boolean;
  /** "No chili", "extra herbs", "I'm in a hurry": a bonus tip for getting it right. */
  twist?: Twist;
  /** The bonus tip a twist paid, for the grade card. */
  twistTip?: number;
}

/** How the player has painted and arranged the shop. Every field is an index into the scene option lists. */
export interface ShopStyle {
  wall: number;
  pattern: number;
  floor: number;
  counter: number;
  /** Which spot each movable decoration sits in. */
  spots: Partial<Record<DecorId, number>>;
  /** Where you dragged each floor piece (stage px, top-left). Overrides `spots`. */
  pos?: Record<string, { x: number; y: number }>;
  /** Indexes into GARLANDS, AWNINGS, SIGNS and UNIFORMS (data/shopfit.ts). */
  garland?: number;
  awning?: number;
  sign?: number;
  uniform?: number;
}

export interface StoryState {
  start: number;
  /** The next chapter to show (0-based). */
  chapter: number;
  nextDay: number;
  /** Lane hearts: support from the neighbours. */
  hearts: number;
  dish?: string;
  festivalDay?: number;
  result?: 'won' | 'second';
}

/** The scripted first week of a guided game: one twist a day, days 2 to 7 (engine/challenge.ts). */
export type OpeningEventId = 'rush' | 'tasteTest' | 'critic' | 'bigOrder' | 'requests' | 'laneParty';

export interface Challenge {
  id: 'sellItem' | 'beforeNoon' | 'love' | 'perfect' | 'noLeave' | 'twists' | 'regulars' | OpeningEventId;
  target: number;
  product?: ProductId;
  done: boolean;
  day: number;
}

export interface Twist {
  kind: 'skip' | 'double' | 'rush';
  /** The recipe step to leave out or do twice. */
  step?: string;
}

/** The visible score for one served order. */
export interface OrderGrade {
  score: number;
  stars: 1 | 2 | 3 | 4 | 5;
  accuracy: number;
  speed: number;
  quality: number;
  tip: number;
}

export interface Fx {
  id: number;
  kind: 'coin' | 'heart' | 'sad' | 'sparkle' | 'star';
  at: number;
  amount?: number;
  visitId?: number;
}

export interface ServerSlot {
  id: string;
  busyUntil: number;
  visitId: number | null;
  quality: number;
  served: number;
}

export interface ServiceState {
  clock: number;
  visits: Visit[];
  lastCall: boolean;
  fx: Fx[];
  nextFx: number;
  cateringDone: boolean;
  /** True when the player has handed the counter to the owner autopilot. */
  auto: boolean;
  servers: ServerSlot[];
}

/** Every money movement and P&L line for one day. */
export interface Books {
  // Income statement (accrual)
  sales: number;
  tips: number;
  otherRevenue: number;
  cogs: number;
  packaging: number;
  wages: number;
  rent: number;
  utilities: number;
  maintenance: number;
  marketing: number;
  waste: number;
  spoilage: number;
  depreciation: number;
  otherExpense: number;
  interest: number;
  otherIncome: number;
  // Cash flows
  cashSales: number;
  cashInventory: number;
  cashOperatingOther: number;
  cashRent: number;
  cashWages: number;
  cashInterest: number;
  cashCapex: number;
  cashInvestments: number;
  cashBorrowed: number;
  cashRepaid: number;
  cashEquity: number;
  cashDistributions: number;
}

export interface DayStats {
  day: number;
  weather: Weather;
  books: Books;
  /** Legacy summary fields kept for the report and older UI. */
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
  comboSales?: number;
  /** Today's 1-, 2- and 3-star sales targets. */
  goal?: [number, number, number];
  bestOrder?: { score: number; stars: number; product: ProductId; name: string };
  /** Consumer surplus: what customers would have paid minus what they did, summed over the day. */
  surplus?: number;
  lostSoldOut: number;
  lostPrice: number;
  lostSlow: number;
  /** Who gave up waiting, by what they wanted. */
  lostSlowKind?: Partial<Record<'tray' | 'drink' | 'sandwich', number>>;
  diverted: number;
  divertedTo: Record<string, number>;
  regularsServed: number;
  sold: ByProduct<number>;
  revenueBy: ByProduct<number>;
  cogsBy: ByProduct<number>;
  made: ByProduct<number>;
  soldOutAt: Partial<ByProduct<number>>;
  wishedFor: Partial<ByProduct<number>>;
  pricey: Partial<ByProduct<number>>;
  segments: Partial<Record<SegmentId, { visits: number; served: number; revenue: number; loyal: number }>>;
  sources: Record<string, { visits: number; revenue: number }>;
  wasteUnits: number;
  wasteCost: number;
  donatedUnits: number;
  keptUnits: number;
  servedBeforeNoon: number;
  /** Tips the Dream team earned today. */
  dreamTips?: number;
  /** Five-star orders the player made by hand, and special requests done just right (daily challenges). */
  fiveStar?: number;
  twistsRight?: number;
  /** Opening week: the critic left happy (4 stars or more), and big orders served. */
  criticPleased?: number;
  bigOrders?: number;
  community: number;
  reputation: number;
  xp: number;
  savedOnSupplies: number;
  lockSaved?: number;
  purchasedUnits: number;
  purchasedEco: number;
  trays: number;
  satisfaction: number;
  staffServed: number;
  ownerServed: number;
  deliveries: number;
  notes: string[];
}

export interface DaySummary {
  day: number;
  stars?: number;
  weather: Weather;
  revenue: number;
  expenses: number;
  profit: number;
  customers: number;
  served: number;
  wasteRate: number;
  eco: number;
  reputation: number;
  cash: number;
  books: Books;
  sold: ByProduct<number>;
  revenueBy: ByProduct<number>;
  cogsBy: ByProduct<number>;
  lost: number;
  wished: Partial<ByProduct<number>>;
  lostSoldOut: number;
  lostPrice: number;
  lostSlow: number;
  /** Who gave up waiting, by what they wanted. */
  lostSlowKind?: Partial<Record<'tray' | 'drink' | 'sandwich', number>>;
  diverted: number;
  inventoryValue: number;
  staff: number;
  satisfaction: number;
  segments: Partial<Record<SegmentId, number>>;
  share: number;
  prices: ByProduct<number>;
  priceIndex: number;
  confidence: number;
  surplus?: number;
}

export type Guess = 'more' | 'same' | 'fewer';

/** The Predict step: before a price change plays out, the player guesses; afterwards the game shows what happened. */
export interface Prediction {
  day: number;
  product: ProductId;
  from: number;
  to: number;
  unitsBefore: number;
  unitsAfter: number;
  /** Bought per 10 shoppers, before and after: fair even when the street is busier. */
  rateBefore?: number;
  rateAfter?: number;
  guess?: Guess;
  result: Guess;
  /** What was asked: how many buy it, or how much money it brings in. */
  ask?: PredictAsk;
  /** Money from this item per 10 shoppers, before and after. */
  moneyBefore?: number;
  moneyAfter?: number;
}

export type PredictAsk = 'buyers' | 'money';

export interface PendingEvent {
  id: string;
  day: number;
  data?: Record<string, number | string>;
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
  id: number;
  lender: string;
  principal: number;
  balance: number;
  rate: number;
  termMonths: number;
  payment: number;
  monthsLeft: number;
  accrued: number;
  missed: number;
  takenDay: number;
  interestPaid: number;
}

export interface Investor {
  id: number;
  name: string;
  stake: number;
  invested: number;
  day: number;
  paidOut: number;
}

export interface Bond {
  id: number;
  amount: number;
  rate: number;
  dueDay: number;
  accrued: number;
}

export interface Equipment {
  uid: number;
  kind: UpgradeId;
  cost: number;
  boughtDay: number;
  depreciated: number;
  broken: boolean;
}

export interface Employee {
  id: number;
  name: string;
  role: RoleId;
  wage: number;
  skill: number;
  morale: number;
  hiredDay: number;
  trainingUntil: number;
  look: Look;
  served: number;
  branch: number | null;
  /** Personality: changes how they serve. Optional so older saves load. */
  trait?: TraitId;
  /** One of the Dream team (unlocked with diamonds). */
  dream?: DreamId;
  /** Tips this person has earned for the bakery (the Dream team's are shown). */
  tips?: number;
}

export type TraitId = 'speedy' | 'careful' | 'cheerful' | 'earlyBird';

export interface Applicant {
  id: number;
  name: string;
  role: RoleId;
  wage: number;
  skill: number;
  look: Look;
  trait?: TraitId;
  /** One of the Dream team, waiting to be hired. */
  dream?: DreamId;
}

export interface Competitor {
  id: string;
  name: string;
  location: LocationId;
  strategy: 'discount' | 'premium' | 'matcher' | 'copycat' | 'chain';
  prices: Partial<ByProduct<number>>;
  quality: number;
  reputation: number;
  marketing: number;
  cash: number;
  openedDay: number;
  closedDay: number | null;
  share: number;
  lastMove: string;
}

export interface Campaign {
  id: number;
  kind: CampaignKind;
  cost: number;
  startDay: number;
  endDay: number;
  reach: number;
  conversion: number;
  newCustomers: number;
  revenue: number;
  ongoingCost: number;
}

export interface SupplyContract {
  id: number;
  ingredient: IngredientId;
  supplier: SupplierId;
  packsPerWeek: number;
  price: number;
  startDay: number;
  endDay: number;
  delivered: number;
}

export interface Delivery {
  id: number;
  ingredient: IngredientId;
  supplier: SupplierId;
  packs: number;
  cost: number;
  arrives: number;
  quality: number;
  eco: number;
}

export interface ReorderRule {
  below: number;
  packs: number;
  supplier: SupplierId;
}

export interface Branch {
  id: number;
  name: string;
  location: LocationId;
  openedDay: number;
  trays: number;
  quality: number;
  reputation: number;
  fitOut: number;
  deposit: number;
  lastRevenue: number;
  lastProfit: number;
  lastServed: number;
  lastLost: number;
  closed: boolean;
}

export interface MacroState {
  regime: Regime;
  monthsInRegime: number;
  inflation: number;
  rate: number;
  unemployment: number;
  confidence: number;
  priceIndex: number;
  wageIndex: number;
  incomeIndex: number;
  rentIndex: number;
  growth: number;
  history: { day: number; regime: Regime; inflation: number; rate: number; unemployment: number; confidence: number; priceIndex: number }[];
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

export interface Decision {
  id: number;
  day: number;
  kind: 'price' | 'hire' | 'fire' | 'wage' | 'train' | 'equipment' | 'loan' | 'investor' | 'bond' | 'branch' | 'campaign' | 'contract' | 'supplier' | 'location' | 'event' | 'menu' | 'sell';
  text: string;
  product?: ProductId;
  metric: 'revenue' | 'profit' | 'units' | 'customers' | 'cash';
  before: number;
  after?: number;
  verdict?: string;
}

export interface Plan {
  trays: Partial<Record<ProductId | 'baguette', number>>;
  autoStock?: boolean;
}

export interface GameState {
  version: number;
  seed: number;
  scenario: ScenarioId;
  difficulty: 'easy' | 'normal' | 'hard' | 'expert';
  goal: string;
  location: LocationId;
  bakeryName: string;
  /** What the player asked to be called. Stays on this device. */
  playerName?: string;
  /** At the counter, staff leave new orders for the player first ('help') or take every order at once ('all'). */
  staffMode?: 'help' | 'all';
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
  menu: ProductId[];
  traysToday: number;
  bakedToday: ByProduct<number>;
  plan: Plan;
  packaging: PackagingId;
  /** Owned equipment kinds (derived from `equipment`, kept for quick checks). */
  upgrades: UpgradeId[];
  equipment: Equipment[];
  nextUid: number;
  decor: DecorId[];
  unlocked: ProductId[];
  market: MarketToday;
  macro: MacroState;
  service: ServiceState | null;
  today: DayStats;
  history: DaySummary[];
  months: MonthRecord[];
  leftoverPlan: Partial<Record<ProductId | 'baguette', LeftoverChoice>>;
  events: PendingEvent[];
  effects: ActiveEffect[];
  locks: PriceLock[];
  loans: Loan[];
  creditLine: { balance: number; accrued: number };
  investors: Investor[];
  bonds: Bond[];
  staff: Employee[];
  applicants: Applicant[];
  competitors: Competitor[];
  campaigns: Campaign[];
  contracts: SupplyContract[];
  deliveries: Delivery[];
  reorder: Partial<Record<IngredientId, ReorderRule>>;
  branches: Branch[];
  loyal: Partial<Record<SegmentId, number>>;
  shares: Record<CoopId, number>;
  shareCost: Record<CoopId, number>;
  supplierLoyalty: Record<SupplierId, number>;
  hearts: Record<string, number>;
  /** Loyalty badges per regular: 1 bronze, 2 silver, 3 gold. Never lost. Optional so older saves load. */
  badges?: Record<string, number>;
  /** Regulars unlocked by the first-week schedule ahead of their level. */
  unlockedRegulars?: string[];
  /** Today's special: this item sells for more today. */
  special?: ProductId | null;
  /** A price change waiting for its day to play out (and, maybe, a guess). */
  pendingPrediction?: { product: ProductId; from: number; to: number; unitsBefore: number; rateBefore?: number; guess?: Guess; ask?: PredictAsk; moneyBefore?: number } | null;
  /** Settled predictions, newest last. */
  predictions?: Prediction[];
  /** Coffee + bánh mì combo deal on (concept 12). */
  combo?: boolean;
  /** Drink sizes offered (concept 18). */
  sizes?: boolean;
  /** Feature gating. `false` = guided game; missing or `true` = everything open (tests, old saves, Experienced baker). */
  allUnlocked?: boolean;
  /** Systems the player has unlocked so far (guided games). */
  features?: FeatureId[];
  /** Unlocked but not yet looked at: drives the NEW badge. */
  newFeatures?: FeatureId[];
  /** Day the last system unlocked (one a day at most). */
  lastFeatureDay?: number;
  /** Intro quests: the active one, deferred ones, finished ones. */
  intro?: IntroState;
  /** Morning event ids the player has met, for unlock triggers. */
  eventsSeen?: string[];
  /** Star-shop cosmetics bought (ids from data/cosmetics). */
  cosmetics?: string[];
  /** Paint and furniture placement chosen by the player. */
  style?: ShopStyle;
  /** Renovation level, 0 to 4 (data/shopfit.ts). */
  shopTier?: number;
  /** The Lantern Festival story. Missing until it starts. */
  story?: StoryState;
  /** Today's small task. */
  challenge?: Challenge | null;
  /** Diamonds to spend (bought in the app or earned on 3-star days). Shared by every bakery on the device. */
  diamonds?: number;
  /** Dream team members unlocked with diamonds (also shared across bakeries). */
  dreamTeam?: DreamId[];
  /** Diamonds this bakery has earned from 3-star days. */
  diamondsEarned?: number;
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
    challenges?: number;
  };
  equity: { contributed: number; retained: number; distributions: number };
  prepaidRent: number;
  weeklyGoal: WeeklyGoal | null;
  goalChoices: string[];
  savingsRate: number;
  ecoHistory: { day: number; sourcingEco: number; wasteRate: number }[];
  decisions: Decision[];
  nextId: number;
  offer: { amount: number; buyer: string; day: number } | null;
  /** Day the scenario's long-term goal was reached (optional so older saves load unchanged). */
  goalReached?: number;
  ending: { kind: 'sold' | 'bankrupt' | 'retired'; day: number; text: string; value: number } | null;
  bailoutsUsed: number;
  daysInDistress: number;
  learned: string[];
  hints: string[];
  toasts: Toast[];
  nextToast: number;
  lastReport: Report | null;
}

export interface MonthRecord {
  year: number;
  month: number;
  startDay: number;
  endDay: number;
  books: Books;
  revenue: number;
  profit: number;
  served: number;
  customers: number;
  endCash: number;
}

export interface Toast {
  id: number;
  kind: 'unlock' | 'quest' | 'achievement' | 'level' | 'info' | 'warning';
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
  communityDelta: number;
  repDelta: number;
  newUnlocks: string[];
  loanPaid: number;
  savedToFund: number;
  why: string[];
  branchProfit: number;
  /** Stars earned on today's goal, and the XP they paid. */
  stars?: number;
  /** Diamonds earned today (a 3-star day). */
  diamonds?: number;
  starXp?: number;
}

export interface IntroState {
  active: FeatureId | null;
  base: Record<string, number>;
  done: FeatureId[];
  later: FeatureId[];
  startedDay: number;
  replay: boolean;
}
