import { BAGUETTE, CONFIG, DECOR, INGREDIENTS, INGREDIENT_ORDER, PRODUCTS, PRODUCT_ORDER, START_PRODUCTS, SUPPLIERS, UPGRADES } from '../data/catalog';
import {
  available,
  blendQuality,
  canBakeTray,
  clamp,
  ecoScore,
  effectActive,
  energyCost,
  has,
  ingredientQuality,
  inStock,
  isTet,
  levelOf,
  masteryBonus,
  normalPackPrice,
  onMenu,
  ovenCapacity,
  packPrice,
  priceBounds,
  recipeCost,
  rent,
  round2,
  wages,
} from './economy';
import { EVENTS, eventFor } from './events';
import { addEffect, bump, learn, toast } from './helpers';
import { generateMarket } from './market';
import { checkProgress, goalMet, WEEKLY_GOALS } from './progression';
import { businessTip, recap } from './report';
import { newSeed, rngFor } from './rng';
import { endService, keepsOvernight, openShop, serve, setLastCall, tick } from './service';
import type {
  ByProduct,
  CoopId,
  DayStats,
  DecorId,
  GameState,
  IngredientId,
  LeftoverChoice,
  Look,
  PackagingId,
  PantryItem,
  ProductId,
  Report,
  StockItem,
  SupplierId,
  UpgradeId,
  Weather,
} from './types';

export const SAVE_VERSION = 2;

const zeroProducts = (): ByProduct<number> => Object.fromEntries(PRODUCT_ORDER.map((p) => [p, 0])) as ByProduct<number>;

export function emptyDay(day: number, weather: Weather): DayStats {
  return {
    day,
    weather,
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
    regularsServed: 0,
    sold: zeroProducts(),
    made: zeroProducts(),
    soldOutAt: {},
    wishedFor: {},
    pricey: {},
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
    notes: [],
  };
}

export const DEFAULT_LOOK: Look = { skin: 1, hair: 3, hairColor: 0, shirt: 0, apron: 0, accessory: 0 };

const STARTER: Partial<Record<IngredientId, number>> = { flour: 10, eggs: 10, milk: 6, condensed: 12, sugar: 10, coffee: 12, chaLua: 10, veg: 10 };

export function createNewGame(seed = newSeed()): GameState {
  const market = generateMarket(seed, 1, null);
  const pantry = {} as Record<IngredientId, PantryItem>;
  for (const id of INGREDIENT_ORDER) {
    const def = INGREDIENTS[id];
    pantry[id] = { qty: STARTER[id] ?? 0, avgCost: def.price / def.pack, quality: 70, eco: 50 };
  }
  const display = {} as ByProduct<StockItem>;
  for (const p of PRODUCT_ORDER) display[p] = { qty: 0, quality: 70, unitCost: 0 };
  display.flan = { qty: 8, quality: 76, unitCost: 0.41 };
  const prices = {} as ByProduct<number>;
  for (const p of PRODUCT_ORDER) prices[p] = PRODUCTS[p].ref;
  return {
    version: SAVE_VERSION,
    seed,
    bakeryName: 'Vielie Bakery',
    look: { ...DEFAULT_LOOK },
    day: 1,
    phase: 'setup',
    cash: CONFIG.startCash,
    safetyFund: 0,
    reputation: 30,
    community: 20,
    xp: 0,
    pantry,
    display,
    baguettes: { qty: 12, quality: 72, unitCost: 0.12 },
    prices,
    traysToday: 0,
    bakedToday: zeroProducts(),
    packaging: 'paper',
    upgrades: [],
    decor: [],
    unlocked: [...START_PRODUCTS],
    market,
    service: null,
    today: { ...emptyDay(1, market.weather), made: { ...zeroProducts(), flan: 8 } },
    history: [],
    leftoverPlan: {},
    events: [],
    effects: [],
    locks: [],
    loan: null,
    shares: { coffee: 0, dairy: 0, fruit: 0 },
    shareCost: { coffee: 0, dairy: 0, fruit: 0 },
    supplierLoyalty: { cho: 0, farm: 0, premium: 0 },
    hearts: {},
    visitsByRegular: {},
    quests: [],
    questProgress: {},
    achievements: [],
    lifetime: { served: 0, sold: zeroProducts(), revenue: 0, profit: 0, donated: 0, zeroWasteDays: 0, returning: 0, tetSold: 0, marketingSpent: 0 },
    weeklyGoal: null,
    goalChoices: [],
    savingsRate: 0,
    ecoHistory: [],
    learned: [],
    hints: [],
    toasts: [],
    nextToast: 1,
    lastReport: null,
  };
}

