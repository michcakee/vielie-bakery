import type { DecorId, IngredientId, PackagingId, ProductId, SupplierId, UpgradeId, Weather } from '../engine/types';

/** All tunable numbers live here so balancing never means hunting through logic. */
export const CONFIG = {
  startCash: 150,
  rentPerDay: 18,
  energyPerTray: 0.4,
  /** Service runs 7:00 → 19:00, measured in game minutes. */
  dayMinutes: 720,
  openHour: 7,
  lastCallAt: 600,
  walkMinutes: 9,
  counterSlots: 4,
  helperDelay: 4,
  basePatience: 95,
  baseWalkIns: 15,
  ovenTrays: [4, 6, 9],
  maxPriceFactor: 2.5,
  minPriceFactor: 0.4,
  priceStep: 0.25,
  tipLove: 0.5,
  lastCallDiscount: 0.4,
  substitutionChance: 0.55,
  /** Customers who get help faster than this many minutes count as "quick". */
  quickServe: 25,
  tetStart: 24,
  tetEnd: 28,
  yearLength: 35,
  loanFee: 0.08,
  loanDays: 10,
  coopDividend: 0.015,
  priceLockFee: 5,
  priceLockDays: 7,
} as const;

export interface IngredientDef {
  id: IngredientId;
  name: string;
  vi: string;
  pack: number;
  unit: string;
  price: number;
  spoil: number;
}

export const INGREDIENTS: Record<IngredientId, IngredientDef> = {
  flour: { id: 'flour', name: 'Flour', vi: 'Bột mì', pack: 10, unit: 'scoop', price: 4, spoil: 0 },
  riceFlour: { id: 'riceFlour', name: 'Rice flour', vi: 'Bột gạo', pack: 10, unit: 'scoop', price: 5, spoil: 0 },
  eggs: { id: 'eggs', name: 'Eggs', vi: 'Trứng', pack: 10, unit: 'egg', price: 3, spoil: 0.05 },
  milk: { id: 'milk', name: 'Fresh milk', vi: 'Sữa tươi', pack: 6, unit: 'cup', price: 4.2, spoil: 0.15 },
  condensed: { id: 'condensed', name: 'Condensed milk', vi: 'Sữa đặc', pack: 12, unit: 'spoon', price: 4.8, spoil: 0 },
  sugar: { id: 'sugar', name: 'Sugar', vi: 'Đường', pack: 10, unit: 'scoop', price: 2.5, spoil: 0 },
  butter: { id: 'butter', name: 'Butter', vi: 'Bơ', pack: 6, unit: 'block', price: 6, spoil: 0.05 },
  coffee: { id: 'coffee', name: 'Phin coffee', vi: 'Cà phê', pack: 12, unit: 'cup', price: 3.6, spoil: 0 },
  chaLua: { id: 'chaLua', name: 'Chả lụa pork roll', vi: 'Chả lụa', pack: 10, unit: 'slice', price: 7, spoil: 0.1 },
  veg: { id: 'veg', name: 'Pickles & herbs', vi: 'Đồ chua & rau', pack: 10, unit: 'handful', price: 3, spoil: 0.2 },
  banana: { id: 'banana', name: 'Bananas', vi: 'Chuối', pack: 12, unit: 'banana', price: 3, spoil: 0.15 },
  coconut: { id: 'coconut', name: 'Coconut milk', vi: 'Nước cốt dừa', pack: 8, unit: 'cup', price: 4, spoil: 0.05 },
  kumquat: { id: 'kumquat', name: 'Kumquat & tea', vi: 'Tắc & trà', pack: 12, unit: 'cup', price: 3, spoil: 0.08 },
  cream: { id: 'cream', name: 'Cream & fruit', vi: 'Kem & trái cây', pack: 4, unit: 'bowl', price: 8, spoil: 0.25 },
};

export const INGREDIENT_ORDER: IngredientId[] = ['flour', 'eggs', 'milk', 'condensed', 'sugar', 'coffee', 'chaLua', 'veg', 'butter', 'kumquat', 'banana', 'coconut', 'riceFlour', 'cream'];

