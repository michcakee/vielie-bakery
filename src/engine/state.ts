import { STAR_XP, starsFor } from './goals';
import { BAGUETTE, DECOR, INGREDIENTS, INGREDIENT_ORDER, PRODUCTS, PRODUCT_ORDER, START_PRODUCTS, SUPPLIERS, UPGRADES } from '../data/catalog';
import { DIFFICULTY, ECON, type Difficulty } from '../data/config';
import { LOCATIONS, ROLES, SCENARIOS } from '../data/world';
import { accrue, addBooks, balanceSheet, emptyBooks, incomeStatement, inventoryValue, move, netProfit, sumBooks } from './accounting';
import { explainChange, settleDecisions } from './analytics';
import { simulateBranch } from './branches';
import { dateOf, isMonthStart, isTetDay } from './calendar';
import { monthlyCompetition, reactWeekly, seedCompetitors } from './competitors';
import {
  available,
  blendQuality,
  canBakeTray,
  canOffer,
  clamp,
  coldCapacity,
  countOf,
  dailyDepreciation,
  displayCapacity,
  displayUse,
  ecoScore,
  effectActive,
  fridgeWorks,
  has,
  inStock,
  ingredientQuality,
  levelOf,
  maintenance,
  masteryBonus,
  normalPackPrice,
  onMenu,
  packPrice,
  priceBounds,
  recipeCost,
  rent,
  round2,
  staffQualityBonus,
  storageUse,
  trayCapacity,
  utilities,
  wages,
  loyalChurnRate,
} from './economy';
import { EVENTS, eventFor, refreshKinds, visibleChoices } from './events';
import { pickChallenge, settleChallenge } from './challenge';
import { allowedLook, allowedStyle, COSMETICS, owns, starsToSpend } from '../data/cosmetics';
import { arcDayEnd } from './arc';
import { bondCapacity, borrowingLimit, creditLimit, creditLineRate, investorTerms, makeLoan, quoteLoan, valuation } from './finance';
import { suggestedTrays, forecast, ingredientsNeeded } from './forecast';
import { bump, decide, learn, spend, toast } from './helpers';
import { hireValue, makeEmployee, marketWage, quitters, updateMorale, weeklyApplicants } from './labor';
import { createMacro, dailyMacro, monthlyMacro } from './macro';
import { generateMarket } from './market';
import { applySchedule, checkProgress, goalMet, WEEKLY_GOALS } from './progression';
import { applyFeatureUnlocks, checkIntro, emptyIntro, featureOn, introLater, introStart, refreshIntroBase, seeTab, startingFeatures, unlockAll } from './unlocks';
import { ACTION_FEATURE, type FeatureId } from '../data/unlocks';
import { businessTip, recap } from './report';
import { newSeed, rngFor } from './rng';
import { endService, fastForward, keepsOvernight, openShop, serve, setLastCall, tick } from './service';
import type {
  PredictAsk,
  ByProduct,
  CampaignKind,
  CoopId,
  DayStats,
  DaySummary,
  DecorId,
  ShopStyle,
  Equipment,
  GameState,
  IngredientId,
  LeftoverChoice,
  LocationId,
  Look,
  MonthRecord,
  PackagingId,
  PantryItem,
  ProductId,
  Report,
  ScenarioId,
  StockItem,
  SupplierId,
  UpgradeId,
  Weather,
  Guess,
  Prediction,
} from './types';

export const SAVE_VERSION = 4;

const zeroProducts = (): ByProduct<number> => Object.fromEntries(PRODUCT_ORDER.map((p) => [p, 0])) as ByProduct<number>;

export function emptyDay(day: number, weather: Weather): DayStats {
  return {
    day,
    weather,
    books: emptyBooks(),
    revenue: 0,
    tips: 0,
    cogs: 0,
    packaging: 0,
    rent: 0,
    energy: 0,
    wages: 0,
    interest: 0,
    spoilage: 0,
    other: 0,
    customers: 0,
    served: 0,
    love: 0,
    lostSoldOut: 0,
    lostPrice: 0,
    lostSlow: 0,
    diverted: 0,
    divertedTo: {},
    regularsServed: 0,
    sold: zeroProducts(),
    revenueBy: zeroProducts(),
    cogsBy: zeroProducts(),
    made: zeroProducts(),
    soldOutAt: {},
    wishedFor: {},
    pricey: {},
    segments: {},
    sources: {},
    wasteUnits: 0,
    wasteCost: 0,
    donatedUnits: 0,
    keptUnits: 0,
    servedBeforeNoon: 0,
    community: 0,
    reputation: 0,
    xp: 0,
    savedOnSupplies: 0,
    purchasedUnits: 0,
    purchasedEco: 0,
    trays: 0,
    satisfaction: 0,
    staffServed: 0,
    ownerServed: 0,
    deliveries: 0,
    notes: [],
  };
}

export const DEFAULT_LOOK: Look = { skin: 1, hair: 3, hairColor: 0, shirt: 0, apron: 0, accessory: 0 };

const STARTER: Partial<Record<IngredientId, number>> = { flour: 10, eggs: 12, milk: 6, condensed: 12, sugar: 10, coffee: 12, chaLua: 10, veg: 10 };

export interface NewGameOptions {
  seed?: number;
  scenario?: ScenarioId;
  difficulty?: Difficulty;
  location?: LocationId;
  name?: string;
  look?: Look;
  /** A guided game: systems unlock one at a time. Off for tests and Experienced bakers. */
  guided?: boolean;
}

export function createNewGame(seedOrOpts: number | NewGameOptions = {}): GameState {
  const opts: NewGameOptions = typeof seedOrOpts === 'number' ? { seed: seedOrOpts } : seedOrOpts;
  const seed = opts.seed ?? newSeed();
  const sc = SCENARIOS[opts.scenario ?? 'family'];
  const difficulty = opts.difficulty ?? sc.difficulty;
  const location = opts.location ?? sc.location ?? 'oldLane';
  const macro = createMacro(sc.regime);
  const market = generateMarket(seed, 1, null, { priceIndex: 1 });
  const pantry = {} as Record<IngredientId, PantryItem>;
  for (const id of INGREDIENT_ORDER) {
    const def = INGREDIENTS[id];
    pantry[id] = { qty: sc.inherited ? STARTER[id] ?? 0 : 0, avgCost: def.price / def.pack, quality: 70, eco: 50 };
  }
  const display = {} as ByProduct<StockItem>;
  for (const p of PRODUCT_ORDER) display[p] = { qty: 0, quality: 70, unitCost: 0 };
  // A guided first day starts with an empty pastry case, so Bà's first lesson (bake a tray) isn't waste.
  if (sc.inherited && !opts.guided) display.flan = { qty: 8, quality: 76, unitCost: 0.71, madeDay: 1 };
  const prices = {} as ByProduct<number>;
  for (const p of PRODUCT_ORDER) prices[p] = PRODUCTS[p].ref;
  const equipment: Equipment[] = sc.inherited ? [{ uid: 1, kind: 'ovenBasic', cost: 1200, boughtDay: 0, depreciated: 600, broken: false }] : [];
  const competitors = seedCompetitors(location, sc.extraRivals);

  const base: GameState = {
    version: SAVE_VERSION,
    seed,
    scenario: sc.id,
    difficulty,
    goal: sc.goal,
    location,
    bakeryName: opts.name ?? 'Viet Bake Shop',
    look: opts.look ?? { ...DEFAULT_LOOK },
    day: 1,
    phase: 'setup',
    cash: sc.cash,
    safetyFund: 0,
    reputation: sc.inherited ? 30 : 25,
    community: sc.inherited ? 20 : 10,
    xp: 0,
    pantry,
    display,
    baguettes: sc.inherited ? { qty: 12, quality: 72, unitCost: 0.27, madeDay: 1 } : { qty: 0, quality: 70, unitCost: 0 },
    prices,
    menu: [...START_PRODUCTS],
    traysToday: 0,
    bakedToday: zeroProducts(),
    plan: { trays: {} },
    packaging: 'paper',
    upgrades: refreshKinds(equipment),
    equipment,
    nextUid: 2,
    decor: ['flowers', 'plant'],
    unlocked: [...START_PRODUCTS],
    market,
    macro,
    service: null,
    today: { ...emptyDay(1, market.weather), made: { ...zeroProducts(), flan: sc.inherited && !opts.guided ? 8 : 0 } },
    history: [],
    months: [],
    leftoverPlan: {},
    events: [],
    effects: [],
    locks: [],
    loans: [],
    creditLine: { balance: 0, accrued: 0 },
    investors: [],
    bonds: [],
    staff: [],
    applicants: [],
    competitors,
    campaigns: [],
    contracts: [],
    deliveries: [],
    reorder: {},
    branches: [],
    loyal: {},
    shares: { coffee: 0, dairy: 0, fruit: 0 },
    shareCost: { coffee: 0, dairy: 0, fruit: 0 },
    supplierLoyalty: { cho: 0, farm: 0, premium: 0, distributor: 0 },
    hearts: {},
    badges: {},
    visitsByRegular: {},
    quests: [],
    questProgress: {},
    achievements: [],
    lifetime: { served: 0, sold: zeroProducts(), revenue: 0, profit: 0, donated: 0, zeroWasteDays: 0, returning: 0, tetSold: 0, marketingSpent: 0 },
    equity: { contributed: 0, retained: 0, distributions: 0 },
    prepaidRent: 0,
    weeklyGoal: null,
    goalChoices: [],
    savingsRate: 0,
    ecoHistory: [],
    decisions: [],
    nextId: 100,
    offer: null,
    ending: null,
    bailoutsUsed: 0,
    daysInDistress: 0,
    learned: [],
    hints: [],
    toasts: [],
    nextToast: 1,
    lastReport: null,
  };
  base.today = { ...base.today, community: base.community, reputation: base.reputation };
  // Rent is paid monthly in advance: the rest of this month is already covered.
  const left = ECON.calendar.daysPerMonth - dateOf(1).dom + 1;
  base.prepaidRent = rent(base) * left;
  if (sc.loan) base.loans = [makeLoan(1, quoteLoan(base, sc.loan, 12), 0, 'Bà\'s old bank loan')];
  base.applicants = weeklyApplicants(base);
  base.nextId += base.applicants.length;
  const bs = balanceSheet(base);
  base.equity = { contributed: bs.equity, retained: 0, distributions: 0 };
  if (opts.guided) {
    base.allUnlocked = false;
    base.features = startingFeatures(sc.id);
    base.newFeatures = [];
    base.intro = { ...emptyIntro(), done: [...base.features] };
    base.lastFeatureDay = 1;
  }
  return base;
}

