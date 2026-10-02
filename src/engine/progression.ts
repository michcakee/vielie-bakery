import { DECOR, LEVELS, PRODUCTS, PRODUCT_ORDER, UPGRADES } from '../data/catalog';
import { move } from './accounting';
import { GOALS } from '../data/world';
import { ecoScore, levelOf } from './economy';
import { valuation } from './finance';
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
  { id: 'firstBanhMi', title: 'First bánh mì', text: 'Sell your first bánh mì.', target: 1, progress: (s) => s.lifetime.sold.banhMi, reward: { cash: 60, xp: 20 }, rewardText: '$60' },
  { id: 'stockUp', title: 'Stock up', text: 'Buy 5 packs of ingredients at the market.', target: 5, progress: (s) => s.questProgress.packs ?? 0, reward: { cash: 40, xp: 15 }, rewardText: '$40' },
  { id: 'baker', title: 'Oven on!', text: 'Bake 3 trays in one morning.', target: 3, progress: (s) => Math.max(s.traysToday, s.questProgress.bestTrays ?? 0), reward: { cash: 50, xp: 20 }, rewardText: '$50' },
  { id: 'firstProfit', title: 'In the black', text: 'Finish a day with a profit.', target: 1, progress: (s) => (s.history.some((h) => h.profit > 0) ? 1 : 0), reward: { xp: 30, decor: 'plant' }, rewardText: 'A potted monstera' },
  { id: 'priceExplorer', title: 'Price explorer', text: 'Change a price, then open the doors.', target: 1, progress: (s) => s.questProgress.priceChanged ?? 0, reward: { xp: 30, cash: 40 }, rewardText: '$40' },
  { id: 'morningRush', title: 'Morning rush', text: 'Serve 12 customers before noon in one day.', target: 12, progress: (s) => Math.max(s.today.servedBeforeNoon, s.questProgress.bestMorning ?? 0), reward: { xp: 40, decor: 'stringLights' }, rewardText: 'String lights' },
  { id: 'smartShopper', title: 'Smart shopper', text: 'Save $60 by shopping below normal prices.', target: 60, progress: (s) => Math.floor(s.questProgress.saved ?? 0), reward: { cash: 80, xp: 30 }, rewardText: '$80' },
  { id: 'firstHire', title: 'Not alone anymore', text: 'Hire your first employee.', target: 1, progress: (s) => Math.min(1, s.staff.length + (s.questProgress.hired ?? 0)), reward: { xp: 40 }, rewardText: 'Bonus XP' },
  { id: 'zeroWaste', title: 'Zero waste day', text: 'Serve 10+ customers and close without binning food (donate a little at most).', target: 1, progress: (s) => s.lifetime.zeroWasteDays, reward: { cash: 80, xp: 40 }, rewardText: '$80' },
  { id: 'safetyFund', title: 'Rainy-day money', text: 'Put $500 in the bakery safety fund.', target: 500, progress: (s) => Math.floor(Math.max(s.safetyFund, s.questProgress.bestFund ?? 0)), reward: { xp: 40, decor: 'radio' }, rewardText: 'An old radio' },
  { id: 'decorator', title: 'Make it yours', text: 'Own 3 decorations.', target: 3, progress: (s) => s.decor.length, reward: { cash: 80, xp: 30 }, rewardText: '$80' },
  { id: 'bigDay', title: 'Big day', text: 'Make $250 profit in a single day.', target: 250, progress: (s) => Math.floor(best(s, (h) => h.profit)), reward: { cash: 150, xp: 60 }, rewardText: '$150' },
  { id: 'greenBakery', title: 'Green bakery', text: 'Reach an eco score of 75.', target: 75, progress: (s) => ecoScore(s), reward: { xp: 60, decor: 'flowers' }, rewardText: 'Fresh flowers' },
  { id: 'community', title: 'Community favourite', text: 'Welcome back loyal customers 100 times.', target: 100, progress: (s) => s.lifetime.returning, reward: { cash: 200, xp: 80 }, rewardText: '$200' },
  { id: 'coffeeTime', title: 'Coffee time', text: 'Sell 200 cà phê sữa đá.', target: 200, progress: (s) => s.lifetime.sold.caPhe, reward: { cash: 120, xp: 60 }, rewardText: '$120' },
  { id: 'expand', title: 'Room to grow', text: 'Open the coffee corner.', target: 1, progress: (s) => (s.upgrades.includes('corner') ? 1 : 0), reward: { xp: 100, decor: 'rug' }, rewardText: 'A woven rug' },
  { id: 'secondShop', title: 'Second shop', text: 'Open a second location.', target: 1, progress: (s) => s.branches.length, reward: { xp: 200 }, rewardText: 'Big XP' },
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