export type ProductKind = 'tray' | 'sandwich' | 'drink';

export interface ProductDef {
  id: ProductId;
  name: string;
  en: string;
  kind: ProductKind;
  /** For trays: ingredients per tray. For made-to-order: ingredients per item. */
  recipe: Partial<Record<IngredientId, number>>;
  /** Trays yield this many items. Made-to-order items yield 1. */
  yield: number;
  ref: number;
  popularity: number;
  /** Appeal by time of day: morning rush, lunch, afternoon, evening. */
  times: [number, number, number, number];
  weather: Partial<Record<Weather, number>>;
  difficulty: 1 | 2 | 3;
  eco: number;
  keeps: boolean;
  blurb: string;
  steps?: { id: string; label: string; vi: string }[];
  level: number;
  /** Mins a perfect take-out window lasts in the oven game (smaller = harder). */
  ovenWindow?: number;
}

export const PRODUCTS: Record<ProductId, ProductDef> = {
  banhMi: {
    id: 'banhMi',
    name: 'Bánh mì',
    en: 'Vietnamese baguette sandwich',
    kind: 'sandwich',
    recipe: { chaLua: 1, veg: 1 },
    yield: 1,
    ref: 3,
    popularity: 1.4,
    times: [1.2, 1.6, 0.6, 0.7],
    weather: { cool: 1.2, rainy: 1.15, hot: 0.9 },
    difficulty: 1,
    eco: 3,
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
  },
  caPhe: {
    id: 'caPhe',
    name: 'Cà phê sữa đá',
    en: 'Iced coffee with condensed milk',
    kind: 'drink',
    recipe: { coffee: 1, condensed: 1 },
    yield: 1,
    ref: 2.5,
    popularity: 1.3,
    times: [1.8, 0.8, 1, 0.5],
    weather: { hot: 1.35, sunny: 1.1, cool: 0.8, rainy: 0.9 },
    difficulty: 1,
    eco: 3,
    keeps: false,
    blurb: 'Slow phin drip over sweet condensed milk and ice.',
    steps: [
      { id: 'milk', label: 'Condensed milk', vi: 'Sữa đặc' },
      { id: 'phin', label: 'Phin drip', vi: 'Pha phin' },
      { id: 'ice', label: 'Ice', vi: 'Đá' },
      { id: 'stir', label: 'Stir', vi: 'Khuấy' },
    ],
    level: 1,
  },
  flan: {
    id: 'flan',
    name: 'Bánh flan',
    en: 'Caramel custard',
    kind: 'tray',
    recipe: { eggs: 4, milk: 2, sugar: 1, condensed: 1 },
    yield: 8,
    ref: 1.75,
    popularity: 1,
    times: [0.5, 0.8, 1.4, 1.1],
    weather: { hot: 1.2, sunny: 1.05, cool: 0.9 },
    difficulty: 1,
    eco: 3,
    keeps: true,
    blurb: 'Silky custard under dark caramel. Keeps overnight in a fridge.',
    level: 1,
    ovenWindow: 22,
  },
  pateChaud: {
    id: 'pateChaud',
    name: 'Bánh patê sô',
    en: 'Pâté chaud puff pastry',
    kind: 'tray',
    recipe: { flour: 2, butter: 2, chaLua: 2, eggs: 1 },
    yield: 8,
    ref: 2.25,
    popularity: 1,
    times: [1.3, 1, 0.9, 0.6],
    weather: { cool: 1.25, rainy: 1.2, hot: 0.85 },
    difficulty: 2,
    eco: 2,
    keeps: false,
    blurb: 'Flaky, buttery pastry with a savoury pork filling. A quick snack.',
    level: 2,
    ovenWindow: 18,
  },
  traTac: {
    id: 'traTac',
    name: 'Trà tắc',
    en: 'Kumquat iced tea',
    kind: 'drink',
    recipe: { kumquat: 1 },
    yield: 1,
    ref: 2,
    popularity: 1.1,
    times: [0.5, 1, 1.6, 1.1],
    weather: { hot: 1.6, sunny: 1.25, cool: 0.6, rainy: 0.7 },
    difficulty: 1,
    eco: 4,
    keeps: false,
    blurb: 'Tangy kumquat over jasmine tea and ice. Huge on hot days.',
    steps: [
      { id: 'tea', label: 'Jasmine tea', vi: 'Trà' },
      { id: 'kumquat', label: 'Squeeze tắc', vi: 'Vắt tắc' },
      { id: 'sugar', label: 'Sugar syrup', vi: 'Nước đường' },
      { id: 'ice', label: 'Ice', vi: 'Đá' },
    ],
    level: 2,
  },
  banhChuoi: {
    id: 'banhChuoi',
    name: 'Bánh chuối nướng',
    en: 'Baked banana cake',
    kind: 'tray',
    recipe: { banana: 4, flour: 1, coconut: 1, sugar: 1, eggs: 2, milk: 1 },
    yield: 8,
    ref: 2,
    popularity: 0.9,
    times: [0.4, 0.6, 1.6, 1.1],
    weather: { cool: 1.1, rainy: 1.1 },
    difficulty: 2,
    eco: 4,
    keeps: false,
    blurb: 'Caramelised bananas in a soft coconut crumb. An afternoon favourite.',
    level: 3,
    ovenWindow: 18,
  },
  banhBo: {
    id: 'banhBo',
    name: 'Bánh bò nướng',
    en: 'Pandan honeycomb cake',
    kind: 'tray',
    recipe: { riceFlour: 2, coconut: 2, sugar: 1, eggs: 1 },
    yield: 10,
    ref: 1.5,
    popularity: 0.8,
    times: [0.8, 0.5, 1.4, 0.8],
    weather: {},
    difficulty: 3,
    eco: 4,
    keeps: false,
    blurb: 'Chewy, green pandan honeycomb. Tricky to bake, and people talk about a good one.',
    level: 3,
    ovenWindow: 11,
  },
  banhKem: {
    id: 'banhKem',
    name: 'Bánh kem',
    en: 'Celebration cake',
    kind: 'tray',
    recipe: { flour: 2, eggs: 4, cream: 2, sugar: 1, butter: 1 },
    yield: 2,
    ref: 16,
    popularity: 0.18,
    times: [0.3, 0.7, 1.2, 1.5],
    weather: {},
    difficulty: 3,
    eco: 2,
    keeps: true,
    blurb: 'Fresh cream and fruit. Few people buy one, but each sale is big.',
    level: 4,
    ovenWindow: 14,
  },
  mutDua: {
    id: 'mutDua',
    name: 'Hộp mứt dừa',
    en: 'Tết candied-coconut gift box',
    kind: 'tray',
    recipe: { coconut: 2, sugar: 2 },
    yield: 6,
    ref: 8,
    popularity: 0.9,
    times: [0.8, 1, 1.2, 1.2],
    weather: {},
    difficulty: 2,
    eco: 3,
    keeps: true,
    blurb: 'Candied coconut ribbons in a red gift box. Only during Tết.',
    level: 1,
    ovenWindow: 18,
  },
};

