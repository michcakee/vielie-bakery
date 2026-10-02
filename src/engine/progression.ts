import { DECOR, LEVELS, PRODUCTS, PRODUCT_ORDER, UPGRADES } from '../data/catalog';
import { ecoScore, levelOf } from './economy';
import { toast } from './helpers';
import type { DecorId, GameState, ProductId } from './types';

export interface QuestDef {
  id: string;
  title: string;
  text: string;
  target: number;
  progress: (s: GameState) => number;
  reward: { cash?: number; xp?: number; decor?: DecorId };
  rewardText: string;
}

const best = (s: GameState, f: (h: GameState['history'][number]) => number) => Math.max(0, ...s.history.map(f));

export const QUESTS: QuestDef[] = [
  { id: 'firstBanhMi', title: 'First bánh mì', text: 'Sell your first bánh mì.', target: 1, progress: (s) => s.lifetime.sold.banhMi, reward: { cash: 20, xp: 20 }, rewardText: '$20' },
  { id: 'stockUp', title: 'Stock up', text: 'Buy 5 packs of ingredients at the market.', target: 5, progress: (s) => s.questProgress.packs ?? 0, reward: { cash: 10, xp: 15 }, rewardText: '$10' },
  { id: 'baker', title: 'Oven on!', text: 'Bake 3 trays in one morning.', target: 3, progress: (s) => Math.max(s.traysToday, s.questProgress.bestTrays ?? 0), reward: { cash: 15, xp: 20 }, rewardText: '$15' },
  { id: 'firstProfit', title: 'In the black', text: 'Finish a day with a profit.', target: 1, progress: (s) => (s.history.some((h) => h.profit > 0) ? 1 : 0), reward: { xp: 30, decor: 'plant' }, rewardText: 'A potted monstera' },
  { id: 'priceExplorer', title: 'Price explorer', text: 'Change a price, then open the doors.', target: 1, progress: (s) => s.questProgress.priceChanged ?? 0, reward: { xp: 30, cash: 10 }, rewardText: '$10' },
  { id: 'morningRush', title: 'Morning rush', text: 'Serve 10 customers before noon in one day.', target: 10, progress: (s) => Math.max(s.today.servedBeforeNoon, s.questProgress.bestMorning ?? 0), reward: { xp: 40, decor: 'stringLights' }, rewardText: 'String lights' },
  { id: 'smartShopper', title: 'Smart shopper', text: 'Save $20 by shopping below normal prices.', target: 20, progress: (s) => Math.floor(s.questProgress.saved ?? 0), reward: { cash: 25, xp: 30 }, rewardText: '$25' },
  { id: 'zeroWaste', title: 'Zero waste day', text: 'Close a day without binning any food.', target: 1, progress: (s) => s.lifetime.zeroWasteDays, reward: { cash: 25, xp: 40 }, rewardText: '$25' },
  { id: 'safetyFund', title: 'Rainy-day money', text: 'Put $100 in the bakery safety fund.', target: 100, progress: (s) => Math.floor(Math.max(s.safetyFund, s.questProgress.bestFund ?? 0)), reward: { xp: 40, decor: 'radio' }, rewardText: 'An old radio' },
  { id: 'decorator', title: 'Make it yours', text: 'Own 3 decorations.', target: 3, progress: (s) => s.decor.length, reward: { cash: 20, xp: 30 }, rewardText: '$20' },
  { id: 'bigDay', title: 'Big day', text: 'Make $60 profit in a single day.', target: 60, progress: (s) => Math.floor(best(s, (h) => h.profit)), reward: { cash: 40, xp: 60 }, rewardText: '$40' },
  { id: 'greenBakery', title: 'Green bakery', text: 'Reach an eco score of 75.', target: 75, progress: (s) => ecoScore(s), reward: { xp: 60, decor: 'flowers' }, rewardText: 'Fresh flowers' },
  { id: 'community', title: 'Community favourite', text: 'Welcome back regulars 25 times.', target: 25, progress: (s) => s.lifetime.returning, reward: { cash: 50, xp: 80 }, rewardText: '$50' },
  { id: 'coffeeTime', title: 'Coffee time', text: 'Sell 50 cà phê sữa đá.', target: 50, progress: (s) => s.lifetime.sold.caPhe, reward: { cash: 30, xp: 60 }, rewardText: '$30' },
  { id: 'expand', title: 'Room to grow', text: 'Open the coffee corner.', target: 1, progress: (s) => (s.upgrades.includes('corner') ? 1 : 0), reward: { xp: 100, decor: 'rug' }, rewardText: 'A woven rug' },
];

