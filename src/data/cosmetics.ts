import type { GameState, Look, ShopStyle } from '../engine/types';

/**
 * The star shop: every star from a day's goal is also a coin to spend here, on looks for you and
 * the shop. Everything is cosmetic, so stars never buy an advantage.
 */
export type CosmeticKind = 'hair' | 'accessory' | 'wall' | 'floor' | 'counter';

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  /** Index in that list (HAIR_STYLES, ACCESSORY_NAMES, WALLS, FLOORS, COUNTERS). */
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
];

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
  return canUse(s, 'wall', style.wall) && canUse(s, 'floor', style.floor) && canUse(s, 'counter', style.counter);
}
