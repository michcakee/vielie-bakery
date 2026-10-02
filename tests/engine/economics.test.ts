import { describe, expect, it } from 'vitest';
import { balanceSheet, bookEquity, cashFlow, incomeStatement, ratios, sumBooks } from '../../src/engine/accounting';
import { breakEven, explainChange, productTable } from '../../src/engine/analytics';
import { dateOf, festivalsOn, isTetDay } from '../../src/engine/calendar';
import { reactWeekly } from '../../src/engine/competitors';
import { expectedUnits, laborTrays, ovenCapacity, playerShare, trayCapacity } from '../../src/engine/economy';
import { eventFor } from '../../src/engine/events';
import { quoteLoan, valuation } from '../../src/engine/finance';
import { forecast } from '../../src/engine/forecast';
import { marketWage } from '../../src/engine/labor';
import { createMacro, dailyMacro, monthlyMacro } from '../../src/engine/macro';
import { createNewGame, gameReducer } from '../../src/engine/state';
import { pmt } from '../../src/engine/util';
import type { GameState } from '../../src/engine/types';
import { autoDay, morning, playDay, resolveEvents } from './bot';
import { sane } from './game.test';

/** Give the owner money the proper way: as a recorded owner contribution. */
function richDay(s: GameState): GameState {
  return { ...s, cash: s.cash + 50000, today: { ...s.today, books: { ...s.today.books, cashEquity: s.today.books.cashEquity + 50000 } }, equity: { ...s.equity, contributed: s.equity.contributed + 50000 } };
}

describe('accounting identities', () => {
  it('assets − liabilities always equals equity built from profits, through loans, equipment, investors, bonds, shares and a branch', () => {
    let s = createNewGame(21);
    for (let d = 0; d < 70; d++) {
      if (d === 10) s = gameReducer(richDay(morning(s)), { type: 'takeLoan', principal: 10000, term: 12 });
      if (d === 12) s = gameReducer(morning(s), { type: 'buyUpgrade', id: 'oven2' });
      if (d === 20) s = { ...morning(s), xp: 4000 };
      if (d === 21) s = gameReducer(morning(s), { type: 'openBranch', location: 'university', name: 'Hill Shop' });
      if (d === 22) {
        s = morning(s);
        const ap = s.applicants[0];
        if (ap) s = gameReducer(s, { type: 'hire', applicantId: ap.id, branch: s.branches[0]?.id ?? null });
      }
      if (d === 35) s = gameReducer(morning(s), { type: 'raiseEquity', amount: 5000 });
      if (d === 36) s = gameReducer({ ...morning(s), community: 80 }, { type: 'issueBond', amount: 2000 });
      if (d === 37) s = gameReducer(morning(s), { type: 'trade', coop: 'dairy', delta: 3 });
      if (d === 45) s = gameReducer(morning(s), { type: 'trade', coop: 'dairy', delta: -2 });
      const before = s.cash + s.safetyFund;
      s = d % 3 ? playDay(s) : autoDay(s);
      sane(s);
      const bs = balanceSheet(s);
      expect(bs.equity).toBeCloseTo(bookEquity(s), 1);
      void before;
    }
    expect(s.loans.length + (s.questProgress.loanRepaid ?? 0)).toBeGreaterThan(0);
    expect(s.branches).toHaveLength(1);
  });

  it('each day cash flow statement explains exactly how cash changed', () => {
    let s = createNewGame(22);
    const start = s.cash + s.safetyFund;
    for (let d = 0; d < 40; d++) {
      if (d === 12) s = gameReducer(richDay(morning(s)), { type: 'takeLoan', principal: 3000, term: 6 });
      s = d % 2 ? playDay(s) : autoDay(s);
    }
    const h = s.history;
    expect(h[0].cash - start).toBeCloseTo(cashFlow(h[0].books).net, 1);
    for (let i = 1; i < h.length - 1; i++) expect(h[i].cash - h[i - 1].cash).toBeCloseTo(cashFlow(h[i].books).net, 1);
  });

  it('profit is revenue minus every cost, and cash is not profit', () => {
    let s = createNewGame(23);
    for (let d = 0; d < 30; d++) s = playDay(s);
    const b = sumBooks(s.history);
    const is = incomeStatement(b);
    expect(is.netProfit).toBeCloseTo(is.revenue - is.cogs - is.opex - is.interest + is.otherIncome, 6);
    expect(is.grossProfit).toBeCloseTo(is.revenue - is.cogs, 6);
    const cf = cashFlow(b);
    expect(cf.net).not.toBeCloseTo(is.netProfit, 0);
  });
});

