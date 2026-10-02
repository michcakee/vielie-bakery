import { INGREDIENT_ORDER, PRODUCT_ORDER } from '../data/catalog';
import type { Books, DaySummary, GameState, ProductId } from './types';

export type CashField =
  | 'cashSales'
  | 'cashInventory'
  | 'cashOperatingOther'
  | 'cashRent'
  | 'cashWages'
  | 'cashInterest'
  | 'cashCapex'
  | 'cashInvestments'
  | 'cashBorrowed'
  | 'cashRepaid'
  | 'cashEquity'
  | 'cashDistributions';

export type PlField = Exclude<keyof Books, CashField>;

export function emptyBooks(): Books {
  return {
    sales: 0,
    tips: 0,
    otherRevenue: 0,
    cogs: 0,
    packaging: 0,
    wages: 0,
    rent: 0,
    utilities: 0,
    maintenance: 0,
    marketing: 0,
    waste: 0,
    spoilage: 0,
    depreciation: 0,
    otherExpense: 0,
    interest: 0,
    otherIncome: 0,
    cashSales: 0,
    cashInventory: 0,
    cashOperatingOther: 0,
    cashRent: 0,
    cashWages: 0,
    cashInterest: 0,
    cashCapex: 0,
    cashInvestments: 0,
    cashBorrowed: 0,
    cashRepaid: 0,
    cashEquity: 0,
    cashDistributions: 0,
  };
}

export function addBooks(a: Books, b: Partial<Books>): Books {
  const out = { ...a };
  for (const [k, v] of Object.entries(b) as [keyof Books, number][]) out[k] = (out[k] ?? 0) + (v ?? 0);
  return out;
}

/**
 * Move cash and record why. `amount` is signed: positive comes in, negative goes out.
 * `pl` records the matching income-statement lines (positive numbers).
 */
export function move(s: GameState, field: CashField, amount: number, pl: Partial<Record<PlField, number>> = {}): GameState {
  const books = addBooks(s.today.books, { [field]: amount, ...pl });
  return { ...s, cash: s.cash + amount, today: { ...s.today, books } };
}

/** Record income-statement lines that don't move cash (depreciation, waste, accrued interest…). */
export function accrue(s: GameState, pl: Partial<Record<PlField, number>>): GameState {
  return { ...s, today: { ...s.today, books: addBooks(s.today.books, pl) } };
}

// ------------------------------------------------------------------ income statement

export interface IncomeStatement {
  revenue: number;
  sales: number;
  tips: number;
  otherRevenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  opexLines: { key: string; label: string; value: number }[];
  operatingProfit: number;
  interest: number;
  otherIncome: number;
  netProfit: number;
}

export const OPEX_LINES: { key: keyof Books; label: string }[] = [
  { key: 'wages', label: 'Wages' },
  { key: 'rent', label: 'Rent' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'waste', label: 'Unsold & donated food' },
  { key: 'spoilage', label: 'Spoiled ingredients' },
  { key: 'depreciation', label: 'Depreciation' },
  { key: 'otherExpense', label: 'Other costs' },
];

export function incomeStatement(b: Books): IncomeStatement {
  const revenue = b.sales + b.tips + b.otherRevenue;
  const cogs = b.cogs + b.packaging;
  const grossProfit = revenue - cogs;
  const opexLines = OPEX_LINES.map((l) => ({ key: l.key, label: l.label, value: b[l.key] }));
  const opex = opexLines.reduce((t, l) => t + l.value, 0);
  const operatingProfit = grossProfit - opex;
  const netProfit = operatingProfit - b.interest + b.otherIncome;
  return { revenue, sales: b.sales, tips: b.tips, otherRevenue: b.otherRevenue, cogs, grossProfit, opex, opexLines, operatingProfit, interest: b.interest, otherIncome: b.otherIncome, netProfit };
}

export const netProfit = (b: Books) => incomeStatement(b).netProfit;

// ------------------------------------------------------------------ cash flow statement

export interface CashFlowStatement {
  operating: number;
  investing: number;
  financing: number;
  net: number;
  lines: { group: 'operating' | 'investing' | 'financing'; label: string; value: number }[];
}

