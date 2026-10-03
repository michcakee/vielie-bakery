import { activeRivals, levelOf, rent } from '../engine/economy';
import { dateOf } from '../engine/calendar';
import type { GameState, ScenarioId } from '../engine/types';

/**
 * Feature unlocks: every system beyond the core loop starts hidden and arrives one at a time,
 * when it becomes useful (trigger) or on its fallback day, whichever comes first.
 * Engine actions for a locked feature are rejected in the reducer, so delegated days stay honest.
 */
export type FeatureId =
  | 'market.wet'
  | 'kitchen.prices'
  | 'today.special'
  | 'customers.regulars'
  | 'market.suppliers'
  | 'analytics.why'
  | 'staff.hire'
  | 'today.teamDay'
  | 'finances.income'
  | 'kitchen.menu'
  | 'eco.all'
  | 'growth.decor'
  | 'customers.rivals'
  | 'finances.cash'
  | 'growth.equipment'
  | 'kitchen.plan'
  | 'analytics.full'
  | 'market.contracts'
  | 'staff.manage'
  | 'kitchen.deals'
  | 'finances.loans'
  | 'customers.marketing'
  | 'analytics.economy'
  | 'finances.capital'
  | 'analytics.testKitchen'
  | 'growth.branches';

export type TabId = 'today' | 'kitchen' | 'market' | 'staff' | 'customers' | 'growth' | 'money' | 'analytics' | 'eco';

export interface IntroStep {
  /** What the player does, in one short line. */
  text: string;
  /** Tab to open and `data-spot` anchor to spotlight for "Show me". */
  tab?: TabId;
  spot?: string;
  /** Done by opening `tab` while this step is active (the UI records `visit:<feature>`). */
  visit?: boolean;
  /** Measured against a snapshot taken when the intro quest starts. */
  done: (s: GameState, base: Record<string, number>) => boolean;
}

export interface FeatureDef {
  id: FeatureId;
  name: string;
  chapter: number;
  tab: TabId;
  /** Unlocks on this day at the latest (one unlock per day, never on a recipe day). */
  fallbackDay: number;
  /** Unlocks early when this becomes true (checked each morning). */
  trigger?: (s: GameState) => boolean;
  /** Unlock the morning the trigger fires, ahead of anything merely on schedule. */
  urgent?: boolean;
  /** Hard condition: never unlocks before this is true (level gates and so on). */
  gate?: (s: GameState) => boolean;
  requires?: FeatureId[];
  teaser: string;
  intro: {
    who: string;
    vi: string;
    en: string;
    /** Numbers to remember when the quest starts, so steps measure new progress only. */
    snapshot?: (s: GameState) => Record<string, number>;
    steps: IntroStep[];
    after: string;
    xp: number;
  };
}

const last = (s: GameState) => s.history[s.history.length - 1];
const sum = (r: Record<string, number> | undefined) => Object.values(r ?? {}).reduce((a, b) => a + b, 0);
const seen = (s: GameState, id: string) => s.hints.includes(id);
const evSeen = (s: GameState, id: string) => (s.eventsSeen ?? []).includes(id);
const qp = (s: GameState, k: string) => s.questProgress[k] ?? 0;

