/**
 * Growing and dressing the bakery: renovation levels (bought with cash, they change the room,
 * the shop front and how many people come in), decorations from the star shop (looks only,
 * in themed sets), the shop front's colours and the team's aprons.
 */

export interface Renovation {
  tier: number;
  name: string;
  blurb: string;
  /** What it changes, in a few words. */
  perk: string;
  cost: number;
  level: number;
  /** Extra walk-ins at this level (cumulative, not added up). */
  walkIns: number;
  /** Reputation gained when you finish this renovation. */
  rep: number;
}

export const RENOVATIONS: Renovation[] = [
  { tier: 0, name: 'Bà’s little shop', blurb: 'Where it all started: one oven, two tables and a cat.', perk: '', cost: 0, level: 1, walkIns: 0, rep: 0 },
  { tier: 1, name: 'Fresh coat', blurb: 'Wood panelling on the walls, brass lamps and a new striped awning out front.', perk: '+3% walk-ins, +1 reputation', cost: 900, level: 2, walkIns: 0.03, rep: 1 },
  { tier: 2, name: 'Neighbourhood café', blurb: 'Hanging plants inside, and café tables with a parasol on the pavement.', perk: '+6% walk-ins, +1 reputation', cost: 2600, level: 3, walkIns: 0.06, rep: 1 },
  { tier: 3, name: 'Saigon classic', blurb: 'Patterned gạch bông tiles behind the counter, along the floor and on the counter front.', perk: '+10% walk-ins, +2 reputation', cost: 6500, level: 4, walkIns: 0.1, rep: 2 },
  { tier: 4, name: 'Grand bakery', blurb: 'A lantern balcony overhead, gold trim, and a lit-up sign the whole street can see.', perk: '+15% walk-ins, +3 reputation', cost: 15000, level: 6, walkIns: 0.15, rep: 3 },
];
export const MAX_TIER = RENOVATIONS.length - 1;

/** Star-shop decorations: looks only, so stars never buy an advantage. */
export type DecoId =
  | 'silkLanterns'
  | 'lanternStand'
  | 'ceramicVases'
  | 'flowerGarland'
  | 'flowerCart'
  | 'hydrangea'
  | 'tetBanner'
  | 'kumquatTree'
  | 'peachBlossom'
  | 'neonStrip'
  | 'coffeeSacks'
  | 'stoolStack'
  | 'fishTank'
  | 'wallClock'
  | 'parkedMoto';

export interface DecoDef {
  id: DecoId;
  name: string;
  cost: number;
  /** garland: strung along the top of the back wall (one at a time); floor: you place it; fixed: has its own spot. */
  kind: 'garland' | 'floor' | 'fixed';
  /** Size in stage pixels, for floor pieces. */
  w?: number;
  h?: number;
}

export const DECOS: Record<DecoId, DecoDef> = {
  silkLanterns: { id: 'silkLanterns', name: 'Silk lantern string', cost: 8, kind: 'garland' },
  lanternStand: { id: 'lanternStand', name: 'Standing lantern', cost: 10, kind: 'floor', w: 10, h: 22 },
  ceramicVases: { id: 'ceramicVases', name: 'Blue-and-white vases', cost: 12, kind: 'floor', w: 16, h: 14 },
  flowerGarland: { id: 'flowerGarland', name: 'Flower garland', cost: 8, kind: 'garland' },
  flowerCart: { id: 'flowerCart', name: 'Flower bucket', cost: 10, kind: 'floor', w: 16, h: 16 },
  hydrangea: { id: 'hydrangea', name: 'Hydrangea pot', cost: 12, kind: 'floor', w: 12, h: 16 },
  tetBanner: { id: 'tetBanner', name: 'Red and gold banner', cost: 8, kind: 'garland' },
  kumquatTree: { id: 'kumquatTree', name: 'Kumquat tree', cost: 12, kind: 'floor', w: 14, h: 22 },
  peachBlossom: { id: 'peachBlossom', name: 'Peach blossom branch', cost: 14, kind: 'floor', w: 14, h: 24 },
  neonStrip: { id: 'neonStrip', name: 'Neon light strip', cost: 10, kind: 'garland' },
  coffeeSacks: { id: 'coffeeSacks', name: 'Coffee bean sacks', cost: 10, kind: 'floor', w: 18, h: 12 },
  stoolStack: { id: 'stoolStack', name: 'Stack of plastic stools', cost: 12, kind: 'floor', w: 10, h: 18 },
  fishTank: { id: 'fishTank', name: 'Goldfish tank', cost: 18, kind: 'floor', w: 18, h: 18 },
  wallClock: { id: 'wallClock', name: 'Wall clock', cost: 9, kind: 'fixed' },
  parkedMoto: { id: 'parkedMoto', name: 'Your moto, parked outside', cost: 15, kind: 'fixed' },
};

export interface DecoSet {
  id: string;
  name: string;
  items: DecoId[];
}

export const DECO_SETS: DecoSet[] = [
  { id: 'hoiAn', name: 'Hội An lantern shop', items: ['silkLanterns', 'lanternStand', 'ceramicVases'] },
  { id: 'daLat', name: 'Đà Lạt flower café', items: ['flowerGarland', 'flowerCart', 'hydrangea'] },
  { id: 'tet', name: 'Tết red and gold', items: ['tetBanner', 'kumquatTree', 'peachBlossom'] },
  { id: 'saigon', name: 'Saigon coffee bar', items: ['neonStrip', 'coffeeSacks', 'stoolStack'] },
  { id: 'extras', name: 'Little extras', items: ['fishTank', 'wallClock', 'parkedMoto'] },
];

