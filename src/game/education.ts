import type { ConceptId } from './types';

export interface Concept {
  id: ConceptId;
  term: string;
  short: string;
  example: string;
}

/** Plain-language explanations, each grounded in a Vielie example. */
export const CONCEPTS: Record<ConceptId, Concept> = {
  revenue: {
    id: 'revenue',
    term: 'Revenue',
    short: 'Money the bakery earns from selling products, before any costs.',
    example: 'Sell 30 loaves at $7.50 and revenue is $225 — even if the flour cost you $100.',
  },
  profit: {
    id: 'profit',
    term: 'Profit',
    short: 'Money left after the relevant costs are paid.',
    example: 'Gross profit subtracts ingredients and packaging. Operating profit also subtracts rent, wages and energy.',
  },
  margin: {
    id: 'margin',
    term: 'Profit margin',
    short: 'Profit as a share of revenue: how many cents you keep from each dollar of sales.',
    example: 'A 12% operating margin means each $10 of muffins leaves $1.20 after all running costs.',
  },
  fixedCost: {
    id: 'fixedCost',
    term: 'Fixed cost',
    short: 'A cost that stays the same no matter how much you sell.',
    example: 'Rent and wages are $300 a day whether you sell 50 items or 250.',
  },
  variableCost: {
    id: 'variableCost',
    term: 'Variable cost',
    short: 'A cost that grows with every item you make or sell.',
    example: 'Flour, butter, packaging and oven energy all rise with each extra croissant.',
  },
  marginalCost: {
    id: 'marginalCost',
    term: 'Marginal cost',
    short: 'The extra cost of making one more item.',
    example: 'One more cookie costs about $0.80 in ingredients and energy. Worth it if someone will pay $3 — not if it ends up in the bin.',
  },
  elasticity: {
    id: 'elasticity',
    term: 'Price elasticity',
    short: 'How strongly demand reacts to a price change.',
    example: 'Raise cookie prices 10% and you lose about 16% of cookie buyers (elastic). Sourdough loses only about 7% (inelastic).',
  },
  roi: {
    id: 'roi',
    term: 'Return on investment',
    short: 'What an investment earns back each year, as a share of what it cost.',
    example: 'A $700 compost station that saves $350 a year returns 50% a year and pays for itself in two years.',
  },
  interest: {
    id: 'interest',
    term: 'Interest',
    short: 'The price of borrowing money, charged as a yearly percentage of what you owe.',
    example: 'A $2,000 loan at 14% a year costs about $0.77 a day. An unplanned overdraft costs more than twice that.',
  },
  liquidity: {
    id: 'liquidity',
    term: 'Liquidity',
    short: 'How much readily available cash the bakery has to meet its obligations.',
    example: 'A shop can be profitable on paper and still run out of cash if it spends everything on butter and ovens.',
  },
  opportunityCost: {
    id: 'opportunityCost',
    term: 'Opportunity cost',
    short: 'The value of the best alternative you give up when you choose something.',
    example: 'An oven minute spent on sourdough is a minute not spent on cookies, which earn more per minute.',
  },
  externality: {
    id: 'externality',
    term: 'Externality',
    short: 'A side effect of a business decision that affects people outside the transaction. Waste and pollution are examples.',
    example: 'Plastic packaging is cheap for you, but the town pays to collect and bury it. That cost never appears on your receipt.',
  },
  breakEven: {
    id: 'breakEven',
    term: 'Break-even',
    short: 'The amount of sales where revenue exactly covers all costs: no profit, no loss.',
    example: 'If each $1 of sales keeps $0.70 after variable costs, you need about $430 of sales just to cover $300 of fixed costs.',
  },
  inventory: {
    id: 'inventory',
    term: 'Inventory',
    short: 'Goods you have paid for but not yet sold or used.',
    example: 'A sack of flour in the store room is an asset — but the cash is locked inside it, and berries spoil while they wait.',
  },
  depreciation: {
    id: 'depreciation',
    term: 'Depreciation',
    short: 'Spreading the cost of long-lived equipment over the years it is used.',
    example: 'A $4,200 oven that lasts five years is counted as about $2.30 of cost each day, not $4,200 on the day you buy it.',
  },
  supplyDemand: {
    id: 'supplyDemand',
    term: 'Supply and demand',
    short: 'Prices and sales are set by how much people want something and how much is available.',
    example: 'A dairy shortage cuts the supply of butter, so its price rises. A festival raises demand for everything.',
  },
  hedging: {
    id: 'hedging',
    term: 'Hedging',
    short: 'Paying a little now to remove the risk of a big price move later. A forward contract fixes the price of a future purchase.',
    example: 'Locking butter at $8.84/kg for a week costs 4% extra on a normal week, but saves a lot if a dairy shortage pushes the market to $13.',
  },
};

export const CONCEPT_ORDER: ConceptId[] = [
  'revenue',
  'profit',
  'margin',
  'fixedCost',
  'variableCost',
  'marginalCost',
  'inventory',
  'supplyDemand',
  'elasticity',
  'opportunityCost',
  'breakEven',
  'liquidity',
  'interest',
  'roi',
  'depreciation',
  'externality',
  'hedging',
];