export const FEATURES: FeatureDef[] = [
  // ------------------------------------------------ Chapter 1: the core loop and Bà's pantry
  {
    id: 'market.wet',
    name: 'Market: the wet market',
    chapter: 1,
    tab: 'market',
    fallbackDay: 2,
    teaser: 'Unlocks soon: the market',
    intro: {
      who: 'Bà',
      vi: 'Con ơi, kho sắp hết rồi. Ra chợ mua bột mì nhé.',
      en: 'My dear, the pantry is running low. Go to the market for flour.',
      snapshot: (s) => ({ packs: qp(s, 'packs') }),
      steps: [{ text: 'Buy 2 packs of anything at the wet market.', tab: 'market', spot: 'stock-up', done: (s, b) => qp(s, 'packs') - b.packs >= 2 }],
      after: 'Money spent on flour can’t be spent on anything else. That’s opportunity cost.',
      xp: 20,
    },
  },
  {
    id: 'kitchen.prices',
    name: 'Kitchen: prices',
    chapter: 1,
    tab: 'kitchen',
    fallbackDay: 3,
    requires: ['market.wet'],
    teaser: 'Unlocks soon: setting your own prices',
    intro: {
      who: 'Bà',
      vi: 'Giá bánh là của con. Thử đổi một giá xem sao.',
      en: 'The prices are yours now. Try changing one and see.',
      snapshot: (s) => ({ changed: qp(s, 'priceEdits'), predictions: s.predictions?.length ?? 0, days: s.history.length }),
      steps: [
        { text: 'Change one price with the + or − button.', tab: 'kitchen', spot: 'price', done: (s, b) => qp(s, 'priceEdits') > b.changed },
        { text: 'Make a guess on the prediction card.', tab: 'kitchen', spot: 'predict', done: (s, b) => !!s.pendingPrediction?.guess || (s.predictions?.length ?? 0) > b.predictions },
        { text: 'Run the day and read the result in the report.', tab: 'today', spot: 'open', done: (s, b) => s.history.length > b.days && (s.predictions?.length ?? 0) > b.predictions },
      ],
      after: 'Higher price, fewer buyers; lower price, more buyers. That’s demand.',
      xp: 25,
    },
  },
  {
    id: 'today.special',
    name: 'Today’s special',
    chapter: 1,
    tab: 'today',
    fallbackDay: 5,
    requires: ['kitchen.prices'],
    teaser: 'Unlocks soon: a daily special',
    intro: {
      who: 'Bà',
      vi: 'Hôm nay có món đặc biệt. Khách sẵn lòng trả thêm.',
      en: 'There’s a special today. People will happily pay more for it.',
      snapshot: (s) => ({ sold: s.special ? s.lifetime.sold[s.special] ?? 0 : 0 }),
      steps: [{ text: 'Sell 5 of today’s special.', tab: 'today', spot: 'special', done: (s, b) => !!s.special && (s.lifetime.sold[s.special] ?? 0) - b.sold >= 5 }],
      after: 'The special sells for more because people value it more today: willingness to pay.',
      xp: 20,
    },
  },
  // ------------------------------------------------ Chapter 2: regulars, suppliers, the first helper
  {
    id: 'customers.regulars',
    name: 'Customers: who comes in',
    chapter: 2,
    tab: 'customers',
    fallbackDay: 7,
    trigger: (s) => sum(s.hearts) > 0,
    requires: ['today.special'],
    teaser: 'Unlocks soon: getting to know your customers',
    intro: {
      who: 'Mai',
      vi: 'Chị nhớ món em thích không?',
      en: 'Do you remember my favourite?',
      snapshot: (s) => ({ visits: sum(s.visitsByRegular) }),
      steps: [
        { text: 'Open the Customers tab.', tab: 'customers', spot: 'tab-customers', visit: true, done: (s) => seen(s, 'visit:customers.regulars') },
        { text: 'Serve a regular by name at the counter.', tab: 'today', spot: 'open', done: (s, b) => sum(s.visitsByRegular) > b.visits },
      ],
      after: 'Happy regulars come back without being asked. Repeat customers are worth more than one sale.',
      xp: 25,
    },
  },
  {
    id: 'market.suppliers',
    name: 'Market: more suppliers',
    chapter: 2,
    tab: 'market',
    fallbackDay: 8,
    trigger: (s) => (last(s)?.lostSoldOut ?? 0) >= 3,
    requires: ['market.wet'],
    teaser: 'Unlocks soon: more suppliers and bulk packs',
    intro: {
      who: 'Chú Tư (farm co-op)',
      vi: 'Rau trái từ Đà Lạt, sáng mai giao tới.',
      en: 'Fresh from Đà Lạt, delivered tomorrow morning.',
      snapshot: (s) => ({ farm: s.supplierLoyalty.farm ?? 0 }),
      steps: [{ text: 'Order anything from the Đà Lạt farm co-op.', tab: 'market', spot: 'supplier-farm', done: (s, b) => (s.supplierLoyalty.farm ?? 0) > b.farm }],
      after: 'Better quality costs more and takes a day to arrive. That wait is a lead time.',
      xp: 25,
    },
  },
  {
    id: 'analytics.why',
    name: 'Analytics: why did this happen?',
    chapter: 2,
    tab: 'analytics',
    fallbackDay: 10,
    gate: (s) => s.history.length >= 5,
    requires: ['kitchen.prices'],
    teaser: 'Unlocks soon: why your days go the way they do',
    intro: {
      who: 'Cô Ngọc (food critic)',
      vi: 'Mỗi ngày đều có lý do.',
      en: 'Every day has a reason behind it.',
      steps: [
        { text: 'Open Analytics and tap one explanation.', tab: 'analytics', spot: 'why', done: (s) => seen(s, 'visit:analytics.why') },
      ],
      after: 'Looking for causes, not just results, is how you get better on purpose.',
      xp: 20,
    },
  },
  {
    id: 'staff.hire',
    name: 'Staff: your first hire',
    chapter: 2,
    tab: 'staff',
    fallbackDay: 12,
    trigger: (s) => (last(s)?.lostSlow ?? 0) >= 3,
    requires: ['market.wet'],
    teaser: 'Unlocks soon: hiring help',
    intro: {
      who: 'Bà',
      vi: 'Một mình con làm không xuể đâu.',
      en: 'You can’t do it all alone.',
      steps: [{ text: 'Hire one applicant.', tab: 'staff', spot: 'hire', done: (s) => s.staff.length > 0 || qp(s, 'hired') > 0 }],
      after: 'One more pair of hands serves more people. How many more is the marginal product.',
      xp: 25,
    },
  },
  {
    id: 'today.teamDay',
    name: 'Let the team run today',
    chapter: 2,
    tab: 'today',
    fallbackDay: 999,
    urgent: true,
    trigger: (s) => s.staff.length > 0,
    requires: ['staff.hire'],
    teaser: 'Unlocks after your first hire: letting the team run a day',
    intro: {
      who: 'Bà',
      vi: 'Tin người ta một ngày xem.',
      en: 'Trust them with a day and see.',
      snapshot: (s) => ({ days: s.history.length, handed: qp(s, 'teamDays') }),
      steps: [{ text: 'Let the team run a day (or hand over the counter).', tab: 'today', spot: 'team-day', done: (s, b) => qp(s, 'teamDays') > b.handed }],
      after: 'Delegating saves your time. Your own service still grades higher: that’s the trade-off.',
      xp: 20,
    },
  },
  // ------------------------------------------------ Chapter 3: reading the money
  {
    id: 'finances.income',
    name: 'Finances: did we make money?',
    chapter: 3,
    tab: 'money',
    fallbackDay: 14,
    requires: ['kitchen.prices'],
    teaser: 'Unlocks soon: your money pages',
    intro: {
      who: 'Bà',
      vi: 'Bán được nhiều chưa chắc là lời nhiều.',
      en: 'Selling a lot doesn’t always mean earning a lot.',
      steps: [{ text: 'Open Finances and find yesterday’s profit.', tab: 'money', spot: 'profit', visit: true, done: (s) => seen(s, 'visit:finances.income') }],
      after: 'Profit is what’s left after costs: sales minus costs. Business view is now in Settings if you want every number.',
      xp: 20,
    },
  },
  {
    id: 'kitchen.menu',
    name: 'Kitchen: menu and recipe book',
    chapter: 3,
    tab: 'kitchen',
    fallbackDay: 15,
    trigger: (s) => s.unlocked.length >= 6,
    requires: ['kitchen.prices'],
    teaser: 'Unlocks soon: choosing what’s on the menu',
    intro: {
      who: 'Bà',
      vi: 'Không cần bán hết mọi món mỗi ngày.',
      en: 'You don’t have to sell everything every day.',
      snapshot: (s) => ({ toggles: qp(s, 'menuToggles') }),
      steps: [{ text: 'Take one item off the menu, or put one back on.', tab: 'kitchen', spot: 'menu', done: (s, b) => qp(s, 'menuToggles') > b.toggles }],
      after: 'Fewer items can mean less waste. Choosing your product mix is a real business decision.',
      xp: 20,
    },
  },
  {
    id: 'eco.all',
    name: 'Eco',
    chapter: 3,
    tab: 'eco',
    fallbackDay: 16,
    trigger: (s) => evSeen(s, 'greenWeek'),
    requires: ['market.wet'],
    teaser: 'Unlocks soon: your eco score',
    intro: {
      who: 'Mai',
      vi: 'Túi ni-lông nhiều quá chị ơi.',
      en: 'So many plastic bags!',
      snapshot: (s) => ({ pack: qp(s, 'packagingChanges') }),
      steps: [{ text: 'Pick a packaging in the Eco tab.', tab: 'eco', spot: 'packaging', done: (s, b) => qp(s, 'packagingChanges') > b.pack }],
      after: 'Plastic is cheap for you but costs the street. A cost someone else pays is an externality.',
      xp: 20,
    },
  },
  {
    id: 'growth.decor',
    name: 'Growth: decorate',
    chapter: 3,
    tab: 'growth',
    fallbackDay: 18,
    requires: ['finances.income'],
    teaser: 'Unlocks soon: decorating the shop',
    intro: {
      who: 'Bà',
      vi: 'Tiệm đẹp thì khách vui.',
      en: 'A pretty shop makes happy customers.',
      steps: [{ text: 'Open Growth and look at the decorations.', tab: 'growth', spot: 'decor', visit: true, done: (s) => seen(s, 'visit:growth.decor') }],
      after: 'Decorations cost once and help every day after. That’s an investment.',
      xp: 15,
    },
  },
  {
    id: 'customers.rivals',
    name: 'Customers: rivals',
    chapter: 3,
    tab: 'customers',
    fallbackDay: 17,
    trigger: (s) => evSeen(s, 'competitor') || (s.day >= 15 && activeRivals(s).some((c) => c.openedDay > 1)),
    requires: ['customers.regulars'],
    teaser: 'Unlocks soon: the bakeries down the street',
    intro: {
      who: 'Mai',
      vi: 'Tiệm mới mở bán rẻ hơn đó chị.',
      en: 'The new place is cheaper, you know.',
      snapshot: (s) => ({ changed: qp(s, 'priceEdits'), days: s.history.length }),
      steps: [
        { text: 'Check your rivals in the Customers tab.', tab: 'customers', spot: 'rivals', visit: true, done: (s) => seen(s, 'visit:customers.rivals') },
        { text: 'Match a price, or keep yours and run a day.', tab: 'kitchen', spot: 'price', done: (s, b) => qp(s, 'priceEdits') > b.changed || s.history.length > b.days },
      ],
      after: 'When someone else sells the same thing, you compete on price or on being different.',
      xp: 25,
    },
  },
  {
    id: 'finances.cash',
    name: 'Finances: cash and the safety fund',
    chapter: 3,
    tab: 'money',
    fallbackDay: 19,
    trigger: (s) => s.day >= 8 && 30 - dateOf(s.day).dom + 1 <= 5,
    requires: ['finances.income'],
    teaser: 'Unlocks soon: a safety fund for rent day',
    intro: {
      who: 'Bà',
      vi: 'Mùng một phải trả tiền nhà đó con.',
      en: 'Rent is due on the first, my dear.',
      snapshot: (s) => ({ fund: s.safetyFund }),
      steps: [{ text: 'Move some cash into the safety fund.', tab: 'money', spot: 'fund', done: (s, b) => s.safetyFund > b.fund }],
      after: 'Profit on paper isn’t cash in the drawer. Cash is what pays the rent.',
      xp: 25,
    },
  },
  {
    id: 'growth.equipment',
    name: 'Growth: equipment',
    chapter: 3,
    tab: 'growth',
    fallbackDay: 20,
    trigger: (s) => s.day >= 6 && qp(s, 'capHits') >= 3,
    requires: ['finances.income'],
    teaser: 'Unlocks soon: a bigger kitchen',
    intro: {
      who: 'Bà',
      vi: 'Lò này cũ rồi, nhỏ nữa.',
      en: 'This oven is old, and small.',
      snapshot: (s) => ({ eq: s.equipment.length }),
      steps: [{ text: 'Buy one piece of equipment.', tab: 'growth', spot: 'equipment', done: (s, b) => s.equipment.length > b.eq }],
      after: 'An oven costs a lot once and wears out slowly. That slow wearing is depreciation.',
      xp: 25,
    },
  },
  {
    id: 'kitchen.plan',
    name: 'Kitchen: the production plan',
    chapter: 3,
    tab: 'kitchen',
    fallbackDay: 21,
    requires: ['today.teamDay'],
    teaser: 'Unlocks soon: a baking plan for your team',
    intro: {
      who: 'Bà',
      vi: 'Dặn trước, người ta làm đúng.',
      en: 'Tell them ahead, and they’ll get it right.',
      snapshot: (s) => ({ plans: qp(s, 'planEdits') }),
      steps: [{ text: 'Set how many trays the team should bake.', tab: 'kitchen', spot: 'plan', done: (s, b) => qp(s, 'planEdits') > b.plans }],
      after: 'Planning ahead is forecasting: guessing tomorrow from what you know today.',
      xp: 20,
    },
  },
  {
    id: 'analytics.full',
    name: 'Analytics: trends and experiments',
    chapter: 4,
    tab: 'analytics',
    fallbackDay: 22,
    requires: ['analytics.why'],
    teaser: 'Unlocks soon: trends and price experiments',
    intro: {
      who: 'Cô Ngọc (food critic)',
      vi: 'Nhìn cả tuần, đừng nhìn một ngày.',
      en: 'Look at the whole week, not just one day.',
      steps: [{ text: 'Open Analytics and find your best-earning product.', tab: 'analytics', spot: 'products', visit: true, done: (s) => seen(s, 'visit:analytics.full') }],
      after: 'Trends hide in many days of numbers. One day can fool you.',
      xp: 15,
    },
  },
  // ------------------------------------------------ Chapter 4: supply and money
  {
    id: 'market.contracts',
    name: 'Market: contracts, locks and reorders',
    chapter: 4,
    tab: 'market',
    fallbackDay: 23,
    trigger: (s) => evSeen(s, 'eggShortage') && s.day >= 12,
    requires: ['market.suppliers'],
    teaser: 'Unlocks soon: protecting yourself from price spikes',
    intro: {
      who: 'Chú Tư (farm co-op)',
      vi: 'Giá trứng lên xuống thất thường lắm.',
      en: 'Egg prices jump up and down all the time.',
      snapshot: (s) => ({ locks: qp(s, 'locksMade'), rules: Object.keys(s.reorder).length, contracts: s.contracts.length }),
      steps: [{ text: 'Lock a price, set a reorder rule, or sign a contract.', tab: 'market', spot: 'contracts', done: (s, b) => qp(s, 'locksMade') > b.locks || Object.keys(s.reorder).length > b.rules || s.contracts.length > b.contracts }],
      after: 'Paying a little to avoid a big surprise is managing risk.',
      xp: 25,
    },
  },
  {
    id: 'staff.manage',
    name: 'Staff: wages and training',
    chapter: 4,
    tab: 'staff',
    fallbackDay: 24,
    trigger: (s) => s.staff.length >= 2,
    requires: ['staff.hire'],
    teaser: 'Unlocks soon: training your team',
    intro: {
      who: 'Bà',
      vi: 'Dạy người ta, người ta giỏi lên.',
      en: 'Teach them, and they get better.',
      snapshot: (s) => ({ trained: qp(s, 'trainings') }),
      steps: [{ text: 'Train someone on your team.', tab: 'staff', spot: 'train', done: (s, b) => qp(s, 'trainings') > b.trained }],
      after: 'Skills make people more productive. Paying for training is investing in human capital.',
      xp: 25,
    },
  },
  {
    id: 'kitchen.deals',
    name: 'Kitchen: combos and sizes',
    chapter: 4,
    tab: 'kitchen',
    fallbackDay: 25,
    requires: ['kitchen.menu'],
    teaser: 'Unlocks soon: combo deals and drink sizes',
    intro: {
      who: 'Mai',
      vi: 'Bánh mì với cà phê, giảm giá được không chị?',
      en: 'A bánh mì with a coffee, any deal?',
      steps: [{ text: 'Turn on the combo deal.', tab: 'kitchen', spot: 'deals', done: (s) => !!s.combo }],
      after: 'Selling two things together for less is bundling. It can sell more of both.',
      xp: 20,
    },
  },
  {
    id: 'finances.loans',
    name: 'Finances: bank loans',
    chapter: 4,
    tab: 'money',
    fallbackDay: 27,
    trigger: (s) => s.day >= 14 && s.cash < rent(s) * 5,
    requires: ['finances.cash'],
    teaser: 'Unlocks soon: borrowing from the bank',
    intro: {
      who: 'Cô Lan (bank officer)',
      vi: 'Vay thì phải trả, cả tiền lời nữa.',
      en: 'A loan must be paid back, with interest too.',
      steps: [{ text: 'Try a loan amount and look at the monthly payment.', tab: 'money', spot: 'loans', done: (s) => seen(s, 'visit:finances.loans') }],
      after: 'Borrowing is worth it only if what you buy earns more than the interest.',
      xp: 20,
    },
  },
  {
    id: 'customers.marketing',
    name: 'Customers: marketing',
    chapter: 4,
    tab: 'customers',
    fallbackDay: 30,
    gate: (s) => levelOf(s.xp) >= 2,
    requires: ['customers.regulars'],
    teaser: 'Unlocks soon: advertising (needs level 2)',
    intro: {
      who: 'Mai',
      vi: 'Phát tờ rơi đi chị, nhiều người chưa biết tiệm.',
      en: 'Hand out flyers! Lots of people don’t know you yet.',
      snapshot: (s) => ({ c: s.campaigns.length }),
      steps: [{ text: 'Run one campaign.', tab: 'customers', spot: 'marketing', done: (s, b) => s.campaigns.length > b.c || qp(s, 'campaigns') > 0 }],
      after: 'Check next week whether it paid back. That’s return on marketing.',
      xp: 25,
    },
  },
  // ------------------------------------------------ Chapter 5: the wider economy and owners
  {
    id: 'analytics.economy',
    name: 'The economy',
    chapter: 5,
    tab: 'analytics',
    fallbackDay: 35,
    trigger: (s) => evSeen(s, 'regimeChange'),
    requires: ['analytics.full'],
    teaser: 'Unlocks soon: booms, slumps and inflation',
    intro: {
      who: 'Cô Lan (bank officer)',
      vi: 'Cả thành phố đang thay đổi.',
      en: 'The whole city is changing.',
      steps: [{ text: 'Read the economy card in Analytics.', tab: 'analytics', spot: 'economy', visit: true, done: (s) => seen(s, 'visit:analytics.economy') }],
      after: 'When everyone earns more or less, every shop feels it. That’s the macroeconomy.',
      xp: 15,
    },
  },
  {
    id: 'finances.capital',
    name: 'Finances: credit, investors and bonds',
    chapter: 5,
    tab: 'money',
    fallbackDay: 45,
    gate: (s) => levelOf(s.xp) >= 3,
    requires: ['finances.loans'],
    teaser: 'Unlocks soon: investors and bonds (needs level 3)',
    intro: {
      who: 'Bà',
      vi: 'Tiền của người khác thì có giá của nó.',
      en: 'Other people’s money always has a price.',
      steps: [{ text: 'Look at the investors card in Finances.', tab: 'money', spot: 'investors', visit: true, done: (s) => seen(s, 'visit:finances.capital') }],
      after: 'Debt must be repaid; investors own a share instead. Leverage cuts both ways.',
      xp: 15,
    },
  },
  {
    id: 'analytics.testKitchen',
    name: 'Test Kitchen',
    chapter: 5,
    tab: 'analytics',
    fallbackDay: 50,
    trigger: (s) => s.learned.includes('elasticityCompare'),
    gate: (s) => levelOf(s.xp) >= 3 || s.learned.includes('elasticityCompare'),
    requires: ['analytics.full'],
    teaser: 'Unlocks soon: the Test Kitchen',
    intro: {
      who: 'Cô Ngọc (food critic)',
      vi: 'Đổi một thứ thôi, rồi so sánh.',
      en: 'Change one thing only, then compare.',
      steps: [{ text: 'Replay a day in the Test Kitchen with one change.', tab: 'analytics', spot: 'test-kitchen', done: (s) => seen(s, 'visit:analytics.testKitchen') }],
      after: 'Changing one thing at a time is a controlled experiment.',
      xp: 20,
    },
  },
  // ------------------------------------------------ Chapter 6: growing up
  {
    id: 'growth.branches',
    name: 'Growth: more shops',
    chapter: 6,
    tab: 'growth',
    fallbackDay: 60,
    gate: (s) => levelOf(s.xp) >= 4 || s.day >= 60,
    requires: ['growth.equipment'],
    teaser: 'Unlocks later: more shops and selling the bakery',
    intro: {
      who: 'Bà',
      vi: 'Con giỏi rồi. Mở thêm tiệm không?',
      en: 'You’ve done well. Another shop, maybe?',
      steps: [{ text: 'Look at a second neighbourhood in Growth.', tab: 'growth', spot: 'branches', visit: true, done: (s) => seen(s, 'visit:growth.branches') }],
      after: 'A second shop shares your recipes and suppliers. Growing cheaper per item is economies of scale.',
      xp: 20,
    },
  },
];

