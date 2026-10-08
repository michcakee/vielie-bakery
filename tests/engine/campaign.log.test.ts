import { writeFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { it } from 'vitest';
import { DECOR, DECOR_ORDER, INGREDIENTS, LEVELS, PRODUCTS, UPGRADES } from '../../src/data/catalog';
import { COSMETICS, owns, starsToSpend } from '../../src/data/cosmetics';
import { FEATURE } from '../../src/data/unlocks';
import { balanceSheet } from '../../src/engine/accounting';
import { canBakeTray, levelOf, rent, onMenu, trayCapacity } from '../../src/engine/economy';
import { EVENTS, visibleChoices } from '../../src/engine/events';
import { activeQuests, QUESTS } from '../../src/engine/progression';
import { createNewGame, gameReducer, type Action } from '../../src/engine/state';
import type { GameState, IngredientId, ProductId, UpgradeId } from '../../src/engine/types';
import { featureOn } from '../../src/engine/unlocks';

/**
 * A long, hands-on campaign: a keen player who follows Bà's lessons, serves at a realistic tapping
 * speed, hires, buys equipment, nudges prices and spends stars. It logs everything new each day and
 * flags anything broken, stuck or repetitive. Opt-in: CAMPAIGN=1 npx vitest run tests/engine/campaign.log.test.ts
 */

type Flag = { day: number; kind: string; text: string };

export function play(seed: number, maxDays: number, style: 'keen' | 'casual') {
  const flags: Flag[] = [];
  const lines: string[] = [];
  const flag = (s: GameState, kind: string, text: string) => flags.push({ day: s.day, kind, text });
  let s = createNewGame({ seed, guided: true });
  const phase = () => s.phase as string;
  const apply = (a: Action): void => {
    try {
      s = gameReducer(s, a);
    } catch (e) {
      flag(s, 'CRASH', `${a.type} threw: ${(e as Error).message}`);
    }
  };
  apply({ type: 'setup', name: 'Campaign', look: s.look, player: 'Tester' });

  let lastNewDay = 1;
  let introSince: Record<string, number> = {};
  const soldOutStreak: Partial<Record<ProductId, number>> = {};
  const lostPriceStreak: Partial<Record<ProductId, number>> = {};
  let michcakeDay = 0;
  const firstSeen: Record<string, number> = {};
  let tappedOrders = 0;
  let tappedDays = 0;
  let maxQueueWait = 0;

  for (let d = 0; d < maxDays && s.phase !== 'ended'; d++) {
    const day = s.day;
    const before = { unlocked: [...s.unlocked], features: [...(s.features ?? [])], quests: [...s.quests], level: levelOf(s.xp), decor: [...s.decor], regulars: [...(s.unlockedRegulars ?? [])], ach: [...s.achievements] };
    const news: string[] = [];

    // ---- events: a thoughtful player picks a sensible middle option
    let guard = 0;
    while (s.events.length && guard++ < 6) {
      const ev = s.events[0];
      news.push(`event:${ev.id}`);
      if (ev.id === 'bailout') {
        apply({ type: 'resolveEvent', choice: 'accept' });
        continue;
      }
      const def = EVENTS[ev.id];
      if (!def) {
        flag(s, 'BUG', `event ${ev.id} has no definition`);
        s = { ...s, events: s.events.slice(1) };
        continue;
      }
      const choices = visibleChoices(def, s).filter((c) => (!c.enabled || c.enabled(s)) && (c.cost === undefined || s.cash >= c.cost));
      if (!choices.length) flag(s, 'BUG', `event ${ev.id}: no choice the player can take`);
      const c = choices[Math.min(choices.length - 1, (day + guard) % Math.max(1, choices.length))];
      const n = s.events.length;
      apply({ type: 'resolveEvent', choice: c?.id ?? 'skip' });
      if (s.events.length === n) {
        flag(s, 'BUG', `event ${ev.id}: choosing "${c?.id}" did not close it`);
        s = { ...s, events: s.events.slice(1) };
      }
    }
    if (s.phase === 'weekly') apply({ type: 'pickGoal', id: s.goalChoices[0] });
    if (s.phase !== 'morning') {
      flag(s, 'BUG', `morning expected, phase is ${s.phase}`);
      break;
    }

    // ---- lesson in progress: how long has it been open?
    const active = s.intro?.active;
    if (active) {
      introSince[active] ??= day;
      if (day - introSince[active] === 4) flag(s, 'STUCK', `lesson "${FEATURE[active].name}" still open after 4 days`);
    }

    // ---- shopping: enough for today's menu, with a little spare
    const menu = onMenu(s);
    const need = new Set<IngredientId>(['flour']);
    for (const p of menu) for (const id of Object.keys(PRODUCTS[p].recipe) as IngredientId[]) need.add(id);
    if (featureOn(s, 'market.wet'))
      for (const id of need) {
        let g = 0;
        while (s.pantry[id].qty < INGREDIENTS[id].pack * (style === 'keen' ? 2 : 1.2) && g++ < 4) {
          const q = s.pantry[id].qty;
          apply({ type: 'buy', ingredient: id, supplier: 'cho', packs: 1 });
          if (s.pantry[id].qty === q) break;
        }
      }

    // ---- prices: sold out three days running → +5%; three days of "too pricey" → −5%
    if (featureOn(s, 'kitchen.prices') && style === 'keen') {
      const last = s.history[s.history.length - 1];
      for (const p of menu) {
        soldOutStreak[p] = last && (last.wished?.[p] ?? 0) >= 3 ? (soldOutStreak[p] ?? 0) + 1 : 0;
        lostPriceStreak[p] = last && last.lostPrice / Math.max(1, last.customers) > 0.15 ? (lostPriceStreak[p] ?? 0) + 1 : 0;
        if ((soldOutStreak[p] ?? 0) >= 3) {
          apply({ type: 'setPrice', product: p, price: Math.round(s.prices[p] * 1.05 * 4) / 4 });
          soldOutStreak[p] = 0;
        } else if ((lostPriceStreak[p] ?? 0) >= 3) {
          apply({ type: 'setPrice', product: p, price: Math.max(0.5, Math.round(s.prices[p] * 0.95 * 4) / 4) });
          lostPriceStreak[p] = 0;
        }
      }
    }

    // ---- growth: hire when people give up waiting, buy what's affordable, decorate, spend stars.
    // A sensible player keeps next month's rent and a week of wages in the drawer first.
    const wagesPerDay = s.staff.reduce((t, e) => t + e.wage * 8 * 1.1, 0);
    const reserve = rent(s) * 30 + wagesPerDay * 7;
    const recent = s.history.slice(-5);
    const lostSlow = recent.length ? recent.reduce((t, h) => t + h.lostSlow, 0) / recent.length : 0;
    if (featureOn(s, 'staff.hire') && s.applicants.length && lostSlow >= 3 && s.staff.length < 1 + Math.floor(levelOf(s.xp) / 2) && s.cash > 1500 + reserve) {
      const a = s.applicants.find((x) => x.name === 'Kevin Nguyen') ?? s.applicants.find((x) => ['helper', 'cashier', 'cook', 'barista'].includes(x.role)) ?? s.applicants[0];
      const n = s.staff.length;
      apply({ type: 'hire', applicantId: a.id });
      if (s.staff.length > n) news.push(`hired:${a.name}(${a.role})`);
    }
    if (featureOn(s, 'growth.equipment')) {
      const want: UpgradeId[] = ['fridge', 'display', 'oven2', 'fan', 'mixer', 'coffeeBar', 'pos', 'steamer', 'storage', 'compost', 'website', 'corner', 'renovation', 'oven3', 'solar', 'garden', 'walkIn', 'loft'];
      for (const id of want) {
        const u = UPGRADES[id];
        if (s.upgrades.includes(id) || u.level > levelOf(s.xp) || (u.requires && !s.upgrades.includes(u.requires))) continue;
        if (s.cash > u.cost * (style === 'keen' ? 1.8 : 3) + 1500 + reserve) {
          const n = s.equipment.length;
          apply({ type: 'buyUpgrade', id });
          if (s.equipment.length > n) news.push(`bought:${id}`);
          break;
        }
      }
    }
    if (featureOn(s, 'growth.decor'))
      for (const id of DECOR_ORDER)
        if (!s.decor.includes(id) && DECOR[id].level <= levelOf(s.xp) && s.cash > DECOR[id].cost * 6 + 2000 + reserve) {
          apply({ type: 'buyDecor', id });
          if (s.decor.includes(id)) news.push(`decor:${id}`);
          break;
        }
    for (const c of COSMETICS)
      if (!owns(s, c.id) && starsToSpend(s) >= c.cost) {
        apply({ type: 'buyCosmetic', id: c.id });
        if (owns(s, c.id)) news.push(`cosmetic:${c.id}`);
        break;
      }

    // ---- bake: baguettes, then trays for what's on the menu, by hand (keen) or quick
    const cap = trayCapacity(s);
    for (let i = 0; i < 2; i++) if (s.baguettes.qty < 14 && canBakeTray(s, { flour: 3 })) apply({ type: 'bake', item: 'baguette', process: 88 });
    const trays = menu.filter((p) => PRODUCTS[p].kind === 'tray');
    let baked = 0;
    for (let round = 0; round < 3 && s.traysToday < cap; round++)
      for (const p of trays) {
        if (s.traysToday >= cap) break;
        if (s.display[p].qty < 10 * (round + 1) && canBakeTray(s, PRODUCTS[p].recipe)) {
          apply({ type: 'bake', item: p, process: style === 'keen' ? 90 : 75 });
          baked++;
        }
      }
    if (trays.length && baked === 0 && trays.every((p) => s.display[p].qty === 0)) flag(s, 'STUCK', `nothing baked and the case is empty (cash $${Math.round(s.cash)})`);

    // ---- open and serve like a person: one order at a time
    const queueBefore = s.today.customers;
    apply({ type: 'open' });
    let busyUntil = 0;
    let orders = 0;
    let g2 = 0;
    while (phase() === 'service' && g2++ < 1200) {
      apply({ type: 'tick', minutes: 2 });
      if (phase() !== 'service') break;
      const clock = s.service!.clock;
      if (clock >= 600 && !s.service!.lastCall) apply({ type: 'lastCall', on: true });
      if (clock < busyUntil) continue;
      const waiting = s.service!.visits.filter((x) => x.status === 'waiting' && !x.servedBy);
      for (const w of waiting) maxQueueWait = Math.max(maxQueueWait, clock - (w.waitStart ?? clock));
      const v = waiting.sort((a, b) => (a.waitStart ?? 0) - (b.waitStart ?? 0))[0];
      if (!v) continue;
      const tray = PRODUCTS[v.wants].kind === 'tray';
      orders++;
      apply({ type: 'serve', visitId: v.id, process: tray ? undefined : orders % 6 === 0 ? 80 : 100 });
      busyUntil = clock + (tray ? 8 : 36) * (style === 'keen' ? 1 : 1.4);
    }
    tappedOrders += orders;
    tappedDays++;
    if (phase() === 'service') flag(s, 'BUG', 'service never ended');
    for (const k of Object.keys(s.leftoverPlan) as (ProductId | 'baguette')[]) apply({ type: 'leftover', key: k, choice: 'donate' });
    if (phase() === 'closing') apply({ type: 'finishDay' });
    const rep = s.lastReport;
    const h = s.history[s.history.length - 1];
    if (phase() === 'report') apply({ type: 'nextDay' });
    if (phase() === 'weekly') apply({ type: 'pickGoal', id: s.goalChoices[0] });

    // ---- what was new today?
    for (const p of s.unlocked) if (!before.unlocked.includes(p)) news.push(`recipe:${p}`);
    for (const f of s.features ?? []) if (!before.features.includes(f)) news.push(`feature:${f}`);
    for (const q of s.quests) if (!before.quests.includes(q)) news.push(`quest:${q}`);
    for (const a of s.achievements) if (!before.ach.includes(a)) news.push(`achievement:${a}`);
    for (const r of s.unlockedRegulars ?? []) if (!before.regulars.includes(r)) news.push(`regular:${r}`);
    if (levelOf(s.xp) > before.level) news.push(`LEVEL ${levelOf(s.xp)}`);
    if (s.unlocked.includes('michcake') && !michcakeDay) michcakeDay = day;
    for (const n of news) firstSeen[n.split(':')[0]] ??= day;
    const meaningful = news.filter((n) => !n.startsWith('event:') || true);
    if (meaningful.length) lastNewDay = day;
    else if (day - lastNewDay === 7) flag(s, 'BORING', `a week with nothing new (since day ${lastNewDay})`);

    // ---- sanity
    const bad: string[] = [];
    const walk = (v: unknown, path: string, depth = 0) => {
      if (depth > 6 || bad.length > 3) return;
      if (typeof v === 'number' && !Number.isFinite(v)) bad.push(path);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, depth + 1);
    };
    walk({ ...s, history: s.history.slice(-1), months: s.months.slice(-1) }, 's');
    if (bad.length) flag(s, 'BUG', `non-finite numbers: ${bad.join(', ')}`);
    for (const [id, p] of Object.entries(s.pantry)) if (p.qty < -1e-9) flag(s, 'BUG', `negative pantry ${id}`);
    const bs = balanceSheet(s);
    if (!Number.isFinite(bs.equity)) flag(s, 'BUG', 'balance sheet equity not finite');

    lines.push(
      `d${String(day).padStart(3)} L${levelOf(s.xp)} xp${Math.round(s.xp)} cash$${Math.round(s.cash)} rev$${Math.round(h?.revenue ?? 0)} profit$${Math.round(h?.profit ?? 0)} ★${rep?.stars ?? '-'} cust${h?.customers ?? 0} served${h?.served ?? 0} lostSlow${h?.lostSlow ?? 0} lostPrice${h?.lostPrice ?? 0} soldOut${h?.lostSoldOut ?? 0} orders${orders} staff${s.staff.length} menu${onMenu(s).length} ${news.join(' ')}${s.intro?.active ? ` [lesson:${s.intro.active}]` : ''}`,
    );
    void queueBefore;
  }
  const quests = QUESTS.filter((q) => !s.quests.includes(q.id)).map((q) => q.id);
  return {
    s,
    flags,
    lines,
    summary: {
      seed,
      style,
      days: s.day,
      level: levelOf(s.xp),
      levelName: LEVELS[levelOf(s.xp) - 1].name,
      cash: Math.round(s.cash),
      michcakeDay,
      firstSeen,
      questsLeft: quests,
      activeQuests: activeQuests(s).map((q) => q.id),
      achievements: s.achievements.length,
      ending: s.ending?.kind ?? null,
      avgOrdersTapped: Math.round(tappedOrders / Math.max(1, tappedDays)),
      maxQueueWait: Math.round(maxQueueWait),
      stars: s.questProgress.stars ?? 0,
      cosmetics: s.cosmetics?.length ?? 0,
      staff: s.staff.map((e) => `${e.name}/${e.role}`),
      upgrades: s.upgrades,
      unlocked: s.unlocked.length,
      lessonsLeft: Object.keys(FEATURE).filter((f) => !(s.features ?? []).includes(f as never)),
    },
  };
}

