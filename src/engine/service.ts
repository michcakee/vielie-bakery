import { CONFIG, PRODUCTS, type ProductKind } from '../data/catalog';
import { ECON } from '../data/config';
import { LINES, REGULARS, WALKIN_NAMES } from '../data/people';
import { SEGMENTS, SEGMENT_ORDER } from '../data/world';
import { accrue, move } from './accounting';
import {
  activeRivals,
  available,
  budgetFromZ,
  clamp,
  effectActive,
  effectivePrice,
  expectedWalkIns,
  flagshipStaff,
  fridgeWorks,
  has,
  isTet,
  levelOf,
  madeToOrderQuality,
  onMenu,
  packagingCost,
  patienceMult,
  playerShare,
  productAppeal,
  productivity,
  round2,
  segmentMix,
  sigmaFor,
  willingToPay,
  loyalCap,
  loyalTotal,
} from './economy';
import { bump } from './helpers';
import { randomLook } from './look';
import { gaussian, rngFor } from './rng';
import { pick, weightedPick } from './util';
import type { Fx, GameState, IngredientId, Look, Mood, ProductId, SegmentId, ServerSlot, ServiceState, Visit } from './types';

export { randomLook };

const DAYPARTS: [number, number, number][] = [
  // start, length, weight (morning rush, lunch, afternoon, evening)
  [0, 150, 0.33],
  [240, 150, 0.3],
  [420, 180, 0.27],
  [600, 105, 0.1],
];

export const dishName = (p: ProductId) => {
  const n = PRODUCTS[p].name;
  return n.charAt(0).toLowerCase() + n.slice(1);
};

function orderLine(rand: () => number, p: ProductId): string {
  return pick(rand, LINES.order(dishName(p)));
}

export function offeredToday(s: GameState): ProductId[] {
  return onMenu(s).filter((p) => available(s, p));
}

function regularSegment(id: string): SegmentId {
  const map: Record<string, SegmentId> = { linh: 'office', minh: 'coffee', baTu: 'vnElders', nam: 'students', mai: 'families', hung: 'coffee', hanh: 'vnFamilies', an: 'event' };
  return map[id] ?? 'vnFamilies';
}