export type Action =
  | { type: 'setup'; name: string; look: Look }
  | { type: 'setLook'; look: Look }
  | { type: 'rename'; name: string }
  | { type: 'buy'; ingredient: IngredientId; supplier: SupplierId; packs: number }
  | { type: 'bake'; item: ProductId | 'baguette'; process: number }
  | { type: 'setPrice'; product: ProductId; price: number }
  | { type: 'open' }
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
  | { type: 'buyDecor'; id: DecorId }
  | { type: 'setPackaging'; packaging: PackagingId }
  | { type: 'fund'; amount: number }
  | { type: 'savingsRate'; rate: number }
  | { type: 'borrow'; amount: number }
  | { type: 'repayLoan' }
  | { type: 'marketing'; kind: 'flyers' | 'video' }
  | { type: 'lockPrice'; ingredient: IngredientId }
  | { type: 'trade'; coop: CoopId; delta: number }
  | { type: 'dismissToast'; id: number }
  | { type: 'hint'; id: string }
  | { type: 'newGame'; seed?: number }
  | { type: 'load'; state: GameState };

// ---------------------------------------------------------------- guards

export const canShop = (s: GameState) => s.phase === 'morning' || s.phase === 'closing' || s.phase === 'report';
export const lockedReason = (s: GameState): string | null => (s.events.length ? 'Choose what to do about today\'s news first.' : null);

export const MARKETING = {
  flyers: { name: 'Hand out flyers', cost: 40, min: 3, max: 12, days: 3, blurb: '3 to 12 extra customers over 3 days. Low risk.' },
  video: { name: 'Pay for a short video ad', cost: 120, min: 0, max: 45, days: 4, blurb: '0 to 45 extra customers over 4 days. Could flop, could boom.' },
};

export const LOAN_SIZES = [300, 600, 1000];

// ---------------------------------------------------------------- morning actions

function buy(s: GameState, id: IngredientId, supplier: SupplierId, packs: number): GameState {
  if (!canShop(s) || packs <= 0 || !inStock(s, id, supplier)) return s;
  const price = packPrice(s, id, supplier);
  const cost = round2(price * packs);
  if (cost > s.cash + 1e-9) return s;
  const def = INGREDIENTS[id];
  const sup = SUPPLIERS[supplier];
  const units = def.pack * packs;
  const p = s.pantry[id];
  const qty = p.qty + units;
  const item: PantryItem = {
    qty,
    avgCost: (p.qty * p.avgCost + cost) / qty,
    quality: (p.qty * p.quality + units * sup.quality) / qty,
    eco: (p.qty * p.eco + units * sup.eco) / qty,
  };
  const saved = Math.max(0, normalPackPrice(id) * packs - cost);
  let next: GameState = {
    ...s,
    cash: round2(s.cash - cost),
    pantry: { ...s.pantry, [id]: item },
    supplierLoyalty: { ...s.supplierLoyalty, [supplier]: s.supplierLoyalty[supplier] + packs },
    today: { ...s.today, savedOnSupplies: s.today.savedOnSupplies + saved, purchasedUnits: s.today.purchasedUnits + units, purchasedEco: s.today.purchasedEco + units * sup.eco },
    questProgress: { ...s.questProgress, packs: (s.questProgress.packs ?? 0) + packs, saved: (s.questProgress.saved ?? 0) + saved },
  };
  next = learn(next, 'variableCost');
  return checkProgress(next);
}

