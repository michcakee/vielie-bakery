import { move } from './accounting';
import type { EventChoice, EventDef } from './events';
import { addEffect, bump, spend, toast } from './helpers';
import type { GameState, StoryState } from './types';

/**
 * The Lantern Festival story (about days 36 to 61): Golden Crust, a big bakery chain, wants
 * Bà's shop. The lane will pick its favourite bakery at the festival. Every chapter is one
 * card with a choice; good days in between win "lane hearts" too. Nobody loses badly.
 */
export const ARC = {
  startDay: 36,
  /** Days from each chapter to the next. */
  gaps: [3, 3, 4, 3, 3, 3, 3, 2, 1],
  /** Lane hearts needed to win the Golden Whisk. */
  win: 16,
  /** Hearts for a 2-star day during the story, and for a 2-star festival day. */
  dayHearts: 1,
  festivalHearts: 3,
  chapters: 10,
};

export const ARC_TITLES = [
  'A visitor in a shiny car',
  'Free samples across the street',
  'The copycat flan',
  'The school fair',
  'A sneaky job offer',
  'Bà calls',
  'The lane helps out',
  'The night before',
  'The Lantern Festival',
  'The lane decides',
];

const id = (i: number) => `arc${i}`;

export function storyActive(s: Pick<GameState, 'story'>): boolean {
  return !!s.story && !s.story.result;
}

/** Move the story on: add hearts, point at the next chapter. */
function turn(s: GameState, hearts: number, patch: Partial<StoryState> = {}): GameState {
  const st = s.story ?? { start: s.day, chapter: 0, nextDay: s.day, hearts: 0 };
  const chapter = st.chapter + 1;
  return { ...s, story: { ...st, ...patch, chapter, hearts: st.hearts + hearts, nextDay: s.day + (ARC.gaps[st.chapter] ?? 999) } };
}

const pay = (s: GameState, cost: number, then: (x: GameState) => GameState): GameState => {
  const after = spend(s, cost, false, 'marketing');
  return after ? then(after) : s;
};
const scaled = (s: GameState, n: number) => Math.round(n * s.macro.priceIndex);
const cashText = (s: GameState, n: number) => `$${scaled(s, n)}`;
const hearts = (n: number) => (n === 0 ? 'No lane hearts.' : `+${n} lane heart${n === 1 ? '' : 's'}.`);

export const ARC_DISHES = [
  { id: 'banhMi', name: 'Bánh mì', why: 'Crunchy, fresh, and everyone on the lane grew up on it.' },
  { id: 'flan', name: 'Bánh flan', why: 'Bà’s own recipe. Slow, wobbly and perfect.' },
  { id: 'caPhe', name: 'Cà phê sữa đá', why: 'Strong, sweet and cold. The lane runs on it.' },
];

function chapter(i: number, vi: string, icon: EventDef['icon'], text: (s: GameState) => string, choices: (s: GameState) => EventChoice[]): EventDef {
  return { id: id(i), icon, title: ARC_TITLES[i], vi, text, choices };
}