export const FEATURE: Record<FeatureId, FeatureDef> = Object.fromEntries(FEATURES.map((f) => [f.id, f])) as Record<FeatureId, FeatureDef>;
export const ALL_FEATURES: FeatureId[] = FEATURES.map((f) => f.id);

/** Which feature each tab needs before it shows at all (any one of them). */
export const TAB_FEATURES: Record<TabId, FeatureId[] | null> = {
  today: null,
  kitchen: null,
  market: ['market.wet'],
  staff: ['staff.hire'],
  customers: ['customers.regulars', 'customers.rivals', 'customers.marketing'],
  growth: ['growth.decor', 'growth.equipment', 'growth.branches'],
  money: ['finances.income', 'finances.cash', 'finances.loans'],
  analytics: ['analytics.why', 'analytics.full'],
  eco: ['eco.all'],
};

/** Scenarios built around a system start with the chapters their mechanics need. */
export const SCENARIO_START: Record<ScenarioId, FeatureId[]> = {
  family: [],
  community: ['market.wet', 'kitchen.prices'],
  startup: ['market.wet', 'kitchen.prices', 'finances.income', 'finances.cash', 'finances.loans', 'growth.equipment'],
  recession: ['market.wet', 'kitchen.prices', 'finances.income', 'finances.cash', 'finances.loans', 'analytics.why', 'analytics.full', 'analytics.economy'],
  expansion: ['market.wet', 'kitchen.prices', 'finances.income', 'finances.cash', 'finances.loans', 'growth.equipment', 'staff.hire', 'today.teamDay'],
  competitive: ['market.wet', 'kitchen.prices', 'customers.regulars', 'customers.rivals', 'finances.income'],
};

