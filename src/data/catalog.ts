import type { DecorId, IngredientId, PackagingId, ProductId, SupplierId, UpgradeId, Weather } from '../engine/types';
import { ECON } from './config';

/** Older modules read service timings through CONFIG; everything lives in ECON. */
export const CONFIG = {
  ...ECON.service,
  priceLockFee: ECON.costs.priceLockFee,
  priceLockDays: ECON.costs.priceLockDays,
} as const;

// ------------------------------------------------------------------ ingredients

export interface IngredientDef {
  id: IngredientId;
  name: string;
  vi: string;
  pack: number;
  unit: string;
  price: number;
  spoil: number;
  cold: boolean;
}

export const INGREDIENTS: Record<IngredientId, IngredientDef> = {
  flour: { id: 'flour', name: 'Flour', vi: 'Bột mì', pack: 10, unit: 'scoop', price: 9, spoil: 0, cold: false },
  riceFlour: { id: 'riceFlour', name: 'Rice flour', vi: 'Bột gạo', pack: 10, unit: 'scoop', price: 11, spoil: 0, cold: false },
  eggs: { id: 'eggs', name: 'Eggs', vi: 'Trứng', pack: 12, unit: 'egg', price: 5.4, spoil: 0.04, cold: true },
  milk: { id: 'milk', name: 'Fresh milk', vi: 'Sữa tươi', pack: 6, unit: 'cup', price: 7.2, spoil: 0.15, cold: true },
  condensed: { id: 'condensed', name: 'Condensed milk', vi: 'Sữa đặc', pack: 12, unit: 'spoon', price: 10.8, spoil: 0, cold: false },
  sugar: { id: 'sugar', name: 'Sugar', vi: 'Đường', pack: 10, unit: 'scoop', price: 5.5, spoil: 0, cold: false },
  butter: { id: 'butter', name: 'Butter', vi: 'Bơ', pack: 6, unit: 'block', price: 13.2, spoil: 0.04, cold: true },
  coffee: { id: 'coffee', name: 'Phin coffee', vi: 'Cà phê', pack: 12, unit: 'cup', price: 8.4, spoil: 0, cold: false },
  chaLua: { id: 'chaLua', name: 'Chả lụa pork roll', vi: 'Chả lụa', pack: 10, unit: 'slice', price: 16, spoil: 0.1, cold: true },
  pork: { id: 'pork', name: 'Pork filling', vi: 'Nhân thịt', pack: 10, unit: 'portion', price: 14, spoil: 0.12, cold: true },
  veg: { id: 'veg', name: 'Pickles & herbs', vi: 'Đồ chua & rau', pack: 10, unit: 'handful', price: 6.5, spoil: 0.2, cold: true },
  banana: { id: 'banana', name: 'Bananas', vi: 'Chuối', pack: 12, unit: 'banana', price: 6.6, spoil: 0.15, cold: false },
  coconut: { id: 'coconut', name: 'Coconut milk', vi: 'Nước cốt dừa', pack: 8, unit: 'cup', price: 9.6, spoil: 0.05, cold: true },
  kumquat: { id: 'kumquat', name: 'Kumquat & tea', vi: 'Tắc & trà', pack: 12, unit: 'cup', price: 7.2, spoil: 0.08, cold: false },
  cream: { id: 'cream', name: 'Cream & fruit', vi: 'Kem & trái cây', pack: 4, unit: 'bowl', price: 18, spoil: 0.25, cold: true },
  beans: { id: 'beans', name: 'Mung & red beans', vi: 'Đậu', pack: 10, unit: 'scoop', price: 6, spoil: 0, cold: false },
  pandan: { id: 'pandan', name: 'Pandan & jelly', vi: 'Lá dứa & thạch', pack: 10, unit: 'bundle', price: 5, spoil: 0.08, cold: false },
  gress: { id: 'gress', name: 'Gress powder', vi: 'Bột Gress', pack: 10, unit: 'scoop', price: 14, spoil: 0, cold: false },
  greenApple: { id: 'greenApple', name: 'Green apples', vi: 'Táo xanh', pack: 8, unit: 'apple', price: 7, spoil: 0.05, cold: true },
  lychee: { id: 'lychee', name: 'Lychee pearls', vi: 'Trân châu vải', pack: 12, unit: 'scoop', price: 9, spoil: 0.08, cold: true },
  lotus: { id: 'lotus', name: 'Lotus seed paste', vi: 'Nhân hạt sen', pack: 8, unit: 'portion', price: 20, spoil: 0.02, cold: false },
};

export const INGREDIENT_ORDER: IngredientId[] = ['flour', 'eggs', 'milk', 'condensed', 'sugar', 'coffee', 'chaLua', 'veg', 'butter', 'kumquat', 'banana', 'coconut', 'riceFlour', 'pandan', 'cream', 'pork', 'beans', 'lotus', 'gress', 'greenApple', 'lychee'];

// ------------------------------------------------------------------ products

export type ProductKind = 'tray' | 'sandwich' | 'drink';