const CHAPTERS: EventDef[] = [
  chapter(
    0,
    'Vị khách đi xe bóng loáng',
    'shop',
    (s) =>
      `A man in a suit steps out of a shiny car. “I’m Mr. Vũ, from Golden Crust. We have 40 bakeries. I’d like to buy ${s.bakeryName} and make it number 41.” He looks around. “No? Then we’ll open across the street. The Lantern Festival is in about three weeks, and the lane votes for its favourite bakery. May the best one win.”`,
    () => [
      { id: 'no', label: '“This is Bà’s bakery. It’s not for sale!”', detail: `The neighbours overhear and cheer. ${hearts(1)} Every 2-star day from now on wins a lane heart too.`, apply: (x) => turn(x, 1) },
      { id: 'ask', label: 'Call Bà and ask what she thinks', detail: `Bà laughs. “Sell? Never. Show him what a real bakery is.” ${hearts(1)}`, apply: (x) => turn({ ...x, xp: x.xp + 10 }, 1) },
    ],
  ),
  chapter(
    1,
    'Phát bánh miễn phí',
    'sale',
    () => 'Golden Crust has set up a stall across the street, handing out free samples in gold paper. A few of your customers wander over to look.',
    (s) => [
      { id: 'samples', label: `Hand out your own samples (${cashText(s, 20)})`, detail: `Warm from the oven beats gold paper. ${hearts(2)}`, cost: scaled(s, 20), apply: (x) => pay(x, scaled(x, 20), (y) => turn(y, 2)) },
      { id: 'sign', label: 'Paint a sign: “Baked here every morning”', detail: `Free, and true. ${hearts(1)}`, apply: (x) => turn(x, 1) },
      { id: 'ignore', label: 'Ignore them and keep baking', detail: hearts(0), apply: (x) => turn(x, 0) },
    ],
  ),
  chapter(
    2,
    'Flan nhái',
    'egg',
    () => 'Chú Hùng hurries in. “They’re selling flan now! Cheaper than yours. It comes from a factory in a plastic cup.” He makes a face.',
    () => [
      { id: 'better', label: 'Keep your price and bake it better', detail: `People taste the difference. Reputation +1. ${hearts(1)}`, apply: (x) => turn({ ...x, reputation: bump(x.reputation, 1) }, 1) },
      { id: 'friends', label: 'Ask your regulars to bring a friend', detail: `Word of mouth is free. Community +2. ${hearts(2)}`, apply: (x) => turn({ ...x, community: bump(x.community, 2) }, 2) },
      { id: 'worry', label: 'Worry about it', detail: `Worrying bakes nothing. ${hearts(0)}`, apply: (x) => turn(x, 0) },
    ],
  ),
  chapter(
    3,
    'Hội chợ trường học',
    'people',
    () => 'A teacher from the school on the corner stops by. “Our school fair is this week. Could the bakery bring something for the children?”',
    (s) => [
      { id: 'donate', label: `Donate a tray of treats (${cashText(s, 15)} of ingredients)`, detail: `The whole school learns your name. Community +3. ${hearts(2)}`, cost: scaled(s, 15), apply: (x) => pay(x, scaled(x, 15), (y) => turn({ ...y, community: bump(y.community, 3) }, 2)) },
      { id: 'half', label: 'Sell them a tray at half price', detail: `A fair deal, and you earn ${cashText(s, 20)}. ${hearts(1)}`, apply: (x) => turn(move(x, 'cashOperatingOther', scaled(x, 20), { otherIncome: scaled(x, 20) }), 1) },
      { id: 'busy', label: '“Sorry, we’re too busy.”', detail: hearts(0), apply: (x) => turn(x, 0) },
    ],
  ),
  chapter(
    4,
    'Lời mời lén lút',
    'phone',
    (s) => {
      const e = s.staff.find((x) => x.branch === null);
      return e
        ? `${e.name} looks nervous. “Mr. Vũ offered me a job at Golden Crust. More money. I said I’d think about it… but I like it here.”`
        : 'Mr. Vũ is back. “You work so hard, all alone. Come and manage my new shop instead. Air conditioning! A gold name tag!”';
    },
    (s) => {
      const e = s.staff.find((x) => x.branch === null);
      if (!e) return [{ id: 'stay', label: '“No thank you. I have a bakery to run.”', detail: hearts(1), apply: (x) => turn(x, 1) }];
      const lift = (x: GameState, by: number): GameState => ({ ...x, staff: x.staff.map((m) => (m.id === e.id ? { ...m, morale: Math.min(100, m.morale + by) } : m)) });
      return [
        { id: 'bonus', label: `Say thank you with a bonus (${cashText(s, 25)})`, detail: `${e.name} stays, and smiles all week. ${hearts(2)}`, cost: scaled(s, 25), apply: (x) => pay(x, scaled(x, 25), (y) => turn(lift(y, 15), 2)) },
        { id: 'team', label: '“We’re a team. I need you for the festival!”', detail: `${e.name} stays. ${hearts(1)}`, apply: (x) => turn(lift(x, 6), 1) },
      ];
    },
  ),
  chapter(
    5,
    'Bà gọi điện',
    'phone',
    () => 'The phone rings. It’s Bà. “Con, for the festival you bake ONE thing, and you bake it with your whole heart. What will it be?”',
    () => ARC_DISHES.map((d) => ({ id: d.id, label: d.name, detail: `${d.why} ${hearts(1)}`, apply: (x: GameState) => turn(x, 1, { dish: d.id }) })),
  ),
  chapter(
    6,
    'Cả xóm giúp một tay',
    'house',
    () => 'The neighbours have heard about the festival. Three of them are at the door, all talking at once. You can say yes to one.',
    () => [
      { id: 'banner', label: 'Chú Hùng paints a big banner', detail: `It’s a bit crooked. Everyone loves it. ${hearts(2)}`, apply: (x) => turn(x, 2) },
      { id: 'lanterns', label: 'Mai folds paper lanterns for the shop', detail: `The shop glows. ${hearts(2)}`, apply: (x) => turn(x.decor.includes('lanterns') ? x : { ...x, decor: [...x.decor, 'lanterns'] }, 2) },
      { id: 'office', label: 'Linh tells her whole office', detail: `New faces all week. Reputation +2. ${hearts(1)}`, apply: (x) => turn({ ...x, reputation: bump(x.reputation, 2) }, 1) },
    ],
  ),
  chapter(
    7,
    'Đêm trước lễ hội',
    'star',
    (s) => `Tomorrow is the Lantern Festival. Across the street, Golden Crust is hanging a gold banner three floors tall. Your ${ARC_DISHES.find((d) => d.id === s.story?.dish)?.name ?? 'bánh mì'} has to be perfect.`,
    (s) => [
      { id: 'practise', label: 'Practise the festival dish all evening', detail: `+20 XP. ${hearts(2)}`, apply: (x) => turn({ ...x, xp: x.xp + 20 }, 2) },
      { id: 'decorate', label: `Decorate the shopfront (${cashText(s, 30)})`, detail: `Ribbons, lights and flowers. ${hearts(2)}`, cost: scaled(s, 30), apply: (x) => pay(x, scaled(x, 30), (y) => turn(y, 2)) },
      { id: 'sleep', label: 'Go to bed early', detail: `A rested baker is a good baker. ${hearts(1)}`, apply: (x) => turn(x, 1) },
    ],
  ),
  chapter(
    8,
    'Lễ hội đèn lồng',
    'party',
    (s) => `Lanterns everywhere! The lane is closed to motorbikes and full of families. The judges will walk past tonight. You have ${s.story?.hearts ?? 0} lane hearts so far, and a 2-star day today wins ${ARC.festivalHearts} more. Bake plenty: a big crowd is coming!`,
    () => [{ id: 'open', label: 'Open the doors!', detail: 'About 60% more customers today.', apply: (x) => turn(addEffect(x, 'festival', 1), 0, { festivalDay: x.day }) }],
  ),
  chapter(
    9,
    'Cả xóm bình chọn',
    'star',
    (s) => {
      const n = s.story?.hearts ?? 0;
      return n >= ARC.win
        ? `The votes are in. “The lane’s favourite bakery, with ${n} hearts… ${s.bakeryName}!” The whole street cheers. Mr. Vũ walks over and shakes your hand. “I have 40 bakeries,” he says quietly, “and none of them has this.” Bà is crying and pretending she isn’t.`
        : `The votes are in. Golden Crust wins the big prize by a whisker, but the lane gives ${s.bakeryName} its own ribbon: “Our Bakery”. You got ${n} hearts. Mr. Vũ looks at the ribbon for a long time. “You can’t buy one of those,” he says. Bà squeezes your hand. “Next year, con.”`;
    },
    (s) => {
      const won = (s.story?.hearts ?? 0) >= ARC.win;
      const cash = scaled(s, won ? 200 : 80);
      const xp = won ? 150 : 80;
      return [
        {
          id: 'done',
          label: won ? 'Hold up the Golden Whisk!' : 'Pin the ribbon on the wall',
          detail: `${won ? 'The Golden Whisk trophy for your shop' : 'A ribbon for your shop'}, $${cash} prize money and +${xp} XP.`,
          apply: (x) => {
            let next = turn(x, 0, { result: won ? 'won' : 'second' });
            next = move(next, 'cashOperatingOther', cash, { otherIncome: cash });
            next = { ...next, xp: next.xp + xp, reputation: bump(next.reputation, won ? 3 : 1), community: bump(next.community, 3), decor: next.decor.includes('trophy') ? next.decor : [...next.decor, 'trophy'] };
            return toast(next, 'achievement', won ? 'Lantern Festival champion!' : 'The lane’s own bakery', 'The whole story is in your Collection book.');
          },
        },
      ];
    },
  ),
];

export const ARC_EVENTS: Record<string, EventDef> = Object.fromEntries(CHAPTERS.map((e) => [e.id, e]));

/** The story card due this morning, if any. Starts by itself on day 36 (or the next morning for older saves). */
export function arcEventFor(s: GameState, day: number): { id: string } | null {
  if (s.story?.result) return null;
  if (!s.story) return day >= ARC.startDay ? { id: id(0) } : null;
  if (s.story.chapter >= ARC.chapters || day < s.story.nextDay) return null;
  return { id: id(s.story.chapter) };
}

/** After closing: good days during the story win lane hearts. */
export function arcDayEnd(s: GameState, stars: number): GameState {
  const st = s.story;
  if (!st || st.result || st.chapter === 0 || stars < 2) return s;
  const festival = st.festivalDay === s.day;
  return { ...s, story: { ...st, hearts: st.hearts + (festival ? ARC.festivalHearts : ARC.dayHearts) } };
}
