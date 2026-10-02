import type { Difficulty } from './config';
import type { LocationId, ProductId, RoleId, ScenarioId, SegmentId } from '../engine/types';

// ------------------------------------------------------------------ neighbourhoods

export interface LocationDef {
  id: LocationId;
  name: string;
  vi: string;
  blurb: string;
  /** Daily rent (shown to players as monthly). */
  rent: number;
  traffic: number;
  income: number;
  segments: Partial<Record<SegmentId, number>>;
  /** Multipliers on weekday traffic, Monday first. */
  week: number[];
  /** Extra traffic by season. */
  seasonal: Partial<Record<'cool' | 'warm' | 'hot' | 'rainy', number>>;
  festivalBoost: number;
  deliverySurcharge: number;
  growth: number;
  fitOut: number;
  deposit: number;
}

const WEEK_FLAT = [1, 1, 1, 1, 1.06, 1.18, 1.15];

export const LOCATIONS: Record<LocationId, LocationDef> = {
  oldLane: {
    id: 'oldLane',
    name: 'Old Market Lane',
    vi: 'Phố Chợ Cũ',
    blurb: 'Bà\'s lane. Cheap rent, loyal elders, steady foot traffic, room to grow.',
    rent: 45,
    traffic: 1,
    income: 0.95,
    segments: { vnElders: 0.24, vnFamilies: 0.22, budget: 0.14, office: 0.1, students: 0.1, coffee: 0.16, families: 0.04 },
    week: WEEK_FLAT,
    seasonal: {},
    festivalBoost: 1.35,
    deliverySurcharge: 0,
    growth: 0.02,
    fitOut: 6000,
    deposit: 2700,
  },
  littleSaigon: {
    id: 'littleSaigon',
    name: 'Little Saigon Plaza',
    vi: 'Khu Sài Gòn Nhỏ',
    blurb: 'The heart of the community. Busy, competitive, and huge at Tết.',
    rent: 78,
    traffic: 1.45,
    income: 1,
    segments: { vnFamilies: 0.3, vnElders: 0.2, event: 0.08, budget: 0.14, coffee: 0.14, tourists: 0.08, families: 0.06 },
    week: [0.95, 0.95, 0.95, 1, 1.08, 1.3, 1.3],
    seasonal: {},
    festivalBoost: 1.7,
    deliverySurcharge: 0,
    growth: 0.03,
    fitOut: 14000,
    deposit: 4700,
  },
  university: {
    id: 'university',
    name: 'University Hill',
    vi: 'Đồi Đại Học',
    blurb: 'Students on tight budgets and lots of coffee. Quiet in the summer break.',
    rent: 55,
    traffic: 1.25,
    income: 0.8,
    segments: { students: 0.52, coffee: 0.22, budget: 0.14, office: 0.08, vnFamilies: 0.04 },
    week: [1.1, 1.1, 1.1, 1.1, 1, 0.75, 0.7],
    seasonal: { hot: 0.6 },
    festivalBoost: 1.1,
    deliverySurcharge: 0.03,
    growth: 0.02,
    fitOut: 9000,
    deposit: 3300,
  },
  downtown: {
    id: 'downtown',
    name: 'Downtown Offices',
    vi: 'Trung Tâm',
    blurb: 'Huge weekday lunch rush, deserted weekends, expensive rent.',
    rent: 125,
    traffic: 1.75,
    income: 1.3,
    segments: { office: 0.5, coffee: 0.2, premium: 0.15, tourists: 0.1, budget: 0.05 },
    week: [1.15, 1.15, 1.15, 1.15, 1.1, 0.5, 0.4],
    seasonal: {},
    festivalBoost: 1,
    deliverySurcharge: 0.05,
    growth: 0.03,
    fitOut: 22000,
    deposit: 7500,
  },
  riverside: {
    id: 'riverside',
    name: 'Riverside Promenade',
    vi: 'Bờ Sông',
    blurb: 'Tourists and couples with money to spend. Booms in summer, slow in the cool months.',
    rent: 95,
    traffic: 1.3,
    income: 1.3,
    segments: { tourists: 0.38, premium: 0.24, families: 0.2, coffee: 0.12, event: 0.06 },
    week: [0.9, 0.9, 0.9, 0.95, 1.1, 1.35, 1.35],
    seasonal: { hot: 1.4, cool: 0.8 },
    festivalBoost: 1.3,
    deliverySurcharge: 0.04,
    growth: 0.04,
    fitOut: 18000,
    deposit: 5700,
  },
  suburb: {
    id: 'suburb',
    name: 'Lotus Grove Mall',
    vi: 'Trung Tâm Thương Mại',
    blurb: 'Families on weekends, a chain bakery next door, and parking for everyone.',
    rent: 85,
    traffic: 1.4,
    income: 1.1,
    segments: { families: 0.42, vnFamilies: 0.16, budget: 0.14, premium: 0.1, students: 0.12, event: 0.06 },
    week: [0.85, 0.85, 0.9, 0.95, 1.1, 1.45, 1.4],
    seasonal: {},
    festivalBoost: 1.2,
    deliverySurcharge: 0.04,
    growth: 0.02,
    fitOut: 16000,
    deposit: 5100,
  },
};