export type Action =
  | { type: 'setup'; name: string; look: Look; location?: LocationId }
  | { type: 'setLook'; look: Look }
  | { type: 'buyCosmetic'; id: string }
  | { type: 'rename'; name: string }
  | { type: 'buy'; ingredient: IngredientId; supplier: SupplierId; packs: number }
  | { type: 'setReorder'; ingredient: IngredientId; below: number; packs: number; supplier: SupplierId }
  | { type: 'clearReorder'; ingredient: IngredientId }
  | { type: 'buyForecast'; supplier: SupplierId }
  | { type: 'signContract'; ingredient: IngredientId; supplier: SupplierId; packsPerWeek: number; weeks: number }
  | { type: 'cancelContract'; id: number }
  | { type: 'bake'; item: ProductId | 'baguette'; process: number; quick?: boolean }
  | { type: 'autoBake' }
  | { type: 'setPlan'; item: ProductId | 'baguette'; trays: number | null }
  | { type: 'setAutoStock'; on: boolean }
  | { type: 'setPrice'; product: ProductId; price: number }
  | { type: 'setMenu'; product: ProductId; on: boolean }
  | { type: 'open' }
  | { type: 'runDay' }
  | { type: 'handOver' }
  | { type: 'takeBack' }
  | { type: 'skipToClose' }
  | { type: 'tick'; minutes: number }
  | { type: 'serve'; visitId: number; process?: number }
  | { type: 'lastCall'; on: boolean }
  | { type: 'closeEarly' }
  | { type: 'leftover'; key: ProductId | 'baguette'; choice: LeftoverChoice }
  | { type: 'finishDay' }
  | { type: 'nextDay' }
  | { type: 'pickGoal'; id: string }
  | { type: 'resolveEvent'; choice: string }
  | { type: 'buyUpgrade'; id: UpgradeId }
  | { type: 'sellEquipment'; uid: number }
  | { type: 'buyDecor'; id: DecorId }
  | { type: 'setStyle'; key: 'wall' | 'pattern' | 'floor' | 'counter'; value: number }
  | { type: 'moveDecor'; id: DecorId }
  | { type: 'setPackaging'; packaging: PackagingId }
  | { type: 'hire'; applicantId: number; branch?: number | null }
  | { type: 'fire'; id: number }
  | { type: 'setWage'; id: number; wage: number }
  | { type: 'train'; id: number }
  | { type: 'assign'; id: number; branch: number | null }
  | { type: 'fund'; amount: number }
  | { type: 'savingsRate'; rate: number }
  | { type: 'takeLoan'; principal: number; term: number }
  | { type: 'repayLoan'; id: number }
  | { type: 'repayCredit'; amount: number }
  | { type: 'raiseEquity'; amount: number }
  | { type: 'buyBack'; id: number }
  | { type: 'issueBond'; amount: number }
  | { type: 'campaign'; kind: CampaignKind }
  | { type: 'lockPrice'; ingredient: IngredientId }
  | { type: 'trade'; coop: CoopId; delta: number }
  | { type: 'openBranch'; location: LocationId; name: string }
  | { type: 'closeBranch'; id: number }
  | { type: 'retire' }
  | { type: 'predict'; guess: Guess }
  | { type: 'setCombo'; on: boolean }
  | { type: 'setSizes'; on: boolean }
  | { type: 'dismissToast'; id: number }
  | { type: 'hint'; id: string }
  | { type: 'introLater' }
  | { type: 'introStart'; id: FeatureId }
  | { type: 'unlockAll' }
  | { type: 'newGame'; seed?: number; options?: NewGameOptions }
  | { type: 'load'; state: GameState };

// ---------------------------------------------------------------- guards & constants

export const canShop = (s: GameState) => s.phase === 'morning' || s.phase === 'closing' || s.phase === 'report';

export const CAMPAIGNS: Record<CampaignKind, { name: string; vi: string; cost: number; days: number; reach: number; conversion: number; ongoing?: number; blurb: string; needs?: UpgradeId }> = {
  flyers: { name: 'Flyers around the block', vi: 'Tờ rơi', cost: 180, days: 7, reach: 900, conversion: 0.03, blurb: 'Cheap and local. Families and bargain hunters read them.' },
  social: { name: 'Social media ads', vi: 'Quảng cáo mạng', cost: 450, days: 10, reach: 4000, conversion: 0.012, blurb: 'Reaches students and young professionals; results vary a lot.' },
  community: { name: 'Sponsor a community event', vi: 'Tài trợ sự kiện', cost: 600, days: 14, reach: 1500, conversion: 0.035, blurb: 'Temple fair or Tết celebration: loved by Vietnamese families and elders. +community.' },
  influencer: { name: 'Pay a food influencer', vi: 'Người nổi tiếng', cost: 900, days: 5, reach: 9000, conversion: 0.008, blurb: 'Huge reach to tourists and treat seekers, unpredictable conversion.' },
  loyalty: { name: 'Loyalty card program', vi: 'Thẻ khách quen', cost: 250, days: 60, reach: 0, conversion: 0, ongoing: 0.03, needs: 'pos', blurb: 'Every 10th item free. Costs ~3% of sales, turns more customers into regulars.' },
  partnership: { name: 'Office lunch partnership', vi: 'Hợp tác văn phòng', cost: 400, days: 21, reach: 1200, conversion: 0.04, blurb: 'A nearby office promotes your bánh mì and coffee to its staff.' },
};

export const LOAN_SIZES = [2000, 5000, 10000, 25000, 50000];

// ---------------------------------------------------------------- buying

function addToPantry(s: GameState, id: IngredientId, units: number, cost: number, quality: number, eco: number): GameState {
  const p = s.pantry[id];
  const qty = p.qty + units;
  const item: PantryItem = { qty, avgCost: qty ? (p.qty * p.avgCost + cost) / qty : p.avgCost, quality: qty ? (p.qty * p.quality + units * quality) / qty : p.quality, eco: qty ? (p.qty * p.eco + units * eco) / qty : p.eco };
  return { ...s, pantry: { ...s.pantry, [id]: item } };
}

function buy(s: GameState, id: IngredientId, supplier: SupplierId, packs: number): GameState {
  const sup = SUPPLIERS[supplier];
  if (!canShop(s) || packs < Math.max(1, sup.minPacks) || !inStock(s, id, supplier)) return s;
  const price = packPrice(s, id, supplier, packs);
  const cost = round2(price * packs);
  if (cost > s.cash + 1e-9) return s;
  const def = INGREDIENTS[id];
  const units = def.pack * packs;
  const saved = Math.max(0, normalPackPrice(s, id) * packs - cost);
  const lock = s.locks.find((l) => l.ingredient === id && l.until >= s.day);
  const lockSaved = lock ? Math.max(0, (s.market.prices[id] - lock.price) * def.price * sup.priceMult * packs) : 0;
  let next = move(s, 'cashInventory', -cost);
  if (sup.leadDays === 0) next = addToPantry(next, id, units, cost, sup.quality, sup.eco);
  else next = { ...next, deliveries: [...next.deliveries, { id: next.nextId, ingredient: id, supplier, packs, cost, arrives: next.day + sup.leadDays, quality: sup.quality, eco: sup.eco }], nextId: next.nextId + 1 };
  next = {
    ...next,
    supplierLoyalty: { ...next.supplierLoyalty, [supplier]: next.supplierLoyalty[supplier] + packs },
    today: { ...next.today, savedOnSupplies: next.today.savedOnSupplies + saved, purchasedUnits: next.today.purchasedUnits + units, purchasedEco: next.today.purchasedEco + units * sup.eco, lockSaved: (next.today.lockSaved ?? 0) + lockSaved },
    questProgress: { ...next.questProgress, packs: (next.questProgress.packs ?? 0) + packs, saved: (next.questProgress.saved ?? 0) + saved, lockSaved: (next.questProgress.lockSaved ?? 0) + lockSaved },
  };
  next = learn(next, 'variableCost');
  if (packs >= 5) next = learn(next, 'scale');
  return checkProgress(next);
}

function receiveDeliveries(s: GameState): GameState {
  let next = s;
  const arriving = s.deliveries.filter((d) => d.arrives <= s.day);
  for (const d of arriving) next = addToPantry(next, d.ingredient, d.packs * INGREDIENTS[d.ingredient].pack, d.cost, d.quality, d.eco);
  if (arriving.length) next = { ...next, deliveries: next.deliveries.filter((d) => d.arrives > s.day), today: { ...next.today, notes: [...next.today.notes, `${arriving.length} deliver${arriving.length === 1 ? 'y' : 'ies'} arrived this morning.`] } };
  // Contract deliveries arrive once a week on the contract's weekday.
  for (const c of next.contracts) {
    if (c.endDay < s.day || (s.day - c.startDay) % 7 !== 1) continue;
    const cost = round2(c.price * c.packsPerWeek);
    const sup = SUPPLIERS[c.supplier];
    next = move(next, 'cashInventory', -cost);
    next = addToPantry(next, c.ingredient, c.packsPerWeek * INGREDIENTS[c.ingredient].pack, cost, sup.quality, sup.eco);
    next = { ...next, contracts: next.contracts.map((x) => (x.id === c.id ? { ...x, delivered: x.delivered + c.packsPerWeek } : x)) };
  }
  return { ...next, contracts: next.contracts.filter((c) => c.endDay >= s.day) };
}

function placeReorders(s: GameState): GameState {
  let next = s;
  for (const [id, rule] of Object.entries(s.reorder) as [IngredientId, NonNullable<GameState['reorder'][IngredientId]>][]) {
    if (!rule) continue;
    const incoming = next.deliveries.filter((d) => d.ingredient === id).reduce((t, d) => t + d.packs * INGREDIENTS[id].pack, 0);
    if (next.pantry[id].qty + incoming >= rule.below) continue;
    const before = next.cash;
    next = buy({ ...next, phase: 'morning' }, id, rule.supplier, rule.packs);
    next = { ...next, phase: s.phase };
    if (next.cash === before) next = { ...next, today: { ...next.today, notes: [...next.today.notes, `Couldn't reorder ${INGREDIENTS[id].name.toLowerCase()} (out of stock or not enough cash).`] } };
  }
  return next;
}

// ---------------------------------------------------------------- baking

