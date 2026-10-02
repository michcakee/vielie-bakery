import { INGREDIENTS, INGREDIENT_ORDER, PRODUCTS, PRODUCT_ORDER, UPGRADES } from '../data/catalog';
import { balanceSheet } from './accounting';
import { refreshKinds } from './events';
import { createNewGame, SAVE_VERSION } from './state';
import type { Employee, Equipment, GameState, UpgradeId } from './types';

/** Old single-slot key from v2 (kept untouched as a backup after migration). */
export const LEGACY_V2_KEY = 'vielie-bakery-save-v2';
export const SLOT_PREFIX = 'vielie-bakery-v3-slot-';
export const BACKUP_SUFFIX = '-backup';
export const PREFS_KEY = 'vielie-bakery-prefs-v2';
export const SLOTS = [1, 2, 3];
/** Kept for older imports. */
export const SAVE_KEY = `${SLOT_PREFIX}1`;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** Reject anything that would break the game: wrong version, NaN money, negative stock. */
/**
 * Content added after a save was written (new products, new ingredients) gets default entries,
 * so an older v3 save keeps loading. Mutates the freshly parsed object before validation.
 */
export function fillNewContent(data: unknown): void {
  const s = data as GameState;
  if (!s || typeof s !== 'object' || s.version !== SAVE_VERSION || !s.display || !s.prices || !s.pantry) return;
  for (const p of PRODUCT_ORDER) {
    if (!s.display[p]) s.display[p] = { qty: 0, quality: 70, unitCost: 0 };
    if (!finite(s.prices[p])) s.prices[p] = PRODUCTS[p].ref;
    if (s.bakedToday && !finite(s.bakedToday[p])) s.bakedToday[p] = 0;
    if (s.lifetime?.sold && !finite(s.lifetime.sold[p])) s.lifetime.sold[p] = 0;
    for (const k of ['made', 'sold', 'revenueBy', 'cogsBy'] as const) {
      const m = s.today?.[k] as Record<string, number> | undefined;
      if (m && !finite(m[p])) m[p] = 0;
    }
  }
  for (const id of INGREDIENT_ORDER) {
    const def = INGREDIENTS[id];
    if (!s.pantry[id]) s.pantry[id] = { qty: 0, avgCost: def.price / def.pack, quality: 70, eco: 50 };
    if (s.market?.prices && !finite(s.market.prices[id])) s.market.prices[id] = def.price * (s.macro?.priceIndex ?? 1);
    if (s.market?.walk && !finite(s.market.walk[id])) s.market.walk[id] = 1;
  }
}

export function validSave(data: unknown): data is GameState {
  fillNewContent(data);
  const s = data as GameState;
  if (!s || typeof s !== 'object' || s.version !== SAVE_VERSION) return false;
  if (!finite(s.day) || s.day < 1 || !finite(s.cash) || !finite(s.safetyFund) || !finite(s.xp)) return false;
  if (!s.pantry || !s.display || !s.prices || !s.market || !s.macro || !Array.isArray(s.history) || !s.today?.books) return false;
  if (!Array.isArray(s.staff) || !Array.isArray(s.loans) || !Array.isArray(s.equipment) || !s.equity) return false;
  for (const id of INGREDIENT_ORDER) if (!s.pantry[id] || !finite(s.pantry[id].qty) || s.pantry[id].qty < 0) return false;
  for (const p of PRODUCT_ORDER) {
    if (!s.display[p] || !finite(s.display[p].qty) || s.display[p].qty < 0) return false;
    if (!finite(s.prices[p]) || s.prices[p] <= 0) return false;
  }
  for (const l of s.loans) if (!finite(l.balance) || l.balance < 0) return false;
  for (const e of s.staff) if (!finite(e.wage) || e.wage <= 0) return false;
  return true;
}

export function forStorage(s: GameState): GameState {
  return { ...s, toasts: [] };
}

// ---------------------------------------------------------------- v2 → v3 migration

const SCALE = 2.2;
const OLD_REF: Record<string, number> = { banhMi: 3, caPhe: 2.5, flan: 1.75, pateChaud: 2.25, traTac: 2, banhChuoi: 2, banhBo: 1.5, banhKem: 16, mutDua: 8 };
const V2_UPGRADES: Record<string, UpgradeId | null> = { oven2: 'oven2', oven3: 'oven3', fridge: 'fridge', display: 'display', coffeeBar: 'coffeeBar', helper: null, fan: 'fan', solar: 'solar', compost: 'compost', corner: 'corner', garden: 'garden', loft: 'loft' };