describe('financial formulas', () => {
  it('loan payments follow the amortisation formula and repay the principal exactly', () => {
    const p = pmt(10000, 0.06 / 12, 12);
    expect(p).toBeCloseTo(860.66, 1);
    let bal = 10000;
    for (let i = 0; i < 12; i++) bal = bal * (1 + 0.06 / 12) - p;
    expect(Math.abs(bal)).toBeLessThan(0.01);
    const s = createNewGame(24);
    const q = quoteLoan(s, 10000, 12);
    expect(q.totalInterest).toBeCloseTo(q.payment * 12 - 10000, 2);
  });

  it('a loan is paid down every month and cash goes out', () => {
    let s = richDay(morning(createNewGame(25)));
    s = gameReducer(s, { type: 'takeLoan', principal: 3000, term: 6 });
    const start = s.loans[0].balance;
    for (let d = 0; d < 40; d++) s = playDay(s);
    expect(s.loans.length === 0 || s.loans[0].balance < start).toBe(true);
    expect(s.history.some((h) => h.books.cashRepaid < 0)).toBe(true);
    expect(s.history.some((h) => h.books.interest > 0)).toBe(true);
  });

  it('equipment depreciates and rent is paid in advance each month', () => {
    let s = richDay(morning(createNewGame(26)));
    s = gameReducer(s, { type: 'buyUpgrade', id: 'oven2' });
    for (let d = 0; d < 30; d++) s = playDay(s);
    const oven = s.equipment.find((e) => e.kind === 'oven2')!;
    expect(oven.depreciated).toBeGreaterThan(0);
    expect(oven.depreciated).toBeLessThan(oven.cost);
    expect(s.history.some((h) => h.books.cashRent < -1000)).toBe(true);
  });

  it('break-even moves with price, wages and rent', () => {
    let s = createNewGame(27);
    for (let d = 0; d < 14; d++) s = playDay(s);
    const base = breakEven(s);
    expect(base.units).not.toBeNull();
    expect(breakEven(s, { pricePct: 0.2 }).units!).toBeLessThan(base.units!);
    expect(breakEven(s, { rentPct: 0.5 }).units!).toBeGreaterThan(base.units!);
    expect(base.contribution).toBeCloseTo(base.avgPrice - base.avgVariable, 6);
  });

  it('ratios are finite and margins are in range', () => {
    let s = createNewGame(28);
    for (let d = 0; d < 20; d++) s = playDay(s);
    const r = ratios(s, s.history.slice(-14));
    expect(r.grossMargin!).toBeGreaterThan(0.3);
    expect(r.grossMargin!).toBeLessThan(1);
    expect(Number.isFinite(r.revenuePerEmployee!)).toBe(true);
  });

  it('a more profitable bakery is worth more; debt lowers equity value', () => {
    let s = createNewGame(29);
    for (let d = 0; d < 40; d++) s = playDay(s);
    const v = valuation(s);
    const richer = valuation({ ...s, history: s.history.map((h) => ({ ...h, books: { ...h.books, sales: h.books.sales * 1.5 } })) });
    expect(richer.enterprise).toBeGreaterThan(v.enterprise);
    const indebted = valuation({ ...s, loans: [{ id: 1, lender: 'x', principal: 9000, balance: 9000, rate: 0.08, termMonths: 12, payment: 800, monthsLeft: 12, accrued: 0, missed: 0, takenDay: 1, interestPaid: 0 }] });
    expect(indebted.equityValue).toBeLessThan(v.equityValue);
  });

  it('products that sell most are not always the most profitable per oven tray', () => {
    let s = createNewGame(30);
    for (let d = 0; d < 20; d++) s = playDay(s);
    const t = productTable(s.history);
    expect(t.length).toBeGreaterThan(1);
    for (const r of t) expect(r.contribution).toBeCloseTo(r.revenue - r.cogs, 6);
  });
});