function bake(s: GameState, item: ProductId | 'baguette', process: number): GameState {
  if (s.phase !== 'morning' || s.events.length || s.traysToday >= ovenCapacity(s)) return s;
  const recipe = item === 'baguette' ? BAGUETTE.recipe : PRODUCTS[item].recipe;
  const yieldN = item === 'baguette' ? BAGUETTE.yield : PRODUCTS[item].yield;
  if (item !== 'baguette' && (PRODUCTS[item].kind !== 'tray' || !onMenu(s).includes(item))) return s;
  if (!canBakeTray(s, recipe)) return s;
  const cost = recipeCost(s, recipe);
  const quality = blendQuality(clamp(process, 0, 100), ingredientQuality(s, recipe), item === 'baguette' ? 0 : masteryBonus(s, item));
  const pantry = { ...s.pantry };
  for (const [id, n] of Object.entries(recipe) as [IngredientId, number][]) pantry[id] = { ...pantry[id], qty: pantry[id].qty - n };
  const merge = (st: StockItem): StockItem => {
    const qty = st.qty + yieldN;
    return { qty, quality: Math.round((st.qty * st.quality + yieldN * quality) / qty), unitCost: (st.qty * st.unitCost + cost) / qty, fresh: s.day * 100 + s.traysToday };
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

// ---------------------------------------------------------------- closing

function finishDay(s: GameState): GameState {
  if (s.phase !== 'closing') return s;
  const t: DayStats = { ...s.today, notes: [...s.today.notes] };
  const fridge = has(s, 'fridge') && !effectActive(s, 'fridgeBroken');
  let display = { ...s.display };
  let baguettes = s.baguettes;
  let community = s.community;
  let rep = s.reputation;

  for (const [key, choice] of Object.entries(s.leftoverPlan) as [ProductId | 'baguette', LeftoverChoice][]) {
    const st = key === 'baguette' ? baguettes : display[key];
    if (!st || st.qty <= 0) continue;
    const keep = choice === 'keep' && key !== 'baguette' && keepsOvernight(s, key);
    if (keep) {
      t.keptUnits += st.qty;
      display = { ...display, [key]: { ...st, quality: Math.max(30, st.quality - 8) } };
      continue;
    }
    if (choice === 'donate' || (choice === 'keep' && !keep)) {
      t.donatedUnits += st.qty;
      community = bump(community, Math.min(3, st.qty * 0.25));
      rep = bump(rep, Math.min(1, st.qty * 0.05));
    } else {
      t.wasteUnits += st.qty;
      t.wasteCost += st.qty * st.unitCost;
    }
    if (key === 'baguette') baguettes = { ...baguettes, qty: 0 };
    else display = { ...display, [key]: { ...st, qty: 0 } };
  }

  const pantry = { ...s.pantry };
  for (const id of INGREDIENT_ORDER) {
    const def = INGREDIENTS[id];
    if (!def.spoil || pantry[id].qty <= 0) continue;
    const lost = Math.floor(pantry[id].qty * def.spoil * (fridge ? 0.5 : 1));
    if (lost > 0) {
      t.spoilage += lost * pantry[id].avgCost;
      pantry[id] = { ...pantry[id], qty: pantry[id].qty - lost };
    }
  }

  t.rent = rent(s);
  t.wages = wages(s);
  t.energy = energyCost(s, s.traysToday);
  t.trays = s.traysToday;
  t.interest = s.loan ? s.loan.fee / CONFIG.loanDays : 0;
  const expenses = t.cogs + t.packaging + t.rent + t.wages + t.energy + t.interest + t.spoilage + t.other;
  const profit = t.revenue + t.tips - expenses;

  const cashBefore = s.cash;
  let cash = s.cash - t.rent - t.wages - t.energy;
  let loan = s.loan;
  let loanPaid = 0;
  let questProgress = { ...s.questProgress };
  if (loan) {
    loanPaid = Math.min(loan.daily, loan.remaining);
    cash -= loanPaid;
    const remaining = round2(loan.remaining - loanPaid);
    if (remaining <= 0.01) {
      loan = null;
      questProgress.loanRepaid = 1;
    } else loan = { ...loan, remaining };
  }
  let fund = s.safetyFund;
  let savedToFund = 0;
  if (profit > 0 && s.savingsRate > 0 && cash > 0) {
    savedToFund = round2(Math.min(cash, profit * s.savingsRate));
    cash -= savedToFund;
    fund += savedToFund;
  }
  if (cash < 0 && fund > 0) {
    const pull = Math.min(fund, -cash);
    fund -= pull;
    cash += pull;
    t.notes.push(`The safety fund covered $${pull.toFixed(2)} of today's bills.`);
  }
  questProgress.bestFund = Math.max(questProgress.bestFund ?? 0, fund);
  questProgress.bestMorning = Math.max(questProgress.bestMorning ?? 0, t.servedBeforeNoon);

  const made = PRODUCT_ORDER.reduce((a, p) => a + t.made[p], 0);
  const wasteRate = made > 0 ? t.wasteUnits / made : 0;
  const sourcingEco = t.purchasedUnits > 0 ? t.purchasedEco / t.purchasedUnits : s.ecoHistory.length ? s.ecoHistory[s.ecoHistory.length - 1].sourcingEco : 50;
  const ecoBefore = ecoScore(s);
  t.xp += Math.max(0, Math.round(profit / 5));
  const levelBefore = levelOf(s.xp);

  let next: GameState = {
    ...s,
    cash: round2(cash),
    safetyFund: round2(fund),
    display,
    baguettes,
    pantry,
    community: round2(community),
    reputation: round2(clamp(rep + (t.love > t.lostSlow ? 0.3 : -0.5) - Math.max(0, rep - 60) * 0.03, 0, 100)),
    loan,
    xp: s.xp + t.xp,
    questProgress,
    ecoHistory: [...s.ecoHistory, { day: s.day, sourcingEco, wasteRate }].slice(-30),
    lifetime: {
      ...s.lifetime,
      profit: s.lifetime.profit + profit,
      donated: s.lifetime.donated + t.donatedUnits,
      zeroWasteDays: s.lifetime.zeroWasteDays + (t.wasteUnits === 0 && made > 0 ? 1 : 0),
    },
    leftoverPlan: {},
  };
  const ecoAfter = ecoScore(next);
  next.history = [
    ...s.history,
    { day: s.day, weather: t.weather, revenue: round2(t.revenue + t.tips), expenses: round2(expenses), profit: round2(profit), customers: t.customers, served: t.served, wasteRate, eco: ecoAfter, reputation: next.reputation },
  ].slice(-60);
  if (t.wasteUnits > 0) next = learn(next, 'waste');
  if (profit < 0) next = learn(next, 'fixedCost');
  next = learn(next, 'revenue', 'profit');
  next.today = t;
  next = checkProgress(next);
  const report: Report = {
    day: s.day,
    stats: t,
    expenses,
    profit,
    cashBefore,
    cashAfter: next.cash,
    recap: recap(s, t),
    tip: businessTip(s, t, profit),
    ecoBefore,
    ecoAfter,
    levelBefore,
    levelAfter: levelOf(next.xp),
    newUnlocks: next.unlocked.filter((p) => !s.unlocked.includes(p)).map((p) => PRODUCTS[p].name),
    loanPaid,
    savedToFund,
  };
  return { ...next, lastReport: report, phase: 'report' };
}

// ---------------------------------------------------------------- new day

function startDay(s: GameState): GameState {
  const day = s.day + 1;
  const market = generateMarket(s.seed, day, s.market);
  let next: GameState = {
    ...s,
    day,
    market,
    phase: 'morning',
    service: null,
    traysToday: 0,
    bakedToday: Object.fromEntries(PRODUCT_ORDER.map((p) => [p, 0])) as ByProduct<number>,
    effects: s.effects.filter((e) => e.until >= day),
    locks: s.locks.filter((l) => l.until >= day),
    today: emptyDay(day, market.weather),
  };
  if (has(next, 'garden')) {
    const v = next.pantry.veg;
    const qty = v.qty + 4;
    next.pantry = { ...next.pantry, veg: { qty, avgCost: (v.qty * v.avgCost) / qty, quality: (v.qty * v.quality + 4 * 92) / qty, eco: (v.qty * v.eco + 400) / qty } };
  }
  const ev = eventFor(next, day);
  next.events = ev ? [{ id: ev, day }] : [];
  if (isTet(day) && !isTet(day - 1)) next = toast(next, 'unlock', 'Chúc mừng năm mới!', 'Tết is here: mứt dừa gift boxes are on the menu for 5 days.');

  const sellable = onMenu(next).some((p) => available(next, p));
  const anyTray = [...onMenu(next).filter((p) => PRODUCTS[p].kind === 'tray').map((p) => PRODUCTS[p].recipe), BAGUETTE.recipe].some((r) => canBakeTray(next, r));
  const lastEnvelope = next.questProgress.envelopeDay ?? -99;
  if (next.cash < 15 && !sellable && !anyTray && day - lastEnvelope >= 7) {
    next = { ...next, cash: next.cash + 40, questProgress: { ...next.questProgress, envelopeDay: day } };
    next = toast(next, 'info', 'An envelope from Bà', '"Mua chút đồ đi con." $40 to get the ovens going again. Spend it wisely!');
  }
  return next;
}

function enterWeekly(s: GameState): GameState {
  let next = s;
  if (s.weeklyGoal) {
    if (goalMet(s)) {
      next = toast({ ...next, cash: next.cash + 40, xp: next.xp + 60 }, 'quest', `Weekly goal met: ${WEEKLY_GOALS[s.weeklyGoal.id].title}`, 'Reward: $40 and a big XP boost');
    }
  }
  let dividends = 0;
  for (const c of Object.keys(next.shares) as CoopId[]) dividends += next.shares[c] * next.market.coop[c] * CONFIG.coopDividend;
  if (dividends > 0) {
    next = toast({ ...next, cash: round2(next.cash + dividends) }, 'info', 'Co-op dividends', `Your shares paid $${dividends.toFixed(2)} this week.`);
    next = learn(next, 'dividends');
  }
  const ids = Object.keys(WEEKLY_GOALS);
  const r = rngFor(s.seed, s.day, 61);
  const choices = [...ids].sort(() => r() - 0.5).slice(0, 3);
  return checkProgress({ ...next, phase: 'weekly', goalChoices: choices, weeklyGoal: null });
}

// ---------------------------------------------------------------- reducer

export function gameReducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'setup': {
      if (s.phase !== 'setup') return s;
      return { ...s, bakeryName: a.name.trim().slice(0, 28) || 'Vielie Bakery', look: a.look, phase: 'morning' };
    }
    case 'setLook':
      return { ...s, look: a.look };
    case 'rename':
      return { ...s, bakeryName: a.name.trim().slice(0, 28) || s.bakeryName };
    case 'buy':
      return buy(s, a.ingredient, a.supplier, Math.floor(a.packs));
    case 'bake':
      return bake(s, a.item, a.process);
    case 'setPrice': {
      if (s.phase !== 'morning' || !Number.isFinite(a.price)) return s;
      const [lo, hi] = priceBounds(a.product);
      const price = round2(clamp(Math.round(a.price / CONFIG.priceStep) * CONFIG.priceStep, lo, hi));
      if (price === s.prices[a.product]) return s;
      return learn({ ...s, prices: { ...s.prices, [a.product]: price }, questProgress: { ...s.questProgress, priceTouched: 1 } }, 'elasticity');
    }
    case 'open': {
      if (s.phase !== 'morning' || s.events.length) return s;
      let next = s;
      if (s.questProgress.priceTouched) next = { ...next, questProgress: { ...next.questProgress, priceChanged: 1 } };
      next = openShop(next);
      return checkProgress(next);
    }
    case 'tick': {
      const before = s.today.served;
      const next = tick(s, Math.max(0, Math.min(30, a.minutes)));
      return next.today.served !== before || next.phase !== s.phase ? checkProgress(next) : next;
    }
    case 'serve': {
      const next = serve(s, a.visitId, a.process);
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
      const def = WEEKLY_GOALS[a.id];
      return startDay({ ...s, weeklyGoal: { id: a.id, target: def.target(s), startDay: s.day + 1, baseline: 0 } });
    }
    case 'resolveEvent': {
      const pending = s.events[0];
      if (!pending || s.phase !== 'morning') return s;
      const def = EVENTS[pending.id];
      const choice = def.choices(s).find((c) => c.id === a.choice);
      if (!choice || (choice.enabled && !choice.enabled(s))) return s;
      let next = choice.apply(s);
      if (def.concept) next = learn(next, def.concept);
      return checkProgress({ ...next, events: next.events.slice(1) });
    }
    case 'buyUpgrade': {
      const def = UPGRADES[a.id];
      if (!canShop(s) || has(s, a.id) || levelOf(s.xp) < def.level || (def.requires && !has(s, def.requires)) || s.cash < def.cost) return s;
      let next = toast({ ...s, cash: round2(s.cash - def.cost), upgrades: [...s.upgrades, a.id] }, 'unlock', `${def.name}!`, def.effect);
      next = learn(next, def.rent || def.wage ? 'fixedCost' : 'investment', 'opportunityCost');
      return checkProgress(next);
    }
    case 'buyDecor': {
      const def = DECOR[a.id];
      if (!canShop(s) || s.decor.includes(a.id) || levelOf(s.xp) < def.level || s.cash < def.cost) return s;
      let next: GameState = { ...s, cash: round2(s.cash - def.cost), decor: [...s.decor, a.id] };
      if (def.rep) next.reputation = bump(next.reputation, def.rep);
      if (def.community) next.community = bump(next.community, def.community);
      return checkProgress(toast(next, 'unlock', `${def.name} placed!`, def.bonus));
    }
    case 'setPackaging':
      return s.phase === 'service' ? s : learn({ ...s, packaging: a.packaging }, 'externality');
    case 'fund': {
      if (s.phase === 'service') return s;
      const amt = round2(a.amount);
      if (amt > 0 && amt > s.cash + 1e-9) return s;
      if (amt < 0 && -amt > s.safetyFund + 1e-9) return s;
      const next = learn({ ...s, cash: round2(s.cash - amt), safetyFund: round2(s.safetyFund + amt) }, 'savings');
      return checkProgress({ ...next, questProgress: { ...next.questProgress, bestFund: Math.max(next.questProgress.bestFund ?? 0, next.safetyFund) } });
    }
    case 'savingsRate':
      return { ...s, savingsRate: clamp(a.rate, 0, 0.5) };
    case 'borrow': {
      if (s.loan || levelOf(s.xp) < 3 || !LOAN_SIZES.includes(a.amount) || s.phase === 'service') return s;
      const fee = round2(a.amount * CONFIG.loanFee);
      const total = a.amount + fee;
      return learn({ ...s, cash: s.cash + a.amount, loan: { principal: a.amount, remaining: total, daily: round2(total / CONFIG.loanDays), fee } }, 'interest', 'debt');
    }
    case 'repayLoan': {
      if (!s.loan || s.cash < s.loan.remaining || s.phase === 'service') return s;
      return checkProgress({ ...s, cash: round2(s.cash - s.loan.remaining), loan: null, questProgress: { ...s.questProgress, loanRepaid: 1 } });
    }
    case 'marketing': {
      const m = MARKETING[a.kind];
      if (s.phase !== 'morning' || levelOf(s.xp) < 2 || s.cash < m.cost || effectActive(s, 'marketing')) return s;
      const r = rngFor(s.seed, s.day, a.kind === 'flyers' ? 71 : 72)();
      const total = Math.round(m.min + (m.max - m.min) * (a.kind === 'video' ? r * r * 1.6 > 1 ? 1 : r * r * 1.6 : r));
      let next = addEffect({ ...s, cash: s.cash - m.cost, today: { ...s.today, other: s.today.other + m.cost } }, 'marketing', m.days, { perDay: total / m.days, total, source: a.kind === 'flyers' ? 'Your flyers' : 'Your video ad' });
      next = { ...next, lifetime: { ...next.lifetime, marketingSpent: next.lifetime.marketingSpent + m.cost } };
      return learn(next, 'risk');
    }
    case 'lockPrice': {
      if (!canShop(s) || levelOf(s.xp) < 2 || s.cash < CONFIG.priceLockFee || s.locks.some((l) => l.ingredient === a.ingredient && l.until >= s.day)) return s;
      return learn(
        { ...s, cash: s.cash - CONFIG.priceLockFee, today: { ...s.today, other: s.today.other + CONFIG.priceLockFee }, locks: [...s.locks, { ingredient: a.ingredient, price: s.market.prices[a.ingredient], until: s.day + CONFIG.priceLockDays - 1 }] },
        'hedging',
      );
    }
    case 'trade': {
      if (s.phase === 'service' || levelOf(s.xp) < 3) return s;
      const price = s.market.coop[a.coop];
      const n = Math.trunc(a.delta);
      if (n > 0 && s.cash < price * n) return s;
      if (n < 0 && s.shares[a.coop] < -n) return s;
      const shares = s.shares[a.coop] + n;
      const shareCost = n > 0 ? (s.shares[a.coop] * s.shareCost[a.coop] + price * n) / shares : shares === 0 ? 0 : s.shareCost[a.coop];
      return checkProgress(learn({ ...s, cash: round2(s.cash - price * n), shares: { ...s.shares, [a.coop]: shares }, shareCost: { ...s.shareCost, [a.coop]: shareCost } }, 'diversification', 'risk'));
    }
    case 'dismissToast':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case 'hint':
      return s.hints.includes(a.id) ? s : { ...s, hints: [...s.hints, a.id] };
    case 'newGame':
      return createNewGame(a.seed);
    case 'load':
      return a.state;
  }
}
