import type { FeatureId } from '../data/unlocks';
import { featureOn } from './unlocks';
import { INGREDIENTS, PRODUCTS, UPGRADES } from '../data/catalog';
import { STORY_BEATS } from '../data/story';
import { DIFFICULTY, ECON } from '../data/config';
import { move } from './accounting';
import { dateOf, festivalsOn } from './calendar';
import { activeRivals, ecoScore, fridgeWorks, has, levelOf, packPrice } from './economy';
import { valuation } from './finance';
import { addEffect, bump, decide, learn, spend, toast } from './helpers';
import { REGIMES } from './macro';
import { rngFor } from './rng';
import { round2 } from './util';
import type { GameState, IngredientId, PantryItem, ProductId } from './types';

export interface EventChoice {
  id: string;
  label: string;
  detail: string;
  cost?: number;
  fromFund?: boolean;
  enabled?: (s: GameState) => boolean;
  /** Only offered once this system is unlocked (choices paid from the fund need the fund). */
  needs?: FeatureId;
  apply: (s: GameState) => GameState;
}

/** The choices a player can actually see: anything tied to a locked system is left out. */
export function visibleChoices(def: EventDef, s: GameState): EventChoice[] {
  return def.choices(s).filter((c) => {
    const need = c.needs ?? (c.fromFund ? 'finances.cash' : undefined);
    return !need || featureOn(s, need);
  });
}

