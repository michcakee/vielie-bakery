import type { Employee, Look, RoleId } from '../engine/types';

/**
 * The Dream team: five all-rounders you unlock with diamonds. They are named for these people only
 * (no customer, helper or rival uses these names) and they have the bright hair no one else has.
 * Each serves anything, far faster than a normal pro, never fumbles an order, and earns much bigger
 * tips; each also has a spike: one job they are simply the best at.
 */
export type DreamId = 'vy' | 'yenVy' | 'sang' | 'hieu' | 'phuongKhanh';

export interface DreamDef {
  id: DreamId;
  name: string;
  role: RoleId;
  look: Look;
  /** Diamonds to unlock. */
  cost: number;
  /** Their one big talent, in a few words. */
  spike: string;
  blurb: string;
  quote: string;
  /** Service quality (0–100) on every order: a normal pro is about 84. */
  quality: number;
  /** Multiplier on a specialist's minutes per order, by kind of order (lower is faster). */
  speed: { tray: number; drink: number; sandwich: number };
  /** Trays they prepare each morning, on top of the owner's. */
  trays: number;
  /** Extra quality on everything baked while they work. */
  bakeQuality: number;
  /** Tips: the normal tip is multiplied by this, plus a flat bonus on every well-served order. */
  tipMult: number;
  tipFlat: number;
}

export const DREAM_ORDER: DreamId[] = ['vy', 'yenVy', 'hieu', 'sang', 'phuongKhanh'];

export const DREAM: Record<DreamId, DreamDef> = {
  vy: {
    id: 'vy',
    name: 'Vy',
    role: 'cashier',
    look: { skin: 1, hair: 4, hairColor: 7, shirt: 7, apron: 1, accessory: 13, eyes: 3 },
    cost: 60,
    spike: 'Pastry counter',
    blurb: 'Knows every regular by name and hands out pastries before you finish asking. Customers tip her without thinking.',
    quote: 'Next one, please!',
    quality: 98,
    speed: { tray: 0.35, drink: 0.6, sandwich: 0.6 },
    trays: 1.5,
    bakeQuality: 2,
    tipMult: 3,
    tipFlat: 0.5,
  },
  yenVy: {
    id: 'yenVy',
    name: 'Yen Vy',
    role: 'barista',
    look: { skin: 0, hair: 3, hairColor: 8, shirt: 5, apron: 4, accessory: 10, eyes: 5 },
    cost: 80,
    spike: 'Drinks',
    blurb: 'Pours a perfect cà phê sữa đá in a blink. Every cup comes with a smile that gets tipped.',
    quote: 'One iced coffee, coming right up!',
    quality: 98,
    speed: { tray: 0.6, drink: 0.3, sandwich: 0.6 },
    trays: 1.5,
    bakeQuality: 2,
    tipMult: 2.5,
    tipFlat: 0.5,
  },
  hieu: {
    id: 'hieu',
    name: 'Hieu',
    role: 'cook',
    look: { skin: 2, hair: 2, hairColor: 10, shirt: 3, apron: 3, accessory: 12, eyes: 6 },
    cost: 100,
    spike: 'Bánh mì',
    blurb: 'Builds a bánh mì in seconds with every layer exactly right. Nobody gets an order wrong.',
    quote: 'Chả lụa, pickles, herbs. Done!',
    quality: 99,
    speed: { tray: 0.6, drink: 0.6, sandwich: 0.3 },
    trays: 1.5,
    bakeQuality: 2,
    tipMult: 2.5,
    tipFlat: 0.5,
  },
  sang: {
    id: 'sang',
    name: 'Sang',
    role: 'baker',
    look: { skin: 3, hair: 8, hairColor: 9, shirt: 1, apron: 0, accessory: 4, eyes: 4 },
    cost: 120,
    spike: 'Baking',
    blurb: 'Up before the sun. Fills the oven with far more trays than anyone, then jumps on the counter at lunch.',
    quote: 'The oven is full. What’s next?',
    quality: 96,
    speed: { tray: 0.45, drink: 0.7, sandwich: 0.7 },
    trays: 7.5,
    bakeQuality: 5,
    tipMult: 2,
    tipFlat: 0.4,
  },
  phuongKhanh: {
    id: 'phuongKhanh',
    name: 'Phuong Khanh',
    role: 'pastryChef',
    look: { skin: 1, hair: 6, hairColor: 4, shirt: 6, apron: 2, accessory: 9, eyes: 7 },
    cost: 150,
    spike: 'Pastry quality',
    blurb: 'Bakes the prettiest trays in town. Customers pay more for them and tip like it was a gift.',
    quote: 'Golden. Perfect. Take it out!',
    quality: 98,
    speed: { tray: 0.5, drink: 0.7, sandwich: 0.7 },
    trays: 3.5,
    bakeQuality: 12,
    tipMult: 2.5,
    tipFlat: 0.6,
  },
};