export function activeQuests(s: GameState, n = 3): QuestDef[] {
  return QUESTS.filter((q) => !s.quests.includes(q.id)).slice(0, n);
}

export interface AchievementDef {
  id: string;
  title: string;
  text: string;
  icon: string;
  check: (s: GameState) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'firstSale', title: 'First sale', text: 'Sell anything at all.', icon: 'coin', check: (s) => s.lifetime.served > 0 },
  { id: 'firstProfit', title: 'First profit', text: 'Finish a profitable day.', icon: 'chart', check: (s) => s.history.some((h) => h.profit > 0) },
  { id: 'banhMi100', title: '100 bánh mì', text: 'Sell 100 bánh mì.', icon: 'banhMi', check: (s) => s.lifetime.sold.banhMi >= 100 },
  { id: 'coffeeMaster', title: 'Coffee master', text: 'Sell 150 cà phê sữa đá.', icon: 'caPhe', check: (s) => s.lifetime.sold.caPhe >= 150 },
  { id: 'zeroWaste', title: 'Zero waste day', text: 'Bin nothing all day.', icon: 'leaf', check: (s) => s.lifetime.zeroWasteDays > 0 },
  { id: 'green', title: 'Green bakery', text: 'Eco score 90.', icon: 'leaf', check: (s) => ecoScore(s) >= 90 },
  { id: 'neighborhood', title: 'Neighbourhood favourite', text: 'Community 80.', icon: 'heart', check: (s) => s.community >= 80 },
  { id: 'tet', title: 'Tết favourite', text: 'Sell 12 mứt dừa gift boxes.', icon: 'mutDua', check: (s) => s.lifetime.tetSold >= 12 },
  { id: 'banana', title: 'Banana master', text: 'Sell 100 bánh chuối.', icon: 'banhChuoi', check: (s) => s.lifetime.sold.banhChuoi >= 100 },
  { id: 'perfect', title: 'Perfect bake', text: 'Bake a tray with 95+ quality.', icon: 'star', check: (s) => (s.questProgress.bestBake ?? 0) >= 95 },
  { id: 'expansion', title: 'Big expansion', text: 'Open the upstairs loft.', icon: 'house', check: (s) => s.upgrades.includes('loft') },
  { id: 'owner', title: 'Business owner', text: 'Reach level 5: Vielie Bakery.', icon: 'crown', check: (s) => levelOf(s.xp) >= 5 },
  { id: 'investor', title: 'Investor', text: 'Own co-op shares.', icon: 'chart', check: (s) => Object.values(s.shares).some((n) => n > 0) },
  { id: 'debtFree', title: 'Debt free', text: 'Pay off a loan.', icon: 'coin', check: (s) => (s.questProgress.loanRepaid ?? 0) > 0 },
  { id: 'rush', title: 'Lunch legend', text: 'Serve 40 customers in a day.', icon: 'star', check: (s) => s.history.some((h) => h.served >= 40) },
];