function bake(s: GameState, item: ProductId | 'baguette', process: number): GameState {
  if (s.phase !== 'morning' || s.events.length || s.traysToday >= trayCapacity(s)) return s;
  const recipe = item === 'baguette' ? BAGUETTE.recipe : PRODUCTS[item].recipe;
  const yieldN = item === 'baguette' ? BAGUETTE.yield : PRODUCTS[item].yield;
  if (item !== 'baguette' && (PRODUCTS[item].kind !== 'tray' || !canOffer(s, item))) return s;
  if (item !== 'baguette' && displayUse(s) + yieldN > displayCapacity(s)) return s;
  if (!canBakeTray(s, recipe)) return s;
  const cost = recipeCost(s, recipe);
  const bonus = item === 'baguette' ? 0 : masteryBonus(s, item) + staffQualityBonus(s);
  const quality = blendQuality(clamp(process, 0, 100), ingredientQuality(s, recipe), bonus);
  const pantry = { ...s.pantry };
  for (const [id, n] of Object.entries(recipe) as [IngredientId, number][]) pantry[id] = { ...pantry[id], qty: pantry[id].qty - n };
  const merge = (st: StockItem): StockItem => {
    const qty = st.qty + yieldN;
    return { qty, quality: Math.round((st.qty * st.quality + yieldN * quality) / qty), unitCost: (st.qty * st.unitCost + cost) / qty, fresh: s.day * 100 + s.traysToday, madeDay: st.qty > 0 ? st.madeDay ?? s.day : s.day };
  };
  let next: GameState = { ...s, pantry, traysToday: s.traysToday + 1 };
  if (item === 'baguette') next.baguettes = merge(s.baguettes);
  else {
    next.display = { ...s.display, [item]: merge(s.display[item]) };
    next.bakedToday = { ...s.bakedToday, [item]: s.bakedToday[item] + 1 };
    next.today = { ...s.today, made: { ...s.today.made, [item]: s.today.made[item] + yieldN } };
  }
  next.questProgress = { ...next.questProgress, bestTrays: Math.max(next.questProgress.bestTrays ?? 0, next.traysToday), bestBake: Math.max(next.questProgress.bestBake ?? 0, quality) };
  return checkProgress(learn(next, 'inventory'));
}

/** Autopilot quality: bakers do it well, the owner on autopilot does a fair job. */
function autoProcess(s: GameState): number {
  const bakers = s.staff.filter((e) => e.branch === null && (e.role === 'baker' || e.role === 'pastryChef'));
  return bakers.length ? Math.min(95, 62 + 7 * (bakers.reduce((t, e) => t + e.skill, 0) / bakers.length)) : 72;
}

function autoStock(s: GameState): GameState {
  if (s.plan.autoStock === false || !featureOn(s, 'market.wet')) return s;
  const bulk = featureOn(s, 'market.suppliers');
  const need = ingredientsNeeded(s, forecast(s, 1));
  let next = s;
  for (const [id, n] of Object.entries(need) as [IngredientId, { short: number }][]) {
    if (!n.short) continue;
    let packs = Math.ceil(n.short / INGREDIENTS[id].pack);
    // Before bulk tiers unlock, the autopilot carries home at most 5 packs at a time, like the player.
    while (packs > 0) {
      const n5 = bulk ? packs : Math.min(5, packs);
      next = buy(next, id, 'cho', n5);
      packs -= n5;
    }
  }
  return next;
}

function autoBake(s: GameState): GameState {
  if (s.phase !== 'morning' || s.events.length) return s;
  let next = autoStock(s);
  const plan = { ...suggestedTrays(next), ...Object.fromEntries(Object.entries(next.plan.trays).filter(([, v]) => v !== undefined)) } as Partial<Record<ProductId | 'baguette', number>>;
  const q = autoProcess(next);
  const order: (ProductId | 'baguette')[] = ['baguette', ...onMenu(next).filter((p) => PRODUCTS[p].kind === 'tray')];
  let guard = 0;
  let progress = true;
  while (progress && guard++ < 60) {
    progress = false;
    for (const item of order) {
      const want = plan[item] ?? 0;
      const done = item === 'baguette' ? next.today.trays : next.bakedToday[item as ProductId];
      if ((item === 'baguette' ? (next.questProgress.autoBaguettes ?? 0) : done) >= want) continue;
      const before = next.traysToday;
      next = bake(next, item, q);
      if (next.traysToday > before) {
        progress = true;
        if (item === 'baguette') next = { ...next, questProgress: { ...next.questProgress, autoBaguettes: (next.questProgress.autoBaguettes ?? 0) + 1 } };
      }
    }
  }
  return { ...next, questProgress: { ...next.questProgress, autoBaguettes: 0 } };
}

// ---------------------------------------------------------------- closing the day

/** Notice: the price change has played out. Score the guess, keep the record, teach the idea. */
function settlePrediction(s: GameState): GameState {
  const p = s.pendingPrediction;
  if (!p) return s;
  const unitsAfter = s.today.sold[p.product] ?? 0;
  // Compare per 10 shoppers, so a busier street doesn't make a higher price look like it sold more.
  const rateAfter = s.today.customers > 0 ? (unitsAfter / s.today.customers) * 10 : 0;
  const moneyAfter = s.today.customers > 0 ? ((s.today.revenueBy[p.product] ?? 0) / s.today.customers) * 10 : 0;
  const money = p.ask === 'money' && p.moneyBefore !== undefined;
  const before = money ? p.moneyBefore! : p.rateBefore ?? p.unitsBefore;
  const after = money ? moneyAfter : p.rateBefore !== undefined ? rateAfter : unitsAfter;
  const diff = before > 0 ? (after - before) / before : after > 0 ? 1 : 0;
  const result: Guess = diff > 0.1 ? 'more' : diff < -0.1 ? 'fewer' : 'same';
  const right = p.guess !== undefined && p.guess === result;
  const record: Prediction = { day: s.day, product: p.product, from: p.from, to: p.to, unitsBefore: p.unitsBefore, unitsAfter, rateBefore: p.rateBefore, rateAfter, guess: p.guess, result, ask: p.ask, moneyBefore: p.moneyBefore, moneyAfter };
  let next: GameState = { ...s, pendingPrediction: null, predictions: [...(s.predictions ?? []).slice(-29), record], xp: s.xp + (right ? 10 : 0) };
  next = { ...next, questProgress: { ...next.questProgress, predictions: (next.questProgress.predictions ?? 0) + (p.guess ? 1 : 0), predictionsRight: (next.questProgress.predictionsRight ?? 0) + (right ? 1 : 0) } };
  return learn(next, 'elasticity', p.to > p.from ? 'elasticityCompare' : 'elasticity');
}

function closeBooks(s: GameState): GameState {
  let next = settlePrediction(s);
  if ((next.today.surplus ?? 0) > 0) next = learn(next, 'surplus');
  const t0 = next.today;
  // Leftovers.
  let display = { ...next.display };
  let baguettes = next.baguettes;
  let community = next.community;
  let rep = next.reputation;
  let wasteUnits = 0;
  let wasteCost = 0;
  let donated = 0;
  let kept = 0;
  for (const [key, choice] of Object.entries(next.leftoverPlan) as [ProductId | 'baguette', LeftoverChoice][]) {
    const st = key === 'baguette' ? baguettes : display[key];
    if (!st || st.qty <= 0) continue;
    const keep = choice === 'keep' && key !== 'baguette' && keepsOvernight(next, key);
    if (keep) {
      kept += st.qty;
      display = { ...display, [key]: { ...st, quality: Math.max(30, st.quality - (PRODUCTS[key].season ? 1 : 8)) } };
      continue;
    }
    if (choice === 'bin') wasteUnits += st.qty;
    else {
      donated += st.qty;
      community = bump(community, Math.min(3, st.qty * 0.25));
      rep = bump(rep, Math.min(1, st.qty * 0.05));
    }
    wasteCost += st.qty * st.unitCost;
    if (key === 'baguette') baguettes = { ...baguettes, qty: 0 };
    else display = { ...display, [key]: { ...st, qty: 0 } };
  }
  next = accrue({ ...next, display, baguettes, community: round2(community), reputation: rep }, { waste: wasteCost });

  // Spoilage: perishables go off overnight, faster without a fridge or when the cold room is overfull.
  const pantry = { ...next.pantry };
  const fridge = fridgeWorks(next);
  const coldOver = Math.max(0, storageUse(next, true) - coldCapacity(next));
  let spoil = 0;
  for (const id of INGREDIENT_ORDER) {
    const def = INGREDIENTS[id];
    if (!def.spoil || pantry[id].qty <= 0) continue;
    const overflow = def.cold && coldOver > 0 ? ECON.inventory.overflowSpoilMult : 1;
    const lost = Math.floor(pantry[id].qty * def.spoil * (fridge ? 0.5 : 1) * overflow);
    if (lost > 0) {
      spoil += lost * pantry[id].avgCost;
      pantry[id] = { ...pantry[id], qty: pantry[id].qty - lost };
    }
  }
  next = accrue({ ...next, pantry }, { spoilage: spoil });

  // Daily costs of running the shop.
  const wageBill = wages(next);
  const util = utilities(next, next.traysToday);
  const maint = maintenance(next);
  const rentToday = rent(next);
  const dep = dailyDepreciation(next);
  next = move(next, 'cashWages', -wageBill, { wages: wageBill });
  next = move(next, 'cashOperatingOther', -(util + maint), { utilities: util, maintenance: maint });
  next = accrue({ ...next, prepaidRent: next.prepaidRent - rentToday }, { rent: rentToday });
  next = accrue({ ...next, equipment: next.equipment.map((e) => ({ ...e, depreciated: Math.min(e.cost, e.depreciated + Math.min(e.cost - e.depreciated, e.cost / (UPGRADES[e.kind].life * 360))) })) }, { depreciation: dep });
  for (const c of next.campaigns) {
    const def = CAMPAIGNS[c.kind];
    if (def.ongoing && c.endDay >= next.day) {
      const fee = round2(def.ongoing * t0.revenue);
      const paid = spend(next, fee, false, 'marketing');
      if (paid) next = paid;
    }
  }

  // Interest accrues every day; it's paid monthly.
  const loans = next.loans.map((l) => ({ ...l, accrued: l.accrued + (l.balance * l.rate) / 360 }));
  const lineInterest = (next.creditLine.balance * creditLineRate(next)) / 360;
  const bonds = next.bonds.map((b) => ({ ...b, accrued: b.accrued + (b.amount * b.rate) / 360 }));
  const interest = loans.reduce((t, l, i) => t + l.accrued - next.loans[i].accrued, 0) + lineInterest + bonds.reduce((t, b, i) => t + b.accrued - next.bonds[i].accrued, 0);
  next = accrue({ ...next, loans, bonds, creditLine: { ...next.creditLine, accrued: next.creditLine.accrued + lineInterest } }, { interest });

  // Other shops.
  let branchProfit = 0;
  const branches = [];
  for (const b of next.branches) {
    if (b.closed) {
      branches.push(b);
      continue;
    }
    const r = simulateBranch(next, b);
    branchProfit += r.branch.lastProfit;
    branches.push(r.branch);
    const cashIn = Object.entries(r.books).filter(([k]) => k.startsWith('cash')).reduce((t, [, v]) => t + v, 0);
    next = { ...next, cash: next.cash + cashIn, today: { ...next.today, books: addBooks(next.today.books, r.books) } };
  }
  next = { ...next, branches, questProgress: { ...next.questProgress, branchProfit } };

  return {
    ...next,
    today: { ...next.today, wasteUnits: t0.wasteUnits + wasteUnits, wasteCost: t0.wasteCost + wasteCost, donatedUnits: t0.donatedUnits + donated, keptUnits: t0.keptUnits + kept, spoilage: spoil, wages: wageBill, energy: util, rent: rentToday, interest },
  };
}

