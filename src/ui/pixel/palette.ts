/** One warm palette for every sprite, the scene and the UI. */
export const PAL = {
  ink: '#3e4a36',
  inkSoft: '#3e4a36',
  cream: '#f7f0dc',
  coconut: '#f7f0dc',
  paper: '#f7f0dc',
  mango: '#e0b072',
  gold: '#e0b072',
  crust: '#a87545',
  coffee: '#3e4a36',
  coffeeDark: '#3e4a36',
  pandan: '#4f7d46',
  forest: '#3e4a36',
  leaf: '#9dbf78',
  pink: '#d97a62',
  peach: '#f2e2bd',
  red: '#a87545',
  redDark: '#3e4a36',
  orange: '#e0b072',
  orangeDark: '#a87545',
  stone: '#f7f0dc',
  stoneDark: '#aab39a',
  ice: '#f7f0dc',
  iceDark: '#b8cfd6',
  sky: '#dde7c4',
  teal: '#4f7d46',
  plum: '#3e4a36',
  night: '#3e4a36',
} as const;

/** Shared character codes used by item sprites. */
export const SPRITE_COLORS: Record<string, string> = {
  o: PAL.ink,
  O: PAL.inkSoft,
  w: PAL.coconut,
  c: PAL.cream,
  y: PAL.mango,
  Y: PAL.gold,
  b: PAL.crust,
  n: PAL.coffee,
  N: PAL.coffeeDark,
  g: PAL.pandan,
  G: PAL.forest,
  l: PAL.leaf,
  p: PAL.pink,
  P: PAL.peach,
  r: PAL.red,
  R: PAL.redDark,
  k: PAL.orange,
  K: PAL.orangeDark,
  e: PAL.stone,
  E: PAL.stoneDark,
  i: PAL.ice,
  I: PAL.iceDark,
  t: PAL.teal,
  u: PAL.plum,
};

export const SKINS = ['#ffe0c4', '#f6cba4', '#e0a57c', '#b97852', '#7e4f35'];
export const SKIN_SHADE = ['#f2c7a6', '#e3b18a', '#c98d66', '#9e6440', '#663e29'];
export const HAIR_COLORS = ['#2b2220', '#4a3226', '#7a4b2e', '#9b4a2c', '#d77a9a', '#c9a15a', '#9e9a96', '#f4b6d2', '#c9b3ea', '#a9dcc9', '#f2c14e'];
export const SHIRTS = ['#e0b072', '#6b7560', '#d97a62', '#9dbf78', '#e0b072', '#9c8fb4', '#7fa8b8', '#efb6a0'];
export const APRONS = ['#4f7d46', '#f7f0dc', '#d97a62', '#6b7560', '#e0b072', '#b8543f', '#4f6680', '#efb6a0', '#3e4a36'];
export const PANTS = ['#6f7fa8', '#3e4a36', '#8a6f8f', '#5d7f8f'];