/**
 * Which feature an engine action needs. Actions that only remove an obligation
 * (repay, cancel, fire, close) are never gated, so a player can't get stuck.
 */
export const ACTION_FEATURE: Partial<Record<string, FeatureId>> = {
  buy: 'market.wet',
  setPrice: 'kitchen.prices',
  predict: 'kitchen.prices',
  setMenu: 'kitchen.menu',
  setPlan: 'kitchen.plan',
  setAutoStock: 'kitchen.plan',
  autoBake: 'kitchen.plan',
  runDay: 'today.teamDay',
  handOver: 'today.teamDay',
  hire: 'staff.hire',
  setWage: 'staff.manage',
  train: 'staff.manage',
  assign: 'staff.manage',
  campaign: 'customers.marketing',
  setReorder: 'market.contracts',
  lockPrice: 'market.contracts',
  signContract: 'market.contracts',
  fund: 'finances.cash',
  savingsRate: 'finances.cash',
  takeLoan: 'finances.loans',
  raiseEquity: 'finances.capital',
  issueBond: 'finances.capital',
  trade: 'finances.capital',
  buyUpgrade: 'growth.equipment',
  buyDecor: 'growth.decor',
  openBranch: 'growth.branches',
  retire: 'growth.branches',
  setCombo: 'kitchen.deals',
  setSizes: 'kitchen.deals',
  setPackaging: 'eco.all',
  buyForecast: 'analytics.full',
};