export interface ProductDef {
  id: ProductId;
  name: string;
  en: string;
  kind: ProductKind;
  recipe: Partial<Record<IngredientId, number>>;
  yield: number;
  ref: number;
  popularity: number;
  times: [number, number, number, number];
  weather: Partial<Record<Weather, number>>;
  difficulty: 1 | 2 | 3;
  eco: number;
  /** Days it stays sellable when kept cold. */
  shelfLife: number;
  keeps: boolean;
  blurb: string;
  steps?: { id: string; label: string; vi: string }[];
  level: number;
  ovenWindow?: number;
  /** Price elasticity factor: above 1 means customers react more to price. */
  elasticity: number;
  /** Labour minutes per tray (trays) or per item (made to order). */
  labor: number;
  equipment?: UpgradeId;
  season?: 'gift' | 'mooncake';
  /** How central this is to Vietnamese bakery culture (0–1). */
  heritage: number;
  boxCost?: number;
}

export const PRODUCTS: Record<ProductId, ProductDef> = {
  banhMi: {
    id: 'banhMi',
    name: 'Bánh mì',
    en: 'Vietnamese baguette sandwich',
    kind: 'sandwich',
    recipe: { chaLua: 1, veg: 1 },
    yield: 1,
    ref: 6.5,
    popularity: 1.4,
    times: [1.2, 1.6, 0.6, 0.7],
    weather: { cool: 1.2, rainy: 1.15, hot: 0.9 },
    difficulty: 1,
    eco: 3,
    shelfLife: 1,
    keeps: false,
    blurb: 'Crackly baguette, chả lụa, đồ chua and herbs. Made to order.',
    steps: [
      { id: 'slice', label: 'Slice bread', vi: 'Cắt bánh' },
      { id: 'chaLua', label: 'Chả lụa', vi: 'Chả lụa' },
      { id: 'pickles', label: 'Pickles', vi: 'Đồ chua' },
      { id: 'herbs', label: 'Herbs', vi: 'Rau thơm' },
      { id: 'sauce', label: 'Chili sauce', vi: 'Tương ớt' },
    ],
    level: 1,
    elasticity: 1,
    labor: 3,
    heritage: 1,
  },
  caPhe: {
    id: 'caPhe',
    name: 'Cà phê sữa đá',
    en: 'Iced coffee with condensed milk',
    kind: 'drink',
    recipe: { coffee: 1, condensed: 1 },
    yield: 1,
    ref: 5,
    popularity: 1.3,
    times: [1.8, 0.8, 1, 0.5],
    weather: { hot: 1.35, sunny: 1.1, cool: 0.8, rainy: 0.9 },
    difficulty: 1,
    eco: 3,
    shelfLife: 1,
    keeps: false,
    blurb: 'Slow phin drip over sweet condensed milk and ice.',
    steps: [
      { id: 'milk', label: 'Condensed milk', vi: 'Sữa đặc' },
      { id: 'phin', label: 'Phin drip', vi: 'Pha phin' },
      { id: 'ice', label: 'Ice', vi: 'Đá' },
      { id: 'stir', label: 'Stir', vi: 'Khuấy' },
    ],
    level: 1,
    elasticity: 0.65,
    labor: 2.5,
    heritage: 0.9,
  },
  flan: {
    id: 'flan',
    name: 'Bánh flan',
    en: 'Caramel custard',
    kind: 'tray',
    recipe: { eggs: 4, milk: 2, sugar: 1, condensed: 1 },
    yield: 8,
    ref: 3.5,
    popularity: 1,
    times: [0.5, 0.8, 1.4, 1.1],
    weather: { hot: 1.2, sunny: 1.05, cool: 0.9 },
    difficulty: 1,
    eco: 3,
    shelfLife: 3,
    keeps: true,
    blurb: 'Silky custard under dark caramel. Keeps overnight in a fridge.',
    level: 1,
    ovenWindow: 22,
    elasticity: 1.1,
    labor: 20,
    heritage: 0.7,
  },
  pateChaud: {
    id: 'pateChaud',
    name: 'Bánh patê sô',
    en: 'Pâté chaud puff pastry',
    kind: 'tray',
    recipe: { flour: 2, butter: 2, chaLua: 2, eggs: 1 },
    yield: 8,
    ref: 4.25,
    popularity: 1,
    times: [1.3, 1, 0.9, 0.6],
    weather: { cool: 1.25, rainy: 1.2, hot: 0.85 },
    difficulty: 2,
    eco: 2,
    shelfLife: 1,
    keeps: false,
    blurb: 'Flaky, buttery pastry with a savoury pork filling.',
    level: 2,
    ovenWindow: 18,
    elasticity: 1,
    labor: 35,
    heritage: 0.8,
  },
  traTac: {
    id: 'traTac',
    name: 'Trà tắc',
    en: 'Kumquat iced tea',
    kind: 'drink',
    recipe: { kumquat: 1 },
    yield: 1,
    ref: 4.5,
    popularity: 1.1,
    times: [0.5, 1, 1.6, 1.1],
    weather: { hot: 1.6, sunny: 1.25, cool: 0.6, rainy: 0.7 },
    difficulty: 1,
    eco: 4,
    shelfLife: 1,
    keeps: false,
    blurb: 'Tangy kumquat over jasmine tea and ice. Huge on hot days.',
    steps: [
      { id: 'tea', label: 'Jasmine tea', vi: 'Trà' },
      { id: 'kumquat', label: 'Squeeze tắc', vi: 'Vắt tắc' },
      { id: 'sugar', label: 'Sugar syrup', vi: 'Nước đường' },
      { id: 'ice', label: 'Ice', vi: 'Đá' },
    ],
    level: 2,
    elasticity: 1.2,
    labor: 2,
    heritage: 0.7,
  },
  banhBao: {
    id: 'banhBao',
    name: 'Bánh bao',
    en: 'Steamed pork bun',
    kind: 'tray',
    recipe: { flour: 2, pork: 2, eggs: 2, sugar: 1 },
    yield: 8,
    ref: 4.5,
    popularity: 1,
    times: [1.4, 1.1, 0.8, 0.7],
    weather: { cool: 1.3, rainy: 1.25, hot: 0.8 },
    difficulty: 2,
    eco: 3,
    shelfLife: 1,
    keeps: false,
    blurb: 'Fluffy steamed buns with pork and egg. Needs a steamer.',
    level: 2,
    ovenWindow: 20,
    elasticity: 1,
    labor: 40,
    equipment: 'steamer',
    heritage: 0.9,
  },
  banhChuoi: {
    id: 'banhChuoi',
    name: 'Bánh chuối nướng',
    en: 'Baked banana cake',
    kind: 'tray',
    recipe: { banana: 4, flour: 1, coconut: 1, sugar: 1, eggs: 2, milk: 1 },
    yield: 8,
    ref: 3.75,
    popularity: 0.9,
    times: [0.4, 0.6, 1.6, 1.1],
    weather: { cool: 1.1, rainy: 1.1 },
    difficulty: 2,
    eco: 4,
    shelfLife: 2,
    keeps: false,
    blurb: 'Caramelised bananas in a soft coconut crumb.',
    level: 3,
    ovenWindow: 18,
    elasticity: 1.15,
    labor: 30,
    heritage: 0.8,
  },
  banhBo: {
    id: 'banhBo',
    name: 'Bánh bò nướng',
    en: 'Pandan honeycomb cake',
    kind: 'tray',
    recipe: { riceFlour: 2, coconut: 2, sugar: 1, eggs: 1, pandan: 1 },
    yield: 10,
    ref: 3.25,
    popularity: 0.8,
    times: [0.8, 0.5, 1.4, 0.8],
    weather: {},
    difficulty: 3,
    eco: 4,
    shelfLife: 2,
    keeps: false,
    blurb: 'Chewy, green pandan honeycomb. Tricky to bake; people talk about a good one.',
    level: 3,
    ovenWindow: 11,
    elasticity: 0.9,
    labor: 45,
    heritage: 1,
  },
  che: {
    id: 'che',
    name: 'Chè ba màu',
    en: 'Three-colour dessert drink',
    kind: 'drink',
    recipe: { beans: 1, coconut: 1, pandan: 1 },
    yield: 1,
    ref: 5.5,
    popularity: 0.9,
    times: [0.4, 0.9, 1.6, 1.3],
    weather: { hot: 1.5, sunny: 1.2, cool: 0.7 },
    difficulty: 1,
    eco: 4,
    shelfLife: 1,
    keeps: false,
    blurb: 'Layers of beans, pandan jelly and coconut cream over ice.',
    steps: [
      { id: 'beans', label: 'Beans', vi: 'Đậu' },
      { id: 'jelly', label: 'Pandan jelly', vi: 'Thạch lá dứa' },
      { id: 'coconut', label: 'Coconut cream', vi: 'Nước cốt dừa' },
      { id: 'ice', label: 'Ice', vi: 'Đá' },
    ],
    level: 3,
    elasticity: 1.1,
    labor: 2.5,
    heritage: 0.9,
  },
  banhKem: {
    id: 'banhKem',
    name: 'Bánh kem',
    en: 'Celebration cake',
    kind: 'tray',
    recipe: { flour: 2, eggs: 4, cream: 2, sugar: 1, butter: 1 },
    yield: 2,
    ref: 38,
    popularity: 0.18,
    times: [0.3, 0.7, 1.2, 1.5],
    weather: {},
    difficulty: 3,
    eco: 2,
    shelfLife: 2,
    keeps: true,
    blurb: 'Fresh cream and fruit. Few people buy one, but each sale is big.',
    level: 4,
    ovenWindow: 14,
    elasticity: 1.5,
    labor: 70,
    heritage: 0.5,
  },
  mutDua: {
    id: 'mutDua',
    name: 'Hộp mứt dừa',
    en: 'Tết candied-coconut gift box',
    kind: 'tray',
    recipe: { coconut: 2, sugar: 2 },
    yield: 6,
    ref: 18,
    popularity: 0.9,
    times: [0.8, 1, 1.2, 1.2],
    weather: {},
    difficulty: 2,
    eco: 3,
    shelfLife: 30,
    keeps: true,
    blurb: 'Candied coconut ribbons in a red gift box. Tết season only.',
    level: 1,
    ovenWindow: 18,
    elasticity: 0.8,
    labor: 40,
    season: 'gift',
    heritage: 1,
    boxCost: ECON.costs.giftBox,
  },
  banhTrungThu: {
    id: 'banhTrungThu',
    name: 'Bánh trung thu',
    en: 'Mid-Autumn mooncake',
    kind: 'tray',
    recipe: { lotus: 2, flour: 1, eggs: 2, sugar: 1 },
    yield: 6,
    ref: 9,
    popularity: 1,
    times: [0.8, 1, 1.2, 1.3],
    weather: {},
    difficulty: 3,
    eco: 3,
    shelfLife: 14,
    keeps: true,
    blurb: 'Lotus-seed mooncakes with a golden crust. Mid-Autumn season only.',
    level: 2,
    ovenWindow: 13,
    elasticity: 0.85,
    labor: 55,
    season: 'mooncake',
    heritage: 1,
    boxCost: ECON.costs.mooncakeBox,
  },
  // ------------------------------------------------------------ the Gress line: everything green
  gressCupcake: {
    id: 'gressCupcake',
    name: 'Gress cupcake',
    en: 'Green Gress cupcake with Gress frosting',
    kind: 'tray',
    recipe: { flour: 2, sugar: 1, butter: 1, eggs: 1, gress: 1 },
    yield: 8,
    ref: 4.25,
    popularity: 1,
    times: [0.7, 0.9, 1.5, 1],
    weather: {},
    difficulty: 1,
    eco: 3,
    shelfLife: 2,
    keeps: true,
    blurb: 'A soft green sponge under a swirl of Gress frosting. The first thing kids point at.',
    level: 1,
    ovenWindow: 15,
    elasticity: 1.1,
    labor: 30,
    heritage: 0.2,
  },
  gressTeaLight: {
    id: 'gressTeaLight',
    name: 'Light gress tea',
    en: 'Lightly brewed iced Gress tea',
    kind: 'drink',
    recipe: { gress: 1 },
    yield: 1,
    ref: 4,
    popularity: 1,
    times: [0.8, 1.1, 1.5, 1],
    weather: { hot: 1.5, sunny: 1.2, cool: 0.7, rainy: 0.8 },
    difficulty: 1,
    eco: 5,
    shelfLife: 1,
    keeps: false,
    blurb: 'Pale green, barely sweet, lots of ice. The gentle way into Gress.',
    steps: [
      { id: 'tea', label: 'Brew tea', vi: 'Pha trà' },
      { id: 'gress', label: 'Gress', vi: 'Gress' },
      { id: 'ice', label: 'Ice', vi: 'Đá' },
    ],
    level: 2,
    elasticity: 1.2,
    labor: 1.5,
    heritage: 0.2,
  },
  gressOreo: {
    id: 'gressOreo',
    name: 'Gress sandwich cookies',
    en: 'Green sandwich cookies with Gress cream',
    kind: 'tray',
    recipe: { flour: 2, butter: 1, sugar: 1, gress: 1 },
    yield: 12,
    ref: 2.5,
    popularity: 1.1,
    times: [0.6, 0.9, 1.6, 1.2],
    weather: {},
    difficulty: 1,
    eco: 3,
    shelfLife: 5,
    keeps: true,
    blurb: 'Two crisp green cookies, Gress cream in the middle. Dangerously easy to eat six.',
    level: 2,
    ovenWindow: 14,
    elasticity: 1.3,
    labor: 25,
    heritage: 0.1,
  },
  gressCoffee: {
    id: 'gressCoffee',
    name: 'Gress coffee',
    en: 'Phin coffee with a Gress cream top',
    kind: 'drink',
    recipe: { coffee: 1, condensed: 1, gress: 1 },
    yield: 1,
    ref: 5.5,
    popularity: 1,
    times: [1.6, 0.9, 1, 0.5],
    weather: { hot: 1.2, cool: 0.9 },
    difficulty: 2,
    eco: 3,
    shelfLife: 1,
    keeps: false,
    blurb: 'Strong phin coffee under a thick green Gress cream. Two layers, one straw.',
    steps: [
      { id: 'milk', label: 'Condensed milk', vi: 'Sữa đặc' },
      { id: 'phin', label: 'Phin drip', vi: 'Pha phin' },
      { id: 'gress', label: 'Gress cream', vi: 'Kem Gress' },
      { id: 'ice', label: 'Ice', vi: 'Đá' },
    ],
    level: 2,
    elasticity: 0.75,
    labor: 2.5,
    heritage: 0.5,
  },
  gressHoneycomb: {
    id: 'gressHoneycomb',
    name: 'Gress honeycomb cake',
    en: 'Chewy Gress honeycomb cake',
    kind: 'tray',
    recipe: { riceFlour: 2, coconut: 2, sugar: 1, eggs: 1, gress: 1 },
    yield: 10,
    ref: 3.5,
    popularity: 0.85,
    times: [0.8, 0.5, 1.4, 0.9],
    weather: {},
    difficulty: 3,
    eco: 4,
    shelfLife: 2,
    keeps: false,
    blurb: 'Bánh bò with Gress instead of pandan: deeper green, same honeycomb crumb. Tricky to bake.',
    level: 3,
    ovenWindow: 11,
    elasticity: 0.9,
    labor: 45,
    heritage: 0.7,
  },
  gressBoba: {
    id: 'gressBoba',
    name: 'Gress boba tea',
    en: 'Gress milk tea with clear lychee pearls',
    kind: 'drink',
    recipe: { gress: 1, milk: 1, lychee: 1 },
    yield: 1,
    ref: 6,
    popularity: 1.2,
    times: [0.4, 1, 1.7, 1.4],
    weather: { hot: 1.5, sunny: 1.2, cool: 0.7, rainy: 0.8 },
    difficulty: 2,
    eco: 2,
    shelfLife: 1,
    keeps: false,
    blurb: 'Creamy green milk tea over clear lychee pearls that pop. The after-school order.',
    steps: [
      { id: 'gress', label: 'Gress tea', vi: 'Trà Gress' },
      { id: 'milk', label: 'Milk', vi: 'Sữa' },
      { id: 'lychee', label: 'Lychee pearls', vi: 'Trân châu vải' },
      { id: 'ice', label: 'Ice', vi: 'Đá' },
    ],
    level: 3,
    elasticity: 1.1,
    labor: 2.5,
    heritage: 0.3,
  },
  gressPie: {
    id: 'gressPie',
    name: 'Gress green apple pie',
    en: 'Green apple pie with a Gress crust',
    kind: 'tray',
    recipe: { flour: 2, butter: 2, greenApple: 2, sugar: 1, gress: 1 },
    yield: 6,
    ref: 5.5,
    popularity: 0.8,
    times: [0.6, 1.2, 1.3, 1.1],
    weather: { cool: 1.3, rainy: 1.2, hot: 0.8 },
    difficulty: 2,
    eco: 4,
    shelfLife: 3,
    keeps: true,
    blurb: 'Tart green apples under a lattice of Gress pastry. Best warm on a rainy afternoon.',
    level: 3,
    ovenWindow: 13,
    elasticity: 1,
    labor: 40,
    heritage: 0.2,
  },
  gressMilkshake: {
    id: 'gressMilkshake',
    name: 'GRESS MILKSHAKE',
    en: 'Thick Gress milkshake with whipped cream',
    kind: 'drink',
    recipe: { gress: 2, milk: 1, cream: 1 },
    yield: 1,
    ref: 6.5,
    popularity: 1,
    times: [0.3, 0.9, 1.8, 1.4],
    weather: { hot: 1.7, sunny: 1.3, cool: 0.5, rainy: 0.7 },
    difficulty: 2,
    eco: 2,
    shelfLife: 1,
    keeps: false,
    blurb: 'Loud, green and very thick. Capital letters are mandatory.',
    steps: [
      { id: 'gress', label: 'Gress', vi: 'Gress' },
      { id: 'milk', label: 'Milk', vi: 'Sữa' },
      { id: 'blend', label: 'Blend', vi: 'Xay' },
      { id: 'cream', label: 'Whipped cream', vi: 'Kem tươi' },
    ],
    level: 4,
    elasticity: 1.2,
    labor: 3,
    heritage: 0.1,
  },
  gressCrepe: {
    id: 'gressCrepe',
    name: 'Gress crepe cake',
    en: 'Twenty-layer Gress crepe cake',
    kind: 'tray',
    recipe: { flour: 2, eggs: 2, milk: 2, cream: 2, gress: 1 },
    yield: 6,
    ref: 7.5,
    popularity: 0.7,
    times: [0.4, 1, 1.5, 1.2],
    weather: {},
    difficulty: 3,
    eco: 3,
    shelfLife: 2,
    keeps: true,
    blurb: 'Twenty paper-thin green crepes with Gress cream between every one. Slow to make, quick to sell.',
    level: 4,
    ovenWindow: 12,
    elasticity: 0.9,
    labor: 70,
    heritage: 0.2,
  },
  gressCake: {
    id: 'gressCake',
    name: 'Gress cake',
    en: 'Whole Gress layer cake',
    kind: 'tray',
    recipe: { flour: 3, sugar: 2, butter: 2, eggs: 3, cream: 2, gress: 2 },
    yield: 2,
    ref: 36,
    popularity: 0.3,
    times: [0.3, 0.8, 1.5, 1.4],
    weather: {},
    difficulty: 3,
    eco: 2,
    shelfLife: 2,
    keeps: true,
    boxCost: 1.5,
    blurb: 'A whole celebration cake, green inside and out. Few buyers, big sales.',
    level: 4,
    ovenWindow: 12,
    elasticity: 1.3,
    labor: 60,
    heritage: 0.2,
  },
};