const streak = (s: GameState, f: (h: GameState['history'][number]) => boolean, n: number) => s.history.length >= n && s.history.slice(-n).every(f);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'firstSale', title: 'First sale', text: 'Sell anything at all.', icon: 'coin', check: (s) => s.lifetime.served > 0 },
  { id: 'firstProfit', title: 'First profit', text: 'Finish a profitable day.', icon: 'chart', check: (s) => s.history.some((h) => h.profit > 0) },
  { id: 'breakEven', title: 'Break-even', text: 'A whole month where sales covered every cost.', icon: 'chart', check: (s) => s.months.some((m) => m.profit >= 0 && m.endDay - m.startDay >= 25) },
  { id: 'hundred', title: '100 customers', text: 'Serve 100 customers.', icon: 'people', check: (s) => s.lifetime.served >= 100 },
  { id: 'banhMi100', title: '1,000 bánh mì', text: 'Sell 1,000 bánh mì.', icon: 'banhMi', check: (s) => s.lifetime.sold.banhMi >= 1000 },
  { id: 'coffeeMaster', title: 'Coffee master', text: 'Sell 1,000 cà phê sữa đá.', icon: 'caPhe', check: (s) => s.lifetime.sold.caPhe >= 1000 },
  { id: 'zeroWasteWeek', title: 'Zero waste week', text: 'Seven days in a row without binning food.', icon: 'leaf', check: (s) => streak(s, (h) => h.wasteRate === 0 && h.served > 5, 7) },
  { id: 'inventoryMaster', title: 'Inventory master', text: 'A month with less than 3% of food wasted or spoiled and nothing sold out before noon.', icon: 'box', check: (s) => streak(s, (h) => h.wasteRate < 0.03 && h.books.spoilage < 2 && h.lostSoldOut < 3, 30) },
  { id: 'green', title: 'Green bakery', text: 'Eco score 90.', icon: 'leaf', check: (s) => ecoScore(s) >= 90 },
  { id: 'neighborhood', title: 'Community favourite', text: 'Community 80.', icon: 'heart', check: (s) => s.community >= 80 },
  { id: 'tet', title: 'Tết favourite', text: 'Sell 60 mứt dừa gift boxes.', icon: 'mutDua', check: (s) => s.lifetime.tetSold >= 60 },
  { id: 'perfect', title: 'Perfect bake', text: 'Bake a tray with 95+ quality.', icon: 'star', check: (s) => (s.questProgress.bestBake ?? 0) >= 95 },
  { id: 'debtFree', title: 'Debt free', text: 'Pay off a bank loan.', icon: 'coin', check: (s) => (s.questProgress.loanRepaid ?? 0) > 0 },
  { id: 'recession', title: 'Survived a recession', text: 'Stay open through six months of recession.', icon: 'house', check: (s) => (s.questProgress.recessionMonths ?? 0) >= 6 },
  { id: 'leader', title: 'Market leader', text: 'Win more than half the shoppers in your neighbourhood for 30 days.', icon: 'crown', check: (s) => streak(s, (h) => h.share > 0.5, 30) },
  { id: 'secondLocation', title: 'Second location', text: 'Open another shop.', icon: 'house', check: (s) => s.branches.length > 0 },
  { id: 'million', title: 'Million-dollar bakery', text: '$1,000,000 in lifetime sales.', icon: 'coin', check: (s) => s.lifetime.revenue >= 1_000_000 },
  { id: 'fiveYears', title: 'Five-year survivor', text: 'Keep the bakery open for five years.', icon: 'crown', check: (s) => s.day >= 1800 },
  { id: 'owner', title: 'Business owner', text: 'Reach level 5: Vielie Bakery.', icon: 'crown', check: (s) => levelOf(s.xp) >= 5 },
  { id: 'investor', title: 'Investor', text: 'Own co-op shares.', icon: 'chart', check: (s) => Object.values(s.shares).some((n) => n > 0) },
];