/** Everyone who will come by today, decided when the doors open. */
export function buildSchedule(s: GameState): Visit[] {
  const rand = rngFor(s.seed, s.day, 11);
  const offered = offeredToday(s);
  const trays = offered.filter((p) => PRODUCTS[p].kind === 'tray');
  const visits: Omit<Visit, 'id'>[] = [];
  if (!offered.length) return [];
  const pm = patienceMult(s);
  const ecoShare = effectActive(s, 'greenWeek') ? ECON.demand.greenWeekEcoShare : ECON.demand.ecoShare;
  const mix = segmentMix(s);
  const names = [...WALKIN_NAMES].sort(() => rand() - 0.5);
  let nameIdx = 0;
  const rivals = activeRivals(s);
  const campaigns = s.campaigns.filter((c) => c.startDay <= s.day && c.endDay >= s.day);

  const make = (opts: {
    part: number;
    arrive?: number;
    who?: string;
    name?: string;
    look?: Look;
    budget?: number;
    patience?: number;
    wants?: ProductId;
    lastCallOnly?: boolean;
    eco?: boolean;
    segment?: SegmentId;
    loyal?: boolean;
    source?: string;
  }) => {
    const part = opts.part;
    const [start, len] = DAYPARTS[part];
    const segment = opts.segment ?? weightedPick(rand, SEGMENT_ORDER, (k) => mix[k] * SEGMENTS[k].times[part]) ?? 'vnFamilies';
    const sd = SEGMENTS[segment];
    const pool = opts.lastCallOnly ? trays : offered;
    const wants = opts.wants ?? weightedPick(rand, pool, (p) => PRODUCTS[p].popularity * (sd.prefs[p] ?? 1) * PRODUCTS[p].times[part] * (PRODUCTS[p].weather[s.market.weather] ?? 1) * (PRODUCTS[p].season ? 2.2 : 1));
    if (!wants) return;
    const altPool = offered.filter((p) => p !== wants);
    const alt = altPool.length && rand() < ECON.service.substitutionChance ? weightedPick(rand, altPool, (p) => (sd.prefs[p] ?? 1) * PRODUCTS[p].times[part]) : null;
    const isTray = PRODUCTS[wants].kind === 'tray';
    const qty = isTray && wants !== 'banhKem' ? Math.max(1, Math.min(4, Math.round(sd.qty + (rand() - 0.5)))) : 1;
    let budget = opts.budget ?? budgetFromZ(gaussian(rand), sigmaFor(s, wants, segment));
    if (opts.lastCallOnly) budget *= 0.75;
    const v: Omit<Visit, 'id'> = {
      who: opts.who ?? 'walkin',
      name: opts.name ?? names[nameIdx++ % names.length],
      look: opts.look ?? randomLook(rand),
      segment,
      loyal: !!opts.loyal,
      wants,
      alt,
      qty,
      budget,
      patience: Math.round(ECON.service.basePatience * (opts.patience ?? (0.8 + 0.4 * rand()) * sd.patience) * pm * (opts.loyal ? 1.2 : 1)),
      arrive: Math.round(opts.arrive ?? start + rand() * len),
      lastCallOnly: !!opts.lastCallOnly,
      source: opts.source,
      status: 'coming',
      ecoMinded: opts.eco ?? rand() < ecoShare * (sd.eco / 0.2),
    };
    if (v.who === 'walkin' && !v.loyal && rivals.length && rand() > playerShare(s, wants)) {
      const takers = rivals.filter((c) => c.prices[wants] !== undefined);
      if (takers.length) v.divertedTo = pick(rand, takers).name;
    }
    visits.push(v);
  };

  if (s.day === 1 && s.scenario === 'family') {
    const linh = REGULARS[0];
    make({ part: 0, arrive: 4, who: linh.id, name: linh.name, look: linh.look, budget: 1.3, patience: 3, wants: 'banhMi', eco: false, segment: 'office' });
  }

  const walkIns = expectedWalkIns(s);
  const boost = campaigns.reduce((t, c) => t + (c.reach * c.conversion) / Math.max(1, c.endDay - c.startDay + 1), 0);
  const n = Math.max(0, Math.round(walkIns * (0.9 + 0.2 * rand())));
  for (let i = 0; i < n; i++) {
    const part = weightedPick(rand, [0, 1, 2, 3], (k) => DAYPARTS[k][2])!;
    const fromCampaign = boost > 0 && campaigns.length && rand() < boost / Math.max(1, walkIns) ? campaigns[Math.floor(rand() * campaigns.length)] : null;
    make({ part, source: fromCampaign ? `c${fromCampaign.id}` : undefined });
  }

  for (const seg of SEGMENT_ORDER) {
    const pool = s.loyal[seg] ?? 0;
    const count = Math.round(pool * 0.22 * (0.8 + 0.4 * rand()));
    for (let i = 0; i < count; i++) {
      const part = weightedPick(rand, [0, 1, 2, 3], (k) => SEGMENTS[seg].times[k])!;
      make({ part, segment: seg, loyal: true });
    }
  }

  const level = levelOf(s.xp);
  const inherited = s.scenario === 'family' || s.scenario === 'community' || s.scenario === 'recession';
  for (const r of REGULARS) {
    if (r.level > level || (s.day === 1 && r.id !== 'minh')) continue;
    if (s.day === 1 && r.id === 'linh') continue;
    if (!inherited && (s.visitsByRegular[r.id] ?? 0) === 0 && s.history.length < 5) continue;
    const hearts = s.hearts[r.id] ?? 0;
    const chance = r.frequency * (0.75 + 0.08 * hearts) * (s.market.weather === 'rainy' ? 0.8 : 1);
    if (rand() > chance) continue;
    const wants = r.favorite.find((p) => offered.includes(p));
    make({ part: r.time, who: r.id, name: r.name, look: r.look, budget: r.budget, patience: r.patience, wants: wants ?? undefined, eco: r.eco, segment: regularSegment(r.id), loyal: true });
  }

  if (trays.length) {
    const hunters = Math.round(n * ECON.demand.lastCallShare);
    for (let i = 0; i < hunters; i++) make({ part: 3, arrive: 600 + rand() * 100, lastCallOnly: true, segment: 'budget' });
  }

  return visits.sort((a, b) => a.arrive - b.arrive).map((v, i) => ({ ...v, id: i + 1 }));
}