export const PRODUCT_ORDER: ProductId[] = ['banhMi', 'caPhe', 'flan', 'pateChaud', 'traTac', 'banhBao', 'banhChuoi', 'banhBo', 'che', 'banhKem', 'mutDua', 'banhTrungThu', 'gressCupcake', 'gressTeaLight', 'gressOreo', 'gressCoffee', 'gressHoneycomb', 'gressBoba', 'gressPie', 'gressMilkshake', 'gressCrepe', 'gressCake'];
export const START_PRODUCTS: ProductId[] = ['banhMi', 'caPhe', 'flan'];
export const SEASONAL: ProductId[] = ['mutDua', 'banhTrungThu'];

export const BAGUETTE = { recipe: { flour: 3 } as Partial<Record<IngredientId, number>>, yield: 10, ovenWindow: 20, labor: 25 };

/** Kept for older UI code; the real box costs live on each product. */
export const GIFT_BOX_COST = ECON.costs.giftBox;

// ------------------------------------------------------------------ suppliers

export interface SupplierDef {
  id: SupplierId;
  name: string;
  vi: string;
  priceMult: number;
  quality: number;
  eco: number;
  reliability: number;
  leadDays: number;
  minPacks: number;
  blurb: string;
}

export const SUPPLIERS: Record<SupplierId, SupplierDef> = {
  cho: { id: 'cho', name: 'Wet market', vi: 'Chợ sỉ', priceMult: 0.9, quality: 55, eco: 30, reliability: 0.99, leadDays: 0, minPacks: 1, blurb: 'You carry it home today. Cheap, a bit rough, plastic bags everywhere.' },
  farm: { id: 'farm', name: 'Đà Lạt farm co-op', vi: 'Nông trại', priceMult: 1.15, quality: 85, eco: 92, reliability: 0.82, leadDays: 1, minPacks: 1, blurb: 'Fresh, local, low waste. Delivered tomorrow morning; sometimes sold out.' },
  premium: { id: 'premium', name: 'Saigon Fine Foods', vi: 'Hàng cao cấp', priceMult: 1.35, quality: 96, eco: 65, reliability: 1, leadDays: 1, minPacks: 1, blurb: 'Top quality, always in stock, delivered tomorrow.' },
  distributor: { id: 'distributor', name: 'Mekong Food Distributors', vi: 'Nhà phân phối', priceMult: 0.78, quality: 62, eco: 40, reliability: 0.96, leadDays: 2, minPacks: 5, blurb: 'Cheapest by the case. Minimum 5 packs, arrives in two days.' },
};

