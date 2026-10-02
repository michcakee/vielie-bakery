/** One warm palette for every sprite, the scene and the UI. */
export const PAL = {
  ink: '#3b2a25',
  inkSoft: '#5a4038',
  cream: '#fff4de',
  coconut: '#fffbf2',
  paper: '#fdebc8',
  mango: '#f6c343',
  gold: '#e0a04a',
  crust: '#b5651d',
  coffee: '#6b3f2a',
  coffeeDark: '#4a2a1c',
  pandan: '#6fa84b',
  forest: '#2f5d3a',
  leaf: '#a8d672',
  pink: '#ee8a9e',
  peach: '#f7c5a0',
  red: '#c2453d',
  redDark: '#8e2f2a',
  orange: '#f39a3d',
  orangeDark: '#d97a2b',
  stone: '#e8e0d0',
  stoneDark: '#b9ae98',
  ice: '#d6eef5',
  iceDark: '#9cc6d6',
  sky: '#bfe3ef',
  teal: '#4f9c94',
  plum: '#7b4a6b',
  night: '#2b3049',
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
export const HAIR_COLORS = ['#2b2220', '#4a3226', '#7a4b2e', '#9b4a2c', '#d77a9a', '#c9a15a', '#9e9a96'];
export const SHIRTS = ['#f2a65a', '#5c8fc7', '#e86f6f', '#7fbf8f', '#f4d06f', '#8a7bc4', '#c97ab5', '#ef8fa8'];
export const APRONS = ['#6fa84b', '#fff4de', '#e86f6f', '#5c8fc7', '#f6c343'];
export const PANTS = ['#4a4e69', '#3b2a25', '#5c6b73', '#6b4f3a'];