export const LOCATION_ORDER: LocationId[] = ['oldLane', 'littleSaigon', 'university', 'downtown', 'riverside', 'suburb'];

// ------------------------------------------------------------------ customer segments

export interface SegmentDef {
  id: SegmentId;
  name: string;
  vi: string;
  blurb: string;
  income: number;
  /** Higher means more price sensitive (a tighter spread of willingness to pay). */
  sensitivity: number;
  prefs: Partial<Record<ProductId, number>>;
  loyalty: number;
  patience: number;
  times: [number, number, number, number];
  eco: number;
  /** How much traditional quality and Vietnamese festivals matter. */
  heritage: number;
  qty: number;
  marketing: Partial<Record<'flyers' | 'social' | 'community' | 'influencer' | 'loyalty' | 'partnership', number>>;
}

export const SEGMENTS: Record<SegmentId, SegmentDef> = {
  students: {
    id: 'students',
    name: 'Students',
    vi: 'Sinh viên',
    blurb: 'Tight budgets, big appetites, coffee and trà tắc.',
    income: 0.78,
    sensitivity: 1.4,
    prefs: { banhMi: 1.4, traTac: 1.6, caPhe: 1.2, banhBao: 1.3, che: 1.4 },
    loyalty: 0.45,
    patience: 0.9,
    times: [0.8, 1.3, 1.2, 1],
    eco: 0.3,
    heritage: 0.2,
    qty: 1,
    marketing: { social: 1.6, influencer: 1.5, flyers: 0.8, loyalty: 1.2 },
  },
  families: {
    id: 'families',
    name: 'Families',
    vi: 'Gia đình',
    blurb: 'Buy for everyone: sweets, cakes and buns.',
    income: 1.05,
    sensitivity: 1,
    prefs: { flan: 1.3, banhChuoi: 1.4, banhKem: 2, banhBao: 1.3, che: 1.3, mutDua: 1.3 },
    loyalty: 0.6,
    patience: 1,
    times: [0.6, 1, 1.5, 1.2],
    eco: 0.2,
    heritage: 0.3,
    qty: 1.8,
    marketing: { flyers: 1.3, community: 1.1, social: 1, loyalty: 1.1 },
  },
  office: {
    id: 'office',
    name: 'Office workers',
    vi: 'Dân văn phòng',
    blurb: 'Quick bánh mì and coffee. Hate waiting.',
    income: 1.3,
    sensitivity: 0.7,
    prefs: { banhMi: 1.6, caPhe: 1.6, pateChaud: 1.3, banhBao: 1.1 },
    loyalty: 0.6,
    patience: 0.6,
    times: [1.7, 1.6, 0.5, 0.2],
    eco: 0.15,
    heritage: 0.2,
    qty: 1.2,
    marketing: { partnership: 1.8, social: 1, loyalty: 1.3 },
  },
  tourists: {
    id: 'tourists',
    name: 'Tourists',
    vi: 'Du khách',
    blurb: 'Curious, happy to pay, rarely come back.',
    income: 1.3,
    sensitivity: 0.8,
    prefs: { banhMi: 1.5, caPhe: 1.4, banhBo: 1.3, che: 1.3, banhTrungThu: 1.3 },
    loyalty: 0.08,
    patience: 1,
    times: [0.7, 1.2, 1.3, 1.1],
    eco: 0.25,
    heritage: 0.4,
    qty: 1.3,
    marketing: { influencer: 1.8, social: 1.4 },
  },
  vnElders: {
    id: 'vnElders',
    name: 'Cô chú (elders)',
    vi: 'Cô chú',
    blurb: 'Know exactly how bánh bò should taste. Fiercely loyal to a good bakery.',
    income: 0.95,
    sensitivity: 1.1,
    prefs: { banhBo: 1.7, flan: 1.3, banhBao: 1.4, che: 1.4, banhTrungThu: 1.9, mutDua: 1.6, banhMi: 1.1 },
    loyalty: 0.92,
    patience: 1.5,
    times: [1.7, 0.8, 0.9, 0.4],
    eco: 0.1,
    heritage: 1.6,
    qty: 1.3,
    marketing: { community: 2, flyers: 1.2 },
  },
  vnFamilies: {
    id: 'vnFamilies',
    name: 'Vietnamese families',
    vi: 'Gia đình Việt',
    blurb: 'Weekend bánh mì runs, birthday cakes and big Tết gift orders.',
    income: 1.05,
    sensitivity: 0.95,
    prefs: { banhMi: 1.3, banhKem: 1.7, mutDua: 1.9, banhTrungThu: 1.9, che: 1.3, banhBao: 1.2 },
    loyalty: 0.8,
    patience: 1.1,
    times: [0.9, 1.1, 1.2, 1.1],
    eco: 0.15,
    heritage: 1.3,
    qty: 1.8,
    marketing: { community: 1.7, social: 1.1, loyalty: 1.2 },
  },
  budget: {
    id: 'budget',
    name: 'Bargain hunters',
    vi: 'Săn giảm giá',
    blurb: 'Come for discounts and last call.',
    income: 0.7,
    sensitivity: 1.6,
    prefs: { banhMi: 1.3, banhBao: 1.2, flan: 1.1 },
    loyalty: 0.3,
    patience: 1,
    times: [0.7, 1, 1, 1.5],
    eco: 0.1,
    heritage: 0.4,
    qty: 1.2,
    marketing: { flyers: 1.5, loyalty: 1.4 },
  },
  premium: {
    id: 'premium',
    name: 'Treat seekers',
    vi: 'Khách sang',
    blurb: 'Pay for quality and atmosphere.',
    income: 1.6,
    sensitivity: 0.55,
    prefs: { banhKem: 2, pateChaud: 1.3, caPhe: 1.3, banhBo: 1.2, banhTrungThu: 1.4 },
    loyalty: 0.5,
    patience: 1,
    times: [0.7, 1, 1.3, 1.2],
    eco: 0.35,
    heritage: 0.5,
    qty: 1.4,
    marketing: { influencer: 1.4, social: 1.2, partnership: 1.1 },
  },
  coffee: {
    id: 'coffee',
    name: 'Coffee regulars',
    vi: 'Dân ghiền cà phê',
    blurb: 'Same order every morning. Barely notice a small price rise.',
    income: 1,
    sensitivity: 0.6,
    prefs: { caPhe: 3, traTac: 1.4 },
    loyalty: 0.9,
    patience: 0.9,
    times: [2.1, 0.6, 0.8, 0.3],
    eco: 0.25,
    heritage: 0.5,
    qty: 1,
    marketing: { loyalty: 2, social: 0.9 },
  },
  event: {
    id: 'event',
    name: 'Party planners',
    vi: 'Khách đặt tiệc',
    blurb: 'Birthdays, weddings, Tết: big orders for special days.',
    income: 1.4,
    sensitivity: 0.85,
    prefs: { banhKem: 3, mutDua: 2, banhTrungThu: 2.2, banhBao: 1.2 },
    loyalty: 0.4,
    patience: 1.2,
    times: [0.5, 1, 1.3, 1.3],
    eco: 0.2,
    heritage: 0.8,
    qty: 2.4,
    marketing: { community: 1.3, partnership: 1.4, social: 1 },
  },
};