export const SUPPLIER_ORDER: SupplierId[] = ['cho', 'farm', 'premium', 'distributor'];
export const LOYALTY = { packsPerPoint: 10, maxDiscount: 0.08 };

export const PACKAGING: Record<PackagingId, { name: string; cost: number; eco: number; blurb: string }> = {
  plastic: { name: 'Plastic bags', cost: ECON.costs.packaging.plastic, eco: 10, blurb: 'Cheapest. Ends up in the canal.' },
  paper: { name: 'Paper bags', cost: ECON.costs.packaging.paper, eco: 55, blurb: 'A little more, and it composts.' },
  reusable: { name: 'Reusable cups & tins', cost: ECON.costs.packaging.reusable, eco: 95, blurb: 'Deposit scheme. Eco customers love it.' },
};

// ------------------------------------------------------------------ equipment & rooms (capital expenditure)

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  vi: string;
  cost: number;
  level: number;
  requires?: UpgradeId;
  blurb: string;
  effect: string;
  group: 'kitchen' | 'shop' | 'eco' | 'room' | 'delivery';
  /** Useful life in years, for depreciation. */
  life: number;
  max: number;
  rent?: number;
  utilities?: number;
  maintenance?: number;
  eco?: number;
  trays?: number;
  cold?: number;
  dry?: number;
  display?: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  ovenBasic: { id: 'ovenBasic', name: 'Countertop oven', vi: 'Lò nướng nhỏ', cost: 1200, level: 1, group: 'kitchen', life: 5, max: 1, trays: 4, maintenance: 0.6, blurb: 'Bà\'s faithful old oven. Four trays a morning.', effect: '4 trays a day' },
  oven2: { id: 'oven2', name: 'Deck oven', vi: 'Lò nướng lớn', cost: 3800, level: 1, group: 'kitchen', life: 6, max: 2, trays: 6, utilities: 4, maintenance: 1.2, blurb: 'A proper bakery oven. Six more trays every morning.', effect: '+6 trays a day' },
  oven3: { id: 'oven3', name: 'Rack oven', vi: 'Lò công nghiệp', cost: 9500, level: 4, group: 'kitchen', life: 8, max: 1, trays: 10, utilities: 8, maintenance: 2.5, requires: 'renovation', blurb: 'An industrial rotating rack. Ten trays at once.', effect: '+10 trays a day' },
  mixer: { id: 'mixer', name: 'Stand mixer', vi: 'Máy trộn bột', cost: 1400, level: 1, group: 'kitchen', life: 6, max: 1, maintenance: 0.4, blurb: 'Bakers get 30% more done.', effect: 'Bakers +30% trays' },
  steamer: { id: 'steamer', name: 'Bamboo steamer stack', vi: 'Xửng hấp', cost: 900, level: 2, group: 'kitchen', life: 4, max: 1, trays: 2, maintenance: 0.2, blurb: 'Unlocks bánh bao. Adds two steamer trays.', effect: 'Bánh bao, +2 trays' },
  fridge: { id: 'fridge', name: 'Refrigerator', vi: 'Tủ lạnh', cost: 1600, level: 1, group: 'kitchen', life: 6, max: 2, cold: 120, utilities: 2, maintenance: 0.4, blurb: 'More cold storage. Flan and cakes keep overnight; fresh ingredients spoil half as fast.', effect: '+120 cold storage' },
  walkIn: { id: 'walkIn', name: 'Walk-in cooler', vi: 'Kho lạnh', cost: 6000, level: 4, group: 'kitchen', life: 10, max: 1, cold: 500, utilities: 6, maintenance: 1, blurb: 'Room-sized cold storage for buying in bulk.', effect: '+500 cold storage' },
  storage: { id: 'storage', name: 'Storage room', vi: 'Kho chứa', cost: 3500, level: 2, group: 'room', life: 10, max: 1, dry: 400, rent: 8, blurb: 'Shelving out back for flour, sugar and boxes. Rent goes up a little.', effect: '+400 dry storage' },
  display: { id: 'display', name: 'Glass display case', vi: 'Tủ kính', cost: 1100, level: 1, group: 'shop', life: 6, max: 1, display: 40, maintenance: 0.2, blurb: 'Pastries look irresistible. Customers pay a little more and the case holds 40 more.', effect: '+8% willingness to pay, +40 case space' },
  coffeeBar: { id: 'coffeeBar', name: 'Phin coffee station', vi: 'Quầy cà phê', cost: 1800, level: 2, group: 'kitchen', life: 6, max: 1, maintenance: 0.5, blurb: 'A rack of phin filters always dripping. Drinks need one step less and baristas work faster.', effect: 'Faster drinks' },
  pos: { id: 'pos', name: 'POS system', vi: 'Máy tính tiền', cost: 900, level: 2, group: 'shop', life: 4, max: 1, maintenance: 0.3, blurb: 'Faster checkout, a loyalty card program and online orders.', effect: 'Service +15%, loyalty & online orders' },
  fan: { id: 'fan', name: 'Ceiling fan', vi: 'Quạt trần', cost: 180, level: 1, group: 'shop', life: 5, max: 1, utilities: 0.5, blurb: 'Keeps the queue cool. Customers wait longer on hot days.', effect: '+30% patience when hot' },
  solar: { id: 'solar', name: 'Solar panels', vi: 'Pin mặt trời', cost: 6500, level: 3, group: 'eco', life: 15, max: 1, eco: 12, blurb: 'Big upfront cost. Oven power gets 60% cheaper for years.', effect: 'Utilities −60%' },
  compost: { id: 'compost', name: 'Compost bin', vi: 'Thùng ủ phân', cost: 250, level: 2, group: 'eco', life: 5, max: 1, eco: 6, blurb: 'Binned food becomes compost instead of rubbish.', effect: 'Waste hurts eco less' },
  bike: { id: 'bike', name: 'Delivery bike', vi: 'Xe giao hàng', cost: 1200, level: 2, group: 'delivery', life: 4, max: 3, maintenance: 0.6, blurb: 'Each bike lets one delivery rider take orders.', effect: 'Delivery for 1 rider' },
  van: { id: 'van', name: 'Delivery van', vi: 'Xe tải nhỏ', cost: 22000, level: 5, group: 'delivery', life: 8, max: 1, maintenance: 6, blurb: 'Big catering and wholesale runs across town.', effect: 'Catering & wholesale ×2' },
  website: { id: 'website', name: 'Online ordering', vi: 'Đặt hàng online', cost: 1500, level: 3, requires: 'pos', group: 'shop', life: 3, max: 1, maintenance: 1, blurb: 'Customers order ahead for pickup. More orders, especially from office workers.', effect: '+8% customers' },
  corner: { id: 'corner', name: 'Coffee corner', vi: 'Góc cà phê', cost: 9000, level: 3, group: 'room', life: 10, max: 1, rent: 15, blurb: 'Plastic stools and a low table by the window. People stay, and more walk in.', effect: '+20% customers, rent +$450/month' },
  garden: { id: 'garden', name: 'Herb garden', vi: 'Vườn rau', cost: 4000, level: 4, group: 'room', life: 10, max: 1, eco: 8, blurb: 'Herbs and pickling vegetables out back. Six free handfuls every morning.', effect: '+6 pickles & herbs daily' },
  renovation: { id: 'renovation', name: 'Kitchen renovation', vi: 'Sửa bếp', cost: 12000, level: 3, group: 'room', life: 12, max: 1, blurb: 'A bigger, brighter kitchen: room for a rack oven and +5 quality on everything.', effect: '+5 quality, room for a rack oven' },
  loft: { id: 'loft', name: 'Upstairs loft', vi: 'Gác lửng', cost: 28000, level: 5, requires: 'corner', group: 'room', life: 15, max: 1, rent: 30, blurb: 'A cosy mezzanine with more seats. The flagship, fully grown.', effect: '+25% customers, rent +$900/month' },
};