export const PRODUCT_ORDER: ProductId[] = ['banhMi', 'caPhe', 'flan', 'pateChaud', 'traTac', 'banhChuoi', 'banhBo', 'banhKem', 'mutDua'];
export const START_PRODUCTS: ProductId[] = ['banhMi', 'caPhe', 'flan'];

/** Baguettes are baked in trays of 10 and become bánh mì to order. */
export const BAGUETTE = { recipe: { flour: 3 } as Partial<Record<IngredientId, number>>, yield: 10, ovenWindow: 20 };

/** Gift-box packaging adds to mứt dừa's cost; cups and bags to everything else. */
export const GIFT_BOX_COST = 0.6;

export interface SupplierDef {
  id: SupplierId;
  name: string;
  vi: string;
  priceMult: number;
  quality: number;
  eco: number;
  reliability: number;
  blurb: string;
}

export const SUPPLIERS: Record<SupplierId, SupplierDef> = {
  cho: {
    id: 'cho',
    name: 'Wet market',
    vi: 'Chợ sỉ',
    priceMult: 0.85,
    quality: 55,
    eco: 30,
    reliability: 0.99,
    blurb: 'Cheapest. Always open. Plastic bags everywhere.',
  },
  farm: {
    id: 'farm',
    name: 'Đà Lạt farm co-op',
    vi: 'Nông trại',
    priceMult: 1.15,
    quality: 85,
    eco: 92,
    reliability: 0.82,
    blurb: 'Fresh, local and low waste. Sometimes sold out.',
  },
  premium: {
    id: 'premium',
    name: 'Saigon Fine Foods',
    vi: 'Hàng cao cấp',
    priceMult: 1.35,
    quality: 96,
    eco: 65,
    reliability: 1,
    blurb: 'Top quality, always in stock, priced to match.',
  },
};