export function makeServers(s: GameState, auto: boolean): ServerSlot[] {
  const out: ServerSlot[] = [];
  if (auto) out.push({ id: 'owner', busyUntil: 0, visitId: null, quality: ECON.service.ownerAutoQuality, served: 0 });
  for (const e of flagshipStaff(s)) if (e.role === 'cashier' || e.role === 'barista' || e.role === 'cook') out.push({ id: `staff:${e.id}`, busyUntil: 0, visitId: null, quality: 60 + 8 * e.skill, served: 0 });
  return out;
}

export function newService(s: GameState, auto = false): ServiceState {
  return { clock: 0, visits: buildSchedule(s), lastCall: false, fx: [], nextFx: 1, cateringDone: false, auto, servers: makeServers(s, auto) };
}

// ---------------------------------------------------------------- helpers

function addFx(svc: ServiceState, kind: Fx['kind'], amount?: number, visitId?: number): ServiceState {
  const fx = [...svc.fx.filter((f) => svc.clock - f.at < 30), { id: svc.nextFx, kind, at: svc.clock, amount, visitId }];
  return { ...svc, fx, nextFx: svc.nextFx + 1 };
}

function setVisit(svc: ServiceState, id: number, patch: Partial<Visit>): ServiceState {
  return { ...svc, visits: svc.visits.map((v) => (v.id === id ? { ...v, ...patch } : v)) };
}

function freeServerOf(svc: ServiceState, visitId: number): ServiceState {
  return { ...svc, servers: svc.servers.map((x) => (x.visitId === visitId ? { ...x, visitId: null, busyUntil: svc.clock } : x)) };
}

function segStat(s: GameState, seg: SegmentId, patch: Partial<{ visits: number; served: number; revenue: number; loyal: number }>): GameState['today']['segments'] {
  const cur = s.today.segments[seg] ?? { visits: 0, served: 0, revenue: 0, loyal: 0 };
  return { ...s.today.segments, [seg]: { visits: cur.visits + (patch.visits ?? 0), served: cur.served + (patch.served ?? 0), revenue: cur.revenue + (patch.revenue ?? 0), loyal: cur.loyal + (patch.loyal ?? 0) } };
}

function leave(s: GameState, v: Visit, mood: Mood, line: string): GameState {
  let svc = setVisit(s.service!, v.id, { status: 'done', mood, line, doneAt: s.service!.clock });
  svc = freeServerOf(addFx(svc, 'sad', undefined, v.id), v.id);
  const t = { ...s.today };
  let rep = s.reputation;
  const hearts = { ...s.hearts };
  const loyal = { ...s.loyal };
  if (mood === 'slow') {
    t.lostSlow++;
    rep = bump(rep, -0.08);
    if (v.who !== 'walkin') hearts[v.who] = Math.max(0, (hearts[v.who] ?? 0) - 0.5);
  } else if (mood === 'pricey') {
    t.lostPrice++;
    t.pricey = { ...t.pricey, [v.wants]: (t.pricey[v.wants] ?? 0) + 1 };
  } else if (mood === 'sad') {
    t.lostSoldOut++;
    t.wishedFor = { ...t.wishedFor, [v.wants]: (t.wishedFor[v.wants] ?? 0) + 1 };
    rep = bump(rep, -0.02);
  }
  if (v.loyal && v.who === 'walkin' && (mood === 'slow' || mood === 'pricey') && rngFor(s.seed, s.day, 700 + v.id)() < 0.3) loyal[v.segment] = Math.max(0, (loyal[v.segment] ?? 0) - 1);
  return { ...s, service: svc, today: t, reputation: rep, hearts, loyal };
}