export const UPGRADE_ORDER: UpgradeId[] = ['fridge', 'fan', 'display', 'oven2', 'mixer', 'steamer', 'coffeeBar', 'pos', 'bike', 'storage', 'compost', 'solar', 'website', 'corner', 'renovation', 'walkIn', 'oven3', 'garden', 'loft', 'van'];

// ------------------------------------------------------------------ decorations

export interface DecorDef {
  id: DecorId;
  name: string;
  vi: string;
  cost: number;
  level: number;
  bonus: string;
  rep?: number;
  eco?: number;
  community?: number;
  patience?: number;
}

export const DECOR: Record<DecorId, DecorDef> = {
  plant: { id: 'plant', name: 'Potted monstera', vi: 'Chậu cây', cost: 90, level: 1, bonus: '+1 eco', eco: 1 },
  stools: { id: 'stools', name: 'Plastic stools', vi: 'Ghế nhựa', cost: 120, level: 1, bonus: 'People linger: +3% customers', rep: 1 },
  stringLights: { id: 'stringLights', name: 'String lights', vi: 'Đèn dây', cost: 140, level: 1, bonus: 'Cosy evenings', rep: 1 },
  sign: { id: 'sign', name: 'Neon "Bánh mì" sign', vi: 'Bảng đèn', cost: 380, level: 2, bonus: '+4% walk-ins', rep: 1 },
  lanterns: { id: 'lanterns', name: 'Hội An lanterns', vi: 'Đèn lồng', cost: 220, level: 2, bonus: '+2 reputation', rep: 2 },
  birdcage: { id: 'birdcage', name: 'Songbird cage', vi: 'Lồng chim', cost: 180, level: 2, bonus: 'Calming chirps: +5% patience', patience: 0.05 },
  radio: { id: 'radio', name: 'Old radio', vi: 'Radio cũ', cost: 150, level: 2, bonus: 'Plays music: +5% patience', patience: 0.05 },
  art: { id: 'art', name: 'Lacquer painting', vi: 'Tranh sơn mài', cost: 420, level: 3, bonus: '+2 reputation', rep: 2 },
  rug: { id: 'rug', name: 'Woven rug', vi: 'Thảm cói', cost: 160, level: 3, bonus: '+1 community', community: 1 },
  flowers: { id: 'flowers', name: 'Fresh flowers', vi: 'Bình hoa', cost: 110, level: 3, bonus: '+1 eco, +1 reputation', eco: 1, rep: 1 },
  bike: { id: 'bike', name: 'Vintage bicycle', vi: 'Xe đạp cũ', cost: 260, level: 4, bonus: '+2 community', community: 2, eco: 1 },
  hoaMai: { id: 'hoaMai', name: 'Hoa mai tree', vi: 'Cây hoa mai', cost: 240, level: 1, bonus: 'Tết luck: +5% customers during Tết', rep: 1 },
};