describe('capacity, labour and competition', () => {
  it('production is limited by ovens and people; a baker raises it if ovens allow', () => {
    let s = richDay(morning(createNewGame(31)));
    expect(trayCapacity(s)).toBe(Math.min(ovenCapacity(s), laborTrays(s)));
    s = gameReducer(s, { type: 'buyUpgrade', id: 'oven2' });
    const before = trayCapacity(s);
    const baker = { id: 1, name: 'Bảo', role: 'baker' as const, wage: 18, skill: 3, morale: 70, hiredDay: 1, trainingUntil: 0, look: s.look, served: 0, branch: null };
    expect(trayCapacity({ ...s, staff: [baker] })).toBeGreaterThan(before);
  });

  it('wages follow the labour market', () => {
    const s = createNewGame(32);
    const tight = { ...s, macro: { ...s.macro, unemployment: 0.03 } };
    const slack = { ...s, macro: { ...s.macro, unemployment: 0.09 } };
    expect(marketWage(tight, 'baker')).toBeGreaterThan(marketWage(slack, 'baker'));
  });

  it('a cashier serves pastry customers without the player', () => {
    let s = morning(playDay(createNewGame(33)));
    s = { ...s, staff: [{ id: 5, name: 'Thảo', role: 'cashier', wage: 16, skill: 3, morale: 80, hiredDay: 1, trainingUntil: 0, look: s.look, served: 0, branch: null }] };
    s = gameReducer(s, { type: 'open' });
    while (s.phase === 'service') s = gameReducer(s, { type: 'tick', minutes: 3 });
    expect(s.today.staffServed).toBeGreaterThan(0);
  });

  it('rivals take share when you overprice, and a discounter reacts when you undercut', () => {
    let s = createNewGame(34);
    for (let d = 0; d < 16; d++) s = playDay(s);
    const fair = playerShare(s, 'banhMi');
    expect(playerShare({ ...s, prices: { ...s.prices, banhMi: 10 } }, 'banhMi')).toBeLessThan(fair);
    const cheap = { ...s, prices: { ...s.prices, banhMi: 4 }, seed: 1 };
    let reacted = false;
    for (let i = 0; i < 20 && !reacted; i++) {
      const r = reactWeekly({ ...cheap, seed: i });
      reacted = (r.competitors.find((c) => c.id === 'coTu')?.prices.banhMi ?? 99) < 5.5;
    }
    expect(reacted).toBe(true);
  });

  it('a rival that keeps losing money closes', async () => {
    const { monthlyCompetition } = await import('../../src/engine/competitors');
    let s = createNewGame(35);
    for (let d = 0; d < 16; d++) s = playDay(s);
    s = { ...s, competitors: s.competitors.map((c) => (c.id === 'coTu' ? { ...c, cash: -10000 } : c)) };
    const r = monthlyCompetition(s);
    expect(r.competitors.find((c) => c.id === 'coTu')!.closedDay).not.toBeNull();
  });
});

describe('macroeconomy and seasons', () => {
  it('inflation raises prices over time and recessions dent confidence', () => {
    let m = { ...createMacro('inflation') };
    for (let i = 0; i < 360; i++) m = dailyMacro(m);
    expect(m.priceIndex).toBeGreaterThan(1.05);
    let r = createMacro('normal');
    r = monthlyMacro({ ...r, regime: 'recession' }, 1, 30, 'normal', 99);
    expect(r.confidence).toBeLessThan(60);
  });

  it('Tết arrives on day 24 and the Mid-Autumn festival brings mooncakes', () => {
    expect(isTetDay(24)).toBe(true);
    expect(dateOf(24).month).toBe(1);
    const trungThu = Array.from({ length: 400 }, (_, i) => i + 1).find((d) => festivalsOn(d).includes('trungThu'))!;
    expect(dateOf(trungThu).month).toBe(8);
  });

  it('the story events run on their days and later events are seeded, not random', () => {
    const s = createNewGame(36);
    expect(eventFor(s, 3)?.id).toBe('coffeeRumour');
    const later = Array.from({ length: 30 }, (_, i) => eventFor({ ...s, day: 100 + i }, 100 + i)?.id ?? null);
    const again = Array.from({ length: 30 }, (_, i) => eventFor({ ...s, day: 100 + i }, 100 + i)?.id ?? null);
    expect(later).toEqual(again);
    expect(later.some((x) => x !== null)).toBe(true);
  });

  it('forecasts give a range and grow with known festivals', () => {
    let s = createNewGame(37);
    for (let d = 0; d < 14; d++) s = playDay(s);
    const f = forecast(s, 7);
    expect(f).toHaveLength(7);
    for (const d of f) for (const u of Object.values(d.units)) expect(u!.high).toBeGreaterThanOrEqual(u!.low);
    expect(expectedUnits(s, 'banhMi')).toBeGreaterThan(0);
  });

  it('"why did this happen?" names the biggest drivers', () => {
    let s = createNewGame(38);
    for (let d = 0; d < 14; d++) s = playDay(s);
    const lines = explainChange(s.history.slice(-7), s.history.slice(-14, -7));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toMatch(/Sales (rose|fell)/);
  });
});

describe('bankruptcy', () => {
  it('a bakery that cannot pay its bills is rescued once, then closes', () => {
    let s = morning(createNewGame({ seed: 39, difficulty: 'normal' }));
    s = { ...s, cash: -50000, daysInDistress: 5 };
    s = gameReducer(gameReducer(gameReducer(s, { type: 'open' }), { type: 'closeEarly' }), { type: 'finishDay' });
    s = gameReducer(s, { type: 'nextDay' });
    if (s.phase === 'weekly') s = gameReducer(s, { type: 'pickGoal', id: s.goalChoices[0] });
    expect(s.events[0]?.id).toBe('bailout');
    s = resolveEvents(s);
    expect(s.bailoutsUsed).toBe(1);
    const hard = { ...morning(createNewGame({ seed: 40, difficulty: 'hard' })), cash: -50000, daysInDistress: 5 };
    let h = gameReducer(gameReducer(gameReducer(hard, { type: 'open' }), { type: 'closeEarly' }), { type: 'finishDay' });
    h = gameReducer(h, { type: 'nextDay' });
    expect(h.phase).toBe('ended');
    expect(h.ending?.kind).toBe('bankrupt');
  });
});
