/**
 * ECONOMIC_CONFIG: every tunable number in the simulation.
 * Money is in US dollars at Little Saigon–style prices; time is in game days
 * (7-day weeks, 30-day months, 12 months a year).
 */
export const ECON = {
  calendar: {
    daysPerMonth: 30,
    monthsPerYear: 12,
    /** Day 1 is month 12, day 8, so the first Tết arrives on day 24. */
    startYearDay: 338,
  },

  service: {
    dayMinutes: 720,
    openHour: 7,
    lastCallAt: 600,
    lastCallDiscount: 0.4,
    walkMinutes: 9,
    counterSlots: 4,
    basePatience: 95,
    substitutionChance: 0.55,
    priceStep: 0.25,
    maxPriceFactor: 2.5,
    minPriceFactor: 0.4,
    /** Tips follow the order grade: a share of the bill, capped, plus a little extra from regulars. */
    tips: { great: 0.15, good: 0.06, cap: 1.5, regularBonus: 0.5 },
    /** Hearts needed per loyalty badge; how much each badge raises a regular's visits; critic strictness and pay. */
    badges: { heartsPer: 5, max: 3, visitBoost: 0.12, criticStrict: 6, criticTipMult: 2, criticRep: { great: 1.5, bad: -1 } },
    /** One menu item pays more each day, from day 3. Customers accept the higher price: it's their special too. */
    dailySpecial: { mult: 1.5, fromDay: 3 },
    /** Occasional big orders with a generous tip, from level 2. */
    specialOrder: { chance: 0.35, qty: 3, budget: 1.5, patience: 1.4, tipShare: 0.4, fromLevel: 2 },
    /** Grade weights (accuracy, speed, quality) and star thresholds. */
    grade: { accuracy: 0.45, speed: 0.35, quality: 0.2, stars: [90, 75, 60, 40] },
    /** Minutes a generalist (the owner on autopilot) needs per order. */
    ownerMinutes: { tray: 1.6, drink: 3, sandwich: 3.6 },
    /** Specialist minutes per order at skill 3, full morale. */
    staffMinutes: { tray: 1.1, drink: 2.2, sandwich: 2.6 },
    ownerAutoQuality: 72,
  },

  demand: {
    /** Walk-ins per day for an average shop at reputation 50 in a 1.0-traffic neighbourhood. */
    baseWalkIns: 24,
    walkInsPerLevel: 6,
    budgetMean: 1.25,
    /** Spread of willingness to pay; divided by product elasticity × segment sensitivity. */
    budgetSigma: 0.2,
    reputationWTP: [0.9, 1.12] as [number, number],
    loyalWTP: 1.08,
    weekend: 1.18,
    friday: 1.06,
    lastCallShare: 0.15,
    /** Share of regulars who drift away each day (moving, habits, a rival's opening offer). ~1/70 days. */
    loyalChurn: 0.014,
    /** Extra daily churn per point of satisfaction below 0.75 (slow service, sold out, too pricey). */
    loyalChurnUnhappy: 0.06,
    /** A neighbourhood only has so many potential regulars: about this many days of foot traffic. */
    loyalCapDays: 4,
    ecoShare: 0.18,
    greenWeekEcoShare: 0.45,
    /** Logit weights for choosing between bakeries. */
    choice: { price: 3.2, quality: 1.5, reputation: 1.1, loyalty: 0.9, homeAdvantage: 0.7, marketing: 0.5 },
  },

  production: {
    ownerTrays: 4,
    bakerTraysBase: 2,
    bakerTraysPerSkill: 0.6,
    mixerBoost: 1.3,
    pastryChefQuality: 8,
    displayBase: 48,
  },

  inventory: {
    dryCapacity: 260,
    coldBase: 40,
    overflowSpoilMult: 3,
    bulkTiers: [
      [20, 0.15],
      [10, 0.1],
      [5, 0.05],
    ] as [number, number][],
    reorderBuffer: 1,
  },

  costs: {
    utilitiesBase: 12,
    utilitiesPerTray: 0.8,
    packaging: { plastic: 0.06, paper: 0.15, reusable: 0.26 },
    giftBox: 1.5,
    mooncakeBox: 0.8,
    priceLockFee: 15,
    priceLockDays: 7,
  },

  labor: {
    hoursPerShift: 8,
    payrollOverhead: 0.1,
    hiringCost: 150,
    trainingCost: 220,
    trainingDays: 3,
    quitMorale: 25,
    quitChance: 0.1,
    severanceDays: 3,
  },

  finance: {
    creditLineBase: 500,
    creditLineRevenueShare: 0.12,
    creditLineSpread: 0.16,
    loanSpread: { low: 0.025, medium: 0.045, high: 0.08 },
    loanTerms: [6, 12, 24, 36],
    latePaymentFee: 75,
    defaultMisses: 3,
    bondRate: 0.04,
    bondTermMonths: 12,
    bondPerCommunityPoint: 120,
    cashBuffer: 200,
    depreciationYears: { equipment: 5, building: 10, decor: 3 },
    bankruptcyDays: 3,
  },

  valuation: {
    /** Small owner-run shops sell for ~2–3× earnings, since the profit includes the owner's own unpaid work. */
    baseMultiple: 2.5,
    growthWeight: 4,
    reputationWeight: 0.6,
    regimeAdj: { normal: 0, boom: 0.6, recession: -0.6, inflation: -0.3 },
    offerThreshold: 60000,
    offerChance: 0.1,
  },

  macro: {
    targets: {
      normal: { inflation: 0.03, rate: 0.045, unemployment: 0.045, confidence: 60, growth: 0.02 },
      boom: { inflation: 0.04, rate: 0.055, unemployment: 0.035, confidence: 76, growth: 0.06 },
      recession: { inflation: 0.015, rate: 0.025, unemployment: 0.085, confidence: 34, growth: -0.06 },
      inflation: { inflation: 0.09, rate: 0.08, unemployment: 0.05, confidence: 44, growth: -0.01 },
    },
    adjust: 0.3,
  },

  competition: {
    entryMargin: 0.2,
    entryShare: 0.5,
    entryChance: 0.25,
    exitCash: -4000,
    reactEvery: 7,
  },

  progression: {
    xpPerServe: 1,
    xpPerLove: 0,
    xpProfitDivisor: 12,
  },

  rng: { eventChance: 0.16 },
} as const;

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