export interface EventDef {
  id: string;
  icon: 'coffee' | 'rain' | 'egg' | 'box' | 'leaf' | 'sun' | 'shop' | 'fridge' | 'fruit' | 'party' | 'cafe' | 'phone' | 'tet' | 'sale' | 'star' | 'chart' | 'house' | 'people' | 'bell' | 'lock';
  title: string;
  vi: string;
  text: (s: GameState) => string;
  choices: (s: GameState) => EventChoice[];
  concept?: string;
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const scaled = (s: GameState, n: number) => Math.round(n * s.macro.priceIndex);

function paid(s: GameState, cost: number, fromFund: boolean, fn: (s: GameState) => GameState, kind: 'otherExpense' | 'marketing' | 'maintenance' = 'otherExpense') {
  const after = spend(s, cost, fromFund, kind);
  return after ? fn(after) : s;
}

const nothing: EventChoice = { id: 'skip', label: 'Carry on', detail: 'No change.', apply: (s) => s };

function buyNow(s: GameState, id: IngredientId, packs: number): GameState {
  const price = packPrice(s, id, 'cho', packs) * packs;
  if (s.cash < price) return s;
  const p = s.pantry[id];
  const add = INGREDIENTS[id].pack * packs;
  const qty = p.qty + add;
  const item: PantryItem = { qty, avgCost: (p.qty * p.avgCost + price) / qty, quality: (p.qty * p.quality + add * 55) / qty, eco: (p.qty * p.eco + add * 30) / qty };
  return move({ ...s, pantry: { ...s.pantry, [id]: item } }, 'cashInventory', -price);
}

function oldestEquipment(s: GameState) {
  return [...s.equipment].filter((e) => !e.broken && UPGRADES[e.kind].group !== 'room').sort((a, b) => a.boughtDay - b.boughtDay)[0] ?? null;
}

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
        needs: 'market.contracts',
        label: `Lock coffee & condensed milk ($${ECON.costs.priceLockFee})`,
        detail: 'Pay a small fee to keep today\'s price for 7 days. If prices rise, you\'re covered. If not, you paid for peace of mind.',
        cost: ECON.costs.priceLockFee,
        apply: (st) =>
          paid(st, ECON.costs.priceLockFee, false, (x) =>
            learn(
              {
                ...decide(x, { kind: 'contract', text: 'Locked coffee & condensed milk prices for a week.', metric: 'profit', before: 0 }),
                locks: [
                  ...x.locks,
                  { ingredient: 'coffee', price: x.market.prices.coffee, until: x.day + ECON.costs.priceLockDays },
                  { ingredient: 'condensed', price: x.market.prices.condensed, until: x.day + ECON.costs.priceLockDays },
                ],
              },
              'hedging',
            ),
          ),
      },
      {
        id: 'stock',
        label: `Stock up: 2 packs of coffee (${money(packPrice(s, 'coffee', 'cho', 2) * 2)})`,
        detail: 'Buy now at the wet market before prices move. Coffee doesn\'t spoil, but the cash is tied up on a shelf.',
        cost: packPrice(s, 'coffee', 'cho', 2) * 2,
        apply: (st) => learn(buyNow(st, 'coffee', 2), 'inventory'),
      },
      { ...nothing, label: 'Take the risk', detail: 'Maybe it\'s just gossip.' },
    ],
  },
  rainySeason: {
    id: 'rainySeason',
    icon: 'rain',
    title: 'Mùa mưa: the rainy season',
    vi: 'Mùa mưa',
    text: () => 'Three days of rain are coming. Fewer people will walk past, but anyone who does wants something hot: bánh mì, patê sô, bánh bao, cà phê.',
    choices: (s) => [
      {
        id: 'awning',
        label: `Put out an awning and free tea (${money(scaled(s, 80))})`,
        detail: 'Customers wait 25% longer for 3 days, and they\'ll remember it.',
        cost: scaled(s, 80),
        apply: (x) => paid(x, scaled(x, 80), false, (y) => ({ ...addEffect(y, 'awning', 3), community: bump(y.community, 2) })),
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
    choices: (s) => [
      { id: 'raise', label: 'Raise flan by $0.75', detail: 'Pass the cost on. Some customers will hesitate.', apply: (x) => learn(decide({ ...x, prices: { ...x.prices, flan: round2(x.prices.flan + 0.75) } }, { kind: 'price', product: 'flan', text: 'Raised flan by $0.75 during the egg shortage.', metric: 'units', before: avgUnits(x, 'flan') }), 'supplyDemand') },
      { id: 'farm', label: `Ask the farm co-op (${money(scaled(s, 50))} deposit)`, detail: 'Their hens are fine: farm eggs stay at the normal price during the shortage.', cost: scaled(s, 50), apply: (x) => paid(x, scaled(x, 50), false, (y) => learn(addEffect(y, 'farmEggs', 3), 'supplyDemand')) },
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
      const qty = Number(s.events[0]?.data?.qty ?? 20);
      const pay = Number(s.events[0]?.data?.pay ?? 110);
      return `Chị Thảo's office wants ${qty} bánh mì picked up tomorrow at noon, for ${money(pay)}. Each one needs a baguette, a slice of chả lụa and pickles. Bake enough baguettes in the morning, or you'll let her down, and they all come out of what walk-ins could have bought.`;
    },
    choices: (s) => {
      const qty = Number(s.events[0]?.data?.qty ?? 20);
      const pay = Number(s.events[0]?.data?.pay ?? 110);
      return [
        { id: 'accept', label: `Accept: ${qty} bánh mì for ${money(pay)}`, detail: `About $${(pay / qty).toFixed(2)} each, below your counter price, but guaranteed.`, apply: (x) => learn(addEffect(x, 'catering', 2, { qty, pay, day: x.day + 1 }), 'opportunityCost', 'capacity') },
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
    text: () => 'The neighbourhood is running Green Week. For 7 days, many more eco-minded shoppers are out, and they pay more at green bakeries.',
    choices: (s) => [
      { id: 'reusable', label: 'Switch to reusable cups & tins', detail: 'Costs more per sale, and your eco score jumps.', enabled: () => s.packaging !== 'reusable', apply: (x) => learn(addEffect({ ...x, packaging: 'reusable' }, 'greenWeek', 7), 'externality') },
      { id: 'cleanup', label: `Join the canal clean-up (${money(scaled(s, 60))})`, detail: '+4 community. Your neighbours notice.', cost: scaled(s, 60), apply: (x) => paid(x, scaled(x, 60), false, (y) => learn(addEffect({ ...y, community: bump(y.community, 4) }, 'greenWeek', 7), 'externality')) },
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
    choices: (s) => [
      { id: 'cooler', label: `Buy an ice cooler (${money(scaled(s, 70))})`, detail: 'Customers wait 20% longer for 3 days.', cost: scaled(s, 70), apply: (x) => paid(x, scaled(x, 70), false, (y) => addEffect(y, 'cooler', 3)) },
      { id: 'raise', label: 'Raise cold drinks by $0.50', detail: 'Demand is high, so people may pay more. Or not.', apply: (x) => learn(decide({ ...x, prices: { ...x.prices, caPhe: x.prices.caPhe + 0.5, traTac: x.prices.traTac + 0.5 } }, { kind: 'price', product: 'caPhe', text: 'Raised cold drinks by $0.50 in the heatwave.', metric: 'revenue', before: avgRevenue(x, 'caPhe') }), 'elasticity') },
      nothing,
    ],
  },
  competitor: {
    id: 'competitor',
    icon: 'shop',
    title: 'A new neighbour',
    vi: 'Hàng xóm mới',
    concept: 'competition',
    text: (s) => {
      const c = s.competitors.find((x) => x.id === 'coTu');
      return `Bánh Mì Cô Tư opened across the street. Her bánh mì is $${(c?.prices.banhMi ?? 5.5).toFixed(2)} and her coffee $${(c?.prices.caPhe ?? 4.25).toFixed(2)}. Some customers will be curious; how you respond decides how many stay.`;
    },
    choices: (s) => [
      { id: 'welcome', label: 'Bring Cô Tư a welcome flan', detail: 'Good neighbours share customers and tips. +5 community.', enabled: () => s.display.flan.qty > 0, apply: (x) => learn({ ...x, display: { ...x.display, flan: { ...x.display.flan, qty: x.display.flan.qty - 1 } }, community: bump(x.community, 5), questProgress: { ...x.questProgress, neighbor: 1 } }, 'competition') },
      {
        id: 'match',
        label: 'Match her bánh mì price',
        detail: 'Keeps price hunters, but you make less on every sandwich.',
        apply: (x) => {
          const price = x.competitors.find((c) => c.id === 'coTu')?.prices.banhMi ?? 5.5;
          return learn(decide({ ...x, prices: { ...x.prices, banhMi: price } }, { kind: 'price', product: 'banhMi', text: `Matched Cô Tư's bánh mì price ($${price.toFixed(2)}).`, metric: 'revenue', before: avgRevenue(x, 'banhMi') }), 'competition');
        },
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
      { id: 'repair', label: `Repair it now (${money(scaled(s, 280))})`, detail: 'From your cash.', cost: scaled(s, 280), enabled: () => s.cash >= scaled(s, 280), apply: (x) => paid(x, scaled(x, 280), false, (y) => y, 'maintenance') },
      { id: 'fund', label: `Pay from the safety fund (${money(scaled(s, 280))})`, detail: 'Exactly what the fund is for.', cost: scaled(s, 280), fromFund: true, enabled: () => s.safetyFund >= scaled(s, 280), apply: (x) => paid(x, scaled(x, 280), true, (y) => learn({ ...y, questProgress: { ...y.questProgress, fundUsed: 1 } }, 'savings'), 'maintenance') },
      { id: 'wait', label: 'Wait 3 days for a cheaper repair', detail: 'No fridge until then.', apply: (x) => learn(addEffect(x, 'fridgeBroken', 3), 'savings') },
    ],
  },
  fruitFest: {
    id: 'fruitFest',
    icon: 'fruit',
    title: 'Fruit festival',
    vi: 'Lễ hội trái cây',
    text: () => 'The fruit market is overflowing. Bananas and cream are about 20% cheaper for three days, and everyone wants something fruity.',
    choices: (s) => [
      { id: 'baskets', label: `Hang fruit baskets (${money(scaled(s, 60))})`, detail: '+2 reputation.', cost: scaled(s, 60), apply: (x) => paid(x, scaled(x, 60), false, (y) => addEffect({ ...y, reputation: bump(y.reputation, 2) }, 'fruitFest', 3), 'marketing') },
      { id: 'skip', label: 'Just buy cheap fruit', detail: 'Bánh chuối gets cheaper to make.', apply: (x) => addEffect(x, 'fruitFest', 3) },
    ],
  },
  festival: {
    id: 'festival',
    icon: 'party',
    title: 'Street festival today!',
    vi: 'Lễ hội khu phố',
    concept: 'demandShift',
    text: () => 'The lane is closed to motorbikes and full of families, music and lanterns. Expect a crowd: bake more than usual!',
    choices: (s) => [
      { id: 'stall', label: `Rent a street stall (${money(scaled(s, 250))})`, detail: 'About 35% more customers today, on top of the festival crowd.', cost: scaled(s, 250), apply: (x) => paid(x, scaled(x, 250), false, (y) => learn(addEffect(addEffect(y, 'festival', 1), 'stall', 1), 'risk'), 'marketing') },
      { id: 'normal', label: 'Open as normal', detail: 'The festival still brings a crowd.', apply: (x) => addEffect(x, 'festival', 1) },
    ],
  },
  wholesale: {
    id: 'wholesale',
    icon: 'cafe',
    title: 'A café wants your pastries',
    vi: 'Đơn sỉ',
    concept: 'margin',
    text: (s) => {
      const p = (s.events[0]?.data?.product as ProductId) ?? 'flan';
      const qty = Number(s.events[0]?.data?.qty ?? 10);
      const price = Number(s.events[0]?.data?.price ?? 2.2);
      return `Café Mộc will buy ${qty} ${PRODUCTS[p].name} every morning for 14 days at $${price.toFixed(2)} each: below your shop price (${money(s.prices[p])}), but guaranteed. Any you can't supply disappoints them.`;
    },
    choices: (s) => {
      const p = (s.events[0]?.data?.product as ProductId) ?? 'flan';
      const qty = Number(s.events[0]?.data?.qty ?? 10);
      const price = Number(s.events[0]?.data?.price ?? 2.2);
      return [
        { id: 'accept', label: `Sign: ${qty} a day at $${price.toFixed(2)}`, detail: 'Steady volume, thinner margin. Bake an extra tray each morning.', apply: (x) => learn(decide(addEffect(x, 'wholesale', 14, { product: p, qty, price }), { kind: 'contract', text: `Wholesale deal: ${qty} ${PRODUCTS[p].name} a day at $${price.toFixed(2)}.`, metric: 'profit', before: avgProfit(x) }), 'margin') },
        { id: 'decline', label: 'Decline', detail: 'Keep your oven space for full-price customers.', apply: (x) => learn(x, 'margin') },
      ];
    },
  },
  influencer: {
    id: 'influencer',
    icon: 'phone',
    title: 'A food vlogger calls',
    vi: 'Food vlogger',
    concept: 'risk',
    text: (s) => `Vy, a local food vlogger, offers a video about your bakery for ${money(scaled(s, 300))}. It could bring 0 to 60 extra customers over the next 4 days. Nobody knows until it's posted.`,
    choices: (s) => [
      {
        id: 'yes',
        label: `Pay ${money(scaled(s, 300))} for the video`,
        detail: 'Risky: the average outcome is around +30 customers.',
        cost: scaled(s, 300),
        enabled: () => s.cash >= scaled(s, 300),
        apply: (x) => {
          const extra = Math.floor(rngFor(x.seed, x.day, 77)() * 61);
          return paid(x, scaled(x, 300), false, (y) => learn({ ...addEffect(y, 'marketing', 4, { perDay: extra / 4, total: extra, source: 'Vy\'s video' }), lifetime: { ...y.lifetime, marketingSpent: y.lifetime.marketingSpent + scaled(x, 300) } }, 'risk'), 'marketing');
        },
      },
      { id: 'no', label: 'No thanks', detail: 'Keep the money.', apply: (x) => learn(x, 'risk') },
    ],
  },
  tetComing: {
    id: 'tetComing',
    icon: 'tet',
    title: 'Tết is coming!',
    vi: 'Sắp Tết rồi!',
    text: (s) => `Lunar New Year arrives in ${Math.max(1, 31 - dateOf(s.day).dom)} days. Families are already buying mứt dừa gift boxes, and during Tết shoppers spend more. You can bake gift boxes from now until the holiday ends.`,
    choices: (s) => [
      { id: 'hoaMai', label: `Buy a hoa mai tree (${money(240)})`, detail: 'Yellow apricot blossoms by the door: +5% customers during Tết.', cost: 240, enabled: () => !s.decor.includes('hoaMai') && s.cash >= 240, apply: (x) => capexDecor(x, 'hoaMai', 240) },
      { id: 'lanterns', label: `Hang red lanterns (${money(220)})`, detail: '+2 reputation, and they stay up afterwards.', cost: 220, enabled: () => !s.decor.includes('lanterns') && s.cash >= 220, apply: (x) => capexDecor(x, 'lanterns', 220) },
      { id: 'simple', label: 'Keep it simple', detail: 'Save the money for gift-box ingredients.', apply: (x) => x },
    ],
  },
  trungThuComing: {
    id: 'trungThuComing',
    icon: 'tet',
    title: 'Mid-Autumn is coming',
    vi: 'Sắp Trung Thu',
    text: () => 'Lanterns are going up and families are pre-ordering mooncakes. From next month until the full moon, bánh trung thu sell fast, and lotus seed paste gets pricier as everyone buys it. Buying ahead could save money, if you have the cash and the space.',
    choices: (s) => [
      { id: 'stock', label: `Buy 4 packs of lotus paste now (${money(packPrice(s, 'lotus', 'cho', 4) * 4)})`, detail: 'Lock in today\'s price; it keeps for weeks.', cost: packPrice(s, 'lotus', 'cho', 4) * 4, apply: (x) => learn(buyNow(x, 'lotus', 4), 'inventory') },
      { ...nothing, label: 'Buy as I go', detail: 'Keep cash free; pay more later.' },
    ],
  },
  premiumSale: {
    id: 'premiumSale',
    icon: 'sale',
    title: 'Saigon Fine Foods sale',
    vi: 'Khuyến mãi',
    concept: 'inventory',
    text: () => 'Saigon Fine Foods has 30% off everything, today only. Top-quality ingredients at close to normal prices, if you have the cash and the storage.',
    choices: () => [{ id: 'ok', label: 'Good to know', detail: 'The discount shows in the Market today.', apply: (s) => addEffect(s, 'premiumSale', 1) }],
  },
  blogger: {
    id: 'blogger',
    icon: 'star',
    title: 'A food critic is in town',
    vi: 'Nhà phê bình',
    concept: 'quality',
    text: (s) => `A critic from Ăn Ngon magazine is visiting bakeries this week. Treat them to a tasting box (${money(scaled(s, 90))} of your best food)? A great review lifts your reputation, if your food is good.`,
    choices: (s) => [
      {
        id: 'tasting',
        label: `Offer a tasting (${money(scaled(s, 90))})`,
        detail: 'The better your recent quality, the bigger the boost.',
        cost: scaled(s, 90),
        apply: (x) =>
          paid(
            x,
            scaled(x, 90),
            false,
            (y) => {
              const q = Math.max(...(['flan', 'pateChaud', 'banhChuoi', 'banhBo', 'banhBao'] as const).map((p) => (y.display[p].qty > 0 ? y.display[p].quality : 0)), 60);
              return learn({ ...y, reputation: bump(y.reputation, Math.round((q - 50) / 5)) }, 'quality');
            },
            'marketing',
          ),
      },
      { id: 'skip', label: 'Let your food speak for itself', detail: 'No cost.', apply: (x) => x },
    ],
  },

  // ------------------------------------------------------------ dynamic events
  flourSpike: {
    id: 'flourSpike',
    icon: 'chart',
    title: 'Flour prices are about to spike',
    vi: 'Bột mì tăng giá',
    concept: 'supplyDemand',
    text: () => 'A drought hit the wheat harvest. Traders expect flour to cost about 60% more from tomorrow, for around ten days. Baguettes, patê sô and bánh bao all need flour.',
    choices: (s) => [
      { id: 'buy', label: `Buy 6 packs today (${money(packPrice(s, 'flour', 'cho', 6) * 6)})`, detail: 'Flour keeps. You tie up cash and shelf space, but dodge the spike.', cost: packPrice(s, 'flour', 'cho', 6) * 6, apply: (x) => addEffect(learn(buyNow(x, 'flour', 6), 'inventory'), 'shock', 11, { ingredient: 'flour', mult: 1.6, headline: 'Flour is 60% dearer after a bad harvest.' }) },
      {
        id: 'contract',
        label: 'Sign a 4-week flour contract at today\'s price +5%',
        detail: '2 packs delivered every week at a fixed price, whatever the market does.',
        apply: (x) => {
          const price = round2(packPrice(x, 'flour', 'distributor', 2) * 1.05);
          const next = { ...x, contracts: [...x.contracts, { id: x.nextId, ingredient: 'flour' as IngredientId, supplier: 'distributor' as const, packsPerWeek: 2, price, startDay: x.day, endDay: x.day + 27, delivered: 0 }], nextId: x.nextId + 1 };
          return addEffect(learn(decide(next, { kind: 'contract', text: `Signed a 4-week flour contract at $${price}/pack.`, metric: 'profit', before: avgProfit(x) }), 'hedging'), 'shock', 11, { ingredient: 'flour', mult: 1.6, headline: 'Flour is 60% dearer after a bad harvest.' });
        },
      },
      { id: 'skip', label: 'Wait and see', detail: 'Maybe the traders are wrong.', apply: (x) => addEffect(x, 'shock', 11, { ingredient: 'flour', mult: 1.6, headline: 'Flour is 60% dearer after a bad harvest.' }) },
    ],
  },
  disruption: {
    id: 'disruption',
    icon: 'box',
    title: 'Supply chain trouble',
    vi: 'Đứt chuỗi cung ứng',
    concept: 'inventory',
    text: () => 'A highway closure is stranding delivery trucks. For about five days, the farm co-op, Saigon Fine Foods and the distributor will often be out of stock. Only the wet market is reliable.',
    choices: (s) => [
      { id: 'stock', label: 'Stock up at the wet market now', detail: 'Go to the Market tab and buy what you need for a week. Watch your storage and spoilage.', apply: (x) => addEffect(x, 'disruption', 5) },
      { id: 'express', label: `Pay for an express courier (${money(scaled(s, 180))})`, detail: 'Your regular deliveries get through anyway.', cost: scaled(s, 180), apply: (x) => paid(x, scaled(x, 180), false, (y) => y) },
    ],
  },
  rentRenewal: {
    id: 'rentRenewal',
    icon: 'house',
    title: 'Lease renewal',
    vi: 'Gia hạn hợp đồng thuê',
    concept: 'fixedCost',
    text: (s) => {
      const rise = rentRise(s);
      return `Your landlord wants to renew the lease with a ${(rise * 100).toFixed(0)}% rent increase, in line with prices around town. Rent is a fixed cost: it rises whether or not your sales do.`;
    },
    choices: (s) => {
      const rise = rentRise(s);
      return [
        { id: 'accept', label: `Accept +${(rise * 100).toFixed(0)}%`, detail: 'Keep things friendly.', apply: (x) => learn(decide({ ...x, macro: { ...x.macro, rentIndex: x.macro.rentIndex * (1 + rise) } }, { kind: 'location', text: `Renewed the lease at +${(rise * 100).toFixed(0)}%.`, metric: 'profit', before: avgProfit(x) }), 'fixedCost') },
        {
          id: 'negotiate',
          label: 'Negotiate',
          detail: 'Half the increase if it works. If not, the full rise and a cooler landlord.',
          apply: (x) => {
            const ok = rngFor(x.seed, x.day, 911)() < 0.5 + (x.reputation - 50) / 200;
            const r = ok ? rise / 2 : rise;
            return toast(learn({ ...x, macro: { ...x.macro, rentIndex: x.macro.rentIndex * (1 + r) } }, 'fixedCost'), 'info', ok ? 'Deal!' : 'No luck', ok ? `Rent rises just ${(r * 100).toFixed(1)}%.` : `The landlord held firm at +${(r * 100).toFixed(0)}%.`);
          },
        },
        { id: 'lock', label: `Sign a 3-year lease at +${((rise * 0.6) * 100).toFixed(0)}%`, detail: 'A smaller rise now, and no renewal fights for three years.', apply: (x) => addEffect({ ...x, macro: { ...x.macro, rentIndex: x.macro.rentIndex * (1 + rise * 0.6) } }, 'longLease', 360 * 3) },
      ];
    },
  },
  inspection: {
    id: 'inspection',
    icon: 'lock',
    title: 'Health inspection today',
    vi: 'Kiểm tra vệ sinh',
    concept: 'risk',
    text: () => 'A city inspector just walked in. Fridges, waste handling and staffing all count. A failed inspection means a fine and the shop stays closed today.',
    choices: (s) => [
      { id: 'clean', label: `Hire a deep clean (${money(scaled(s, 300))})`, detail: 'A guaranteed pass, and a shiny shop.', cost: scaled(s, 300), apply: (x) => paid(x, scaled(x, 300), false, (y) => toast({ ...y, reputation: bump(y.reputation, 2) }, 'info', 'Inspection passed', 'Spotless. +2 reputation.'), 'maintenance') },
      {
        id: 'trust',
        label: 'Trust your routine',
        detail: `Your readiness: ${inspectionScore(s)}/100. Below 55 risks a fail.`,
        apply: (x) => {
          const pass = inspectionScore(x) >= 55 || rngFor(x.seed, x.day, 913)() < 0.3;
          if (pass) return toast({ ...x, reputation: bump(x.reputation, 3) }, 'info', 'Inspection passed', 'Clean as a whistle. +3 reputation.');
          const fine = scaled(x, 500);
          const y = spend(x, Math.min(fine, Math.max(0, x.cash)), false) ?? x;
          return toast(addEffect({ ...y, reputation: bump(y.reputation, -6) }, 'closedDay', 1), 'warning', 'Inspection failed', `A ${money(fine)} fine, and the shop stays closed today.`);
        },
      },
    ],
  },
  viral: {
    id: 'viral',
    icon: 'phone',
    title: 'You went viral!',
    vi: 'Nổi tiếng trên mạng',
    concept: 'capacity',
    text: () => 'A customer\'s video of your bánh mì has a million views. Expect crowds for about five days. Can your kitchen and counter keep up?',
    choices: (s) => [
      { id: 'temp', label: `Hire temporary help for 5 days (${money(scaled(s, 900))})`, detail: 'An extra pair of hands at the counter during the rush.', cost: scaled(s, 900), apply: (x) => paid(x, scaled(x, 900), false, (y) => addEffect(addEffect(y, 'viral', 5), 'tempHelp', 5)) },
      { id: 'ride', label: 'Ride the wave', detail: 'Bake extra and hope the queue holds.', apply: (x) => learn(addEffect(x, 'viral', 5), 'capacity') },
    ],
  },
  construction: {
    id: 'construction',
    icon: 'house',
    title: 'Road works outside',
    vi: 'Công trình',
    concept: 'demandShift',
    text: () => 'The city is digging up the street for new pipes. For about three weeks, walk-in traffic will drop by a quarter.',
    choices: (s) => [
      { id: 'sign', label: `Sidewalk signs and flyers (${money(scaled(s, 350))})`, detail: 'Halves the loss of foot traffic.', cost: scaled(s, 350), apply: (x) => paid(x, scaled(x, 350), false, (y) => addEffect(y, 'construction', 21, { mult: 0.88 }), 'marketing') },
      { id: 'ride', label: 'Ride it out', detail: 'Bake less and wait.', apply: (x) => learn(addEffect(x, 'construction', 21, { mult: 0.75 }), 'demandShift') },
    ],
  },
  equipmentFailure: {
    id: 'equipmentFailure',
    icon: 'bell',
    title: 'Something broke',
    vi: 'Hỏng thiết bị',
    concept: 'investment',
    text: (s) => {
      const e = oldestEquipment(s);
      return e ? `Your ${UPGRADES[e.kind].name.toLowerCase()} stopped working this morning. Old equipment breaks more often; that's part of the cost of owning it.` : 'Nothing broke after all.';
    },
    choices: (s) => {
      const e = oldestEquipment(s);
      if (!e) return [nothing];
      const repair = Math.round(e.cost * 0.22);
      return [
        { id: 'repair', label: `Repair it (${money(repair)})`, detail: 'Back to work today.', cost: repair, apply: (x) => paid(x, repair, false, (y) => y, 'maintenance') },
        { id: 'wait', label: `Cheaper repair in 4 days (${money(Math.round(repair * 0.4))})`, detail: 'Do without it until then.', apply: (x) => addEffect({ ...x, equipment: x.equipment.map((q) => (q.uid === e.uid ? { ...q, broken: true } : q)), upgrades: refreshKinds(x.equipment.map((q) => (q.uid === e.uid ? { ...q, broken: true } : q))) }, 'repairDue', 4, { uid: e.uid, cost: Math.round(repair * 0.4) }) },
      ];
    },
  },
  raiseRequest: {
    id: 'raiseRequest',
    icon: 'people',
    title: 'A raise request',
    vi: 'Xin tăng lương',
    concept: 'labor',
    text: (s) => {
      const e = s.staff.find((x) => x.id === Number(s.events[0]?.data?.staff));
      return e ? `${e.name}, your ${e.role}, says rents are rising and asks for 10% more ($${(e.wage * 1.1).toFixed(2)}/hour instead of $${e.wage.toFixed(2)}).` : 'Never mind, they changed their mind.';
    },
    choices: (s) => {
      const id = Number(s.events[0]?.data?.staff);
      const upd = (x: GameState, mult: number, morale: number) => ({ ...x, staff: x.staff.map((e) => (e.id === id ? { ...e, wage: round2(e.wage * mult), morale: Math.min(100, Math.max(0, e.morale + morale)) } : e)) });
      return [
        { id: 'yes', label: 'Give the full 10%', detail: 'Morale +15. Wages are a fixed cost every day.', apply: (x) => learn(decide(upd(x, 1.1, 15), { kind: 'wage', text: 'Gave a 10% raise.', metric: 'profit', before: avgProfit(x) }), 'labor') },
        { id: 'half', label: 'Offer 5%', detail: 'Morale +4.', apply: (x) => learn(upd(x, 1.05, 4), 'labor') },
        { id: 'no', label: 'Not right now', detail: 'Morale −20. They might start looking elsewhere.', apply: (x) => learn(upd(x, 1, -20), 'labor') },
      ];
    },
  },
  priceWar: {
    id: 'priceWar',
    icon: 'shop',
    title: 'Price war!',
    vi: 'Cuộc chiến giá',
    concept: 'competition',
    text: (s) => {
      const c = s.competitors.find((x) => x.id === s.events[0]?.data?.rival);
      return c ? `${c.name} slashed prices 15% across the board and put up a giant "SALE" banner. Your price-sensitive customers are noticing.` : 'The rival changed their mind.';
    },
    choices: (s) => {
      const rid = s.events[0]?.data?.rival;
      return [
        {
          id: 'match',
          label: 'Match their prices',
          detail: 'Keep share, lose margin. A price war can hurt everyone.',
          apply: (x) => {
            const c = x.competitors.find((r) => r.id === rid);
            if (!c) return x;
            const prices = { ...x.prices };
            for (const [p, v] of Object.entries(c.prices) as [ProductId, number][]) if (x.menu.includes(p)) prices[p] = round2(Math.min(prices[p], v));
            return learn(decide({ ...x, prices }, { kind: 'price', text: `Matched ${c.name} in a price war.`, metric: 'profit', before: avgProfit(x) }), 'competition');
          },
        },
        { id: 'quality', label: 'Stay premium and push quality', detail: 'Lose some bargain hunters, keep your margin.', apply: (x) => learn(x, 'competition') },
        { id: 'loyalty', label: `Launch a loyalty card (${money(scaled(s, 200))})`, detail: 'Regulars get every 10th coffee free. Loyal customers ignore rivals\' sales.', cost: scaled(s, 200), enabled: () => has(s, 'pos'), apply: (x) => paid(x, scaled(x, 200), false, (y) => addEffect(y, 'loyaltyCard', 60), 'marketing') },
      ];
    },
  },
  regimeChange: {
    id: 'regimeChange',
    icon: 'chart',
    title: 'The economy is changing',
    vi: 'Kinh tế thay đổi',
    concept: 'macro',
    text: (s) => `${REGIMES[s.macro.regime].name}: ${REGIMES[s.macro.regime].blurb} ${REGIMES[s.macro.regime].forYou}`,
    choices: (s) => [
      {
        id: 'raise',
        label: 'Raise all prices 5%',
        detail: s.macro.regime === 'inflation' ? 'Keep up with rising costs.' : 'Protect your margin; some customers will walk.',
        apply: (x) => {
          const prices = { ...x.prices };
          for (const p of Object.keys(prices) as ProductId[]) prices[p] = round2(Math.round((prices[p] * 1.05) / 0.25) * 0.25);
          return learn(decide({ ...x, prices }, { kind: 'price', text: 'Raised all prices 5% as the economy shifted.', metric: 'revenue', before: avgRevenue(x) }), 'inflation');
        },
      },
      { id: 'hold', label: 'Hold prices steady', detail: s.macro.regime === 'recession' ? 'Keep careful customers coming.' : 'Margins may get squeezed.', apply: (x) => learn(x, 'inflation') },
    ],
  },
  bailout: {
    id: 'bailout',
    icon: 'house',
    title: 'The bakery is out of money',
    vi: 'Hết tiền rồi',
    concept: 'cashFlow',
    text: (s) => `For ${s.daysInDistress} days you couldn't pay the bills, and the bank's credit line is maxed out. A business can be profitable on paper and still run out of cash. Bà offers her savings to keep the doors open.`,
    choices: (s) => [
      { id: 'accept', label: `Accept Bà's help (${money(4000 * s.macro.priceIndex)})`, detail: 'Counted as money the owner put in, not income. Use it to fix what went wrong.', apply: (x) => x },
      { id: 'close', label: 'Close the bakery', detail: 'End this game here.', apply: (x) => x },
    ],
  },
  buyout: {
    id: 'buyout',
    icon: 'chart',
    title: 'Someone wants to buy your bakery',
    vi: 'Có người muốn mua lại tiệm',
    concept: 'valuation',
    text: (s) => {
      const amount = Number(s.events[0]?.data?.amount ?? 0);
      const v = valuation(s);
      return `${String(s.events[0]?.data?.buyer ?? 'A restaurant group')} offers ${money(amount)} for your share of the business. By our numbers it's worth about ${money(v.ownerValue)} to you (yearly cash earnings ${money(v.ebitdaAnnual)} × ${v.multiple.toFixed(1)}, plus cash, minus debt). Selling ends this game; you can start another.`;
    },
    choices: (s) => {
      const amount = Number(s.events[0]?.data?.amount ?? 0);
      return [
        { id: 'sell', label: `Sell for ${money(amount)}`, detail: 'Take the money and retire to a hammock.', apply: (x) => ({ ...x, ending: { kind: 'sold', day: x.day, value: amount, text: `You sold ${x.bakeryName} for ${money(amount)} after ${x.day} days.` } }) },
        {
          id: 'haggle',
          label: 'Ask for 15% more',
          detail: 'They might agree. They might walk away.',
          apply: (x) => {
            const ok = rngFor(x.seed, x.day, 917)() < 0.45;
            return ok ? { ...x, events: [{ id: 'buyout', day: x.day, data: { amount: Math.round(amount * 1.15), buyer: String(x.events[0]?.data?.buyer ?? 'The buyer') } }, ...x.events] } : toast(x, 'info', 'Offer withdrawn', 'The buyer walked away. Maybe next time.');
          },
        },
        { id: 'keep', label: 'Not for sale', detail: 'This is your bakery.', apply: (x) => x },
      ];
    },
  },
};

function capexDecor(s: GameState, id: 'hoaMai' | 'lanterns', cost: number): GameState {
  if (s.decor.includes(id)) return s;
  const next = spend(s, cost);
  if (!next) return s;
  return { ...next, decor: [...next.decor, id], reputation: id === 'lanterns' ? bump(next.reputation, 2) : next.reputation };
}

export function refreshKinds(equipment: GameState['equipment']): GameState['upgrades'] {
  return [...new Set(equipment.filter((e) => !e.broken).map((e) => e.kind))];
}

function rentRise(s: GameState): number {
  return Math.max(0.02, Math.min(0.15, s.macro.inflation + 0.02 + (s.macro.regime === 'boom' ? 0.03 : 0)));
}

export function inspectionScore(s: GameState): number {
  const recent = s.history.slice(-7);
  const waste = recent.length ? recent.reduce((t, h) => t + h.wasteRate, 0) / recent.length : 0.1;
  let score = 40;
  if (fridgeWorks(s)) score += 20;
  if (has(s, 'compost')) score += 10;
  if (s.staff.some((e) => e.role === 'manager')) score += 15;
  score += Math.round(20 * (1 - Math.min(1, waste * 4)));
  if (ecoScore(s) > 70) score += 5;
  return Math.min(100, score);
}

function avgOf(s: GameState, f: (h: GameState['history'][number]) => number): number {
  const h = s.history.slice(-7);
  return h.length ? h.reduce((t, x) => t + f(x), 0) / h.length : 0;
}
const avgUnits = (s: GameState, p: ProductId) => avgOf(s, (h) => h.sold[p] ?? 0);
const avgRevenue = (s: GameState, p?: ProductId) => avgOf(s, (h) => (p ? h.revenueBy?.[p] ?? 0 : h.revenue));
const avgProfit = (s: GameState) => avgOf(s, (h) => h.profit);

/** Which event (if any) greets the player on a given morning. */
// Milestone story beats: one tap, a few lines, a small gift.
for (const b of STORY_BEATS) {
  EVENTS[b.id] = {
    id: b.id,
    icon: 'house',
    title: b.title,
    vi: b.vi,
    text: () => b.text,
    choices: () => [
      {
        id: 'on',
        label: 'Carry on',
        detail: b.giftText,
        apply: (x) => ({ ...x, community: bump(x.community, b.gift.community ?? 0), reputation: bump(x.reputation, b.gift.reputation ?? 0), xp: x.xp + (b.gift.xp ?? 0) }),
      },
    ],
  };
}

export function eventFor(s: GameState, day: number): { id: string; data?: Record<string, number | string> } | null {
  const level = levelOf(s.xp);
  const beat = STORY_BEATS.find((b) => b.day === day);
  if (beat) return { id: beat.id };
  const d = dateOf(day);
  const story = s.scenario === 'family' || s.scenario === 'community' || s.scenario === 'recession';
  if (day <= 35 && story) {
    switch (day) {
      case 3:
        return { id: 'coffeeRumour' };
      case 5:
        return { id: 'rainySeason' };
      case 8:
        return { id: 'eggShortage' };
      case 10:
        return { id: 'catering', data: { qty: 20, pay: scaled(s, 110) } };
      case 12:
        return { id: 'greenWeek' };
      case 14:
        return { id: 'heatwave' };
      case 15:
        return s.location === 'oldLane' ? { id: 'competitor' } : null;
      case 17:
        return has(s, 'fridge') ? { id: 'fridgeBroke' } : { id: 'fruitFest' };
      case 19:
        return { id: 'festival' };
      case 21:
        return level >= 3 ? { id: 'wholesale', data: { product: 'flan', qty: 10, price: round2(s.prices.flan * 0.62) } } : { id: 'influencer' };
      case 23:
        return { id: 'tetComing' };
      case 30:
        return { id: 'influencer' };
      case 31:
        return { id: 'catering', data: { qty: 30, pay: scaled(s, 160) } };
      case 33:
        return { id: 'premiumSale' };
    }
    if (day <= 35) return null;
  }
  if (d.month === 12 && d.dom === 15) return { id: 'tetComing' };
  if (d.month === 7 && d.dom === 25) return { id: 'trungThuComing' };
  if (d.yearDay === ECON.calendar.startYearDay && day > 1 && !s.effects.some((e) => e.id === 'longLease' && e.until >= day)) return { id: 'rentRenewal' };
  if (s.offer && s.offer.day === day) return { id: 'buyout', data: { amount: s.offer.amount, buyer: s.offer.buyer } };

  const rand = rngFor(s.seed, day, 41);
  if (rand() > ECON.rng.eventChance * DIFFICULTY[s.difficulty].eventChance) return null;
  const pool: { id: string; w: number; data?: Record<string, number | string> }[] = [
    { id: 'flourSpike', w: 1 },
    { id: 'disruption', w: 0.8 },
    { id: 'inspection', w: 0.8 },
    { id: 'construction', w: 0.4 },
    { id: 'premiumSale', w: 0.8 },
    { id: 'blogger', w: 0.8 },
    { id: 'influencer', w: 0.7 },
    { id: 'festival', w: festivalsOn(day).length ? 0 : 0.6 },
    { id: 'catering', w: 1, data: { qty: 25 + Math.floor(rand() * 25), pay: scaled(s, 140 + Math.floor(rand() * 120)) } },
    { id: 'heatwave', w: d.season === 'hot' ? 1 : 0 },
    { id: 'rainySeason', w: d.season === 'rainy' ? 1 : 0 },
    { id: 'eggShortage', w: 0.4 },
    { id: 'fruitFest', w: d.season === 'warm' ? 0.8 : 0.2 },
    { id: 'greenWeek', w: 0.4 },
  ];
  const avgSat = s.history.slice(-5).reduce((t, h) => t + h.satisfaction, 0) / Math.max(1, Math.min(5, s.history.length));
  if (avgSat > 0.7) pool.push({ id: 'viral', w: 0.6 });
  if (s.equipment.length) pool.push({ id: 'equipmentFailure', w: 0.5 + s.equipment.filter((e) => day - e.boughtDay > 720).length * 0.4 });
  const staffer = s.staff.find((e) => day - e.hiredDay > 60 && e.morale < 75);
  if (staffer) pool.push({ id: 'raiseRequest', w: 0.8, data: { staff: staffer.id } });
  const discounter = activeRivals(s).find((c) => c.strategy === 'discount' || c.strategy === 'chain');
  if (discounter) pool.push({ id: 'priceWar', w: 0.5 * DIFFICULTY[s.difficulty].competitorAggression, data: { rival: discounter.id } });
  if (level >= 3) pool.push({ id: 'wholesale', w: 0.6, data: { product: 'flan', qty: 10 + Math.floor(rand() * 10), price: round2(s.prices.flan * 0.62) } });
  const total = pool.reduce((t, e) => t + e.w, 0);
  let r = rand() * total;
  for (const e of pool) {
    r -= e.w;
    if (r <= 0) return { id: e.id, data: e.data };
  }
  return null;
}