export const SUPPLIER_ORDER: SupplierId[] = ['cho', 'farm', 'premium'];
/** Each pack bought from a supplier builds loyalty; every 10 packs is 1% off, up to 8%. */
export const LOYALTY = { packsPerPoint: 10, maxDiscount: 0.08 };

export const PACKAGING: Record<PackagingId, { name: string; cost: number; eco: number; blurb: string }> = {
  plastic: { name: 'Plastic bags', cost: 0.03, eco: 10, blurb: 'Cheapest. Ends up in the canal.' },
  paper: { name: 'Paper bags', cost: 0.07, eco: 55, blurb: 'A little more, and it composts.' },
  reusable: { name: 'Reusable cups & tins', cost: 0.12, eco: 95, blurb: 'Deposit scheme. Eco customers love it.' },
};

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  vi: string;
  cost: number;
  level: number;
  requires?: UpgradeId;
  blurb: string;
  effect: string;
  rent?: number;
  wage?: number;
  eco?: number;
  group: 'kitchen' | 'shop' | 'eco' | 'room';
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  oven2: { id: 'oven2', name: 'Bigger oven', vi: 'Lò nướng lớn', cost: 180, level: 1, group: 'kitchen', blurb: 'Bake 6 trays each morning instead of 4.', effect: '6 trays a day' },
  oven3: { id: 'oven3', name: 'Commercial oven', vi: 'Lò công nghiệp', cost: 600, level: 4, requires: 'oven2', group: 'kitchen', blurb: 'Nine trays a morning. Uses a bit more power.', effect: '9 trays a day' },
  fridge: { id: 'fridge', name: 'Refrigerator', vi: 'Tủ lạnh', cost: 120, level: 1, group: 'kitchen', blurb: 'Flan and cakes keep overnight. Fresh ingredients spoil half as fast.', effect: 'Less spoilage' },
  display: { id: 'display', name: 'Glass display case', vi: 'Tủ kính', cost: 90, level: 1, group: 'shop', blurb: 'Pastries look irresistible. Customers will pay a little more.', effect: '+8% willingness to pay for pastries' },
  coffeeBar: { id: 'coffeeBar', name: 'Coffee station', vi: 'Quầy cà phê', cost: 140, level: 2, group: 'kitchen', blurb: 'A rack of phin filters always dripping. Drinks need one step less.', effect: 'Faster drinks' },
  helper: { id: 'helper', name: 'Hire Cô Ba', vi: 'Thuê Cô Ba', cost: 60, level: 2, wage: 20, group: 'shop', blurb: 'Cô Ba hands out pastries from the case while you make sandwiches and drinks.', effect: 'Auto-serves pastries · $20/day wage' },
  fan: { id: 'fan', name: 'Ceiling fan', vi: 'Quạt trần', cost: 45, level: 1, group: 'shop', blurb: 'Keeps the queue cool. Customers wait longer on hot days.', effect: '+30% patience when hot' },
  solar: { id: 'solar', name: 'Solar panels', vi: 'Pin mặt trời', cost: 400, level: 3, group: 'eco', eco: 12, blurb: 'Big upfront cost. Oven power gets 60% cheaper forever.', effect: 'Energy −60%' },
  compost: { id: 'compost', name: 'Compost bin', vi: 'Thùng ủ phân', cost: 60, level: 2, group: 'eco', eco: 6, blurb: 'Binned food turns into compost instead of rubbish.', effect: 'Waste hurts eco score less' },
  corner: { id: 'corner', name: 'Coffee corner', vi: 'Góc cà phê', cost: 350, level: 3, rent: 6, group: 'room', blurb: 'Plastic stools and a low table by the window. People stay and chat, and more walk in.', effect: '+20% customers · rent +$6/day' },
  garden: { id: 'garden', name: 'Herb garden', vi: 'Vườn rau', cost: 220, level: 4, group: 'room', eco: 8, blurb: 'Herbs and pickling vegetables out back. 4 free handfuls every morning.', effect: '+4 pickles & herbs daily' },
  loft: { id: 'loft', name: 'Upstairs loft', vi: 'Gác lửng', cost: 900, level: 5, requires: 'corner', rent: 12, group: 'room', blurb: 'A cosy mezzanine with more seats. Vielie Bakery, fully grown.', effect: '+25% customers · rent +$12/day' },
};