/** Cover a shortfall from savings, then the credit line; pay the line back when cash is comfortable. */
function settleCash(s: GameState): GameState {
  let next = s;
  if (next.cash < 0 && next.safetyFund > 0) {
    const pull = Math.min(next.safetyFund, -next.cash);
    next = { ...next, cash: next.cash + pull, safetyFund: next.safetyFund - pull, today: { ...next.today, notes: [...next.today.notes, `The safety fund covered $${pull.toFixed(2)} of today's bills.`] } };
  }
  if (next.cash < 0) {
    const room = Math.max(0, creditLimit(next) - next.creditLine.balance);
    const draw = Math.min(room, -next.cash);
    if (draw > 0) {
      next = move({ ...next, creditLine: { ...next.creditLine, balance: next.creditLine.balance + draw } }, 'cashBorrowed', draw);
      next = learn({ ...next, today: { ...next.today, notes: [...next.today.notes, `Cash ran short: the bank's credit line covered $${draw.toFixed(2)} at ${(creditLineRate(next) * 100).toFixed(0)}% a year.`] } }, 'cashFlow', 'interest');
    }
  } else if (next.creditLine.balance > 0 && next.cash > ECON.finance.cashBuffer) {
    const pay = Math.min(next.creditLine.balance, next.cash - ECON.finance.cashBuffer);
    next = move({ ...next, creditLine: { ...next.creditLine, balance: next.creditLine.balance - pay } }, 'cashRepaid', -pay);
  }
  return { ...next, daysInDistress: next.cash < -1 ? next.daysInDistress + 1 : 0 };
}

/** Reputation drifts toward what customers actually experienced: satisfaction, minus people turned away. */
function reputationDrift(s: GameState, t: DayStats): number {
  if (t.customers === 0) return -0.3;
  const avgSat = t.served ? t.satisfaction / t.served : 0.4;
  const lostRate = (t.lostSlow + t.lostSoldOut * 0.5) / Math.max(1, t.customers);
  const target = clamp(avgSat * 115 - lostRate * 45 + (s.decor.length + (has(s, 'corner') ? 3 : 0)) * 0.6, 5, 98);
  const marketer = s.staff.some((e) => e.role === 'marketer' && e.branch === null) ? 0.4 : 0;
  return 0.06 * (target - s.reputation) + marketer;
}

function summarise(s: GameState, t: DayStats): DaySummary {
  const is = incomeStatement(t.books);
  const made = PRODUCT_ORDER.reduce((a, p) => a + t.made[p], 0);
  const totalShoppers = t.customers + t.diverted;
  return {
    day: s.day,
    weather: t.weather,
    revenue: round2(is.revenue),
    expenses: round2(is.revenue - is.netProfit),
    profit: round2(is.netProfit),
    customers: t.customers,
    served: t.served,
    wasteRate: made > 0 ? t.wasteUnits / made : 0,
    eco: ecoScore(s),
    reputation: s.reputation,
    cash: round2(s.cash + s.safetyFund),
    books: t.books,
    sold: t.sold,
    revenueBy: t.revenueBy,
    cogsBy: t.cogsBy,
    lost: t.lostPrice + t.lostSlow + t.lostSoldOut,
    wished: { ...t.wishedFor },
    lostSoldOut: t.lostSoldOut,
    lostPrice: t.lostPrice,
    lostSlow: t.lostSlow,
    lostSlowKind: t.lostSlowKind,
    diverted: t.diverted,
    inventoryValue: round2(inventoryValue(s)),
    staff: s.staff.length,
    satisfaction: t.served ? t.satisfaction / t.served : 0,
    surplus: t.surplus ?? 0,
    segments: Object.fromEntries(Object.entries(t.segments).map(([k, v]) => [k, v?.served ?? 0])),
    share: totalShoppers ? t.customers / totalShoppers : 1,
    prices: { ...s.prices },
    priceIndex: s.macro.priceIndex,
    confidence: s.macro.confidence,
  };
}

function finalSummary(h: DaySummary, s: GameState): DaySummary {
  const is = incomeStatement(s.today.books);
  return { ...h, books: s.today.books, cash: round2(s.cash + s.safetyFund), revenue: round2(is.revenue), profit: round2(is.netProfit), expenses: round2(is.revenue - is.netProfit) };
}

function finishDay(s: GameState): GameState {
  if (s.phase !== 'closing') return s;
  const cashBefore = s.cash;
  const levelBefore = levelOf(s.xp);
  const ecoBefore = ecoScore(s);
  let next = closeBooks(settleChallenge(s));
  next = placeReorders(next);
  next = settleCash(next);
  let fund = next.safetyFund;
  let savedToFund = 0;
  const profit = netProfit(next.today.books);
  if (profit > 0 && next.savingsRate > 0 && next.cash > 0) {
    savedToFund = round2(Math.min(next.cash, profit * next.savingsRate));
    next = { ...next, cash: next.cash - savedToFund };
    fund += savedToFund;
  }
  const t = next.today;
  const made = PRODUCT_ORDER.reduce((a, p) => a + t.made[p], 0);
  const wasteRate = made > 0 ? t.wasteUnits / made : 0;
  const sourcingEco = t.purchasedUnits > 0 ? t.purchasedEco / t.purchasedUnits : next.ecoHistory.length ? next.ecoHistory[next.ecoHistory.length - 1].sourcingEco : 50;
  const stars = starsFor(incomeStatement(t.books).revenue, t.goal);
  const starXp = STAR_XP[stars];
  next = arcDayEnd(next, stars);
  const xpGain = t.xp + starXp + Math.max(0, Math.round(profit / ECON.progression.xpProfitDivisor));
  next = {
    ...next,
    safetyFund: fund,
    reputation: round2(clamp(next.reputation + reputationDrift(next, t), 0, 100)),
    xp: next.xp + xpGain,
    questProgress: { ...next.questProgress, stars: (next.questProgress.stars ?? 0) + stars, threeStarDays: (next.questProgress.threeStarDays ?? 0) + (stars === 3 ? 1 : 0), bestFund: Math.max(next.questProgress.bestFund ?? 0, fund), bestMorning: Math.max(next.questProgress.bestMorning ?? 0, t.servedBeforeNoon) },
    ecoHistory: [...next.ecoHistory, { day: next.day, sourcingEco, wasteRate }].slice(-30),
    lifetime: {
      ...next.lifetime,
      profit: next.lifetime.profit + profit,
      donated: next.lifetime.donated + t.donatedUnits,
      zeroWasteDays: next.lifetime.zeroWasteDays + (t.wasteUnits === 0 && made > 0 && t.served >= 10 && t.donatedUnits <= made * 0.25 ? 1 : 0),
    },
    leftoverPlan: {},
    staff: updateMorale(next, next.service ? next.service.servers.filter((x) => x.served > 0).length / Math.max(1, next.service.servers.length) : 0.5),
  };
  next = { ...next, history: [...next.history, { ...summarise(next, t), stars }].slice(-400) };
  if (t.wasteUnits > 0) next = learn(next, 'waste');
  if (profit < 0) next = learn(next, 'fixedCost');
  next = learn(next, 'revenue', 'profit');
  next = checkProgress(next);
  const why = next.history.length >= 8 ? explainChange(next.history.slice(-1), next.history.slice(-8, -1)) : [];
  const report: Report = {
    day: s.day,
    stats: next.today,
    expenses: incomeStatement(next.today.books).revenue - profit,
    profit,
    stars,
    starXp,
    cashBefore,
    cashAfter: next.cash,
    recap: recap(s, next.today),
    tip: businessTip(s, next.today, profit),
    ecoBefore,
    ecoAfter: ecoScore(next),
    levelBefore,
    levelAfter: levelOf(next.xp),
    communityDelta: next.community - t.community,
    repDelta: next.reputation - t.reputation,
    newUnlocks: next.unlocked.filter((p) => !s.unlocked.includes(p)).map((p) => PRODUCTS[p].name),
    loanPaid: 0,
    savedToFund,
    why,
    branchProfit: next.questProgress.branchProfit ?? 0,
  };
  return { ...next, lastReport: report, phase: 'report' };
}

// ---------------------------------------------------------------- months

function monthRecord(s: GameState): MonthRecord | null {
  const d = dateOf(s.day - 1);
  const days = s.history.filter((h) => {
    const g = dateOf(h.day);
    return g.year === d.year && g.month === d.month;
  });
  if (!days.length) return null;
  const books = sumBooks(days);
  return { year: d.year, month: d.month, startDay: days[0].day, endDay: days[days.length - 1].day, books, revenue: incomeStatement(books).revenue, profit: incomeStatement(books).netProfit, served: days.reduce((t, h) => t + h.served, 0), customers: days.reduce((t, h) => t + h.customers, 0), endCash: days[days.length - 1].cash };
}