export const WEEKLY_GOALS: Record<string, { title: string; text: (t: number) => string; measure: (s: GameState, start: number) => number; reverse?: boolean; target: (s: GameState) => number }> = {
  serve: {
    title: 'Busy week',
    text: (t) => `Serve ${t} customers this week.`,
    measure: (s, start) => s.history.filter((h) => h.day >= start).reduce((a, h) => a + h.served, 0),
    target: (s) => Math.max(120, Math.round((s.history.slice(-7).reduce((a, h) => a + h.served, 0) * 1.12) / 5) * 5),
  },
  profit: {
    title: 'Money week',
    text: (t) => `Make $${t} profit this week.`,
    measure: (s, start) => s.history.filter((h) => h.day >= start).reduce((a, h) => a + h.profit, 0),
    target: (s) => Math.max(400, Math.round((s.history.slice(-7).reduce((a, h) => a + h.profit, 0) * 1.15) / 50) * 50),
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

/** Grant quest rewards (a bonus counts as other income) and achievements, and announce unlocks. */
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const YEAR = 360;

/** Progress toward the scenario's long-term goal: 0–1 plus a short status line. */
export function goalProgress(s: GameState): { pct: number; text: string } {
  const shops = 1 + s.branches.filter((b) => !b.closed).length;
  const debt = s.loans.reduce((t, l) => t + l.balance, 0) + s.creditLine.balance;
  switch (s.goal) {
    case 'legacy': {
      const lv = levelOf(s.xp);
      return { pct: Math.min(clamp01((lv - 1) / 4), clamp01(s.community / 75)), text: `Level ${lv}/5 · community ${Math.round(s.community)}/75` };
    }
    case 'value': {
      const v = valuation(s).ownerValue;
      return { pct: clamp01(v / 1_000_000), text: `Worth about $${Math.round(v).toLocaleString('en-US')} of $1,000,000` };
    }
    case 'survive':
      return { pct: clamp01(s.day / (2 * YEAR)), text: `Day ${s.day} of ${2 * YEAR}` };
    case 'chain':
      return { pct: s.day > 2 * YEAR && shops < 3 ? 0 : clamp01(shops / 3), text: `${shops}/3 shops${s.day > 2 * YEAR ? ' (time’s up for the 2-year target)' : `, ${2 * YEAR - s.day + 1} days left`}` };
    case 'community': {
      const eco = ecoScore(s);
      return { pct: Math.min(clamp01(s.community / 90), clamp01(eco / 80), clamp01(s.lifetime.served / 10000)), text: `Community ${Math.round(s.community)}/90 · eco ${Math.round(eco)}/80 · ${s.lifetime.served.toLocaleString('en-US')}/10,000 served` };
    }
    case 'leader': {
      const last = s.history.slice(-30);
      const share = last.reduce((t, h) => t + (h.share ?? 0), 0) / Math.max(1, last.length);
      return { pct: last.length < 30 ? Math.min(0.99, clamp01(share / 0.4)) : clamp01(share / 0.4), text: `${Math.round(share * 100)}% average share over the last ${last.length} days (goal 40% for 30)` };
    }
    case 'debtFree': {
      // Count back through whole years (12 months each) until one wasn't profitable.
      let years = 0;
      for (let end = s.months.length; end >= 12; end -= 12) {
        if (s.months.slice(end - 12, end).reduce((t, m) => t + m.profit, 0) > 0) years++;
        else break;
      }
      return { pct: debt > 0 ? Math.min(0.99, years / 3) : clamp01(years / 3), text: `${years}/3 profitable years in a row${debt > 0 ? ` · $${Math.round(debt).toLocaleString('en-US')} still owed` : ' · no debt'}` };
    }
    case 'twentyYears':
      return { pct: clamp01(s.day / (20 * YEAR)), text: `Year ${Math.floor((s.day - 1) / YEAR) + 1} of 20` };
    default:
      return { pct: 0, text: '' };
  }
}

export function checkProgress(s: GameState): GameState {
  let next = s;
  if (next.phase !== 'service' && next.goalReached === undefined && GOALS[next.goal] && goalProgress(next).pct >= 1) {
    next = toast({ ...next, goalReached: next.day }, 'achievement', `Goal reached: ${GOALS[next.goal].name}!`, 'Keep playing in sandbox mode, or sell the bakery from the Growth tab.');
  }
  for (const q of QUESTS) {
    if (next.quests.includes(q.id)) continue;
    if (q.progress(next) < q.target) continue;
    next = { ...next, quests: [...next.quests, q.id], xp: next.xp + (q.reward.xp ?? 0) };
    if (q.reward.cash) next = move(next, 'cashOperatingOther', q.reward.cash, { otherIncome: q.reward.cash });
    if (q.reward.decor && !next.decor.includes(q.reward.decor)) next = { ...next, decor: [...next.decor, q.reward.decor] };
    next = toast(next, 'quest', `Quest complete: ${q.title}`, `Reward: ${q.rewardText}`);
  }
  for (const a of ACHIEVEMENTS) {
    if (next.achievements.includes(a.id) || !a.check(next)) continue;
    next = toast({ ...next, achievements: [...next.achievements, a.id] }, 'achievement', `Achievement: ${a.title}`, a.text);
  }
  return applyLevelUnlocks(next);
}

export function applyLevelUnlocks(s: GameState): GameState {
  const level = levelOf(s.xp);
  let next = s;
  const newly: ProductId[] = PRODUCT_ORDER.filter((p) => p !== 'mutDua' && PRODUCTS[p].level <= level && !next.unlocked.includes(p));
  if (newly.length) {
    next = { ...next, unlocked: [...next.unlocked, ...newly], menu: [...next.menu, ...newly.filter((p) => !PRODUCTS[p].season && !PRODUCTS[p].equipment)] };
    for (const p of newly) next = toast(next, 'unlock', 'NEW RECIPE!!', `${PRODUCTS[p].name}: ${PRODUCTS[p].en}${PRODUCTS[p].equipment ? ` (needs a ${UPGRADES[PRODUCTS[p].equipment!].name.toLowerCase()})` : ''}`);
  }
  const prevLevel = next.questProgress.level ?? 1;
  if (level > prevLevel) {
    next = { ...next, questProgress: { ...next.questProgress, level } };
    const shop = [...Object.values(UPGRADES).filter((u) => u.level === level).map((u) => u.name), ...Object.values(DECOR).filter((d) => d.level === level).map((d) => d.name)];
    next = toast(next, 'level', `LEVEL ${level}: ${LEVELS[level - 1].name}`, shop.length ? `New in the shop: ${shop.slice(0, 4).join(', ')}` : LEVELS[level - 1].en);
  }
  return next;
}
