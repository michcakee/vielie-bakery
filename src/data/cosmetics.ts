import type { GameState, Look, ShopStyle } from '../engine/types';
import { DECOS, GARLANDS } from './shopfit';

/**
 * The star shop: every star from a day's goal is also a coin to spend here, on looks for you and
 * the shop. Everything is cosmetic, so stars never buy an advantage.
 */
export type CosmeticKind = 'hair' | 'accessory' | 'wall' | 'floor' | 'counter' | 'deco';

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  /** Index in that list (HAIR_STYLES, ACCESSORY_NAMES, WALLS, FLOORS, COUNTERS); 0 for decorations. */
  index: number;
  name: string;
  cost: number;
}

export const COSMETICS: CosmeticDef[] = [
  { id: 'starClip', kind: 'accessory', index: 13, name: 'Star clip', cost: 5 },
  { id: 'twinBuns', kind: 'hair', index: 6, name: 'Twin buns', cost: 6 },
  { id: 'curly', kind: 'hair', index: 7, name: 'Curly hair', cost: 6 },
  { id: 'spiky', kind: 'hair', index: 8, name: 'Spiky hair', cost: 6 },
  { id: 'sunglasses', kind: 'accessory', index: 12, name: 'Sunglasses', cost: 8 },
  { id: 'lavender', kind: 'wall', index: 6, name: 'Lavender walls', cost: 8 },
  { id: 'catEars', kind: 'accessory', index: 9, name: 'Cat ears', cost: 10 },
  { id: 'pinkTiles', kind: 'floor', index: 4, name: 'Pink tiles', cost: 10 },
  { id: 'flowerCrown', kind: 'accessory', index: 10, name: 'Flower crown', cost: 12 },
  { id: 'goldCounter', kind: 'counter', index: 4, name: 'Gold counter', cost: 15 },
  { id: 'crown', kind: 'accessory', index: 11, name: 'Crown', cost: 20 },
  { id: 'mintWalls', kind: 'wall', index: 7, name: 'Mint walls', cost: 22 },
  { id: 'blueTiles', kind: 'floor', index: 5, name: 'Blue tiles', cost: 25 },
  { id: 'mintCounter', kind: 'counter', index: 5, name: 'Mint counter', cost: 28 },
  { id: 'lemonWalls', kind: 'wall', index: 8, name: 'Lemon walls', cost: 32 },
  { id: 'greenTiles', kind: 'floor', index: 6, name: 'Green tiles', cost: 36 },
  { id: 'marbleCounter', kind: 'counter', index: 6, name: 'Marble counter', cost: 42 },
  { id: 'duskWalls', kind: 'wall', index: 9, name: 'Dusk walls', cost: 50 },
  { id: 'honeyWood', kind: 'floor', index: 7, name: 'Honey wood floor', cost: 60 },
  { id: 'lavenderCounter', kind: 'counter', index: 7, name: 'Lavender counter', cost: 75 },
  // Decorations in themed sets (data/shopfit.ts): the id is the decoration's own.
  ...Object.values(DECOS).map((d): CosmeticDef => ({ id: d.id, kind: 'deco', index: 0, name: d.name, cost: d.cost })),
];

/** How many choices each paint list has (the lists themselves are drawn in ui/pixel/scene.ts). */
export const STYLE_COUNTS = { wall: 10, pattern: 4, floor: 8, counter: 8, garland: 5, awning: 6, sign: 5, uniform: 10 } as const;

/** Bà's tip jar: once every look is bought, stars still turn into cash for the bakery. */
export const STAR_CASH = { stars: 10, cash: 150 };

export function cosmeticFor(kind: CosmeticKind, index: number): CosmeticDef | undefined {
  return COSMETICS.find((c) => c.kind === kind && c.index === index);
}

/** Stars earned from daily goals, minus stars spent in the shop. */
export function starsToSpend(s: Pick<GameState, 'questProgress'>): number {
  return Math.max(0, (s.questProgress.stars ?? 0) - (s.questProgress.starsSpent ?? 0));
}

export const owns = (s: Pick<GameState, 'cosmetics'>, id: string) => (s.cosmetics ?? []).includes(id);

/** True when this option is free or already bought. */
export function canUse(s: Pick<GameState, 'cosmetics'>, kind: CosmeticKind, index: number): boolean {
  const c = cosmeticFor(kind, index);
  return !c || owns(s, c.id);
}

/** A look with any not-yet-bought parts swapped back to the plain choice. */
export function allowedLook(s: Pick<GameState, 'cosmetics'>, look: Look): Look {
  return { ...look, hair: canUse(s, 'hair', look.hair) ? look.hair : 0, accessory: canUse(s, 'accessory', look.accessory) ? look.accessory : 0 };
}

export function allowedStyle(s: Pick<GameState, 'cosmetics'>, style: ShopStyle): boolean {
  const garland = GARLANDS[style.garland ?? 0];
  return canUse(s, 'wall', style.wall) && canUse(s, 'floor', style.floor) && canUse(s, 'counter', style.counter) && (!garland || garland === 'bunting' || owns(s, garland));
}