function arriveAtCounter(s: GameState, v: Visit, rand: () => number): GameState {
  let wants = v.wants;
  let line = v.who !== 'walkin' && rand() < 0.5 ? REGULARS.find((r) => r.id === v.who)?.hello : undefined;
  const sources = v.source ? { ...s.today.sources, [v.source]: { visits: (s.today.sources[v.source]?.visits ?? 0) + 1, revenue: s.today.sources[v.source]?.revenue ?? 0 } } : s.today.sources;
  s = { ...s, today: { ...s.today, segments: segStat(s, v.segment, { visits: 1 }), sources } };
  if (!available(s, wants, 1)) {
    const t = s.today;
    if (t.soldOutAt[wants] === undefined && (t.made[wants] > 0 || PRODUCTS[wants].kind !== 'tray')) s = { ...s, today: { ...t, soldOutAt: { ...t.soldOutAt, [wants]: s.service!.clock } } };
    if (v.alt && available(s, v.alt)) {
      wants = v.alt;
      line = LINES.substitute(dishName(wants));
    } else return leave(s, v, 'sad', pick(rand, LINES.soldOut));
  }
  const qty = available(s, wants, v.qty) ? v.qty : 1;
  const price = effectivePrice(s, wants);
  const quality = PRODUCTS[wants].kind === 'tray' ? s.display[wants].quality : madeToOrderQuality(s, wants, 80);
  if (price > willingToPay(s, wants, v.budget, quality, v.ecoMinded, v.segment, v.loyal) + 1e-9) return leave(s, { ...v, wants }, 'pricey', pick(rand, LINES.pricey));
  if (!line) line = isTet(s.day) && rand() < 0.3 ? pick(rand, LINES.tet) : orderLine(rand, wants);
  return { ...s, service: setVisit(s.service!, v.id, { status: 'waiting', waitStart: s.service!.clock, wants, qty, line, mood: undefined }) };
}

// ---------------------------------------------------------------- serving

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

/** Book one sale: cash in, revenue, cost of goods and packaging. */
function bookSale(s: GameState, p: ProductId, units: number, paid: number, tip: number, cogs: number, pack: number, revenueField: 'sales' | 'otherRevenue' = 'sales'): GameState {
  let next = move(s, 'cashSales', paid + tip, { [revenueField]: paid, tips: tip });
  next = move(next, 'cashOperatingOther', -pack, { packaging: pack });
  next = accrue(next, { cogs });
  const t = next.today;
  return {
    ...next,
    today: {
      ...t,
      revenue: t.revenue + paid,
      tips: t.tips + tip,
      cogs: t.cogs + cogs,
      packaging: t.packaging + pack,
      sold: { ...t.sold, [p]: t.sold[p] + units },
      revenueBy: { ...t.revenueBy, [p]: t.revenueBy[p] + paid },
      cogsBy: { ...t.cogsBy, [p]: t.cogsBy[p] + cogs + pack },
    },
  };
}