it.runIf(!!process.env.CAMPAIGN)(
  'campaign',
  () => {
    const out: string[] = [];
    const runs = [play(2026, 420, 'keen'), play(77, 420, 'casual'), play(5, 250, 'keen')];
    for (const r of runs) {
      out.push(`==== seed ${r.summary.seed} ${r.summary.style}`, JSON.stringify(r.summary, null, 1), '-- flags', ...r.flags.map((f) => `d${f.day} ${f.kind} ${f.text}`), '-- days', ...r.lines);
    }
    writeFileSync(process.env.CAMPAIGN_OUT ?? 'campaign.log', out.join('\n'));
  },
  1_200_000,
);

// Opt-in: SAVE_AT=70 SAVE_OUT=path writes a restore code for a mid-game bakery, to look at in the browser.
it.runIf(!!process.env.SAVE_OUT)('mid-game save', () => {
  const { s } = play(2026, Number(process.env.SAVE_AT ?? 70), 'keen');
  const lean = { ...s, toasts: [], history: s.history.slice(-60), ecoHistory: s.ecoHistory.slice(-7), service: null, lastReport: null };
  const code = 'z' + deflateRawSync(Buffer.from(JSON.stringify(lean))).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  writeFileSync(process.env.SAVE_OUT!, code);
}, 300_000);