export const SEGMENT_ORDER: SegmentId[] = ['vnElders', 'vnFamilies', 'families', 'students', 'office', 'coffee', 'budget', 'premium', 'tourists', 'event'];

// ------------------------------------------------------------------ staff roles

export interface RoleDef {
  id: RoleId;
  name: string;
  vi: string;
  blurb: string;
  wage: number;
  serves?: ('tray' | 'drink' | 'sandwich')[];
}

export const ROLES: Record<RoleId, RoleDef> = {
  baker: { id: 'baker', name: 'Baker', vi: 'Thợ làm bánh', blurb: 'Bakes extra trays every morning.', wage: 18 },
  cashier: { id: 'cashier', name: 'Cashier', vi: 'Thu ngân', blurb: 'Hands out pastries from the case.', wage: 16, serves: ['tray'] },
  barista: { id: 'barista', name: 'Barista', vi: 'Pha chế', blurb: 'Makes cà phê, trà tắc and chè.', wage: 17, serves: ['drink'] },
  cook: { id: 'cook', name: 'Sandwich maker', vi: 'Đứng bếp', blurb: 'Builds bánh mì to order.', wage: 17, serves: ['sandwich'] },
  pastryChef: { id: 'pastryChef', name: 'Pastry chef', vi: 'Đầu bếp bánh', blurb: 'Better trays, and cakes and mooncakes worth talking about.', wage: 25 },
  delivery: { id: 'delivery', name: 'Delivery rider', vi: 'Giao hàng', blurb: 'Takes phone and app orders across the neighbourhood. Needs a bike.', wage: 16 },
  manager: { id: 'manager', name: 'Manager', vi: 'Quản lý', blurb: 'Keeps the team happy and can run a shop without you.', wage: 27 },
  marketer: { id: 'marketer', name: 'Marketer', vi: 'Tiếp thị', blurb: 'Makes campaigns work harder and spreads the word.', wage: 22 },
};