export function serve(s: GameState, visitId: number, process?: number, by: string = 'player'): GameState {
  const svc = s.service;
  if (!svc || s.phase !== 'service') return s;
  const v = svc.visits.find((x) => x.id === visitId);
  if (!v || v.status !== 'waiting') return s;
  if (by === 'player' && v.servedBy && v.servedBy !== 'player') return s;
  const p = v.wants;
  let qty = v.qty;
  if (!available(s, p, qty)) {
    if (available(s, p, 1)) qty = 1;
    else return leave(s, v, 'sad', pick(rngFor(s.seed, s.day, 500 + visitId), LINES.soldOut));
  }
  const price = effectivePrice(s, p);
  const c = consume(s, p, qty, process);
  let next = c.s;
  const pack = packagingCost(s, p) * qty;
  const paid = round2(price * qty);
  const wtp = willingToPay(s, p, v.budget, c.quality, v.ecoMinded, v.segment, v.loyal);
  const waited = svc.clock - (v.waitStart ?? svc.clock);
  const sat = 0.45 * (c.quality / 100) + 0.35 * clamp(1 - waited / Math.max(1, v.patience), 0, 1) + 0.2 * clamp(((wtp - price) / wtp) * 2 + 0.5, 0, 1);
  const mood: Mood = sat >= 0.72 ? 'love' : sat >= 0.5 ? 'happy' : 'ok';
  const rand = rngFor(s.seed, s.day, 900 + visitId);
  const line = pick(rand, mood === 'love' ? LINES.love : mood === 'happy' ? LINES.happy : LINES.ok);
  const named = v.who !== 'walkin';
  const tip = (named || v.loyal) && mood === 'love' ? ECON.service.tipLove : 0;

  next = bookSale(next, p, qty, paid, tip, c.cogs, pack);
  const t = { ...next.today };
  t.served++;
  t.satisfaction += sat;
  if (mood === 'love') t.love++;
  if (named) t.regularsServed++;
  if (svc.clock < 300) t.servedBeforeNoon++;
  if (by === 'player' || by === 'owner') t.ownerServed++;
  else t.staffServed++;
  t.xp += ECON.progression.xpPerServe + (mood === 'love' ? ECON.progression.xpPerLove : 0);
  t.segments = segStat(next, v.segment, { served: 1, revenue: paid, loyal: v.loyal ? 1 : 0 });
  if (v.source) t.sources = { ...t.sources, [v.source]: { visits: t.sources[v.source]?.visits ?? 1, revenue: (t.sources[v.source]?.revenue ?? 0) + paid } };

  let rep = next.reputation;
  if (p === 'banhBo' && c.quality >= 80) rep += 0.03;
  const hearts = { ...next.hearts };
  if (named) hearts[v.who] = Math.min(5, (hearts[v.who] ?? 0) + (mood === 'love' ? 0.5 : mood === 'happy' ? 0.25 : 0));
  const loyal = { ...next.loyal };
  if (!v.loyal && !named && sat >= 0.5 && rand() < SEGMENTS[v.segment].loyalty * (sat - 0.4) * 0.6 * Math.max(0, 1 - loyalTotal(next) / loyalCap(next))) loyal[v.segment] = (loyal[v.segment] ?? 0) + 1;
  const visitsByRegular = named ? { ...next.visitsByRegular, [v.who]: (next.visitsByRegular[v.who] ?? 0) + 1 } : next.visitsByRegular;
  const lifetime = {
    ...next.lifetime,
    served: next.lifetime.served + 1,
    sold: { ...next.lifetime.sold, [p]: (next.lifetime.sold[p] ?? 0) + qty },
    revenue: next.lifetime.revenue + paid,
    returning: next.lifetime.returning + ((named && (next.visitsByRegular[v.who] ?? 0) > 0) || v.loyal ? 1 : 0),
    tetSold: next.lifetime.tetSold + (p === 'mutDua' ? qty : 0),
  };

  let nsvc = setVisit(svc, visitId, { status: 'done', mood, line, paid, tip, qty, doneAt: svc.clock, servedBy: by });
  nsvc = freeServerOf(nsvc, visitId);
  nsvc = addFx(nsvc, 'coin', paid + tip, visitId);
  if (mood === 'love') nsvc = addFx(nsvc, 'heart', undefined, visitId);
  const staff = by.startsWith('staff:') ? next.staff.map((e) => (`staff:${e.id}` === by ? { ...e, served: e.served + 1 } : e)) : next.staff;
  const campaigns = v.source ? next.campaigns.map((c) => (`c${c.id}` === v.source ? { ...c, newCustomers: c.newCustomers + 1, revenue: c.revenue + paid } : c)) : next.campaigns;
  return {
    ...next,
    today: t,
    reputation: clamp(rep, 0, 100),
    hearts,
    loyal,
    visitsByRegular,
    lifetime,
    staff,
    campaigns,
    service: nsvc,
    questProgress: by === 'player' ? { ...next.questProgress, handServed: (next.questProgress.handServed ?? 0) + 1 } : next.questProgress,
  };
}

// ---------------------------------------------------------------- staff & autopilot

function minutesFor(s: GameState, serverId: string, kind: ProductKind): number {
  if (serverId === 'owner') return ECON.service.ownerMinutes[kind];
  const e = s.staff.find((x) => `staff:${x.id}` === serverId);
  if (!e) return 3;
  let m = ECON.service.staffMinutes[kind] / productivity(e, s.day);
  if (has(s, 'pos')) m *= 0.87;
  if (kind === 'drink' && has(s, 'coffeeBar')) m *= 0.75;
  return m;
}

function canServe(s: GameState, serverId: string, kind: ProductKind): boolean {
  if (serverId === 'owner') return true;
  const e = s.staff.find((x) => `staff:${x.id}` === serverId);
  if (!e) return false;
  return (e.role === 'cashier' && kind === 'tray') || (e.role === 'barista' && kind === 'drink') || (e.role === 'cook' && kind === 'sandwich');
}