/** Carry a v2 bakery into v3: same day, name, look and progress, money on the new scale. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateV2(old: any): GameState | null {
  try {
    if (!old || old.version !== 2 || !finite(old.day)) return null;
    const s = createNewGame({ seed: old.seed, scenario: 'family' });
    s.bakeryName = old.bakeryName ?? s.bakeryName;
    s.look = old.look ?? s.look;
    s.day = old.day;
    s.phase = 'morning';
    s.cash = Math.round((old.cash ?? 0) * SCALE * 100) / 100;
    s.safetyFund = Math.round((old.safetyFund ?? 0) * SCALE * 100) / 100;
    s.reputation = old.reputation ?? s.reputation;
    s.community = old.community ?? s.community;
    s.xp = Math.round((old.xp ?? 0) * 1.6);
    for (const id of INGREDIENT_ORDER) {
      const o = old.pantry?.[id];
      if (o && finite(o.qty)) s.pantry[id] = { qty: Math.max(0, o.qty), avgCost: (o.avgCost ?? 0) * SCALE, quality: o.quality ?? 70, eco: o.eco ?? 50 };
    }
    for (const p of PRODUCT_ORDER) {
      const o = old.display?.[p];
      if (o && finite(o.qty)) s.display[p] = { qty: Math.max(0, o.qty), quality: o.quality ?? 70, unitCost: (o.unitCost ?? 0) * SCALE, madeDay: old.day };
      if (finite(old.prices?.[p]) && OLD_REF[p]) s.prices[p] = Math.max(0.25, Math.round((old.prices[p] * (PRODUCTS[p].ref / OLD_REF[p])) / 0.25) * 0.25);
    }
    if (old.baguettes && finite(old.baguettes.qty)) s.baguettes = { qty: old.baguettes.qty, quality: old.baguettes.quality ?? 70, unitCost: (old.baguettes.unitCost ?? 0.12) * SCALE, madeDay: old.day };
    s.packaging = old.packaging ?? 'paper';
    const equipment: Equipment[] = [...s.equipment];
    let uid = s.nextUid;
    for (const u of (old.upgrades ?? []) as string[]) {
      const kind = V2_UPGRADES[u];
      if (kind && UPGRADES[kind]) equipment.push({ uid: uid++, kind, cost: UPGRADES[kind].cost, boughtDay: Math.max(0, old.day - 10), depreciated: 0, broken: false });
    }
    s.equipment = equipment;
    s.nextUid = uid;
    s.upgrades = refreshKinds(equipment);
    if ((old.upgrades ?? []).includes('helper')) {
      const coBa: Employee = { id: 9001, name: 'Cô Ba', role: 'cashier', wage: 16, skill: 3, morale: 80, hiredDay: Math.max(1, old.day - 10), trainingUntil: 0, look: { skin: 1, hair: 1, hairColor: 6, shirt: 6, apron: 1, accessory: 5 }, served: 0, branch: null };
      s.staff = [coBa];
    }
    s.decor = old.decor ?? [];
    s.unlocked = [...new Set([...s.unlocked, ...((old.unlocked ?? []) as string[]).filter((p) => p in PRODUCTS)])] as GameState['unlocked'];
    s.menu = s.unlocked.filter((p) => !PRODUCTS[p].season && !PRODUCTS[p].equipment);
    s.hearts = old.hearts ?? {};
    s.visitsByRegular = old.visitsByRegular ?? {};
    s.quests = old.quests ?? [];
    s.questProgress = old.questProgress ?? {};
    s.achievements = (old.achievements ?? []).filter((a: string) => typeof a === 'string');
    s.learned = old.learned ?? [];
    s.hints = [...(old.hints ?? []), 'intro', 'migrated'];
    if (old.lifetime) s.lifetime = { ...s.lifetime, ...old.lifetime, sold: { ...s.lifetime.sold, ...(old.lifetime.sold ?? {}) }, revenue: (old.lifetime.revenue ?? 0) * SCALE, profit: (old.lifetime.profit ?? 0) * SCALE };
    s.shares = old.shares ?? s.shares;
    s.shareCost = old.shareCost ?? s.shareCost;
    if (old.loan && finite(old.loan.remaining) && old.loan.remaining > 0) s.loans = [{ id: 1, lender: 'Saigon Community Bank', principal: old.loan.remaining * SCALE, balance: old.loan.remaining * SCALE, rate: 0.08, termMonths: 6, payment: (old.loan.remaining * SCALE) / 6, monthsLeft: 6, accrued: 0, missed: 0, takenDay: old.day, interestPaid: 0 }];
    s.ecoHistory = old.ecoHistory ?? [];
    s.market = { ...s.market, coop: old.market?.coop ?? s.market.coop };
    s.today = { ...s.today, day: old.day, community: s.community, reputation: s.reputation };
    s.equity = { contributed: balanceSheet(s).equity, retained: 0, distributions: 0 };
    return validSave(s) ? s : null;
  } catch (e) {
    console.error('[vielie] migration failed', e);
    return null;
  }
}

// ---------------------------------------------------------------- slots

export interface SlotInfo {
  slot: number;
  name: string;
  day: number;
  cash: number;
  scenario: string;
  updated: number;
}

export function saveGame(s: GameState, slot = 1, store: StorageLike | null = storage()): boolean {
  if (!store) return false;
  try {
    const key = `${SLOT_PREFIX}${slot}`;
    const prev = store.getItem(key);
    if (prev && s.day % 7 === 0 && s.phase === 'report') store.setItem(key + BACKUP_SUFFIX, prev);
    store.setItem(key, JSON.stringify({ ...forStorage(s), savedAt: Date.now() }));
    return true;
  } catch (e) {
    console.error('[vielie] save failed', e);
    return false;
  }
}

/** Load a slot; on corruption fall back to the weekly backup; migrate a v2 save into slot 1. */
export function loadGame(slot = 1, store: StorageLike | null = storage()): GameState | null {
  if (!store) return null;
  const tryKey = (key: string) => {
    try {
      const raw = store.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return validSave(data) ? data : null;
    } catch (e) {
      console.error('[vielie] save unreadable', key, e);
      return null;
    }
  };
  const main = tryKey(`${SLOT_PREFIX}${slot}`) ?? tryKey(`${SLOT_PREFIX}${slot}${BACKUP_SUFFIX}`);
  if (main) return main;
  if (slot === 1) {
    try {
      const raw = store.getItem(LEGACY_V2_KEY);
      if (raw) {
        const migrated = migrateV2(JSON.parse(raw));
        if (migrated) {
          saveGame(migrated, 1, store);
          return migrated;
        }
      }
    } catch (e) {
      console.error('[vielie] v2 save unreadable', e);
    }
  }
  return null;
}

