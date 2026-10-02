import { CONFIG, INGREDIENTS } from '../data/catalog';
import { has, levelOf, packPrice, yearDay } from './economy';
import { addEffect, bump, learn, spend } from './helpers';
import { rngFor } from './rng';
import type { GameState } from './types';

export interface EventChoice {
  id: string;
  label: string;
  detail: string;
  cost?: number;
  fromFund?: boolean;
  enabled?: (s: GameState) => boolean;
  apply: (s: GameState) => GameState;
}

export interface EventDef {
  id: string;
  icon: 'coffee' | 'rain' | 'egg' | 'box' | 'leaf' | 'sun' | 'shop' | 'fridge' | 'fruit' | 'party' | 'cafe' | 'phone' | 'tet' | 'sale' | 'star';
  title: string;
  vi: string;
  text: (s: GameState) => string;
  choices: (s: GameState) => EventChoice[];
  concept?: string;
}

const paid = (s: GameState, cost: number, fromFund: boolean, fn: (s: GameState) => GameState) => {
  const after = spend(s, cost, fromFund);
  return after ? fn(after) : s;
};

const nothing: EventChoice = { id: 'skip', label: 'Carry on', detail: 'No change.', apply: (s) => s };

export const EVENTS: Record<string, EventDef> = {
  coffeeRumour: {
    id: 'coffeeRumour',
    icon: 'coffee',
    title: 'Coffee rumours',
    vi: 'Tin đồn cà phê',
    concept: 'hedging',
    text: () => 'Chú Bảy from the coffee co-op leans over the counter: "The highland harvest was bad. Prices will jump in a few days." Coffee is in every cà phê sữa đá you sell.',
    choices: (s) => [
      {
        id: 'lock',
        label: `Lock coffee & condensed milk ($${CONFIG.priceLockFee})`,
        detail: 'Pay a small fee to keep today\'s price for 7 days. If prices rise, you\'re covered. If not, you paid $5 for peace of mind.',
        cost: CONFIG.priceLockFee,
        apply: (st) =>
          paid(st, CONFIG.priceLockFee, false, (x) =>
            learn(
              {
                ...x,
                locks: [
                  ...x.locks,
                  { ingredient: 'coffee', price: x.market.prices.coffee, until: x.day + CONFIG.priceLockDays },
                  { ingredient: 'condensed', price: x.market.prices.condensed, until: x.day + CONFIG.priceLockDays },
                ],
              },
              'hedging',
            ),
          ),
      },
      {
        id: 'stock',
        label: `Stock up: 2 packs of coffee ($${(packPrice(s, 'coffee', 'cho') * 2).toFixed(2)})`,
        detail: 'Buy now at the wet market before prices move. Coffee doesn\'t spoil, but the cash is tied up.',
        cost: packPrice(s, 'coffee', 'cho') * 2,
        apply: (st) => {
          const cost = packPrice(st, 'coffee', 'cho') * 2;
          if (st.cash < cost) return st;
          const p = st.pantry.coffee;
          const add = INGREDIENTS.coffee.pack * 2;
          const qty = p.qty + add;
          return learn(
            {
              ...st,
              cash: st.cash - cost,
              pantry: { ...st.pantry, coffee: { qty, avgCost: (p.qty * p.avgCost + cost) / qty, quality: (p.qty * p.quality + add * 55) / qty, eco: (p.qty * p.eco + add * 30) / qty } },
            },
            'inventory',
          );
        },
      },
      { ...nothing, label: 'Take the risk', detail: 'Maybe it\'s just gossip.' },
    ],
  },
  rainySeason: {
    id: 'rainySeason',
    icon: 'rain',
    title: 'Mùa mưa: the rainy season',
    vi: 'Mùa mưa',
    text: () => 'Three days of rain are coming. Fewer people will walk past, but anyone who does wants something hot: bánh mì, patê sô, cà phê.',
    choices: () => [
      {
        id: 'awning',
        label: 'Put out an awning and free tea ($15)',
        detail: 'Customers wait 25% longer for 3 days, and they\'ll remember it.',
        cost: 15,
        apply: (s) => paid(s, 15, false, (x) => ({ ...addEffect(x, 'awning', 3), community: bump(x.community, 2) })),
      },
      { ...nothing, label: 'Ride it out', detail: 'Plan a smaller bake and save your cash.' },
    ],
  },
  eggShortage: {
    id: 'eggShortage',
    icon: 'egg',
    title: 'Egg shortage!',
    vi: 'Thiếu trứng',
    concept: 'supplyDemand',
    text: () => 'Bird flu up north. With fewer eggs to go round, egg prices are up about 70% for three days. Flan uses 4 eggs a tray.',
    choices: () => [
      {
        id: 'raise',
        label: 'Raise flan by $0.50',
        detail: 'Pass the cost on. Some customers will hesitate.',
        apply: (s) => learn({ ...s, prices: { ...s.prices, flan: Math.round((s.prices.flan + 0.5) * 100) / 100 } }, 'supplyDemand'),
      },
      {
        id: 'farm',
        label: 'Ask the farm co-op ($10 deposit)',
        detail: 'Their hens are fine: farm eggs stay at the normal price during the shortage.',
        cost: 10,
        apply: (s) => paid(s, 10, false, (x) => learn(addEffect(x, 'farmEggs', 3), 'supplyDemand')),
      },
      { ...nothing, label: 'Absorb it', detail: 'Keep prices the same. Your margin on flan shrinks for a few days.' },
    ],
  },
  catering: {
    id: 'catering',
    icon: 'box',
    title: 'Catering order!',
    vi: 'Đơn đặt hàng',
    concept: 'opportunityCost',
    text: (s) => {
      const big = yearDay(s.day) > 20;
      return `Chị Thảo's office wants ${big ? 30 : 20} bánh mì picked up tomorrow at noon, for $${big ? 84 : 55}. Each one uses a baguette, a slice of chả lụa and a handful of đồ chua. Bake enough baguettes in the morning, or you'll let her down.`;
    },
    choices: (s) => {
      const big = yearDay(s.day) > 20;
      const qty = big ? 30 : 20;
      const pay = big ? 84 : 55;
      return [
        {
          id: 'accept',
          label: `Accept: ${qty} bánh mì for $${pay}`,
          detail: `About $${(pay / qty).toFixed(2)} each. Fewer sandwiches left for walk-ins at lunch.`,
          apply: (x) => learn(addEffect({ ...x }, 'catering', 2, { qty, pay, day: x.day + 1 }), 'opportunityCost', 'capacity'),
        },
        { ...nothing, id: 'decline', label: 'Politely decline', detail: 'Keep tomorrow simple.' },
      ];
    },
  },
  greenWeek: {
    id: 'greenWeek',
    icon: 'leaf',
    title: 'Green Week',
    vi: 'Tuần lễ xanh',
    concept: 'externality',
    text: () => 'The ward is running Green Week. For 7 days, many more eco-minded shoppers are out, and they pay more at green bakeries.',
    choices: (s) => [
      {
        id: 'reusable',
        label: 'Switch to reusable cups & tins',
        detail: 'Costs $0.12 a sale instead of a few cents, and your eco score jumps.',
        enabled: () => s.packaging !== 'reusable',
        apply: (x) => learn(addEffect({ ...x, packaging: 'reusable' }, 'greenWeek', 7), 'externality'),
      },
      {
        id: 'cleanup',
        label: 'Join the canal clean-up ($10)',
        detail: '+4 community. Your neighbours notice.',
        cost: 10,
        apply: (x) => paid(x, 10, false, (y) => learn(addEffect({ ...y, community: bump(y.community, 4) }, 'greenWeek', 7), 'externality')),
      },
      { id: 'skip', label: 'Business as usual', detail: 'Green Week still happens around you.', apply: (x) => addEffect(x, 'greenWeek', 7) },
    ],
  },
  heatwave: {
    id: 'heatwave',
    icon: 'sun',
    title: 'Heatwave',
    vi: 'Nắng nóng',
    concept: 'elasticity',
    text: (s) => `It's 37°C for three days. Cold drinks will fly off the counter and long queues will melt.${has(s, 'fan') ? ' Your ceiling fan helps.' : ''}`,
    choices: () => [
      {
        id: 'cooler',
        label: 'Buy an ice cooler ($12)',
        detail: 'Customers wait 20% longer for 3 days.',
        cost: 12,
        apply: (s) => paid(s, 12, false, (x) => addEffect(x, 'cooler', 3)),
      },
      {
        id: 'raise',
        label: 'Raise cold drinks by $0.25',
        detail: 'Demand is high, so people may pay more. Or they may not.',
        apply: (s) => learn({ ...s, prices: { ...s.prices, caPhe: s.prices.caPhe + 0.25, traTac: s.prices.traTac + 0.25 } }, 'elasticity'),
      },
      nothing,
    ],
  },
  competitor: {
    id: 'competitor',
    icon: 'shop',
    title: 'A new neighbour',
    vi: 'Hàng xóm mới',
    concept: 'competition',
    text: () => 'Bánh Mì Cô Tư opened across the street. Her bánh mì is $2.50 and her coffee $2.10. Some of your customers will be curious.',
    choices: (s) => [
      {
        id: 'welcome',
        label: 'Bring Cô Tư a welcome flan',
        detail: 'Good neighbours share customers and tips. +5 community.',
        enabled: () => s.display.flan.qty > 0,
        apply: (x) => learn({ ...x, display: { ...x.display, flan: { ...x.display.flan, qty: x.display.flan.qty - 1 } }, community: bump(x.community, 5), questProgress: { ...x.questProgress, neighbor: 1 } }, 'competition'),
      },
      {
        id: 'match',
        label: 'Match her bánh mì price ($2.50)',
        detail: 'Keeps price-hunters, but you make less on every sandwich.',
        apply: (x) => learn({ ...x, prices: { ...x.prices, banhMi: 2.5 } }, 'competition'),
      },
      { id: 'quality', label: 'Compete on quality', detail: 'Better ingredients and a careful hand keep people coming back.', apply: (x) => learn(x, 'competition') },
    ],
  },
  fridgeBroke: {
    id: 'fridgeBroke',
    icon: 'fridge',
    title: 'Your fridge broke!',
    vi: 'Tủ lạnh hỏng',
    concept: 'savings',
    text: () => 'The compressor gave up overnight. Without it, flan and cake can\'t be kept and fresh ingredients spoil twice as fast.',
    choices: (s) => [
      { id: 'repair', label: 'Repair it now ($45)', detail: 'From your cash.', cost: 45, enabled: () => s.cash >= 45, apply: (x) => paid(x, 45, false, (y) => y) },
      {
        id: 'fund',
        label: 'Pay from the safety fund ($45)',
        detail: 'This is exactly what the fund is for.',
        cost: 45,
        fromFund: true,
        enabled: () => s.safetyFund >= 45,
        apply: (x) => paid(x, 45, true, (y) => learn({ ...y, questProgress: { ...y.questProgress, fundUsed: 1 } }, 'savings')),
      },
      { id: 'wait', label: 'Wait 3 days for a free repair', detail: 'No fridge until then.', apply: (x) => learn(addEffect(x, 'fridgeBroken', 3), 'savings') },
    ],
  },
  fruitFest: {
    id: 'fruitFest',
    icon: 'fruit',
    title: 'Fruit festival',
    vi: 'Lễ hội trái cây',
    text: () => 'The fruit market is overflowing. Bananas and cream are about 20% cheaper for three days, and everyone wants something fruity.',
    choices: () => [
      { id: 'baskets', label: 'Hang fruit baskets ($10)', detail: '+2 reputation.', cost: 10, apply: (s) => paid(s, 10, false, (x) => addEffect({ ...x, reputation: bump(x.reputation, 2) }, 'fruitFest', 3)) },
      { id: 'skip', label: 'Just buy cheap fruit', detail: 'Bánh chuối gets cheaper to make.', apply: (s) => addEffect(s, 'fruitFest', 3) },
    ],
  },
  festival: {
    id: 'festival',
    icon: 'party',
    title: 'Street festival today!',
    vi: 'Lễ hội khu phố',
    concept: 'demandShift',
    text: () => 'The lane is closed to motorbikes and full of families, music and lanterns. Expect a crowd: bake more than usual!',
    choices: () => [
      { id: 'stall', label: 'Rent a street stall ($40)', detail: 'About 35% more customers today, on top of the festival crowd.', cost: 40, apply: (s) => paid(s, 40, false, (x) => learn(addEffect(addEffect(x, 'festival', 1), 'stall', 1), 'risk')) },
      { id: 'normal', label: 'Open as normal', detail: 'The festival still brings a crowd.', apply: (s) => addEffect(s, 'festival', 1) },
    ],
  },
  wholesale: {
    id: 'wholesale',
    icon: 'cafe',
    title: 'Café Mộc wants flan',
    vi: 'Đơn sỉ',
    concept: 'margin',
    text: () => 'Café Mộc down the road will buy 10 flan every morning for 7 days at $1.10 each: lower than your shop price, but guaranteed. Any you can\'t supply disappoints them.',
    choices: () => [
      { id: 'accept', label: 'Sign: 10 flan a day at $1.10', detail: 'Steady volume, thinner margin. Bake an extra tray of flan each day.', apply: (s) => learn(addEffect(s, 'wholesale', 7, { qty: 10, price: 1.1 }), 'margin') },
      { id: 'decline', label: 'Decline', detail: 'Keep all your flan for full-price customers.', apply: (s) => learn(s, 'margin') },
    ],
  },
  influencer: {
    id: 'influencer',
    icon: 'phone',
    title: 'A food vlogger calls',
    vi: 'Food vlogger',
    concept: 'risk',
    text: () => 'Vy, a local food vlogger, offers a video about your bakery for $50. It could bring 0 to 40 extra customers over the next 3 days. Nobody knows until it\'s posted.',
    choices: (s) => [
      {
        id: 'yes',
        label: 'Pay $50 for the video',
        detail: 'Risky: average outcome around +20 customers.',
        cost: 50,
        enabled: () => s.cash >= 50,
        apply: (x) => {
          const extra = Math.floor(rngFor(x.seed, x.day, 77)() * 41);
          return paid(x, 50, false, (y) => learn({ ...addEffect(y, 'marketing', 3, { perDay: extra / 3, total: extra, source: 'Vy\'s video' }), lifetime: { ...y.lifetime, marketingSpent: y.lifetime.marketingSpent + 50 } }, 'risk'));
        },
      },
      { id: 'no', label: 'No thanks', detail: 'Keep the $50.', apply: (x) => learn(x, 'risk') },
    ],
  },
  tetComing: {
    id: 'tetComing',
    icon: 'tet',
    title: 'Tết is coming!',
    vi: 'Sắp Tết rồi!',
    text: () => 'Lunar New Year starts tomorrow and lasts five days. Shoppers spend more, families buy gifts, and everyone wants mứt dừa gift boxes. You can bake them during Tết.',
    choices: (s) => [
      {
        id: 'hoaMai',
        label: 'Buy a hoa mai tree ($50)',
        detail: 'Yellow apricot blossoms by the door: +5% customers during Tết.',
        cost: 50,
        enabled: () => !s.decor.includes('hoaMai') && s.cash >= 50,
        apply: (x) => paid(x, 50, false, (y) => ({ ...y, decor: [...y.decor, 'hoaMai'] })),
      },
      {
        id: 'lanterns',
        label: 'Hang red lanterns ($40)',
        detail: '+2 reputation, and they stay up afterwards.',
        cost: 40,
        enabled: () => !s.decor.includes('lanterns') && s.cash >= 40,
        apply: (x) => paid(x, 40, false, (y) => ({ ...y, decor: [...y.decor, 'lanterns'] })),
      },
      { id: 'simple', label: 'Keep it simple', detail: 'Save the money for gift-box ingredients.', apply: (x) => x },
    ],
  },
  premiumSale: {
    id: 'premiumSale',
    icon: 'sale',
    title: 'Saigon Fine Foods sale',
    vi: 'Khuyến mãi',
    concept: 'inventory',
    text: () => 'Saigon Fine Foods has 30% off everything, today only. Top-quality ingredients at close to normal prices, if you have the cash and the space.',
    choices: () => [{ id: 'ok', label: 'Good to know', detail: 'The discount shows in the Market today.', apply: (s) => addEffect(s, 'premiumSale', 1) }],
  },
  blogger: {
    id: 'blogger',
    icon: 'star',
    title: 'A food critic is in town',
    vi: 'Nhà phê bình',
    concept: 'quality',
    text: () => 'A critic from Ăn Ngon magazine is visiting bakeries this week. Treat them to a free tasting box ($15 of your best food)? A great review lifts your reputation, if your food is good.',
    choices: () => [
      {
        id: 'tasting',
        label: 'Offer a tasting ($15)',
        detail: 'The better your recent quality, the bigger the boost.',
        cost: 15,
        apply: (x) =>
          paid(x, 15, false, (y) => {
            const q = Math.max(...(['flan', 'pateChaud', 'banhChuoi', 'banhBo'] as const).map((p) => (y.display[p].qty > 0 ? y.display[p].quality : 0)), 60);
            const gain = Math.round((q - 50) / 5);
            return learn({ ...y, reputation: bump(y.reputation, gain) }, 'quality');
          }),
      },
      { id: 'skip', label: 'Let your food speak for itself', detail: 'No cost.', apply: (x) => x },
    ],
  },
};

/** Which event (if any) greets the player on a given morning. */
export function eventFor(s: GameState, day: number): string | null {
  const y = yearDay(day);
  const level = levelOf(s.xp);
  const firstYear = day <= CONFIG.yearLength;
  switch (y) {
    case 3:
      return 'coffeeRumour';
    case 5:
      return 'rainySeason';
    case 8:
      return 'eggShortage';
    case 10:
      return 'catering';
    case 12:
      return 'greenWeek';
    case 14:
      return 'heatwave';
    case 15:
      return firstYear ? 'competitor' : 'blogger';
    case 17:
      return has(s, 'fridge') ? 'fridgeBroke' : 'fruitFest';
    case 19:
      return 'festival';
    case 21:
      return level >= 3 ? 'wholesale' : 'influencer';
    case 23:
      return 'tetComing';
    case 30:
      return 'influencer';
    case 31:
      return 'catering';
    case 33:
      return 'premiumSale';
  }
  if (day > 35 && rngFor(s.seed, day, 41)() < 0.25) return (['blogger', 'influencer', 'premiumSale', 'festival'] as const)[Math.floor(rngFor(s.seed, day, 42)() * 4)];
  return null;
}