export function cashFlow(b: Books): CashFlowStatement {
  const lines: CashFlowStatement['lines'] = [
    { group: 'operating', label: 'Cash from customers', value: b.cashSales },
    { group: 'operating', label: 'Ingredients bought', value: b.cashInventory },
    { group: 'operating', label: 'Wages paid', value: b.cashWages },
    { group: 'operating', label: 'Rent paid', value: b.cashRent },
    { group: 'operating', label: 'Interest paid', value: b.cashInterest },
    { group: 'operating', label: 'Other operating', value: b.cashOperatingOther },
    { group: 'investing', label: 'Equipment & rooms', value: b.cashCapex },
    { group: 'investing', label: 'Co-op shares', value: b.cashInvestments },
    { group: 'financing', label: 'Borrowed', value: b.cashBorrowed },
    { group: 'financing', label: 'Loan repayments', value: b.cashRepaid },
    { group: 'financing', label: 'Owner & investor money', value: b.cashEquity },
    { group: 'financing', label: 'Paid to investors', value: b.cashDistributions },
  ];
  const sum = (g: string) => lines.filter((l) => l.group === g).reduce((t, l) => t + l.value, 0);
  const operating = sum('operating');
  const investing = sum('investing');
  const financing = sum('financing');
  return { operating, investing, financing, net: operating + investing + financing, lines };
}

// ------------------------------------------------------------------ balance sheet

export interface BalanceSheet {
  cash: number;
  safetyFund: number;
  inventory: number;
  prepaidRent: number;
  equipment: number;
  investments: number;
  deposits: number;
  totalAssets: number;
  currentAssets: number;
  loans: number;
  creditLine: number;
  accruedInterest: number;
  bonds: number;
  totalLiabilities: number;
  currentLiabilities: number;
  equity: number;
  ownerEquity: number;
  investorStake: number;
}

export function inventoryValue(s: Pick<GameState, 'pantry' | 'display' | 'baguettes' | 'deliveries'>): number {
  let v = 0;
  for (const id of INGREDIENT_ORDER) v += s.pantry[id].qty * s.pantry[id].avgCost;
  for (const p of PRODUCT_ORDER) v += s.display[p].qty * s.display[p].unitCost;
  v += s.baguettes.qty * s.baguettes.unitCost;
  for (const d of s.deliveries) v += d.cost;
  return v;
}

export function equipmentValue(s: Pick<GameState, 'equipment' | 'branches'>): number {
  let v = 0;
  for (const e of s.equipment) v += e.cost - e.depreciated;
  for (const b of s.branches) if (!b.closed) v += b.fitOut;
  return Math.max(0, v);
}

export function balanceSheet(s: GameState): BalanceSheet {
  const inventory = inventoryValue(s);
  const equipment = equipmentValue(s);
  const investments = (Object.keys(s.shares) as (keyof GameState['shares'])[]).reduce((t, c) => t + s.shares[c] * s.shareCost[c], 0);
  const deposits = s.branches.filter((b) => !b.closed).reduce((t, b) => t + b.deposit, 0);
  const currentAssets = s.cash + s.safetyFund + inventory + s.prepaidRent;
  const totalAssets = currentAssets + equipment + investments + deposits;
  const loans = s.loans.reduce((t, l) => t + l.balance, 0);
  const bonds = s.bonds.reduce((t, b) => t + b.amount, 0);
  const accruedInterest = s.loans.reduce((t, l) => t + l.accrued, 0) + s.creditLine.accrued + s.bonds.reduce((t, b) => t + b.accrued, 0);
  const creditLine = s.creditLine.balance;
  const nextYearPrincipal = s.loans.reduce((t, l) => t + Math.min(l.balance, l.payment * 12), 0);
  const currentLiabilities = creditLine + accruedInterest + nextYearPrincipal + s.bonds.filter((b) => b.dueDay - s.day <= 360).reduce((t, b) => t + b.amount, 0);
  const totalLiabilities = loans + bonds + accruedInterest + creditLine;
  const equity = totalAssets - totalLiabilities;
  const investorStake = Math.min(0.95, s.investors.reduce((t, i) => t + i.stake, 0));
  return {
    cash: s.cash,
    safetyFund: s.safetyFund,
    inventory,
    prepaidRent: s.prepaidRent,
    equipment,
    investments,
    deposits,
    totalAssets,
    currentAssets,
    loans,
    creditLine,
    accruedInterest,
    bonds,
    totalLiabilities,
    currentLiabilities,
    equity,
    ownerEquity: equity * (1 - investorStake),
    investorStake,
  };
}