export function slotInfo(store: StorageLike | null = storage()): (SlotInfo | null)[] {
  return SLOTS.map((slot) => {
    try {
      const raw = store?.getItem(`${SLOT_PREFIX}${slot}`);
      if (!raw) return slot === 1 && store?.getItem(LEGACY_V2_KEY) ? { slot, name: 'Your v2 bakery', day: 0, cash: 0, scenario: 'family', updated: 0 } : null;
      const s = JSON.parse(raw);
      return { slot, name: s.bakeryName, day: s.day, cash: s.cash, scenario: s.scenario, updated: s.savedAt ?? 0 };
    } catch {
      return null;
    }
  });
}

export function hasOldSave(store: StorageLike | null = storage()): boolean {
  try {
    return !!store?.getItem('vielie-bakery-save-v1');
  } catch {
    return false;
  }
}

export function clearSave(slot = 1, store: StorageLike | null = storage()): void {
  try {
    store?.removeItem(`${SLOT_PREFIX}${slot}`);
    store?.removeItem(`${SLOT_PREFIX}${slot}${BACKUP_SUFFIX}`);
    if (slot === 1) store?.removeItem(LEGACY_V2_KEY);
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------- save codes

const toB64 = (bytes: Uint8Array) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64 = (code: string) => {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function exportCode(s: GameState): Promise<string> {
  const lean: GameState = { ...forStorage(s), history: s.history.slice(-60), ecoHistory: s.ecoHistory.slice(-7), service: s.phase === 'service' ? s.service : null, lastReport: null };
  const json = new TextEncoder().encode(JSON.stringify(lean));
  if (typeof CompressionStream !== 'undefined') return 'z' + toB64(await pipe(json, new CompressionStream('deflate-raw')));
  return 'j' + toB64(json);
}

export async function importCode(code: string): Promise<GameState | null> {
  try {
    const c = code.trim();
    const bytes = fromB64(c.slice(1));
    const raw = c[0] === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
    const data = JSON.parse(new TextDecoder().decode(raw));
    if (validSave(data)) return { ...data, lastReport: null };
    const migrated = migrateV2(data);
    return migrated;
  } catch (e) {
    console.error('[vielie] bad save code', e);
    return null;
  }
}

export function restoreLink(code: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#restore=${code}`;
}

// ---------------------------------------------------------------- prefs

export interface Prefs {
  reducedMotion: boolean;
  sound: boolean;
  music: boolean;
  /** Bumped when the audio defaults change, so existing players get the new default once. */
  audioDefault?: number;
  relaxed: boolean;
  email: string;
  translations: boolean;
  view: 'casual' | 'business';
  slot: number;
  textScale: number;
}

export const DEFAULT_PREFS: Prefs = { reducedMotion: false, sound: false, music: false, audioDefault: 1, relaxed: false, email: '', translations: true, view: 'casual', slot: 1, textScale: 1 };

export function loadPrefs(): Prefs {
  try {
    const raw = storage()?.getItem(PREFS_KEY);
    const p: Prefs = raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
    if (!p.audioDefault) {
      // Audio now starts muted; apply that once to prefs saved before the change.
      p.sound = false;
      p.music = false;
      p.audioDefault = 1;
    }
    return p;
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(p: Prefs): void {
  try {
    storage()?.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