function startOfMonth(s: GameState): GameState {
  let next = s;
  const rec = monthRecord(next);
  if (rec) next = { ...next, months: [...next.months, rec].slice(-240) };

  const sc = SCENARIOS[next.scenario];
  const before = next.macro.regime;
  next = { ...next, macro: monthlyMacro(next.macro, next.seed, next.day, next.difficulty, next.day < sc.regimeMonths * 30 ? sc.regimeMonths : 0) };
  if (next.macro.regime !== before && next.day > 30) next = { ...next, events: [...next.events, { id: 'regimeChange', day: next.day }] };
  if (next.macro.regime === 'recession') next = { ...next, questProgress: { ...next.questProgress, recessionMonths: (next.questProgress.recessionMonths ?? 0) + 1 } };

  // Rent for the coming month, paid in advance.
  const rentDue = rent(next) * ECON.calendar.daysPerMonth;
  next = move({ ...next, prepaidRent: next.prepaidRent + rentDue }, 'cashRent', -rentDue);
  if (next.day > 1) next = toast(next, 'warning', 'Rent day!', `Paid ${Math.round(rentDue).toLocaleString('en-US')} dollars for the whole month. That's why we keep cash in the drawer.`);

  // Loan instalments: interest first, then principal.
  const loans = [];
  for (const l of next.loans) {
    const due = Math.min(l.payment, l.balance + l.accrued);
    if (next.cash + next.safetyFund + Math.max(0, creditLimit(next) - next.creditLine.balance) < due) {
      next = toast(spend(next, Math.min(next.cash, ECON.finance.latePaymentFee), false) ?? next, 'warning', 'Missed loan payment', `${l.lender} charged a late fee. Miss ${ECON.finance.defaultMisses} and the loan is called in.`);
      loans.push({ ...l, missed: l.missed + 1 });
      continue;
    }
    const interestPart = Math.min(due, l.accrued);
    const principalPart = Math.min(l.balance, due - interestPart);
    next = move(next, 'cashInterest', -interestPart);
    next = move(next, 'cashRepaid', -principalPart);
    const balance = round2(l.balance - principalPart);
    if (balance <= 0.01) {
      next = toast({ ...next, questProgress: { ...next.questProgress, loanRepaid: 1 } }, 'quest', 'Loan paid off!', `${l.lender} is fully repaid.`);
      continue;
    }
    loans.push({ ...l, balance, accrued: l.accrued - interestPart, monthsLeft: Math.max(1, l.monthsLeft - 1), interestPaid: l.interestPaid + interestPart });
  }
  next = { ...next, loans };
  const defaulted = loans.find((l) => l.missed >= ECON.finance.defaultMisses);
  if (defaulted) next = { ...next, daysInDistress: ECON.finance.bankruptcyDays };

  // Credit line interest.
  if (next.creditLine.accrued > 0) {
    const a = next.creditLine.accrued;
    next = move({ ...next, creditLine: { ...next.creditLine, accrued: 0 } }, 'cashInterest', -a);
  }

  // Bonds that mature.
  const bonds = [];
  for (const b of next.bonds) {
    if (b.dueDay <= next.day) {
      next = move(next, 'cashRepaid', -b.amount);
      next = move(next, 'cashInterest', -b.accrued);
      next = toast({ ...next, community: bump(next.community, 3) }, 'info', 'Community bond repaid', `Your neighbours got their $${Math.round(b.amount)} back with interest. +3 community.`);
    } else bonds.push(b);
  }
  next = { ...next, bonds };

  // Investors get their share of last month's profit.
  if (rec && rec.profit > 0 && next.investors.length) {
    for (const inv of next.investors) {
      const pay = round2(inv.stake * rec.profit);
      next = move(next, 'cashDistributions', -pay);
      next = { ...next, equity: { ...next.equity, distributions: next.equity.distributions + pay }, investors: next.investors.map((i) => (i.id === inv.id ? { ...i, paidOut: i.paidOut + pay } : i)) };
    }
  }

  // Rivals, valuation offers.
  const comp = monthlyCompetition(next);
  next = { ...next, competitors: comp.competitors };
  for (const n of comp.news) next = toast(next, 'info', 'Neighbourhood news', n);
  const v = valuation(next);
  if (v.ownerValue > ECON.valuation.offerThreshold && !next.offer && rngFor(next.seed, next.day, 921)() < ECON.valuation.offerChance) {
    const buyers = ['Golden Lotus Restaurant Group', 'Saigon Express Holdings', 'A family from Little Saigon', 'Mekong Ventures'];
    next = { ...next, offer: { amount: Math.round((v.ownerValue * (0.85 + 0.4 * rngFor(next.seed, next.day, 923)())) / 100) * 100, buyer: buyers[Math.floor(rngFor(next.seed, next.day, 925)() * buyers.length)], day: next.day + 1 } };
  }
  return next;
}

// ---------------------------------------------------------------- new day

function startDay(s: GameState): GameState {
  const prevBooks = s.today.books;
  const day = s.day + 1;
  // Anything earned after the report (quest bonuses, weekly rewards) belongs to yesterday's final books.
  const history = s.history.length && s.history[s.history.length - 1].day === s.day ? [...s.history.slice(0, -1), finalSummary(s.history[s.history.length - 1], s)] : s.history;
  let next: GameState = {
    ...s,
    history,
    day,
    equity: { ...s.equity, retained: s.equity.retained + netProfit(prevBooks) },
    macro: dailyMacro(s.macro),
    phase: 'morning',
    service: null,
    traysToday: 0,
    bakedToday: zeroProducts(),
    effects: s.effects.filter((e) => e.until >= day || e.id === 'repairDue'),
    locks: s.locks.filter((l) => l.until >= day),
    offer: s.offer && s.offer.day < day ? null : s.offer,
    events: [],
  };
  next.market = generateMarket(next.seed, day, s.market, { priceIndex: next.macro.priceIndex, volatility: DIFFICULTY[next.difficulty].priceVolatility, effects: next.effects });
  next.today = { ...emptyDay(day, next.market.weather), community: next.community, reputation: next.reputation };

  next = applySchedule(next);
  next = applyFeatureUnlocks(next);
  // Today's special: one everyday item from the menu pays more.
  next.special = null;
  if (day >= ECON.service.dailySpecial.fromDay && featureOn(next, 'today.special')) {
    const pool = onMenu(next).filter((p) => !PRODUCTS[p].season);
    next.special = pool.length ? pool[Math.floor(rngFor(next.seed, day, 931)() * pool.length)] : null;
  }
  next = refreshIntroBase(next);
  next.challenge = pickChallenge(next);
  if (isMonthStart(day)) next = startOfMonth(next);
  // Repairs that were waiting.
  for (const e of next.effects.filter((x) => x.id === 'repairDue' && x.until < day)) {
    const uid = Number(e.data?.uid);
    const cost = Number(e.data?.cost ?? 0);
    next = spend(next, Math.min(cost, Math.max(0, next.cash)), false, 'maintenance') ?? next;
    const equipment = next.equipment.map((q) => (q.uid === uid ? { ...q, broken: false } : q));
    next = toast({ ...next, equipment, upgrades: refreshKinds(equipment) }, 'info', 'Repaired', 'Your equipment is working again.');
  }
  next = { ...next, effects: next.effects.filter((e) => e.until >= day) };

  // Regulars drift away: a steady trickle, faster after a bad day.
  if (day > 1) {
    const churn = loyalChurnRate(s);
    const r = rngFor(s.seed, day, 913);
    const loyal = { ...next.loyal };
    for (const k of Object.keys(loyal) as (keyof typeof loyal)[]) {
      const n = loyal[k] ?? 0;
      loyal[k] = Math.max(0, n - Math.floor(n * churn + r()));
    }
    next = { ...next, loyal };
  }

  next = receiveDeliveries(next);
  if (has(next, 'garden')) next = addToPantry(next, 'veg', 6, 0, 92, 100);

  // Kept goods that are too old go in the bin.
  const display = { ...next.display };
  let expired = 0;
  for (const p of PRODUCT_ORDER) {
    const st = display[p];
    if (st.qty > 0 && st.madeDay !== undefined && day - st.madeDay > PRODUCTS[p].shelfLife) {
      expired += st.qty * st.unitCost;
      display[p] = { ...st, qty: 0 };
    }
  }
  if (expired > 0) next = accrue({ ...next, display }, { waste: expired });

  // Staff: some quit, a new applicant pool each week, rivals react.
  for (const q of quitters(next)) {
    next = toast({ ...next, staff: next.staff.filter((e) => e.id !== q.id) }, 'warning', `${q.name} quit`, `Morale was too low. Your ${q.role} found another job.`);
  }
  if (day % 7 === 1) {
    const apps = weeklyApplicants(next);
    next = { ...next, applicants: apps, nextId: next.nextId + apps.length };
    const r = reactWeekly(next);
    next = { ...next, competitors: r.competitors };
    for (const n of r.news.slice(0, 2)) next = toast(next, 'info', 'Rival move', n);
  }
  next = { ...next, decisions: settleDecisions(next) };

  // Bankruptcy or rescue.
  if (next.daysInDistress >= ECON.finance.bankruptcyDays) {
    if (next.bailoutsUsed < DIFFICULTY[next.difficulty].bailouts) next = { ...next, events: [{ id: 'bailout', day }] };
    else {
      const v = valuation(next);
      return { ...next, phase: 'ended', ending: { kind: 'bankrupt', day, value: Math.max(0, v.equityValue), text: `${next.bakeryName} ran out of cash and credit on day ${day}.${next.loans.length ? ' The bank called in the loans.' : ' There was no money left to pay the bills.'}` } };
    }
  }

  const ev = eventFor(next, day);
  if (ev && EVENTS[ev.id]) next = { ...next, events: [...next.events, { id: ev.id, day, data: ev.data }] };
  if (isTetDay(day) && !isTetDay(day - 1)) next = toast(next, 'unlock', 'Chúc mừng năm mới!', 'Tết is here: mứt dừa gift boxes are on the menu.');
  return next;
}

function enterWeekly(s: GameState): GameState {
  let next = s;
  if (s.weeklyGoal && goalMet(s)) {
    const reward = Math.round(150 * s.macro.priceIndex);
    next = toast(move({ ...next, xp: next.xp + 60 }, 'cashOperatingOther', reward, { otherIncome: reward }), 'quest', `Weekly goal met: ${WEEKLY_GOALS[s.weeklyGoal.id].title}`, `Reward: $${reward} and a big XP boost`);
  }
  let dividends = 0;
  for (const c of Object.keys(next.shares) as CoopId[]) dividends += next.shares[c] * next.market.coop[c] * 0.015;
  if (dividends > 0) {
    next = move(next, 'cashOperatingOther', dividends, { otherIncome: dividends });
    next = learn(toast(next, 'info', 'Co-op dividends', `Your shares paid $${dividends.toFixed(2)} this week.`), 'dividends');
  }
  const ids = Object.keys(WEEKLY_GOALS);
  const r = rngFor(s.seed, s.day, 61);
  const choices = [...ids].sort(() => r() - 0.5).slice(0, 3);
  return checkProgress({ ...next, phase: 'weekly', goalChoices: choices, weeklyGoal: null });
}

// ---------------------------------------------------------------- equipment

function buyEquipment(s: GameState, id: UpgradeId): GameState {
  const def = UPGRADES[id];
  const cost = Math.round(def.cost * s.macro.priceIndex);
  if (!canShop(s) || countOf(s, id) >= def.max || levelOf(s.xp) < def.level || (def.requires && !has(s, def.requires)) || s.cash < cost) return s;
  const equipment = [...s.equipment, { uid: s.nextUid, kind: id, cost, boughtDay: s.day, depreciated: 0, broken: false }];
  let next = move({ ...s, equipment, upgrades: refreshKinds(equipment), nextUid: s.nextUid + 1 }, 'cashCapex', -cost);
  next = decide(next, { kind: 'equipment', text: `Bought a ${def.name.toLowerCase()} for $${cost.toLocaleString('en-US')}.`, metric: 'profit', before: avgProfit(s) });
  next = toast(next, 'unlock', `${def.name}!`, def.effect);
  next = learn(next, def.rent ? 'fixedCost' : 'investment', 'capex', 'opportunityCost', 'depreciation');
  return checkProgress(next);
}

function sellEquipment(s: GameState, uid: number): GameState {
  const e = s.equipment.find((x) => x.uid === uid);
  if (!e || !canShop(s) || UPGRADES[e.kind].group === 'room') return s;
  const book = e.cost - e.depreciated;
  const proceeds = round2(book * 0.6);
  const equipment = s.equipment.filter((x) => x.uid !== uid);
  let next = move({ ...s, equipment, upgrades: refreshKinds(equipment) }, 'cashCapex', proceeds);
  next = accrue(next, proceeds >= book ? { otherIncome: proceeds - book } : { otherExpense: book - proceeds });
  return toast(next, 'info', 'Sold', `You sold the ${UPGRADES[e.kind].name.toLowerCase()} for $${proceeds.toFixed(0)} (book value $${book.toFixed(0)}).`);
}

