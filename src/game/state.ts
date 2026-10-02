import {
  FUTURES,
  GAME_LENGTH_DAYS,
  INGREDIENTS,
  INGREDIENT_ORDER,
  INVESTMENTS,
  LOAN,
  PACKAGING,
  PRICE_STEP,
  PRODUCTS,
  PRODUCT_ORDER,
  REPUTATION,
  SOURCING,
  STARTING_CASH,
  UNLOCKS,
} from '../config/balance';
import { ingredientBuyPrice } from './economy';
import { inventoryValue } from './finance';
import { generateMarket } from './market';
import { newSeed } from './rng';
import { checkPlan, runDay } from './simulation';
import { computeGreenScore } from './sustainability';
import type {
  ByIngredient,
  ByProduct,
  ConceptId,
  Decision,
  GameState,
  IngredientId,
  InvestmentId,
  PackagingId,
  ProductId,
  SourcingId,
} from './types';

export const SAVE_VERSION = 1;

export const DEFAULT_PLAN: ByProduct<number> = { sourdough: 28, matcha: 55, muffin: 36, croissant: 30 };

export function createNewGame(seed = newSeed()): GameState {
  const market = generateMarket(seed, 1, null);
  const ingredients = {} as GameState['ingredients'];
  for (const id of INGREDIENT_ORDER) {
    ingredients[id] = { qty: INGREDIENTS[id].startingQty, avgCost: INGREDIENTS[id].basePrice };
  }
  const prices = {} as ByProduct<number>;
  for (const p of PRODUCT_ORDER) prices[p] = PRODUCTS[p].refPrice;
  const base: GameState = {
    version: SAVE_VERSION,
    seed,
    day: 1,
    phase: 'morning',
    cash: STARTING_CASH,
    cashAtDayStart: STARTING_CASH,
    ingredients,
    dayOld: { qty: 0, unitCost: 0 },
    prices,
    plan: { ...DEFAULT_PLAN },
    packaging: 'paper',
    sourcing: 'conventional',
    owned: [],
    equipmentCost: 0,
    accumulatedDepreciation: 0,
    loan: 0,
    overdraft: 0,
    reputation: REPUTATION.start,
    greenScore: 0,
    market,
    marketHistory: [market],
    history: [],
    lastResult: null,
    decisions: [],
    contracts: [],
    learned: [],
    tutorialDone: false,
    sandbox: false,
    startingCapital: 0,
  };
  base.greenScore = computeGreenScore(base);
  base.startingCapital = STARTING_CASH + inventoryValue(base);
  return base;
}

export type Action =
  | { type: 'setPrice'; product: ProductId; price: number }
  | { type: 'setPlan'; product: ProductId; qty: number }
  | { type: 'buyIngredient'; ingredient: IngredientId; qty: number }
  | { type: 'buyShortfall' }
  | { type: 'setPackaging'; packaging: PackagingId }
  | { type: 'setSourcing'; sourcing: SourcingId }
  | { type: 'buyInvestment'; id: InvestmentId }
  | { type: 'borrow'; amount: number }
  | { type: 'repay'; amount: number }
  | { type: 'signContract'; ingredient: IngredientId; qtyPerDay: number }
  | { type: 'bake' }
  | { type: 'continue' }
  | { type: 'learn'; concept: ConceptId }
  | { type: 'completeTutorial' }
  | { type: 'restartTutorial' }
  | { type: 'setSandbox'; on: boolean }
  | { type: 'newGame'; seed?: number }
  | { type: 'load'; state: GameState };

// ------------------------------------------------------------------ guards

export const isUnlocked = (state: Pick<GameState, 'day' | 'sandbox'>, feature: keyof typeof UNLOCKS) =>
  state.sandbox || state.day >= UNLOCKS[feature];

export function purchaseCost(state: GameState, id: IngredientId, qty: number): number {
  return qty * ingredientBuyPrice(state, state.market, id, qty);
}

export function canAfford(state: GameState, amount: number): boolean {
  return amount <= state.cash + 1e-9;
}

/** Ingredient quantities needed to cover the plan, rounded up to purchase steps. */
export function shortfallPurchase(state: GameState): ByIngredient<number> {
  const { shortfall } = checkPlan({ ...state, phase: 'morning' });
  const out = {} as ByIngredient<number>;
  for (const id of INGREDIENT_ORDER) {
    const step = INGREDIENTS[id].step;
    out[id] = shortfall[id] > 1e-9 ? Math.ceil(shortfall[id] / step - 1e-9) * step : 0;
  }
  return out;
}

export function shortfallCost(state: GameState): number {
  const buy = shortfallPurchase(state);
  return INGREDIENT_ORDER.reduce((s, id) => s + purchaseCost(state, id, buy[id]), 0);
}

export function borrowCapacity(state: GameState): number {
  return Math.max(0, LOAN.maxPrincipal - state.loan);
}

// ----------------------------------------------------------------- helpers

function learn(state: GameState, ...concepts: ConceptId[]): GameState {
  const add = concepts.filter((c) => !state.learned.includes(c));
  return add.length ? { ...state, learned: [...state.learned, ...add] } : state;
}