function dispatchServers(s: GameState): GameState {
  let next = s;
  const clock = next.service!.clock;
  for (const srv of next.service!.servers) {
    if (srv.visitId !== null && clock >= srv.busyUntil) {
      const v = next.service!.visits.find((x) => x.id === srv.visitId);
      if (v && v.status === 'waiting') next = serve(next, v.id, srv.quality, srv.id);
      next = { ...next, service: { ...next.service!, servers: next.service!.servers.map((x) => (x.id === srv.id ? { ...x, visitId: null } : x)) } };
    }
  }
  const waiting = next.service!.visits.filter((v) => v.status === 'waiting' && !v.servedBy).sort((a, b) => (a.waitStart ?? 0) - (b.waitStart ?? 0));
  for (const v of waiting) {
    const kind = PRODUCTS[v.wants].kind;
    const free = next.service!.servers.filter((x) => x.visitId === null && canServe(next, x.id, kind));
    if (!free.length) continue;
    const srv = free.find((x) => x.id !== 'owner') ?? free[0];
    const minutes = minutesFor(next, srv.id, kind) * (v.qty > 1 && kind === 'tray' ? 1 + 0.25 * (v.qty - 1) : 1);
    next = {
      ...next,
      service: {
        ...setVisit(next.service!, v.id, { servedBy: srv.id }),
        servers: next.service!.servers.map((x) => (x.id === srv.id ? { ...x, visitId: v.id, busyUntil: clock + minutes } : x)),
      },
    };
  }
  return next;
}

// ---------------------------------------------------------------- special orders

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
  next = bookSale(next, 'banhMi', made, earned, 0, cogs, 0, 'otherRevenue');
  next = { ...next, today: { ...next.today, notes: [...next.today.notes, made === want ? `Chị Thảo picked up all ${want} bánh mì and paid $${earned.toFixed(2)}. Cảm ơn!` : `You only had ${made} of ${want} bánh mì for Chị Thảo. She paid $${earned.toFixed(2)} and looked disappointed.`] } };
  return {
    ...next,
    community: made === want ? bump(next.community, 3) : bump(next.community, -4),
    reputation: made === want ? bump(next.reputation, 2) : bump(next.reputation, -3),
    service: addFx({ ...next.service!, cateringDone: true }, 'coin', earned),
  };
}

function wholesaleDelivery(s: GameState): GameState {
  const eff = s.effects.find((e) => e.id === 'wholesale' && e.until >= s.day);
  if (!eff) return s;
  const p = (eff.data?.product as ProductId) ?? 'flan';
  const want = Number(eff.data?.qty ?? 10);
  const price = Number(eff.data?.price ?? 2.2);
  const st = s.display[p];
  const n = Math.min(want, st.qty);
  const earned = round2(n * price);
  let next: GameState = { ...s, display: { ...s.display, [p]: { ...st, qty: st.qty - n } } };
  next = bookSale(next, p, n, earned, 0, n * st.unitCost, 0, 'otherRevenue');
  next = { ...next, today: { ...next.today, notes: [...next.today.notes, n === want ? `Café Mộc collected ${n} ${PRODUCTS[p].name} for $${earned.toFixed(2)}.` : `Café Mộc wanted ${want} ${PRODUCTS[p].name} but you had ${n}.`] } };
  return { ...next, community: n < want ? bump(next.community, -1) : next.community };
}

/** Delivery riders fulfil phone and app orders from what's left at the end of the day. */
function deliveryOrders(s: GameState): GameState {
  const riders = flagshipStaff(s).filter((e) => e.role === 'delivery').length;
  const bikes = s.equipment.filter((e) => e.kind === 'bike' && !e.broken).length;
  const active = Math.min(riders, bikes);
  if (!active) return s;
  const rand = rngFor(s.seed, s.day, 811);
  const demand = Math.round(active * (10 + 12 * rand()) * (0.7 + 0.3 * (s.reputation / 100)));
  let next = s;
  let done = 0;
  const fee = round2(2.5 * s.macro.priceIndex);
  for (let i = 0; i < demand; i++) {
    const options = offeredToday(next);
    if (!options.length) break;
    const p = pick(rand, options);
    const c = consume(next, p, 1, 70);
    next = bookSale(c.s, p, 1, next.prices[p], 0, c.cogs, packagingCost(next, p));
    next = move(next, 'cashSales', fee, { otherRevenue: fee });
    done++;
  }
  return { ...next, today: { ...next.today, deliveries: done, revenue: next.today.revenue + done * fee } };
}

// ---------------------------------------------------------------- clock

export function openShop(s: GameState, auto = false): GameState {
  let next: GameState = { ...s, phase: 'service', service: newService(s, auto) };
  next = wholesaleDelivery(next);
  const visits = next.service!.visits;
  return { ...next, today: { ...next.today, customers: visits.filter((v) => !v.lastCallOnly).length } };
}