export const WEEKLY_GOALS: Record<string, { title: string; text: (t: number) => string; measure: (s: GameState, start: number) => number; reverse?: boolean; target: (s: GameState) => number }> = {
  serve: {
    title: 'Busy week',
    text: (t) => `Serve ${t} customers this week.`,
    measure: (s, start) => s.history.filter((h) => h.day >= start).reduce((a, h) => a + h.served, 0),
    target: (s) => Math.max(80, Math.round((s.history.slice(-7).reduce((a, h) => a + h.served, 0) * 1.12) / 5) * 5),
  },
  profit: {
    title: 'Money week',
    text: (t) => `Make $${t} profit this week.`,
    measure: (s, start) => s.history.filter((h) => h.day >= start).reduce((a, h) => a + h.profit, 0),
    target: (s) => Math.max(120, Math.round((s.history.slice(-7).reduce((a, h) => a + h.profit, 0) * 1.15) / 10) * 10),
  },
  waste: {
    title: 'Lean week',
    text: (t) => `Keep waste under ${t}% all week.`,
    measure: (s, start) => {
      const days = s.history.filter((h) => h.day >= start);
      return days.length ? Math.round((100 * days.reduce((a, h) => a + h.wasteRate, 0)) / days.length) : 0;
    },
    reverse: true,
    target: () => 8,
  },
  eco: {
    title: 'Green week',
    text: (t) => `Finish the week with an eco score of ${t}.`,
    measure: (s) => ecoScore(s),
    target: (s) => Math.min(95, Math.max(55, ecoScore(s) + 10)),
  },
  rep: {
    title: 'Word of mouth',
    text: (t) => `Reach a reputation of ${t}.`,
    measure: (s) => Math.round(s.reputation),
    target: (s) => Math.min(95, Math.round(s.reputation) + 8),
  },
};

export function goalMet(s: GameState): boolean {
  const g = s.weeklyGoal;
  if (!g) return false;
  const def = WEEKLY_GOALS[g.id];
  const v = def.measure(s, g.startDay);
  return def.reverse ? v <= g.target : v >= g.target;
}

/** Grant quest rewards and achievements, and announce level-ups and unlocks. */
export function checkProgress(s: GameState): GameState {
  let next = s;
  for (const q of QUESTS) {
    if (next.quests.includes(q.id)) continue;
    if (q.progress(next) < q.target) continue;
    next = { ...next, quests: [...next.quests, q.id], cash: next.cash + (q.reward.cash ?? 0), xp: next.xp + (q.reward.xp ?? 0) };
    if (q.reward.decor && !next.decor.includes(q.reward.decor)) next = { ...next, decor: [...next.decor, q.reward.decor] };
    next = toast(next, 'quest', `Quest complete: ${q.title}`, `Reward: ${q.rewardText}`);
  }
  for (const a of ACHIEVEMENTS) {
    if (next.achievements.includes(a.id) || !a.check(next)) continue;
    next = toast({ ...next, achievements: [...next.achievements, a.id] }, 'achievement', `Achievement: ${a.title}`, a.text);
  }
  next = applyLevelUnlocks(next);
  return next;
}

export function applyLevelUnlocks(s: GameState): GameState {
  const level = levelOf(s.xp);
  let next = s;
  const newly: ProductId[] = PRODUCT_ORDER.filter((p) => p !== 'mutDua' && PRODUCTS[p].level <= level && !next.unlocked.includes(p));
  if (newly.length) {
    next = { ...next, unlocked: [...next.unlocked, ...newly] };
    for (const p of newly) next = toast(next, 'unlock', 'NEW RECIPE!!', `${PRODUCTS[p].name}: ${PRODUCTS[p].en}`);
  }
  const prevLevel = next.questProgress.level ?? 1;
  if (level > prevLevel) {
    next = { ...next, questProgress: { ...next.questProgress, level } };
    const shop = [
      ...Object.values(UPGRADES)
        .filter((u) => u.level === level)
        .map((u) => u.name),
      ...Object.values(DECOR)
        .filter((d) => d.level === level)
        .map((d) => d.name),
    ];
    next = toast(next, 'level', `LEVEL ${level}: ${LEVELS[level - 1].name}`, shop.length ? `New in the shop: ${shop.slice(0, 4).join(', ')}` : LEVELS[level - 1].en);
  }
  return next;
}
