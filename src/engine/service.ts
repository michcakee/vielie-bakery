import { CONFIG, PRODUCTS } from '../data/catalog';
import { LINES, REGULARS, WALKIN_NAMES } from '../data/people';
import {
  available,
  clamp,
  divertChance,
  effectActive,
  effectivePrice,
  expectedWalkIns,
  has,
  isTet,
  levelOf,
  madeToOrderQuality,
  onMenu,
  packagingCost,
  patienceMult,
  round2,
  sampleBudget,
  willingToPay,
} from './economy';
import { bump } from './helpers';
import { rngFor } from './rng';
import type { Fx, GameState, IngredientId, Look, Mood, ProductId, ServiceState, Visit } from './types';

const SEGMENTS: [number, number, number][] = [
  // start, length, weight (morning rush, lunch, afternoon, evening)
  [0, 150, 0.33],
  [240, 150, 0.3],
  [420, 180, 0.27],
  [600, 105, 0.1],
];

const pick = <T,>(rand: () => number, list: T[]): T => list[Math.floor(rand() * list.length)];

function weightedPick<T>(rand: () => number, items: T[], weight: (t: T) => number): T | null {
  const ws = items.map(weight);
  const total = ws.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function randomLook(rand: () => number): Look {
  return {
    skin: Math.floor(rand() * 5),
    hair: Math.floor(rand() * 4),
    hairColor: Math.floor(rand() * 6),
    shirt: Math.floor(rand() * 8),
    apron: -1,
    accessory: rand() < 0.75 ? 0 : 1 + Math.floor(rand() * 3),
  };
}

/** Products a customer could ask for when the doors open. */
export function offeredToday(s: GameState): ProductId[] {
  return onMenu(s).filter((p) => available(s, p));
}

function appeal(s: GameState, p: ProductId, seg: number): number {
  const d = PRODUCTS[p];
  let w = d.popularity * d.times[seg] * (d.weather[s.market.weather] ?? 1);
  if (effectActive(s, 'fruitFest') && (p === 'banhChuoi' || p === 'banhKem')) w *= 1.4;
  if (p === 'banhKem' && (s.day % 7 >= 5 || isTet(s.day))) w *= 1.8;
  if (p === 'mutDua') w *= 2.2;
  return w;
}

function orderLine(rand: () => number, p: ProductId): string {
  return pick(rand, LINES.order(PRODUCTS[p].name.replace('Bánh ', 'bánh ').replace('Hộp ', 'hộp ')));
}

/** Everyone who will come by today, decided when the doors open. */
export function buildSchedule(s: GameState): Visit[] {
  const rand = rngFor(s.seed, s.day, 11);
  const offered = offeredToday(s);
  const trays = offered.filter((p) => PRODUCTS[p].kind === 'tray');
  const visits: Omit<Visit, 'id'>[] = [];
  if (!offered.length) return [];
  const pm = patienceMult(s);
  const ecoShare = effectActive(s, 'greenWeek') ? 0.45 : 0.18;

  const make = (opts: { seg: number; arrive?: number; who?: string; name?: string; look?: Look; budget?: number; patience?: number; wants?: ProductId; lastCallOnly?: boolean; eco?: boolean }) => {
    const seg = opts.seg;
    const [start, len] = SEGMENTS[seg];
    const pool = opts.lastCallOnly ? trays : offered;
    const wants = opts.wants ?? weightedPick(rand, pool, (p) => appeal(s, p, seg));
    if (!wants) return;
    const altPool = offered.filter((p) => p !== wants);
    const alt = altPool.length && rand() < CONFIG.substitutionChance ? weightedPick(rand, altPool, (p) => appeal(s, p, seg)) : null;
    const v: Omit<Visit, 'id'> = {
      who: opts.who ?? 'walkin',
      name: opts.name ?? pick(rand, WALKIN_NAMES),
      look: opts.look ?? randomLook(rand),
      wants,
      alt,
      qty: PRODUCTS[wants].kind === 'tray' && wants !== 'banhKem' && rand() < 0.22 ? 2 : 1,
      budget: opts.budget ?? (opts.lastCallOnly ? clamp(sampleBudget(rand) - 0.3, 0.5, 1.2) : sampleBudget(rand)),
      patience: Math.round(CONFIG.basePatience * (opts.patience ?? 0.8 + 0.4 * rand()) * pm),
      arrive: Math.round(opts.arrive ?? start + rand() * len),
      lastCallOnly: !!opts.lastCallOnly,
      status: 'coming',
      ecoMinded: opts.eco ?? rand() < ecoShare,
    };
    if (v.who === 'walkin' && rand() < divertChance(s, wants)) v.divertedTo = 'Bánh Mì Cô Tư';
    visits.push(v);
  };

  if (s.day === 1) {
    const linh = REGULARS[0];
    make({ seg: 0, arrive: 4, who: linh.id, name: linh.name, look: linh.look, budget: 1.3, patience: 3, wants: 'banhMi', eco: false });
  }

  const target = expectedWalkIns(s);
  const n = Math.max(0, Math.round(target * (0.9 + 0.2 * rand())));
  for (let i = 0; i < n; i++) {
    const seg = weightedPick(rand, [0, 1, 2, 3], (k) => SEGMENTS[k][2])!;
    make({ seg });
  }

  const level = levelOf(s.xp);
  for (const r of REGULARS) {
    if (r.level > level || (s.day === 1 && r.id !== 'minh')) continue;
    if (s.day === 1 && r.id === 'linh') continue;
    const hearts = s.hearts[r.id] ?? 0;
    const chance = r.frequency * (0.75 + 0.08 * hearts) * (s.market.weather === 'rainy' ? 0.8 : 1);
    if (rand() > chance) continue;
    const wants = r.favorite.find((p) => offered.includes(p));
    make({
      seg: r.time,
      who: r.id,
      name: r.name,
      look: r.look,
      budget: r.budget,
      patience: r.patience,
      wants: wants ?? undefined,
      eco: r.eco,
    });
  }

  if (trays.length) {
    const hunters = Math.round(n * 0.15);
    for (let i = 0; i < hunters; i++) make({ seg: 3, arrive: 600 + rand() * 100, lastCallOnly: true });
  }

  return visits.sort((a, b) => a.arrive - b.arrive).map((v, i) => ({ ...v, id: i + 1 }));
}

export function newService(s: GameState): ServiceState {
  return { clock: 0, visits: buildSchedule(s), lastCall: false, fx: [], nextFx: 1, cateringDone: false };
}

// ---------------------------------------------------------------- helpers

function addFx(svc: ServiceState, kind: Fx['kind'], amount?: number, visitId?: number): ServiceState {
  const fx = [...svc.fx.filter((f) => svc.clock - f.at < 30), { id: svc.nextFx, kind, at: svc.clock, amount, visitId }];
  return { ...svc, fx, nextFx: svc.nextFx + 1 };
}

function setVisit(svc: ServiceState, id: number, patch: Partial<Visit>): ServiceState {
  return { ...svc, visits: svc.visits.map((v) => (v.id === id ? { ...v, ...patch } : v)) };
}

function leave(s: GameState, v: Visit, mood: Mood, line: string): GameState {
  let svc = setVisit(s.service!, v.id, { status: 'done', mood, line, doneAt: s.service!.clock });
  svc = addFx(svc, 'sad', undefined, v.id);
  const t = { ...s.today };
  let rep = s.reputation;
  const hearts = { ...s.hearts };
  if (mood === 'slow') {
    t.lostSlow++;
    rep = bump(rep, -0.25);
    if (v.who !== 'walkin') hearts[v.who] = Math.max(0, (hearts[v.who] ?? 0) - 0.5);
  } else if (mood === 'pricey') {
    t.lostPrice++;
    t.pricey = { ...t.pricey, [v.wants]: (t.pricey[v.wants] ?? 0) + 1 };
    rep = bump(rep, -0.05);
  } else if (mood === 'sad') {
    t.lostSoldOut++;
    t.wishedFor = { ...t.wishedFor, [v.wants]: (t.wishedFor[v.wants] ?? 0) + 1 };
    rep = bump(rep, -0.1);
  }
  return { ...s, service: svc, today: t, reputation: rep, hearts };
}

function arriveAtCounter(s: GameState, v: Visit, rand: () => number): GameState {
  let wants = v.wants;
  let line = v.who !== 'walkin' && rand() < 0.5 ? REGULARS.find((r) => r.id === v.who)?.hello : undefined;
  if (!available(s, wants, v.qty) && !available(s, wants, 1)) {
    const t = s.today;
    if (t.soldOutAt[wants] === undefined && (t.made[wants] > 0 || PRODUCTS[wants].kind !== 'tray')) {
      s = { ...s, today: { ...t, soldOutAt: { ...t.soldOutAt, [wants]: s.service!.clock } } };
    }
    if (v.alt && available(s, v.alt)) {
      wants = v.alt;
      line = LINES.substitute(PRODUCTS[wants].name.toLowerCase());
    } else {
      return leave(s, v, 'sad', pick(rand, LINES.soldOut));
    }
  }
  const qty = available(s, wants, v.qty) ? v.qty : 1;
  const price = effectivePrice(s, wants);
  const quality = PRODUCTS[wants].kind === 'tray' ? s.display[wants].quality : madeToOrderQuality(s, wants, 80);
  if (price > willingToPay(s, wants, v.budget, quality, v.ecoMinded) + 1e-9) {
    return leave(s, { ...v, wants }, 'pricey', pick(rand, LINES.pricey));
  }
  if (!line) line = isTet(s.day) && rand() < 0.3 ? pick(rand, LINES.tet) : orderLine(rand, wants);
  return { ...s, service: setVisit(s.service!, v.id, { status: 'waiting', waitStart: s.service!.clock, wants, qty, line, mood: undefined }) };
}

// ---------------------------------------------------------------- serving

/** Consume stock for one sale and return the cost of goods and quality. */
function consume(s: GameState, p: ProductId, qty: number, process?: number): { s: GameState; cogs: number; quality: number } {
  const def = PRODUCTS[p];
  if (def.kind === 'tray') {
    const st = s.display[p];
    return { s: { ...s, display: { ...s.display, [p]: { ...st, qty: st.qty - qty } } }, cogs: st.unitCost * qty, quality: st.quality };
  }
  const quality = madeToOrderQuality(s, p, process ?? 75);
  let cogs = 0;
  const pantry = { ...s.pantry };
  for (const [id, n] of Object.entries(def.recipe) as [IngredientId, number][]) {
    if (!n) continue;
    cogs += pantry[id].avgCost * n * qty;
    pantry[id] = { ...pantry[id], qty: pantry[id].qty - n * qty };
  }
  let baguettes = s.baguettes;
  if (p === 'banhMi') {
    cogs += baguettes.unitCost * qty;
    baguettes = { ...baguettes, qty: baguettes.qty - qty };
  }
  return { s: { ...s, pantry, baguettes }, cogs, quality };
}

export function serve(s: GameState, visitId: number, process?: number, byHelper = false): GameState {
  const svc = s.service;
  if (!svc || s.phase !== 'service') return s;
  const v = svc.visits.find((x) => x.id === visitId);
  if (!v || v.status !== 'waiting') return s;
  const p = v.wants;
  if (!available(s, p, v.qty)) {
    if (available(s, p, 1)) v.qty = 1;
    else return leave(s, v, 'sad', pick(rngFor(s.seed, s.day, 500 + visitId), LINES.soldOut));
  }
  const price = effectivePrice(s, p);
  const c = consume(s, p, v.qty, process);
  let next = c.s;
  const pack = packagingCost(s, p) * v.qty;
  const paidAmt = round2(price * v.qty);
  const wtp = willingToPay(s, p, v.budget, c.quality, v.ecoMinded);
  const waited = svc.clock - (v.waitStart ?? svc.clock);
  const sat = 0.45 * (c.quality / 100) + 0.35 * clamp(1 - waited / Math.max(1, v.patience), 0, 1) + 0.2 * clamp(((wtp - price) / wtp) * 2 + 0.5, 0, 1);
  const mood: Mood = sat >= 0.72 ? 'love' : sat >= 0.5 ? 'happy' : 'ok';
  const rand = rngFor(s.seed, s.day, 900 + visitId);
  const line = pick(rand, mood === 'love' ? LINES.love : mood === 'happy' ? LINES.happy : LINES.ok);
  const regular = v.who !== 'walkin';
  const tip = regular && mood === 'love' ? CONFIG.tipLove : 0;

  const t = { ...next.today };
  t.revenue += paidAmt;
  t.tips += tip;
  t.cogs += c.cogs;
  t.packaging += pack;
  t.served++;
  t.sold = { ...t.sold, [p]: t.sold[p] + v.qty };
  if (mood === 'love') t.love++;
  if (regular) t.regularsServed++;
  if (svc.clock < 300) t.servedBeforeNoon++;
  t.xp += 1 + (mood === 'love' ? 1 : 0);

  let rep = next.reputation + (mood === 'love' ? 0.1 : mood === 'happy' ? 0.04 : -0.06);
  if (p === 'banhBo' && c.quality >= 80) rep += 0.08;
  const hearts = { ...next.hearts };
  if (regular) hearts[v.who] = Math.min(5, (hearts[v.who] ?? 0) + (mood === 'love' ? 0.5 : mood === 'happy' ? 0.25 : 0));
  const visitsByRegular = regular ? { ...next.visitsByRegular, [v.who]: (next.visitsByRegular[v.who] ?? 0) + 1 } : next.visitsByRegular;
  const lifetime = {
    ...next.lifetime,
    served: next.lifetime.served + 1,
    sold: { ...next.lifetime.sold, [p]: (next.lifetime.sold[p] ?? 0) + v.qty },
    revenue: next.lifetime.revenue + paidAmt,
    returning: next.lifetime.returning + (regular && (next.visitsByRegular[v.who] ?? 0) > 0 ? 1 : 0),
    tetSold: next.lifetime.tetSold + (p === 'mutDua' ? v.qty : 0),
  };

  let nsvc = setVisit(svc, visitId, { status: 'done', mood, line, paid: paidAmt, tip, doneAt: svc.clock });
  nsvc = addFx(nsvc, 'coin', paidAmt + tip, visitId);
  if (mood === 'love') nsvc = addFx(nsvc, 'heart', undefined, visitId);
  next = {
    ...next,
    cash: next.cash + paidAmt + tip - pack,
    today: t,
    reputation: clamp(rep, 0, 100),
    hearts,
    visitsByRegular,
    lifetime,
    service: nsvc,
    questProgress: byHelper ? next.questProgress : { ...next.questProgress, handServed: (next.questProgress.handServed ?? 0) + 1 },
  };
  return next;
}

// ---------------------------------------------------------------- clock

function cateringPickup(s: GameState): GameState {
  const eff = s.effects.find((e) => e.id === 'catering' && Number(e.data?.day) === s.day);
  const svc = s.service!;
  if (!eff || svc.cateringDone) return s;
  const want = Number(eff.data?.qty ?? 0);
  const pay = Number(eff.data?.pay ?? 0);
  let made = 0;
  let next = s;
  let cogs = 0;
  while (made < want && available(next, 'banhMi')) {
    const c = consume(next, 'banhMi', 1, 70);
    next = c.s;
    cogs += c.cogs;
    made++;
  }
  const earned = round2((pay * made) / want);
  const t = { ...next.today, revenue: next.today.revenue + earned, cogs: next.today.cogs + cogs, sold: { ...next.today.sold, banhMi: next.today.sold.banhMi + made } };
  t.notes = [...t.notes, made === want ? `Chị Thảo picked up all ${want} bánh mì and paid $${earned.toFixed(2)}. Cảm ơn!` : `You only had ${made} of ${want} bánh mì for Chị Thảo. She paid $${earned.toFixed(2)} and looked disappointed.`];
  const community = made === want ? bump(next.community, 3) : bump(next.community, -4);
  const rep = made === want ? bump(next.reputation, 2) : bump(next.reputation, -3);
  return { ...next, cash: next.cash + earned, today: t, community, reputation: rep, service: addFx({ ...next.service!, cateringDone: true }, 'coin', earned) };
}

function wholesaleDelivery(s: GameState): GameState {
  const eff = s.effects.find((e) => e.id === 'wholesale' && e.until >= s.day);
  if (!eff) return s;
  const want = Number(eff.data?.qty ?? 10);
  const price = Number(eff.data?.price ?? 1.1);
  const st = s.display.flan;
  const n = Math.min(want, st.qty);
  const earned = round2(n * price);
  const t = { ...s.today, revenue: s.today.revenue + earned, cogs: s.today.cogs + n * st.unitCost, sold: { ...s.today.sold, flan: s.today.sold.flan + n } };
  t.notes = [...t.notes, n === want ? `Café Mộc collected ${n} flan for $${earned.toFixed(2)}.` : `Café Mộc wanted ${want} flan but you had ${n}.`];
  return {
    ...s,
    cash: s.cash + earned,
    display: { ...s.display, flan: { ...st, qty: st.qty - n } },
    today: t,
    community: n < want ? bump(s.community, -1) : s.community,
  };
}

export function openShop(s: GameState): GameState {
  let next: GameState = { ...s, phase: 'service', service: newService(s) };
  next = wholesaleDelivery(next);
  const visits = next.service!.visits;
  next = { ...next, today: { ...next.today, customers: visits.filter((v) => !v.lastCallOnly).length } };
  return next;
}

export function tick(s: GameState, dt: number): GameState {
  if (s.phase !== 'service' || !s.service) return s;
  let next: GameState = { ...s, service: { ...s.service, clock: Math.min(CONFIG.dayMinutes, s.service.clock + dt) } };
  const clock = next.service!.clock;
  const rand = rngFor(s.seed, s.day, 300 + Math.floor(clock));

  for (const v0 of next.service!.visits) {
    const v = next.service!.visits.find((x) => x.id === v0.id)!;
    if (v.status === 'coming' && v.arrive <= clock) {
      if (v.lastCallOnly && !next.service!.lastCall) {
        next = { ...next, service: setVisit(next.service!, v.id, { status: 'done', doneAt: clock }) };
      } else if (v.divertedTo) {
        next = {
          ...next,
          service: setVisit(next.service!, v.id, { status: 'done', mood: 'thinking', doneAt: clock }),
          today: { ...next.today, diverted: next.today.diverted + 1 },
        };
      } else {
        if (v.lastCallOnly) next = { ...next, today: { ...next.today, customers: next.today.customers + 1 } };
        next = { ...next, service: setVisit(next.service!, v.id, { status: 'walking', walkStart: v.arrive }) };
      }
    }
  }

  for (const v0 of next.service!.visits) {
    const v = next.service!.visits.find((x) => x.id === v0.id)!;
    if (v.status === 'walking') {
      const waiting = next.service!.visits.filter((x) => x.status === 'waiting').length;
      if (clock - (v.walkStart ?? v.arrive) >= CONFIG.walkMinutes && waiting < CONFIG.counterSlots) next = arriveAtCounter(next, v, rand);
      else if (clock - v.arrive > v.patience * 1.2) next = leave(next, v, 'slow', pick(rand, LINES.slow));
    } else if (v.status === 'waiting' && clock - (v.waitStart ?? clock) > v.patience) {
      next = leave(next, v, 'slow', pick(rand, LINES.slow));
    }
  }

  if (has(next, 'helper')) {
    const ready = next.service!.visits.find((v) => v.status === 'waiting' && PRODUCTS[v.wants].kind === 'tray' && clock - (v.waitStart ?? clock) >= CONFIG.helperDelay);
    if (ready) next = serve(next, ready.id, undefined, true);
  }

  if (clock >= 300) next = cateringPickup(next);
  if (clock >= CONFIG.dayMinutes) next = endService(next);
  return next;
}

export function setLastCall(s: GameState, on: boolean): GameState {
  if (s.phase !== 'service' || !s.service || s.service.clock < CONFIG.lastCallAt - 60) return s;
  return { ...s, service: { ...s.service, lastCall: on } };
}

/** Skip to closing time (or fast-forward through a quiet afternoon). */
export function endService(s: GameState): GameState {
  if (!s.service) return s;
  let next = s;
  for (const v of s.service.visits) {
    if (v.status === 'waiting' || v.status === 'walking') next = leave(next, v, 'slow', 'Đóng cửa rồi à?');
  }
  const svc = { ...next.service!, clock: CONFIG.dayMinutes, visits: next.service!.visits.map((v) => (v.status === 'coming' ? { ...v, status: 'done' as const } : v)) };
  return { ...next, service: svc, phase: 'closing', leftoverPlan: defaultLeftoverPlan(next) };
}

export function keepsOvernight(s: GameState, p: ProductId): boolean {
  if (p === 'mutDua') return true;
  return PRODUCTS[p].keeps && has(s, 'fridge') && !effectActive(s, 'fridgeBroken');
}

export function defaultLeftoverPlan(s: GameState): GameState['leftoverPlan'] {
  const plan: GameState['leftoverPlan'] = {};
  for (const p of Object.keys(s.display) as ProductId[]) if (s.display[p].qty > 0) plan[p] = keepsOvernight(s, p) ? 'keep' : 'donate';
  if (s.baguettes.qty > 0) plan.baguette = 'donate';
  return plan;
}