export function tick(s: GameState, dt: number): GameState {
  if (s.phase !== 'service' || !s.service) return s;
  let next: GameState = { ...s, service: { ...s.service, clock: Math.min(CONFIG.dayMinutes, s.service.clock + dt) } };
  const clock = next.service!.clock;
  const rand = rngFor(s.seed, s.day, 300 + Math.floor(clock));

  for (const v0 of next.service!.visits) {
    if (v0.status !== 'coming' || v0.arrive > clock) continue;
    const v = next.service!.visits.find((x) => x.id === v0.id)!;
    if (v.lastCallOnly && !next.service!.lastCall) {
      next = { ...next, service: setVisit(next.service!, v.id, { status: 'done', doneAt: clock }) };
    } else if (v.divertedTo) {
      const name = v.divertedTo;
      next = {
        ...next,
        service: setVisit(next.service!, v.id, { status: 'done', mood: 'thinking', doneAt: clock }),
        today: { ...next.today, diverted: next.today.diverted + 1, divertedTo: { ...next.today.divertedTo, [name]: (next.today.divertedTo[name] ?? 0) + 1 } },
      };
    } else {
      if (v.lastCallOnly) next = { ...next, today: { ...next.today, customers: next.today.customers + 1 } };
      next = { ...next, service: setVisit(next.service!, v.id, { status: 'walking', walkStart: v.arrive }) };
    }
  }

  const slots = ECON.service.counterSlots + (has(next, 'corner') ? 2 : 0);
  for (const v0 of next.service!.visits) {
    if (v0.status !== 'walking' && v0.status !== 'waiting') continue;
    const v = next.service!.visits.find((x) => x.id === v0.id)!;
    if (v.status === 'walking') {
      const waiting = next.service!.visits.filter((x) => x.status === 'waiting').length;
      if (clock - (v.walkStart ?? v.arrive) >= ECON.service.walkMinutes && waiting < slots) next = arriveAtCounter(next, v, rand);
      else if (clock - v.arrive > v.patience * 1.2) next = leave(next, v, 'slow', pick(rand, LINES.slow));
    } else if (v.status === 'waiting' && clock - (v.waitStart ?? clock) > v.patience) {
      next = leave(next, v, 'slow', pick(rand, LINES.slow));
    }
  }

  if (next.service!.servers.length) next = dispatchServers(next);
  if (clock >= 300) next = cateringPickup(next);
  if (clock >= CONFIG.dayMinutes) next = endService(next);
  return next;
}

export function setLastCall(s: GameState, on: boolean): GameState {
  if (s.phase !== 'service' || !s.service || s.service.clock < CONFIG.lastCallAt - 60) return s;
  return { ...s, service: { ...s.service, lastCall: on } };
}

export function endService(s: GameState): GameState {
  if (!s.service) return s;
  let next = s;
  for (const v of s.service.visits) if (v.status === 'waiting' || v.status === 'walking') next = leave(next, v, 'slow', 'Đóng cửa rồi à?');
  next = deliveryOrders(next);
  const svc = { ...next.service!, clock: CONFIG.dayMinutes, visits: next.service!.visits.map((v) => (v.status === 'coming' ? { ...v, status: 'done' as const } : v)) };
  return { ...next, service: svc, phase: 'closing', leftoverPlan: defaultLeftoverPlan(next) };
}

/** Run the rest of the day instantly (staff and the autopilot keep serving). */
export function fastForward(s: GameState, step = 2): GameState {
  let next = s;
  let guard = 0;
  while (next.phase === 'service' && guard++ < 1000) next = tick(next, step);
  return next;
}

export function keepsOvernight(s: GameState, p: ProductId): boolean {
  if (PRODUCTS[p].season) return true;
  return PRODUCTS[p].keeps && fridgeWorks(s);
}

export function defaultLeftoverPlan(s: GameState): GameState['leftoverPlan'] {
  const plan: GameState['leftoverPlan'] = {};
  for (const p of Object.keys(s.display) as ProductId[]) if (s.display[p].qty > 0) plan[p] = keepsOvernight(s, p) ? 'keep' : 'donate';
  if (s.baguettes.qty > 0) plan.baguette = 'donate';
  return plan;
}

export { productAppeal };