/** Difficulty changes the economic environment, not just the price tags. */
export const DIFFICULTY: Record<
  Difficulty,
  {
    name: string;
    blurb: string;
    priceVolatility: number;
    eventChance: number;
    regimeStay: number;
    badRegimeWeight: number;
    competitorAggression: number;
    forecastError: number;
    loanSpread: number;
    bailouts: number;
    patience: number;
    /** Multiplies rent, utilities and maintenance. */
    costMult: number;
    /** Multiplies how fast regulars drift away. */
    churnMult: number;
  }
> = {
  easy: {
    name: 'Easy',
    blurb: 'Gentle markets, patient customers, forgiving banks. Bà will bail you out twice.',
    priceVolatility: 0.6,
    eventChance: 0.7,
    regimeStay: 0.92,
    badRegimeWeight: 0.4,
    competitorAggression: 0.6,
    forecastError: 0.06,
    loanSpread: -0.01,
    bailouts: 2,
    patience: 1.25,
    costMult: 0.85,
    churnMult: 0.7,
  },
  normal: {
    name: 'Normal',
    blurb: 'Realistic trade-offs. One rescue from Bà if things go badly wrong.',
    priceVolatility: 1,
    eventChance: 1,
    regimeStay: 0.88,
    badRegimeWeight: 1,
    competitorAggression: 1,
    forecastError: 0.12,
    loanSpread: 0,
    bailouts: 1,
    patience: 1,
    costMult: 1,
    churnMult: 1,
  },
  hard: {
    name: 'Hard',
    blurb: 'Volatile prices, sharper rivals, stricter lenders. No rescue.',
    priceVolatility: 1.5,
    eventChance: 1.25,
    regimeStay: 0.84,
    badRegimeWeight: 1.5,
    competitorAggression: 1.4,
    forecastError: 0.2,
    loanSpread: 0.02,
    bailouts: 0,
    patience: 0.9,
    costMult: 1.15,
    churnMult: 1.35,
  },
  expert: {
    name: 'Expert',
    blurb: 'Fast-moving economy, frequent shocks, rivals who copy you. For seasoned owners.',
    priceVolatility: 2,
    eventChance: 1.5,
    regimeStay: 0.78,
    badRegimeWeight: 2,
    competitorAggression: 1.8,
    forecastError: 0.28,
    loanSpread: 0.035,
    bailouts: 0,
    patience: 0.82,
    costMult: 1.3,
    churnMult: 1.7,
  },
};
