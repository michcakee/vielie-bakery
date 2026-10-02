import { DIFFICULTY, ECON } from '../data/config';
import { balanceSheet, incomeStatement, sumBooks } from './accounting';
import { creditLineRate } from './economy';
import { clamp, pmt, round2 } from './util';
import type { GameState, Loan } from './types';

// ---------------------------------------------------------------- credit

/** 'low', 'medium' or 'high' risk, from history, debt and cash. */
export function creditRisk(s: GameState): 'low' | 'medium' | 'high' {
  const bs = balanceSheet(s);
  const recent = s.history.slice(-30);
  const profit = recent.length ? incomeStatement(sumBooks(recent)).netProfit : 0;
  const debt = bs.loans + bs.creditLine + bs.bonds;
  const missed = s.loans.reduce((t, l) => t + l.missed, 0);
  let score = 0;
  if (recent.length < 14) score += 1;
  if (profit < 0) score += 1;
  if (bs.equity > 0 && debt / bs.equity > 1.5) score += 1;
  if (bs.equity <= 0) score += 2;
  score += missed;
  return score <= 0 ? 'low' : score <= 2 ? 'medium' : 'high';
}

export function loanRate(s: GameState): number {
  return round2((s.macro.rate + ECON.finance.loanSpread[creditRisk(s)] + DIFFICULTY[s.difficulty].loanSpread) * 10000) / 10000;
}

/** How much a bank will lend in total, based on recent sales. */
export function borrowingLimit(s: GameState): number {
  const recent = s.history.slice(-30);
  const revenue = recent.reduce((t, h) => t + h.revenue, 0) * (30 / Math.max(1, recent.length));
  const risk = creditRisk(s);
  const mult = risk === 'low' ? 4 : risk === 'medium' ? 2.5 : 1;
  const existing = s.loans.reduce((t, l) => t + l.balance, 0);
  return Math.max(0, Math.round((Math.max(3000, revenue * mult) - existing) / 500) * 500);
}

export interface LoanQuote {
  principal: number;
  rate: number;
  termMonths: number;
  payment: number;
  totalInterest: number;
}

export function quoteLoan(s: GameState, principal: number, termMonths: number): LoanQuote {
  const rate = loanRate(s);
  const payment = round2(pmt(principal, rate / 12, termMonths));
  return { principal, rate, termMonths, payment, totalInterest: round2(payment * termMonths - principal) };
}

export function makeLoan(id: number, q: LoanQuote, day: number, lender = 'Saigon Community Bank'): Loan {
  return { id, lender, principal: q.principal, balance: q.principal, rate: q.rate, termMonths: q.termMonths, payment: q.payment, monthsLeft: q.termMonths, accrued: 0, missed: 0, takenDay: day, interestPaid: 0 };
}

export function creditLimit(s: GameState): number {
  const recent = s.history.slice(-30);
  const revenue = recent.reduce((t, h) => t + h.revenue, 0);
  return Math.round(ECON.finance.creditLineBase + ECON.finance.creditLineRevenueShare * revenue);
}

export { creditLineRate };

// ---------------------------------------------------------------- valuation

export interface Valuation {
  ebitdaAnnual: number;
  multiple: number;
  enterprise: number;
  assetValue: number;
  equityValue: number;
  ownerValue: number;
  growth: number;
}

/** A simple, explainable valuation: annual cash earnings × a multiple, but never below the assets. */
export function valuation(s: GameState): Valuation {
  const last90 = s.history.slice(-90);
  const prev90 = s.history.slice(-180, -90);
  const is = incomeStatement(sumBooks(last90));
  const ebitda = is.operatingProfit + sumBooks(last90).depreciation;
  const ebitdaAnnual = last90.length ? (ebitda * 360) / last90.length : 0;
  const revNow = last90.reduce((t, h) => t + h.revenue, 0) / Math.max(1, last90.length);
  const revPrev = prev90.length ? prev90.reduce((t, h) => t + h.revenue, 0) / prev90.length : revNow;
  const growth = revPrev > 0 ? clamp(revNow / revPrev - 1, -0.5, 1) : 0;
  const v = ECON.valuation;
  const multiple = clamp(v.baseMultiple + v.growthWeight * growth + (v.reputationWeight * (s.reputation - 50)) / 50 + v.regimeAdj[s.macro.regime] + 0.2 * s.branches.filter((b) => !b.closed).length, 1, 8);
  const bs = balanceSheet(s);
  const debt = bs.loans + bs.creditLine + bs.bonds + bs.accruedInterest;
  const assetValue = bs.equipment * 0.6 + bs.inventory * 0.5 + bs.deposits;
  const enterprise = Math.max(assetValue, ebitdaAnnual * multiple);
  const equityValue = enterprise + bs.cash + bs.safetyFund - debt;
  return { ebitdaAnnual, multiple, enterprise, assetValue, equityValue, ownerValue: equityValue * (1 - bs.investorStake), growth };
}

/** Investors want a slice of a business worth something. */
export function investorTerms(s: GameState, amount: number): { stake: number; preMoney: number } | null {
  const v = valuation(s);
  const preMoney = Math.max(v.equityValue, 15000);
  if (s.history.length < 30) return null;
  const stake = amount / (preMoney + amount);
  const existing = s.investors.reduce((t, i) => t + i.stake, 0);
  if (existing + stake > 0.49) return null;
  return { stake: round2(stake * 1000) / 1000, preMoney };
}

export function bondCapacity(s: GameState): number {
  if (s.community < 50) return 0;
  const outstanding = s.bonds.reduce((t, b) => t + b.amount, 0);
  return Math.max(0, Math.round((s.community * ECON.finance.bondPerCommunityPoint - outstanding) / 100) * 100);
}