export const GARLANDS: (DecoId | 'bunting')[] = ['bunting', 'silkLanterns', 'flowerGarland', 'tetBanner', 'neonStrip'];
export const GARLAND_NAMES: Record<DecoId | 'bunting', string> = { bunting: 'Bunting', ...Object.fromEntries(Object.values(DECOS).map((d) => [d.id, d.name])) } as Record<DecoId | 'bunting', string>;

/** Things you can drag around the floor: the plant and hoa mai from the Decorate list, and star-shop floor pieces. */
export type Placeable = 'plant' | 'hoaMai' | DecoId;
export const PLACE_SIZE: Record<string, { w: number; h: number }> = {
  plant: { w: 12, h: 16 },
  hoaMai: { w: 12, h: 16 },
  ...Object.fromEntries(Object.values(DECOS).filter((d) => d.kind === 'floor').map((d) => [d.id, { w: d.w!, h: d.h! }])),
};
/** Where a floor piece starts before you move it (stage px, top-left). */
export const DEFAULT_POS: Record<string, { x: number; y: number }> = {
  lanternStand: { x: 8, y: 100 },
  ceramicVases: { x: 196, y: 82 },
  flowerCart: { x: 8, y: 102 },
  hydrangea: { x: 220, y: 84 },
  kumquatTree: { x: 8, y: 98 },
  peachBlossom: { x: 220, y: 80 },
  coffeeSacks: { x: 194, y: 86 },
  stoolStack: { x: 222, y: 82 },
  fishTank: { x: 8, y: 96 },
};

/** The floor you can place things on, and the counter you can't place them behind. */
export const PLACE_AREA = { x0: 6, x1: 234, y0: 44, y1: 160 };
export const COUNTER_BAND = { x0: 50, x1: 198, y0: 46, y1: 98 };

/**
 * Where a piece would be hidden: behind the counter, or behind a café table and its chairs (the
 * two tables, and the corner table the coffee corner adds).
 */
export const BLOCKED = [
  COUNTER_BAND,
  { x0: 58, x1: 112, y0: 128, y1: 160 },
  { x0: 116, x1: 170, y0: 128, y1: 160 },
  { x0: 176, x1: 230, y0: 128, y1: 160 },
];

/** Keep a piece on the floor and out from behind the counter and the tables. */
export function clampPlace(id: string, x: number, y: number): { x: number; y: number } {
  const size = PLACE_SIZE[id] ?? { w: 12, h: 16 };
  const inArea = (px: number, py: number) => ({
    x: Math.round(Math.max(PLACE_AREA.x0, Math.min(PLACE_AREA.x1 - size.w, px))),
    y: Math.round(Math.max(PLACE_AREA.y0, Math.min(PLACE_AREA.y1 - size.h, py))),
  });
  const hits = (p: { x: number; y: number }) => BLOCKED.find((b) => p.x + size.w > b.x0 && p.x < b.x1 && p.y + size.h > b.y0 && p.y < b.y1);
  let at = inArea(x, y);
  // Nudge it to the nearest free side; a couple of tries, since moving off one thing can land on another.
  for (let tries = 0; tries < 4; tries++) {
    const b = hits(at);
    if (!b) return at;
    const options = [
      { x: b.x0 - size.w, y: at.y },
      { x: b.x1, y: at.y },
      { x: at.x, y: b.y0 - size.h },
      { x: at.x, y: b.y1 },
    ]
      .map((o) => inArea(o.x, o.y))
      .filter((o) => !hits(o));
    const best = options.sort((p, q) => Math.hypot(p.x - at.x, p.y - at.y) - Math.hypot(q.x - at.x, q.y - at.y))[0];
    if (best) return best;
    at = inArea(b.x0 - size.w, b.y0 - size.h);
  }
  return at;
}

/** Shop front colours. Index 0 is how the shop starts. */
export const AWNINGS = [
  { name: 'Green', c: '#9dbf78' },
  { name: 'Red', c: '#d0634f' },
  { name: 'Blue', c: '#8fb0bd' },
  { name: 'Pink', c: '#efb6a0' },
  { name: 'Mango', c: '#e0b072' },
  { name: 'Lavender', c: '#b9a6d8' },
];
export const SIGNS = [
  { name: 'Forest', c: '#3e4a36', text: '#e0b072' },
  { name: 'Wood', c: '#7a5434', text: '#f7f0dc' },
  { name: 'Red', c: '#a83f32', text: '#f4dc8c' },
  { name: 'Navy', c: '#36485e', text: '#f7f0dc' },
  { name: 'Cream', c: '#f7f0dc', text: '#3e4a36' },
];
/** Team aprons: indexes into APRONS (ui/pixel/palette.ts). -1 lets each person keep their own. */
export const UNIFORMS = [
  { name: 'Their own', apron: -1 },
  { name: 'Green', apron: 0 },
  { name: 'Cream', apron: 1 },
  { name: 'Coral', apron: 2 },
  { name: 'Grey', apron: 3 },
  { name: 'Mango', apron: 4 },
  { name: 'Red', apron: 5 },
  { name: 'Navy', apron: 6 },
  { name: 'Pink', apron: 7 },
  { name: 'Black', apron: 8 },
];