export const ROLE_ORDER: RoleId[] = ['cashier', 'barista', 'cook', 'baker', 'pastryChef', 'delivery', 'manager', 'marketer'];

export const STAFF_NAMES = ['Thảo', 'Bảo', 'Hiền', 'Khánh', 'Trung', 'Ngân', 'Phát', 'Uyên', 'Tài', 'Diễm', 'Lộc', 'Quyên', 'Hưng', 'Vân', 'Thịnh', 'Kim', 'Sang', 'Như', 'Đức', 'Mỹ'];

// ------------------------------------------------------------------ rivals

export interface CompetitorSeed {
  id: string;
  name: string;
  location: LocationId;
  strategy: 'discount' | 'premium' | 'matcher' | 'copycat' | 'chain';
  products: Partial<Record<ProductId, number>>;
  quality: number;
  reputation: number;
  marketing: number;
  cash: number;
  opensDay: number;
  blurb: string;
}

export const COMPETITOR_SEEDS: CompetitorSeed[] = [
  { id: 'coTu', name: 'Bánh Mì Cô Tư', location: 'oldLane', strategy: 'discount', products: { banhMi: 5.5, caPhe: 4.25 }, quality: 58, reputation: 40, marketing: 0.2, cash: 6000, opensDay: 15, blurb: 'A cheerful stand across the street. Cheap and fast.' },
  { id: 'hongPhat', name: 'Tiệm Bánh Hồng Phát', location: 'littleSaigon', strategy: 'premium', products: { banhBo: 3.75, banhBao: 5, banhTrungThu: 11, mutDua: 21, flan: 4 }, quality: 82, reputation: 72, marketing: 0.4, cash: 40000, opensDay: 0, blurb: 'Forty years of traditional cakes. The elders\' favourite.' },
  { id: 'saigonExpress', name: 'Saigon Express', location: 'littleSaigon', strategy: 'chain', products: { banhMi: 5.75, caPhe: 4.5, traTac: 4 }, quality: 60, reputation: 55, marketing: 0.8, cash: 120000, opensDay: 0, blurb: 'A fast-growing chain with big ads and average sandwiches.' },
  { id: 'bobaBanh', name: 'Boba & Bánh', location: 'university', strategy: 'copycat', products: { traTac: 4, caPhe: 4.5, banhMi: 6 }, quality: 62, reputation: 55, marketing: 0.6, cash: 15000, opensDay: 0, blurb: 'Students love the vibe. They copy whatever sells.' },
  { id: 'metroCafe', name: 'Metro Café', location: 'downtown', strategy: 'chain', products: { caPhe: 5.5, banhMi: 7.5, pateChaud: 4.5 }, quality: 66, reputation: 60, marketing: 0.9, cash: 200000, opensDay: 0, blurb: 'A coffee chain in every office lobby.' },
  { id: 'riverPatisserie', name: 'Riverside Pâtisserie', location: 'riverside', strategy: 'premium', products: { banhKem: 46, pateChaud: 5, caPhe: 6 }, quality: 84, reputation: 70, marketing: 0.5, cash: 60000, opensDay: 0, blurb: 'French-Vietnamese pastries with a view.' },
  { id: 'sweetMart', name: 'SweetMart Bakery', location: 'suburb', strategy: 'discount', products: { banhKem: 30, flan: 3, banhMi: 5.5, banhBao: 3.75 }, quality: 52, reputation: 50, marketing: 0.7, cash: 150000, opensDay: 0, blurb: 'A supermarket bakery. Cheap, cheerful, a little bland.' },
  { id: 'chiBay', name: 'Chè Chị Bảy', location: 'oldLane', strategy: 'matcher', products: { che: 5, banhBo: 3, flan: 3.25 }, quality: 70, reputation: 55, marketing: 0.2, cash: 8000, opensDay: 200, blurb: 'A dessert cart that watches your prices closely.' },
];