export const UPGRADE_ORDER: UpgradeId[] = ['fridge', 'fan', 'display', 'oven2', 'helper', 'coffeeBar', 'compost', 'solar', 'corner', 'garden', 'oven3', 'loft'];

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
  plant: { id: 'plant', name: 'Potted monstera', vi: 'Chậu cây', cost: 20, level: 1, bonus: '+1 eco', eco: 1 },
  stools: { id: 'stools', name: 'Plastic stools', vi: 'Ghế nhựa', cost: 25, level: 1, bonus: 'People linger: +3% customers', rep: 1 },
  stringLights: { id: 'stringLights', name: 'String lights', vi: 'Đèn dây', cost: 30, level: 1, bonus: 'Cosy evenings', rep: 1 },
  sign: { id: 'sign', name: 'Neon "Bánh mì" sign', vi: 'Bảng đèn', cost: 45, level: 2, bonus: '+4% walk-ins', rep: 1 },
  lanterns: { id: 'lanterns', name: 'Hội An lanterns', vi: 'Đèn lồng', cost: 40, level: 2, bonus: '+2 reputation', rep: 2 },
  birdcage: { id: 'birdcage', name: 'Songbird cage', vi: 'Lồng chim', cost: 35, level: 2, bonus: 'Calming chirps: +5% patience', patience: 0.05 },
  radio: { id: 'radio', name: 'Old radio', vi: 'Radio cũ', cost: 30, level: 2, bonus: 'Plays music: +5% patience', patience: 0.05 },
  art: { id: 'art', name: 'Lacquer painting', vi: 'Tranh sơn mài', cost: 60, level: 3, bonus: '+2 reputation', rep: 2 },
  rug: { id: 'rug', name: 'Woven rug', vi: 'Thảm cói', cost: 30, level: 3, bonus: '+1 community', community: 1 },
  flowers: { id: 'flowers', name: 'Fresh flowers', vi: 'Bình hoa', cost: 25, level: 3, bonus: '+1 eco, +1 reputation', eco: 1, rep: 1 },
  bike: { id: 'bike', name: 'Delivery bicycle', vi: 'Xe đạp', cost: 70, level: 4, bonus: '+2 community', community: 2, eco: 1 },
  hoaMai: { id: 'hoaMai', name: 'Hoa mai tree', vi: 'Cây hoa mai', cost: 50, level: 1, bonus: 'Tết luck: +5% customers during Tết', rep: 1 },
};

export const DECOR_ORDER: DecorId[] = ['plant', 'stools', 'stringLights', 'sign', 'lanterns', 'birdcage', 'radio', 'art', 'rug', 'flowers', 'bike', 'hoaMai'];

export const LEVELS = [
  { level: 1, xp: 0, name: 'Tiny Tiệm Bánh', en: 'A tiny bakery' },
  { level: 2, xp: 120, name: 'Neighborhood Bakery', en: 'The street knows you' },
  { level: 3, xp: 480, name: 'Popular Bakery', en: 'People cross town for you' },
  { level: 4, xp: 1250, name: 'Community Favorite', en: 'Part of the neighborhood' },
  { level: 5, xp: 2600, name: 'Vielie Bakery', en: 'A local legend' },
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