function addDecision(state: GameState, kind: Decision['kind'], text: string): GameState {
  return { ...state, decisions: [...state.decisions, { day: state.day, kind, text }] };
}

function buy(state: GameState, id: IngredientId, qty: number): GameState {
  if (qty <= 0 || state.phase !== 'morning') return state;
  const cost = purchaseCost(state, id, qty);
  if (!canAfford(state, cost)) return state;
  const stock = state.ingredients[id];
  const newQty = stock.qty + qty;
  const avgCost = (stock.qty * stock.avgCost + cost) / newQty;
  return {
    ...state,
    cash: state.cash - cost,
    ingredients: { ...state.ingredients, [id]: { qty: newQty, avgCost } },
  };
}

/** Price a forward contract would lock in today. */
export function contractPrice(state: GameState, id: IngredientId): number {
  return ingredientBuyPrice(state, state.market, id) * (1 + FUTURES.premium);
}

export function activeContract(state: GameState, id: IngredientId) {
  // A contract whose last delivery was today no longer blocks a new one starting tomorrow.
  return (state.contracts ?? []).find((c) => c.ingredient === id && c.endDay > state.day);
}

/** Contracted deliveries arrive each morning and are paid for at the locked price. */
function deliverContracts(state: GameState): GameState {
  const contracts = state.contracts ?? [];
  if (!contracts.some((c) => c.startDay <= state.day && c.endDay >= state.day)) return state;
  let s = state;
  const next = contracts.map((c) => {
    if (c.startDay > s.day || c.endDay < s.day) return c;
    const cost = c.qtyPerDay * c.price;
    const stock = s.ingredients[c.ingredient];
    const qty = stock.qty + c.qtyPerDay;
    const fromCash = Math.min(cost, s.cash);
    s = {
      ...s,
      cash: s.cash - fromCash,
      // A contract is an obligation: if cash is short, the bank covers it as overdraft.
      overdraft: s.overdraft + (cost - fromCash),
      ingredients: { ...s.ingredients, [c.ingredient]: { qty, avgCost: (stock.qty * stock.avgCost + cost) / qty } },
    };
    const spot = ingredientBuyPrice(s, s.market, c.ingredient);
    return { ...c, delivered: c.delivered + c.qtyPerDay, gain: c.gain + (spot - c.price) * c.qtyPerDay };
  });
  return { ...s, contracts: next };
}

function advanceDay(state: GameState): GameState {
  const day = state.day + 1;
  const market = generateMarket(state.seed, day, state.market);
  const s = deliverContracts({
    ...state,
    day,
    phase: 'morning',
    market,
    marketHistory: [...state.marketHistory, market],
  });
  return { ...s, cashAtDayStart: s.cash };
}

/** Record price changes and trigger concept unlocks after a day is run. */
function afterBake(prev: GameState, next: GameState): GameState {
  let s = next;
  const r = s.lastResult!;
  const yesterday = prev.history[prev.history.length - 1];
  if (yesterday) {
    for (const p of PRODUCT_ORDER) {
      const before = yesterday.products[p].price;
      const now = prev.prices[p];
      if (Math.abs(before - now) > 1e-9) {
        s = addDecision(s, 'price', `${now > before ? 'Raised' : 'Cut'} ${PRODUCTS[p].name.toLowerCase()} price from $${before.toFixed(2)} to $${now.toFixed(2)}`);
        s = learn(s, 'elasticity');
      }
    }
  }
  s = learn(s, 'revenue', 'profit', 'fixedCost', 'variableCost');
  if (s.history.length >= 2) s = learn(s, 'margin');
  if (r.unitsWasted > 0) s = learn(s, 'marginalCost');
  if (r.spoiledIngredientCost > 0 || r.products.sourdough.carriedOver > 0) s = learn(s, 'inventory');
  if (r.ovenMinutesUsed >= r.ovenCapacity * 0.95) s = learn(s, 'opportunityCost');
  if (r.income.netProfit < 0) s = learn(s, 'breakEven');
  if (r.overdraftDrawn > 0) s = learn(s, 'liquidity', 'interest');
  if (r.eventId) s = learn(s, 'supplyDemand');
  return s;
}