/** Their hourly pay compared with the going rate for a top-skilled person in the same job: no premium, so they're a bargain. */
export const DREAM_WAGE_PREMIUM = 1;

export const dreamOf = (e: Pick<Employee, 'dream'> | undefined | null): DreamDef | undefined => (e?.dream ? DREAM[e.dream] : undefined);
export const isDreamId = (id: unknown): id is DreamId => typeof id === 'string' && id in DREAM;

/** The names only the Dream team may use. */
export const DREAM_NAMES: string[] = DREAM_ORDER.map((id) => DREAM[id].name);

/** Hair colours (indices into the palette) everyone else uses, and the bright ones kept for the Dream team. */
export const NORMAL_HAIR = [0, 1, 2, 3, 5, 6];
export const BRIGHT_HAIR = [4, 7, 8, 9, 10];
/** Ordinary hair colours for walk-ins and new applicants (no grey: that is for the lane's grandmothers). */
export const EVERYDAY_HAIR = [0, 1, 2, 3, 5];

/** A normal colour for a look that has a bright one (an old save, a bad import): same family, nothing neon. */
export function normalHairColor(i: number): number {
  if (NORMAL_HAIR.includes(i)) return i;
  return i === 4 ? 3 : i === 10 ? 5 : i === 7 || i === 8 || i === 9 ? 2 : 1;
}

// ------------------------------------------------------------------ diamonds

/**
 * Diamonds come two ways: free, a handful on every 3-star day, or bought in the iOS app (the fast way).
 * They belong to the device, not one bakery: every save slot shares the same diamonds and Dream team.
 */
export const DIAMOND = {
  /** Diamonds for a day with all three stars. A keen player gets about 13 of those in the first month. */
  perThreeStarDay: 5,
};

export interface DiamondPack {
  /** App Store product id (a consumable in-app purchase). */
  product: string;
  diamonds: number;
  name: string;
  /** Shown until the App Store sends the real, local price. */
  price: string;
  note?: string;
}

export const DIAMOND_PACKS: DiamondPack[] = [
  { product: 'com.michcakee.vietbakeshop.diamonds60', diamonds: 60, name: 'Handful of diamonds', price: '$0.99', note: 'Enough for Vy' },
  { product: 'com.michcakee.vietbakeshop.diamonds200', diamonds: 200, name: 'Pouch of diamonds', price: '$2.99', note: '+11% extra' },
  { product: 'com.michcakee.vietbakeshop.diamonds520', diamonds: 520, name: 'Chest of diamonds', price: '$5.99', note: 'The whole Dream team' },
];

export const packFor = (product: string) => DIAMOND_PACKS.find((p) => p.product === product);

/** About how much faster than a normal pro this person works at their best job (ignores morale). */
export function dreamSpeedUp(d: DreamDef): number {
  const best = Math.min(d.speed.tray, d.speed.drink, d.speed.sandwich);
  return Math.round((1 / best) * 10) / 10;
}