// ------------------------------------------------------------------ scenarios

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  vi: string;
  blurb: string;
  cash: number;
  location: LocationId | null;
  inherited: boolean;
  loan: number;
  regime: 'normal' | 'recession' | 'boom' | 'inflation';
  regimeMonths: number;
  extraRivals: string[];
  goal: string;
  difficulty: Difficulty;
}

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  family: {
    id: 'family',
    name: 'Family Business',
    vi: 'Tiệm của Bà',
    blurb: 'Take over Bà\'s little bakery on Old Market Lane. A gentle start with her oven, her recipes and her regulars.',
    cash: 2500,
    location: 'oldLane',
    inherited: true,
    loan: 0,
    regime: 'normal',
    regimeMonths: 6,
    extraRivals: [],
    goal: 'legacy',
    difficulty: 'normal',
  },
  startup: {
    id: 'startup',
    name: 'Startup',
    vi: 'Khởi nghiệp',
    blurb: 'You have $10,000 and an empty shop. Pick a neighbourhood, buy an oven and build from nothing.',
    cash: 10000,
    location: null,
    inherited: false,
    loan: 0,
    regime: 'normal',
    regimeMonths: 4,
    extraRivals: [],
    goal: 'value',
    difficulty: 'normal',
  },
  recession: {
    id: 'recession',
    name: 'Survive the Recession',
    vi: 'Vượt khủng hoảng',
    blurb: 'Bà\'s bakery, but money is tight, customers are careful and there\'s a $3,000 loan to repay.',
    cash: 1200,
    location: 'oldLane',
    inherited: true,
    loan: 3000,
    regime: 'recession',
    regimeMonths: 12,
    extraRivals: [],
    goal: 'survive',
    difficulty: 'hard',
  },
  expansion: {
    id: 'expansion',
    name: 'Rapid Expansion',
    vi: 'Mở rộng nhanh',
    blurb: 'Investors are excited. Start with $15,000 and aim for three shops within two years.',
    cash: 15000,
    location: 'littleSaigon',
    inherited: false,
    loan: 0,
    regime: 'boom',
    regimeMonths: 8,
    extraRivals: [],
    goal: 'chain',
    difficulty: 'normal',
  },
  community: {
    id: 'community',
    name: 'Community Bakery',
    vi: 'Tiệm của xóm',
    blurb: 'Bà\'s lane, with a mission: affordable food, zero waste, and a bakery the whole neighbourhood loves.',
    cash: 2500,
    location: 'oldLane',
    inherited: true,
    loan: 0,
    regime: 'normal',
    regimeMonths: 6,
    extraRivals: [],
    goal: 'community',
    difficulty: 'normal',
  },
  competitive: {
    id: 'competitive',
    name: 'Competitive Market',
    vi: 'Cạnh tranh',
    blurb: 'Open in Little Saigon Plaza next to three established bakeries. Find your niche or get squeezed.',
    cash: 12000,
    location: 'littleSaigon',
    inherited: false,
    loan: 0,
    regime: 'normal',
    regimeMonths: 6,
    extraRivals: ['chiBay'],
    goal: 'leader',
    difficulty: 'hard',
  },
};

export const SCENARIO_ORDER: ScenarioId[] = ['family', 'startup', 'recession', 'expansion', 'community', 'competitive'];

export const GOALS: Record<string, { name: string; blurb: string }> = {
  legacy: { name: 'Bà\'s legacy', blurb: 'Reach level 5 and keep the regulars happy (community 75).' },
  value: { name: 'Build value', blurb: 'Grow the business to an estimated value of $250,000.' },
  survive: { name: 'Survive', blurb: 'Stay open for two full years without going bankrupt.' },
  chain: { name: 'Bakery chain', blurb: 'Run three shops at once within two years.' },
  community: { name: 'Heart of the street', blurb: 'Community 90, eco score 80 and 10,000 customers served.' },
  leader: { name: 'Market leader', blurb: 'Win the biggest share of Little Saigon Plaza for a whole month.' },
  debtFree: { name: 'Debt-free and steady', blurb: 'Three profitable years in a row with no debt.' },
  twentyYears: { name: 'Twenty years', blurb: 'Keep the bakery open for 20 years.' },
};