/** Equity built up from the other direction: what was put in plus what was earned. */
export function bookEquity(s: GameState): number {
  return s.equity.contributed + s.equity.retained + netProfit(s.today.books) - s.equity.distributions;
}

// ------------------------------------------------------------------ periods

export function sumBooks(days: Pick<DaySummary, 'books'>[]): Books {
  return days.reduce((t, d) => addBooks(t, d.books), emptyBooks());
}

export function productTotals(days: Pick<DaySummary, 'sold' | 'revenueBy' | 'cogsBy'>[]) {
  const out = {} as Record<ProductId, { units: number; revenue: number; cogs: number }>;
  for (const p of PRODUCT_ORDER) out[p] = { units: 0, revenue: 0, cogs: 0 };
  for (const d of days)
    for (const p of PRODUCT_ORDER) {
      out[p].units += d.sold[p] ?? 0;
      out[p].revenue += d.revenueBy?.[p] ?? 0;
      out[p].cogs += d.cogsBy?.[p] ?? 0;
    }
  return out;
}

// ------------------------------------------------------------------ ratios

export interface Ratios {
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  inventoryTurnover: number | null;
  roa: number | null;
  roic: number | null;
  revenuePerEmployee: number | null;
}

/** Ratios over a window of days, annualised where it matters. */
export function ratios(s: GameState, days: DaySummary[]): Ratios {
  const b = sumBooks(days);
  const is = incomeStatement(b);
  const bs = balanceSheet(s);
  const n = Math.max(1, days.length);
  const annual = 360 / n;
  const avgInv = days.length ? days.reduce((t, d) => t + d.inventoryValue, 0) / days.length : bs.inventory;
  const debt = bs.loans + bs.bonds + bs.creditLine;
  const invested = bs.equity + debt - bs.cash - bs.safetyFund;
  const people = 1 + s.staff.length;
  const safe = (num: number, den: number) => (Math.abs(den) > 1e-6 ? num / den : null);
  return {
    grossMargin: safe(is.grossProfit, is.revenue),
    operatingMargin: safe(is.operatingProfit, is.revenue),
    netMargin: safe(is.netProfit, is.revenue),
    currentRatio: safe(bs.currentAssets, bs.currentLiabilities),
    debtToEquity: bs.equity > 0 ? debt / bs.equity : null,
    inventoryTurnover: avgInv > 1 ? (b.cogs * annual) / avgInv : null,
    roa: safe(is.netProfit * annual, bs.totalAssets),
    roic: invested > 1 ? (is.operatingProfit * annual) / invested : null,
    revenuePerEmployee: (is.revenue * annual) / people,
  };
}

export const RATIO_TIPS: Record<keyof Ratios, { name: string; tip: string; good: string }> = {
  grossMargin: { name: 'Gross margin', tip: 'Of every dollar of sales, how much is left after ingredients and packaging.', good: 'Bakeries aim for 60–75%.' },
  operatingMargin: { name: 'Operating margin', tip: 'What\'s left after running the shop too: wages, rent, power, depreciation.', good: 'Above 10% is healthy for a small bakery.' },
  netMargin: { name: 'Net margin', tip: 'What the business keeps after everything, including interest.', good: 'Positive is the goal; 8%+ is strong.' },
  currentRatio: { name: 'Current ratio', tip: 'Short-term money you have ÷ short-term money you owe. Below 1 means bills could outrun cash.', good: 'Above 1.5 feels safe.' },
  debtToEquity: { name: 'Debt to equity', tip: 'How much is borrowed for every dollar the owners have in the business.', good: 'Below 1 is cautious; above 2 is risky.' },
  inventoryTurnover: { name: 'Inventory turnover', tip: 'How many times a year the pantry is used up and refilled. Higher means less money sitting on shelves.', good: 'Fresh bakeries turn stock 30+ times a year.' },
  roa: { name: 'Return on assets', tip: 'Yearly profit for every dollar of stuff the business owns.', good: 'Above 10% is good.' },
  roic: { name: 'Return on invested capital', tip: 'Yearly operating profit for every dollar invested in the business. Compare it with a loan\'s interest rate: if ROIC is higher, investing more pays.', good: 'Beat your borrowing rate.' },
  revenuePerEmployee: { name: 'Revenue per person', tip: 'Yearly sales for each person working (you included). Shows if the team is busy enough.', good: '$60k+ a year per person.' },
};