export const DECOR_ORDER: DecorId[] = ['plant', 'stools', 'stringLights', 'sign', 'lanterns', 'birdcage', 'radio', 'art', 'rug', 'flowers', 'bike', 'hoaMai'];

/**
 * Something new every day or two in the first fortnight, rotating recipe / neighbour / decor.
 * Scheduled recipes wait for their day even if the level would allow them earlier; after the
 * schedule runs out, levels take over. Days are game days (day 1 is the first morning).
 */
export const UNLOCK_SCHEDULE: { day: number; kind: 'recipe' | 'regular' | 'decor'; id: string; tease: string }[] = [
  { day: 2, kind: 'recipe', id: 'gressCupcake', tease: 'New recipe: Gress cupcake' },
  { day: 3, kind: 'regular', id: 'mai', tease: 'A new face on the lane: Mai' },
  { day: 4, kind: 'recipe', id: 'traTac', tease: 'New recipe: Trà tắc' },
  { day: 5, kind: 'decor', id: 'stringLights', tease: 'A gift from Bà for the shop' },
  { day: 6, kind: 'recipe', id: 'gressTeaLight', tease: 'New recipe: Light gress tea' },
  { day: 8, kind: 'regular', id: 'hung', tease: 'A new face: Chú Hùng' },
  { day: 10, kind: 'recipe', id: 'pateChaud', tease: 'New recipe: Bánh patê sô' },
  { day: 13, kind: 'recipe', id: 'gressOreo', tease: 'New recipe: Gress sandwich cookies' },
];

