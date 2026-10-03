/** One warm palette for every sprite, the scene and the UI. */
export const PAL = {
  ink: '#58525a',
  inkSoft: '#58525a',
  cream: '#eeede3',
  coconut: '#eeede3',
  paper: '#eeede3',
  mango: '#eab281',
  gold: '#eab281',
  crust: '#bf796d',
  coffee: '#58525a',
  coffeeDark: '#58525a',
  pandan: '#5d937b',
  forest: '#58525a',
  leaf: '#a9c484',
  pink: '#ea7286',
  peach: '#f5d1b6',
  red: '#bf796d',
  redDark: '#58525a',
  orange: '#eab281',
  orangeDark: '#bf796d',
  stone: '#eeede3',
  stoneDark: '#a2a6a9',
  ice: '#eeede3',
  iceDark: '#a3b2d2',
  sky: '#bfded8',
  teal: '#5d937b',
  plum: '#58525a',
  night: '#58525a',
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
export const SHIRTS = ['#eab281', '#777f8f', '#ea7286', '#a9c484', '#eab281', '#a07ca7', '#a07ca7', '#f4a4bf'];
export const APRONS = ['#5d937b', '#eeede3', '#ea7286', '#777f8f', '#eab281'];
export const PANTS = ['#58525a', '#58525a', '#58525a', '#58525a'];