const avgProfit = (s: GameState) => {
  const h = s.history.slice(-7);
  return h.length ? h.reduce((t, x) => t + x.profit, 0) / h.length : 0;
};
const avgUnits = (s: GameState, p: ProductId) => {
  const h = s.history.slice(-7);
  return h.length ? h.reduce((t, x) => t + (x.sold[p] ?? 0), 0) / h.length : 0;
};

// ---------------------------------------------------------------- run a whole day

/** Let the team (and the owner on autopilot) run the day instantly. */
function runDay(s: GameState): GameState {
  if (s.phase !== 'morning' || s.events.length) return s;
  let next = autoBake(s);
  next = openShop(next, true);
  next = fastForward(next);
  return finishDay(next);
}

// ---------------------------------------------------------------- reducer

/** Counters for intro quests: bumped whenever one of these actions changes the game. */
const COUNTERS: Partial<Record<Action['type'], string>> = {
  setPrice: 'priceEdits',
  setMenu: 'menuToggles',
  setPackaging: 'packagingChanges',
  setPlan: 'planEdits',
  lockPrice: 'locksMade',
  train: 'trainings',
  campaign: 'campaigns',
  runDay: 'teamDays',
  handOver: 'teamDays',
};

/** Which feature an action needs right now (buying beyond the wet market needs more suppliers). */
export function actionFeature(a: Action): FeatureId | undefined {
  if (a.type === 'buy' && (a.supplier !== 'cho' || a.packs > 5)) return 'market.suppliers';
  return ACTION_FEATURE[a.type];
}

/** Quick bake: unlocked per recipe after a few bakes by hand, always normal quality. */
export const QUICK_BAKE = { practice: 3, quality: 72 };
export const handBakes = (s: GameState, item: ProductId | 'baguette') => s.questProgress[`handBakes_${item}`] ?? 0;
/** Experienced bakers (everything unlocked) skip the practice. */
export const quickBakeReady = (s: GameState, item: ProductId | 'baguette') => s.allUnlocked !== false || handBakes(s, item) >= QUICK_BAKE.practice;

export const DEFAULT_STYLE: ShopStyle = { wall: 0, pattern: 0, floor: 0, counter: 0, spots: {} };
/** Decorations the player can move between three spots. */
export const MOVABLE: DecorId[] = ['plant', 'hoaMai', 'birdcage'];
const DEFAULT_SPOT: Partial<Record<DecorId, number>> = { plant: 0, hoaMai: 2, birdcage: 0 };
export const decorSpot = (style: ShopStyle | undefined, id: DecorId): number => style?.spots[id] ?? DEFAULT_SPOT[id] ?? 0;

export function gameReducer(s: GameState, a: Action): GameState {
  // Locked systems: the reducer refuses them, so the UI, the team and the autopilot all play by the same rules.
  const need = actionFeature(a);
  if (need && !featureOn(s, need)) return s;
  let next = reduce(s, a);
  if (next === s) return s;
  const k = COUNTERS[a.type];
  if (k) next = { ...next, questProgress: { ...next.questProgress, [k]: (next.questProgress[k] ?? 0) + 1 } };
  if (a.type === 'bake' && s.traysToday < trayCapacity(s) && next.traysToday >= trayCapacity(next)) next = { ...next, questProgress: { ...next.questProgress, capHits: (next.questProgress.capHits ?? 0) + 1 } };
  return next.intro?.active ? checkIntro(next) : next;
}