export const LEVELS = [
  { level: 1, xp: 0, name: 'Tiny Tiệm Bánh', en: 'A tiny bakery' },
  { level: 2, xp: 150, name: 'Neighborhood Bakery', en: 'The street knows you' },
  { level: 3, xp: 900, name: 'Popular Bakery', en: 'People cross town for you' },
  { level: 4, xp: 3000, name: 'Community Favorite', en: 'Part of the neighbourhood' },
  { level: 5, xp: 8000, name: 'Viet Bake Shop', en: 'A local legend' },
];

export const STAGES = [
  { stage: 1, name: 'Tiny tiệm bánh', blurb: 'Just you behind the counter.' },
  { stage: 2, name: 'Storefront', blurb: 'Your first hire.' },
  { stage: 3, name: 'Established bakery', blurb: 'A real team and a busy kitchen.' },
  { stage: 4, name: 'Large bakery', blurb: 'Big kitchen, big days.' },
  { stage: 5, name: 'Multiple locations', blurb: 'More than one shop.' },
  { stage: 6, name: 'Regional brand', blurb: 'A name people recognise across town.' },
];

export const WEEKDAYS = [
  { vi: 'Thứ Hai', en: 'Monday' },
  { vi: 'Thứ Ba', en: 'Tuesday' },
  { vi: 'Thứ Tư', en: 'Wednesday' },
  { vi: 'Thứ Năm', en: 'Thursday' },
  { vi: 'Thứ Sáu', en: 'Friday' },
  { vi: 'Thứ Bảy', en: 'Saturday' },
  { vi: 'Chủ Nhật', en: 'Sunday' },
];

export const WEATHER: Record<Weather, { name: string; vi: string; traffic: number; tip: string }> = {
  sunny: { name: 'Sunny', vi: 'Nắng', traffic: 1.1, tip: 'More people out walking.' },
  cloudy: { name: 'Cloudy', vi: 'Nhiều mây', traffic: 1, tip: 'A normal day.' },
  rainy: { name: 'Rainy', vi: 'Mưa', traffic: 0.75, tip: 'Fewer walk-ins. Hot food sells.' },
  hot: { name: 'Hot', vi: 'Nóng', traffic: 0.95, tip: 'Cold drinks fly off the counter.' },
  cool: { name: 'Cool', vi: 'Mát', traffic: 1.05, tip: 'Warm pastries and bánh mì do well.' },
};