// ----------------------------------------------------------------- reducer

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'setPrice': {
      if (state.phase !== 'morning' || !isUnlocked(state, 'pricing')) return state;
      const cfg = PRODUCTS[action.product];
      const rounded = Math.round(action.price / PRICE_STEP) * PRICE_STEP;
      const price = Math.min(cfg.maxPrice, Math.max(cfg.minPrice, rounded));
      return { ...state, prices: { ...state.prices, [action.product]: price } };
    }
    case 'setPlan': {
      if (state.phase !== 'morning') return state;
      const qty = Math.max(0, Math.min(400, Math.round(action.qty)));
      return { ...state, plan: { ...state.plan, [action.product]: qty } };
    }
    case 'buyIngredient':
      return buy(state, action.ingredient, action.qty);
    case 'buyShortfall': {
      if (!canAfford(state, shortfallCost(state))) return state;
      const toBuy = shortfallPurchase(state);
      return INGREDIENT_ORDER.reduce((s, id) => buy(s, id, toBuy[id]), state);
    }
    case 'setPackaging': {
      if (state.phase !== 'morning' || state.packaging === action.packaging) return state;
      let s: GameState = { ...state, packaging: action.packaging };
      s = { ...s, greenScore: computeGreenScore(s) };
      s = addDecision(s, 'packaging', `Switched packaging to ${PACKAGING[action.packaging].name.toLowerCase()}`);
      return learn(s, 'externality');
    }
    case 'setSourcing': {
      if (state.phase !== 'morning' || state.sourcing === action.sourcing || !isUnlocked(state, 'competition')) return state;
      let s: GameState = { ...state, sourcing: action.sourcing };
      s = { ...s, greenScore: computeGreenScore(s) };
      s = addDecision(s, 'sourcing', `Switched to ${SOURCING[action.sourcing].name.toLowerCase()}`);
      return learn(s, 'externality');
    }
    case 'buyInvestment': {
      const cfg = INVESTMENTS[action.id];
      if (state.phase !== 'morning' || !isUnlocked(state, 'finance') || state.owned.includes(action.id) || !canAfford(state, cfg.cost)) return state;
      let s: GameState = {
        ...state,
        cash: state.cash - cfg.cost,
        owned: [...state.owned, action.id],
        equipmentCost: state.equipmentCost + cfg.cost,
      };
      s = { ...s, greenScore: computeGreenScore(s) };
      s = addDecision(s, 'investment', `Bought ${cfg.name.toLowerCase()} for $${cfg.cost.toLocaleString('en-US')}`);
      return learn(s, 'roi', 'depreciation');
    }
    case 'borrow': {
      const amount = Math.min(action.amount, borrowCapacity(state));
      if (state.phase !== 'morning' || !isUnlocked(state, 'finance') || amount <= 0) return state;
      const s = addDecision({ ...state, cash: state.cash + amount, loan: state.loan + amount }, 'loan', `Borrowed $${amount.toLocaleString('en-US')} at ${(LOAN.apr * 100).toFixed(0)}% a year`);
      return learn(s, 'interest', 'liquidity');
    }
    case 'repay': {
      if (state.phase !== 'morning') return state;
      let amount = Math.min(action.amount, state.cash, state.loan + state.overdraft);
      if (amount <= 0) return state;
      // The most expensive debt (overdraft) is repaid first.
      const toOverdraft = Math.min(amount, state.overdraft);
      amount -= toOverdraft;
      const toLoan = Math.min(amount, state.loan);
      const s = {
        ...state,
        cash: state.cash - toOverdraft - toLoan,
        overdraft: state.overdraft - toOverdraft,
        loan: state.loan - toLoan,
      };
      return addDecision(s, 'repay', `Repaid $${(toOverdraft + toLoan).toLocaleString('en-US', { maximumFractionDigits: 0 })} of debt`);
    }
    case 'signContract': {
      const step = INGREDIENTS[action.ingredient].step;
      const qtyPerDay = Math.round(action.qtyPerDay / step) * step;
      if (state.phase !== 'morning' || !isUnlocked(state, 'pricing') || qtyPerDay <= 0 || qtyPerDay > step * FUTURES.maxSteps + 1e-9) return state;
      if (activeContract(state, action.ingredient)) return state;
      const price = contractPrice(state, action.ingredient);
      const startDay = state.day + 1;
      const endDay = Math.min(GAME_LENGTH_DAYS, state.day + FUTURES.days);
      if (startDay > endDay) return state;
      let s: GameState = {
        ...state,
        contracts: [...(state.contracts ?? []), { ingredient: action.ingredient, qtyPerDay, price, signedDay: state.day, startDay, endDay, gain: 0, delivered: 0 }],
      };
      const unit = INGREDIENTS[action.ingredient].unit;
      s = addDecision(s, 'contract', `Locked ${qtyPerDay} ${unit} of ${INGREDIENTS[action.ingredient].name.toLowerCase()} a day at $${price.toFixed(2)}/${unit}, days ${startDay}–${endDay}`);
      return learn(s, 'hedging');
    }
    case 'bake': {
      const next = runDay(state);
      return next === state ? state : afterBake(state, next);
    }
    case 'continue': {
      if (state.phase === 'report') {
        if (state.day >= GAME_LENGTH_DAYS) return { ...state, phase: 'final' };
        if (state.day % 7 === 0) return { ...state, phase: 'weekly' };
        return advanceDay(state);
      }
      if (state.phase === 'weekly') return advanceDay(state);
      return state;
    }
    case 'learn':
      return learn(state, action.concept);
    case 'completeTutorial':
      return { ...state, tutorialDone: true };
    case 'restartTutorial':
      return { ...state, tutorialDone: false };
    case 'setSandbox':
      return { ...state, sandbox: action.on };
    case 'newGame':
      // Returning players keep the tutorial dismissed; it can be replayed from Settings.
      return { ...createNewGame(action.seed), tutorialDone: state.tutorialDone ?? false };
    case 'load':
      return action.state;
  }
}