function reduce(s: GameState, a: Action): GameState {
  if (s.ending && a.type !== 'newGame' && a.type !== 'load' && a.type !== 'dismissToast') return s;
  // Untrusted input guard: NaN or ±Infinity anywhere in an action would silently pass every `<`/`>` check.
  if (a.type !== 'load' && a.type !== 'newGame' && Object.values(a).some((v) => typeof v === 'number' && !Number.isFinite(v))) return s;
  switch (a.type) {
    case 'setup': {
      if (s.phase !== 'setup') return s;
      let next: GameState = { ...s, bakeryName: a.name.trim().slice(0, 28) || 'Viet Bake Shop', look: allowedLook(s, a.look), phase: 'morning' };
      if (a.location && a.location !== s.location && !SCENARIOS[s.scenario].location) {
        next = { ...next, location: a.location, competitors: seedCompetitors(a.location, SCENARIOS[s.scenario].extraRivals) };
        const left = ECON.calendar.daysPerMonth - dateOf(1).dom + 1;
        const prepaid = rent(next) * left;
        next = { ...next, prepaidRent: prepaid, equity: { ...next.equity, contributed: next.equity.contributed - s.prepaidRent + prepaid } };
      }
      return next;
    }
    case 'setLook':
      return { ...s, look: allowedLook(s, a.look) };
    case 'buyCosmetic': {
      const c = COSMETICS.find((x) => x.id === a.id);
      if (!c || owns(s, c.id) || starsToSpend(s) < c.cost) return s;
      const next = { ...s, cosmetics: [...(s.cosmetics ?? []), c.id], questProgress: { ...s.questProgress, starsSpent: (s.questProgress.starsSpent ?? 0) + c.cost } };
      return toast(next, 'unlock', `Unlocked: ${c.name}!`, c.kind === 'hair' || c.kind === 'accessory' ? 'Change your look any time from the star shop.' : 'Choose it in Paint, under the shop picture.');
    }
    case 'rename':
      return { ...s, bakeryName: a.name.trim().slice(0, 28) || s.bakeryName };
    case 'buy':
      return buy(s, a.ingredient, a.supplier, Math.floor(a.packs));
    case 'setReorder':
      if (a.below < 0 || a.packs < 1 || a.packs > 50) return s;
      return learn({ ...s, reorder: { ...s.reorder, [a.ingredient]: { below: Math.round(a.below), packs: Math.round(a.packs), supplier: a.supplier } } }, 'inventory');
    case 'clearReorder': {
      const reorder = { ...s.reorder };
      delete reorder[a.ingredient];
      return { ...s, reorder };
    }
    case 'buyForecast': {
      const need = ingredientsNeeded(s, forecast(s, 2));
      let next = s;
      for (const [id, n] of Object.entries(need) as [IngredientId, { short: number }][]) {
        if (n.short > 0) next = buy(next, id, a.supplier, Math.max(SUPPLIERS[a.supplier].minPacks, Math.ceil(n.short / INGREDIENTS[id].pack)));
      }
      return learn(next, 'forecasting');
    }
    case 'signContract': {
      if (!canShop(s) || !Number.isInteger(a.packsPerWeek) || !Number.isInteger(a.weeks) || a.packsPerWeek < 1 || a.packsPerWeek > 50 || a.weeks < 2 || a.weeks > 26) return s;
      const price = round2(packPrice(s, a.ingredient, a.supplier, a.packsPerWeek) * 1.03);
      const next = { ...s, contracts: [...s.contracts, { id: s.nextId, ingredient: a.ingredient, supplier: a.supplier, packsPerWeek: a.packsPerWeek, price, startDay: s.day, endDay: s.day + a.weeks * 7 - 1, delivered: 0 }], nextId: s.nextId + 1 };
      return learn(decide(next, { kind: 'contract', text: `Signed a ${a.weeks}-week contract: ${a.packsPerWeek} packs of ${INGREDIENTS[a.ingredient].name.toLowerCase()} a week at $${price}.`, metric: 'profit', before: avgProfit(s) }), 'hedging', 'contracts');
    }
    case 'cancelContract': {
      const c = s.contracts.find((x) => x.id === a.id);
      if (!c) return s;
      const fee = round2(c.price * c.packsPerWeek * 2);
      const next = spend(s, Math.min(fee, Math.max(0, s.cash)), false) ?? s;
      return toast({ ...next, contracts: next.contracts.filter((x) => x.id !== a.id) }, 'info', 'Contract cancelled', `A $${fee.toFixed(0)} cancellation fee (two weeks of deliveries).`);
    }
    case 'bake': {
      // Quick bake is earned, like auto-cook in Genshin: practise a recipe by hand first, and it only
      // ever comes out at normal quality. Baking by hand can reach perfect.
      if (a.quick) return quickBakeReady(s, a.item) ? bake(s, a.item, QUICK_BAKE.quality) : s;
      const next = bake(s, a.item, clamp(a.process, 0, 100));
      return next === s ? s : { ...next, questProgress: { ...next.questProgress, [`handBakes_${a.item}`]: (next.questProgress[`handBakes_${a.item}`] ?? 0) + 1 } };
    }
    case 'autoBake':
      return autoBake(s);
    case 'setPlan':
      return { ...s, plan: { ...s.plan, trays: { ...s.plan.trays, [a.item]: a.trays === null ? undefined : Math.max(0, Math.min(20, Math.round(a.trays))) } } };
    case 'setAutoStock':
      return { ...s, plan: { ...s.plan, autoStock: a.on } };
    case 'setPrice': {
      if (s.phase !== 'morning' || !Number.isFinite(a.price)) return s;
      const [lo, hi] = priceBounds(s, a.product);
      const price = round2(clamp(Math.round(a.price / ECON.service.priceStep) * ECON.service.priceStep, lo, hi));
      if (price === s.prices[a.product]) return s;
      // Predict: remember the change so tomorrow's result can be shown against a guess.
      const recent = s.history.slice(-3);
      const unitsBefore = recent.length ? recent.reduce((t, h) => t + (h.sold[a.product] ?? 0), 0) / recent.length : 0;
      const shoppers = recent.reduce((t, h) => t + h.customers, 0);
      const rateBefore = shoppers > 0 ? (recent.reduce((t, h) => t + (h.sold[a.product] ?? 0), 0) / shoppers) * 10 : 0;
      // The question takes turns: how many will buy it, then how much money it will bring in.
      const ask: PredictAsk = (s.predictions?.length ?? 0) % 2 === 0 ? 'buyers' : 'money';
      const moneyBefore = shoppers > 0 ? (recent.reduce((t, h) => t + (h.revenueBy?.[a.product] ?? 0), 0) / shoppers) * 10 : 0;
      const pending = s.pendingPrediction?.product === a.product ? { ...s.pendingPrediction, to: price } : { product: a.product, from: s.prices[a.product], to: price, unitsBefore, rateBefore, ask, moneyBefore };
      let next: GameState = { ...s, prices: { ...s.prices, [a.product]: price }, questProgress: { ...s.questProgress, priceTouched: 1 }, pendingPrediction: pending.from === pending.to ? null : pending };
      const last = s.decisions[s.decisions.length - 1];
      if (last && last.kind === 'price' && last.product === a.product && last.day === s.day) {
        next = { ...next, decisions: next.decisions.map((d) => (d.id === last.id ? { ...d, text: `${PRODUCTS[a.product].name}: $${(d.text.match(/\$([\d.]+) to/)?.[1] ?? s.prices[a.product].toFixed(2))} to $${price.toFixed(2)}.` } : d)) };
      } else next = decide(next, { kind: 'price', product: a.product, text: `${PRODUCTS[a.product].name}: $${s.prices[a.product].toFixed(2)} to $${price.toFixed(2)}.`, metric: 'revenue', before: avgUnits(s, a.product) ? s.history.slice(-7).reduce((t, h) => t + (h.revenueBy?.[a.product] ?? 0), 0) / Math.max(1, s.history.slice(-7).length) : 0 });
      return learn(next, 'elasticity');
    }
    case 'setMenu': {
      if (s.phase === 'service') return s;
      const menu = a.on ? [...new Set([...s.menu, a.product])] : s.menu.filter((p) => p !== a.product);
      return learn({ ...s, menu }, 'productMix');
    }
    case 'open': {
      if (s.phase !== 'morning' || s.events.length) return s;
      let next = s;
      if (s.questProgress.priceTouched) next = { ...next, questProgress: { ...next.questProgress, priceChanged: 1 } };
      if (effectActive(next, 'closedDay')) return finishDay(endService(openShop({ ...next, today: { ...next.today, notes: [...next.today.notes, 'Closed today after the failed inspection.'] } }, true)));
      return checkProgress(openShop(next));
    }
    case 'runDay':
      return runDay(s);
    case 'handOver': {
      if (s.phase !== 'service' || !s.service || s.service.auto) return s;
      const svc = { ...s.service, auto: true, servers: [{ id: 'owner', busyUntil: s.service.clock, visitId: null, quality: ECON.service.ownerAutoQuality, served: 0 }, ...s.service.servers] };
      return { ...s, service: svc };
    }
    case 'takeBack': {
      if (s.phase !== 'service' || !s.service || !s.service.auto) return s;
      const owner = s.service.servers.find((x) => x.id === 'owner');
      // Whatever Bà was in the middle of goes back in the line for you.
      const visits = s.service.visits.map((v) => (owner && v.id === owner.visitId && v.status === 'waiting' ? { ...v, servedBy: undefined } : v));
      return { ...s, service: { ...s.service, auto: false, visits, servers: s.service.servers.filter((x) => x.id !== 'owner') } };
    }
    case 'skipToClose': {
      if (s.phase !== 'service' || !s.service) return s;
      const handed = s.service.auto ? s : gameReducer(s, { type: 'handOver' });
      return checkProgress(fastForward(handed));
    }
    case 'tick': {
      const before = s.today.served;
      const next = tick(s, Math.max(0, Math.min(30, a.minutes)));
      return next.today.served !== before || next.phase !== s.phase ? checkProgress(next) : next;
    }
    case 'serve': {
      const next = serve(s, a.visitId, a.process === undefined ? undefined : clamp(a.process, 0, 100));
      return next === s ? s : checkProgress(next);
    }
    case 'lastCall':
      return setLastCall(s, a.on);
    case 'closeEarly':
      return s.phase === 'service' ? endService(s) : s;
    case 'leftover': {
      if (s.phase !== 'closing') return s;
      if (a.choice === 'keep' && (a.key === 'baguette' || !keepsOvernight(s, a.key))) return s;
      return { ...s, leftoverPlan: { ...s.leftoverPlan, [a.key]: a.choice } };
    }
    case 'finishDay':
      return finishDay(s);
    case 'nextDay': {
      if (s.phase !== 'report') return s;
      return s.day % 7 === 0 ? enterWeekly(s) : startDay(s);
    }
    case 'pickGoal': {
      if (s.phase !== 'weekly' || !s.goalChoices.includes(a.id)) return s;
      return startDay({ ...s, weeklyGoal: { id: a.id, target: WEEKLY_GOALS[a.id].target(s), startDay: s.day + 1, baseline: 0 } });
    }
    case 'resolveEvent': {
      const pending = s.events[0];
      if (!pending || s.phase !== 'morning') return s;
      if (pending.id === 'bailout') return resolveBailout(s, a.choice);
      const def = EVENTS[pending.id];
      if (!def) return { ...s, events: s.events.slice(1) };
      const choice = visibleChoices(def, s).find((c) => c.id === a.choice);
      if (!choice || (choice.enabled && !choice.enabled(s))) return s;
      let next = choice.apply(s);
      next = { ...next, eventsSeen: [...new Set([...(next.eventsSeen ?? []), pending.id])] };
      if (def.concept) next = learn(next, def.concept);
      next = { ...next, events: next.events.filter((e) => e !== pending) };
      if (next.ending) return { ...next, phase: 'ended' };
      return checkProgress(next);
    }
    case 'buyUpgrade':
      return buyEquipment(s, a.id);
    case 'sellEquipment':
      return sellEquipment(s, a.uid);
    case 'setStyle': {
      const style = { ...(s.style ?? DEFAULT_STYLE), [a.key]: Math.max(0, Math.min(7, Math.round(a.value))) };
      return allowedStyle(s, style) ? { ...s, style } : s;
    }
    case 'moveDecor': {
      if (!MOVABLE.includes(a.id) || !s.decor.includes(a.id)) return s;
      const style = s.style ?? DEFAULT_STYLE;
      // Floor plants share three spots: skip one that is taken.
      const other = a.id === 'plant' ? 'hoaMai' : a.id === 'hoaMai' ? 'plant' : null;
      const taken = other && s.decor.includes(other) ? decorSpot(style, other) : -1;
      let spot = (decorSpot(style, a.id) + 1) % 3;
      if (spot === taken) spot = (spot + 1) % 3;
      return { ...s, style: { ...style, spots: { ...style.spots, [a.id]: spot } } };
    }
    case 'buyDecor': {
      const def = DECOR[a.id];
      if (!canShop(s) || s.decor.includes(a.id) || levelOf(s.xp) < def.level || s.cash < def.cost) return s;
      let next = spend(s, def.cost) ?? s;
      next = { ...next, decor: [...next.decor, a.id] };
      if (def.rep) next.reputation = bump(next.reputation, def.rep);
      if (def.community) next.community = bump(next.community, def.community);
      return checkProgress(toast(next, 'unlock', `${def.name} placed!`, def.bonus));
    }
    case 'setPackaging':
      return s.phase === 'service' ? s : learn({ ...s, packaging: a.packaging }, 'externality');
    case 'hire': {
      const ap = s.applicants.find((x) => x.id === a.applicantId);
      if (!ap || s.phase === 'service') return s;
      const fee = Math.round(ECON.labor.hiringCost * s.macro.priceIndex);
      const paid = spend(s, fee);
      if (!paid) return s;
      const branch = a.branch ?? null;
      let next: GameState = { ...paid, staff: [...paid.staff, makeEmployee(ap, s.day, branch)], applicants: paid.applicants.filter((x) => x.id !== ap.id), questProgress: { ...paid.questProgress, hired: 1 } };
      if (new Set(next.staff.map((e) => e.role)).size >= 2) next = learn(next, 'comparative');
      next = decide(next, { kind: 'hire', text: `Hired ${ap.name} as a ${ROLES[ap.role].name.toLowerCase()} at $${ap.wage.toFixed(2)}/hour.`, metric: 'customers', before: s.history.slice(-7).reduce((t, h) => t + h.served, 0) / Math.max(1, s.history.slice(-7).length) });
      return checkProgress(learn(next, 'labor', 'marginal'));
    }
    case 'fire': {
      const e = s.staff.find((x) => x.id === a.id);
      if (!e || s.phase === 'service') return s;
      const severance = round2(e.wage * ECON.labor.hoursPerShift * ECON.labor.severanceDays);
      const next = move(s, 'cashWages', -severance, { wages: severance });
      return decide(
        { ...next, staff: next.staff.filter((x) => x.id !== a.id).map((x) => ({ ...x, morale: Math.max(0, x.morale - 8) })) },
        { kind: 'fire', text: `Let ${e.name} go (${severance.toFixed(0)} severance).`, metric: 'profit', before: avgProfit(s) },
      );
    }
    case 'setWage': {
      const e = s.staff.find((x) => x.id === a.id);
      if (!e || !Number.isFinite(a.wage) || a.wage < 10 || a.wage > 80) return s;
      return decide({ ...s, staff: s.staff.map((x) => (x.id === a.id ? { ...x, wage: round2(a.wage), morale: clamp(x.morale + (a.wage > x.wage ? 6 : -10), 0, 100) } : x)) }, { kind: 'wage', text: `Changed ${e.name}'s wage from $${e.wage.toFixed(2)} to $${a.wage.toFixed(2)}/hour.`, metric: 'profit', before: avgProfit(s) });
    }
    case 'train': {
      const e = s.staff.find((x) => x.id === a.id);
      if (!e || e.skill >= 5 || e.trainingUntil >= s.day || s.phase === 'service') return s;
      const cost = Math.round(ECON.labor.trainingCost * s.macro.priceIndex);
      const paid = spend(s, cost);
      if (!paid) return s;
      return learn(decide({ ...paid, staff: paid.staff.map((x) => (x.id === a.id ? { ...x, skill: x.skill + 1, trainingUntil: s.day + ECON.labor.trainingDays - 1, morale: Math.min(100, x.morale + 5) } : x)) }, { kind: 'train', text: `Trained ${e.name} (skill ${e.skill} → ${e.skill + 1}).`, metric: 'customers', before: 0 }), 'humanCapital');
    }
    case 'assign':
      if (a.branch !== null && !s.branches.some((b) => b.id === a.branch && !b.closed)) return s;
      return { ...s, staff: s.staff.map((x) => (x.id === a.id ? { ...x, branch: a.branch } : x)) };
    case 'fund': {
      if (s.phase === 'service') return s;
      const amt = round2(a.amount);
      if (amt > 0 && amt > s.cash + 1e-9) return s;
      if (amt < 0 && -amt > s.safetyFund + 1e-9) return s;
      const next = learn({ ...s, cash: s.cash - amt, safetyFund: s.safetyFund + amt }, 'savings');
      return checkProgress({ ...next, questProgress: { ...next.questProgress, bestFund: Math.max(next.questProgress.bestFund ?? 0, next.safetyFund) } });
    }
    case 'savingsRate':
      return { ...s, savingsRate: clamp(a.rate, 0, 0.5) };
    case 'takeLoan': {
      if (s.phase === 'service' || !ECON.finance.loanTerms.includes(a.term as 6) || a.principal < 500 || a.principal > borrowingLimit(s)) return s;
      const q = quoteLoan(s, a.principal, a.term);
      const next = move({ ...s, loans: [...s.loans, makeLoan(s.nextId, q, s.day)], nextId: s.nextId + 1 }, 'cashBorrowed', a.principal);
      return learn(decide(next, { kind: 'loan', text: `Borrowed $${a.principal.toLocaleString('en-US')} for ${a.term} months at ${(q.rate * 100).toFixed(1)}% ($${q.payment.toFixed(0)}/month).`, metric: 'profit', before: avgProfit(s) }), 'interest', 'debt', 'leverage');
    }
    case 'repayLoan': {
      const l = s.loans.find((x) => x.id === a.id);
      if (!l || s.phase === 'service') return s;
      const total = l.balance + l.accrued;
      if (s.cash < total) return s;
      let next = move(s, 'cashInterest', -l.accrued);
      next = move(next, 'cashRepaid', -l.balance);
      return checkProgress(toast({ ...next, loans: next.loans.filter((x) => x.id !== a.id), questProgress: { ...next.questProgress, loanRepaid: 1 } }, 'quest', 'Debt free!', `${l.lender} paid off early.`));
    }
    case 'repayCredit': {
      const pay = Math.min(a.amount, s.creditLine.balance, s.cash);
      if (pay <= 0) return s;
      return move({ ...s, creditLine: { ...s.creditLine, balance: s.creditLine.balance - pay } }, 'cashRepaid', -pay);
    }
    case 'raiseEquity': {
      const terms = investorTerms(s, a.amount);
      if (!terms || s.phase === 'service') return s;
      const names = ['Auntie Phượng', 'Mekong Angels', 'Uncle Danh', 'Little Saigon Fund'];
      const inv = { id: s.nextId, name: names[s.investors.length % names.length], stake: terms.stake, invested: a.amount, day: s.day, paidOut: 0 };
      const next = move({ ...s, investors: [...s.investors, inv], nextId: s.nextId + 1, equity: { ...s.equity, contributed: s.equity.contributed + a.amount } }, 'cashEquity', a.amount);
      return learn(decide(next, { kind: 'investor', text: `${inv.name} invested $${a.amount.toLocaleString('en-US')} for ${(terms.stake * 100).toFixed(1)}% of the business.`, metric: 'cash', before: s.cash }), 'equity', 'dilution');
    }
    case 'buyBack': {
      const inv = s.investors.find((i) => i.id === a.id);
      if (!inv) return s;
      const price = round2(Math.max(inv.invested, valuation(s).equityValue * inv.stake));
      if (s.cash < price) return s;
      const next = move({ ...s, investors: s.investors.filter((i) => i.id !== a.id), equity: { ...s.equity, distributions: s.equity.distributions + price } }, 'cashDistributions', -price);
      return toast(next, 'info', 'Bought back', `You bought back ${inv.name}'s ${(inv.stake * 100).toFixed(1)}% for $${price.toFixed(0)}.`);
    }
    case 'issueBond': {
      if (a.amount < 500 || a.amount > bondCapacity(s) || s.phase === 'service') return s;
      const next = move({ ...s, bonds: [...s.bonds, { id: s.nextId, amount: a.amount, rate: ECON.finance.bondRate, dueDay: s.day + ECON.finance.bondTermMonths * 30, accrued: 0 }], nextId: s.nextId + 1, community: bump(s.community, 4) }, 'cashBorrowed', a.amount);
      return learn(decide(next, { kind: 'bond', text: `Raised $${a.amount.toLocaleString('en-US')} in community bonds at ${(ECON.finance.bondRate * 100).toFixed(0)}%.`, metric: 'cash', before: s.cash }), 'debt', 'community');
    }
    case 'campaign': {
      const c = CAMPAIGNS[a.kind];
      if (!c) return s;
      const cost = Math.round(c.cost * s.macro.priceIndex);
      if (s.phase !== 'morning' || levelOf(s.xp) < 2 || (c.needs && !has(s, c.needs)) || s.campaigns.some((x) => x.kind === a.kind && x.endDay >= s.day)) return s;
      const paid = spend(s, cost, false, 'marketing');
      if (!paid) return s;
      const r = rngFor(s.seed, s.day, 71 + a.kind.length)();
      const marketer = s.staff.some((e) => e.role === 'marketer' && e.branch === null) ? 1.3 : 1;
      const conversion = c.conversion * (0.5 + r) * marketer;
      let next: GameState = { ...paid, campaigns: [...paid.campaigns, { id: s.nextId, kind: a.kind, cost, startDay: s.day, endDay: s.day + c.days - 1, reach: Math.round(c.reach * marketer), conversion, newCustomers: 0, revenue: 0, ongoingCost: 0 }], nextId: s.nextId + 1, lifetime: { ...paid.lifetime, marketingSpent: paid.lifetime.marketingSpent + cost } };
      if (a.kind === 'community') next.community = bump(next.community, 4);
      next = decide(next, { kind: 'campaign', text: `Launched "${c.name}" for $${cost}.`, metric: 'customers', before: s.history.slice(-7).reduce((t, h) => t + h.served, 0) / Math.max(1, s.history.slice(-7).length) });
      return learn(next, 'risk', 'marketingROI');
    }
    case 'lockPrice': {
      if (!canShop(s) || levelOf(s.xp) < 2 || s.locks.some((l) => l.ingredient === a.ingredient && l.until >= s.day)) return s;
      const paid = spend(s, ECON.costs.priceLockFee);
      if (!paid) return s;
      return learn({ ...paid, locks: [...paid.locks, { ingredient: a.ingredient, price: s.market.prices[a.ingredient], until: s.day + ECON.costs.priceLockDays - 1 }] }, 'hedging');
    }
    case 'trade': {
      if (s.phase === 'service' || levelOf(s.xp) < 3) return s;
      const price = s.market.coop[a.coop];
      const n = Math.trunc(a.delta);
      if (n > 0 && s.cash < price * n) return s;
      if (n < 0 && s.shares[a.coop] < -n) return s;
      const shares = s.shares[a.coop] + n;
      if (n > 0) {
        const shareCost = (s.shares[a.coop] * s.shareCost[a.coop] + price * n) / shares;
        return checkProgress(learn(move({ ...s, shares: { ...s.shares, [a.coop]: shares }, shareCost: { ...s.shareCost, [a.coop]: shareCost } }, 'cashInvestments', -price * n), 'diversification', 'risk'));
      }
      const basis = s.shareCost[a.coop] * -n;
      const proceeds = price * -n;
      let next = move({ ...s, shares: { ...s.shares, [a.coop]: shares }, shareCost: { ...s.shareCost, [a.coop]: shares === 0 ? 0 : s.shareCost[a.coop] } }, 'cashInvestments', proceeds);
      next = accrue(next, proceeds >= basis ? { otherIncome: proceeds - basis } : { otherExpense: basis - proceeds });
      return next;
    }
    case 'openBranch': {
      const loc = LOCATIONS[a.location];
      const fit = Math.round(loc.fitOut * s.macro.priceIndex);
      const dep = Math.round(loc.deposit * s.macro.priceIndex);
      if (!canShop(s) || levelOf(s.xp) < 4 || s.cash < fit + dep || s.branches.filter((b) => !b.closed).length >= 5) return s;
      const b = { id: s.nextId, name: a.name.trim().slice(0, 28) || `${s.bakeryName} ${loc.name}`, location: a.location, openedDay: s.day, trays: 2, quality: 70, reputation: 35, fitOut: fit, deposit: dep, lastRevenue: 0, lastProfit: 0, lastServed: 0, lastLost: 0, closed: false };
      let next = move({ ...s, branches: [...s.branches, b], nextId: s.nextId + 1 }, 'cashCapex', -(fit + dep));
      next = decide(next, { kind: 'branch', text: `Opened ${b.name} in ${loc.name} ($${(fit + dep).toLocaleString('en-US')} fit-out and deposit).`, metric: 'profit', before: avgProfit(s) });
      return checkProgress(learn(toast(next, 'unlock', 'New shop!', `${b.name} is open. Hire a manager, a baker and counter staff for it in the Staff tab.`), 'expansion', 'capex'));
    }
    case 'setCombo':
      if (s.phase === 'service') return s;
      return learn({ ...s, combo: a.on }, 'bundling');
    case 'setSizes':
      if (s.phase === 'service') return s;
      return learn({ ...s, sizes: a.on }, 'anchoring');
    case 'predict': {
      if (s.phase !== 'morning' || !s.pendingPrediction || s.pendingPrediction.guess) return s;
      return learn({ ...s, pendingPrediction: { ...s.pendingPrediction, guess: a.guess }, xp: s.xp + 5 }, 'forecasting');
    }
    case 'retire': {
      if (s.phase !== 'morning' || s.day < 60) return s;
      const value = Math.max(0, Math.round(valuation(s).ownerValue));
      return { ...s, phase: 'ended', events: [], ending: { kind: 'retired', day: s.day, value, text: `You sold ${s.bakeryName} for $${value.toLocaleString('en-US')} after ${s.day} days and retired.` } };
    }
    case 'closeBranch': {
      const b = s.branches.find((x) => x.id === a.id && !x.closed);
      if (!b) return s;
      let next = move({ ...s, branches: s.branches.map((x) => (x.id === a.id ? { ...x, closed: true } : x)) }, 'cashCapex', b.deposit);
      next = accrue(next, { otherExpense: b.fitOut });
      next = { ...next, staff: next.staff.filter((e) => e.branch !== a.id) };
      return toast(next, 'info', 'Shop closed', `${b.name} has closed. The deposit came back; the fit-out ($${b.fitOut.toFixed(0)} left on the books) is written off.`);
    }
    case 'dismissToast':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case 'hint': {
      let next = s.hints.includes(a.id) ? s : { ...s, hints: [...s.hints, a.id] };
      if (a.id.startsWith('tab:')) next = seeTab(next, a.id.slice(4).split(':')[0]);
      return next;
    }
    case 'introLater':
      return introLater(s);
    case 'introStart':
      return introStart(s, a.id);
    case 'unlockAll':
      return unlockAll(s);
    case 'newGame':
      return createNewGame(a.options ?? (a.seed !== undefined ? { seed: a.seed } : {}));
    case 'load':
      return a.state;
  }
}

function resolveBailout(s: GameState, choice: string): GameState {
  const amount = Math.round(4000 * s.macro.priceIndex);
  if (choice === 'accept') {
    let next = move({ ...s, bailoutsUsed: s.bailoutsUsed + 1, daysInDistress: 0, equity: { ...s.equity, contributed: s.equity.contributed + amount } }, 'cashEquity', amount);
    next = { ...next, events: next.events.slice(1) };
    return toast(next, 'info', 'Bà to the rescue', `"Con ơi, take this and be more careful." $${amount.toLocaleString('en-US')} from Bà\'s savings.`);
  }
  const v = valuation(s);
  return { ...s, phase: 'ended', events: [], ending: { kind: 'bankrupt', day: s.day, value: Math.max(0, v.equityValue), text: `You closed ${s.bakeryName} on day ${s.day} rather than borrow from Bà.` } };
}

export const BAILOUT_EVENT = {
  title: 'The bakery is out of money',
  text: (s: GameState) => `You've been unable to pay the bills for ${s.daysInDistress} days and the credit line is maxed out. Bà offers her savings to keep the doors open.`,
};

export { hireValue, marketWage, available, inventoryValue };
