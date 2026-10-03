/**
 * Short, friendly notes the player collects as they run into each idea. Entries with a
 * `professor` note carry the formal version (intro–intermediate micro), a real-world card and
 * a question to ask a grown-up; `graph` names which of the player's own numbers to draw.
 */
export interface NotebookEntry {
  term: string;
  friendly: string;
  text: string;
  professor?: string;
  realWorld?: string;
  askGrownUp?: string;
  graph?: 'demand' | 'profit' | 'surplus' | 'waste' | 'capacity';
}

export const NOTEBOOK: Record<string, NotebookEntry> = {
  revenue: { term: 'Revenue', friendly: "Today's sales", text: 'All the money customers paid you. Not the same as what you keep!' },
  profit: {
    term: 'Profit',
    friendly: 'What the bakery made',
    text: 'Sales minus everything it cost to make them and keep the doors open.',
    professor: 'π = TR − TC. Revenue is what comes in; profit is what is left after every cost, including costs that don’t move with sales (rent) and costs that only show up slowly (an oven wearing out). A busy day can still lose money.',
    realWorld: 'A lemonade stand that sells 100 cups at $1 has $100 of revenue. If the lemons, sugar, cups and the table rental cost $110, it lost $10.',
    askGrownUp: 'Ask a grown-up: what’s the difference between what a shop takes in and what it keeps?',
    graph: 'profit',
  },
  variableCost: { term: 'Variable cost', friendly: 'Ingredient money', text: 'Costs that grow with every item you make: flour, eggs, coffee, cups.' },
  fixedCost: {
    term: 'Fixed, variable and sunk costs',
    friendly: 'The bills',
    text: 'Rent and wages cost the same whether you sell 5 bánh mì or 50. Selling more spreads them thinner.',
    professor: 'Average cost AC = FC/q + AVC: fixed costs are spread over more units as output grows, which is why busy days have fatter margins. A sunk cost is money already spent that no decision can recover (the steamer you bought). It should not influence what you do next: keep making bánh bao only if each extra tray earns more than it costs from here on, whatever the steamer cost.',
    realWorld: 'Having paid for a cinema ticket doesn’t make a bad film worth sitting through. The ticket is gone either way; only the next two hours are yours to decide.',
    askGrownUp: 'Ask a grown-up: have they ever kept doing something just because they’d already paid for it?',
    graph: 'profit',
  },
  inventory: {
    term: 'Inventory and perishability',
    friendly: 'The pantry',
    text: 'Ingredients and food you own but haven\'t sold yet. Cash turned into stuff, and some of it spoils.',
    professor: 'How much to bake when demand is uncertain is the newsvendor problem. With price p, unit cost c and salvage value s for leftovers, the best stock Q* satisfies F(Q*) = (p − c)/(p − s): bake up to the point where the chance of selling the last tray equals the ratio of lost profit to wasted cost. High margins and cheap leftovers (donations, a fridge) justify baking more; perishable, costly goods justify baking less.',
    realWorld: 'Newspapers were the original case: unsold copies are worthless tomorrow, so the vendor has to guess the day’s demand every morning.',
    askGrownUp: 'Ask a grown-up: how does a supermarket decide how much bread to put out each day?',
    graph: 'waste',
  },
  elasticity: {
    term: 'Demand and price',
    friendly: 'How customers react to price',
    text: 'Raise a price and fewer people buy. How many fewer depends on the product, the weather and your quality.',
    professor: 'Each customer has a willingness to pay (WTP) and buys when price ≤ WTP. Market demand is Q(p) = N · (1 − F(p)), where F is the share of customers whose WTP is below p. In this game every customer’s WTP is drawn from a lognormal distribution whose spread depends on the item, so the demand curve slopes down smoothly. Simplification the game makes: customers know the price before they decide and never bargain.',
    realWorld: 'When a cinema raises ticket prices, some people still go (they’d have paid more anyway) and some stay home. The ones who stay home are the part of demand you lost.',
    askGrownUp: 'Ask a grown-up: what’s something they stopped buying when it got more expensive, and something they kept buying anyway?',
    graph: 'demand',
  },
  elasticityCompare: {
    term: 'Price elasticity',
    friendly: 'Habits vs treats',
    text: 'Coffee drinkers keep buying when the price creeps up. Cake buyers vanish. The same price rise can earn you more on one item and less on another.',
    professor: 'Elasticity ε = %ΔQ / %ΔP. If |ε| < 1 (inelastic, like a daily coffee) a price rise raises revenue; if |ε| > 1 (elastic, like a celebration cake) it lowers revenue. A seller with market power sets the markup by the Lerner rule: (p − MC)/p = −1/ε, so inelastic items carry the biggest markups. In the game, each item’s elasticity sets how wide its customers’ WTP spread is.',
    realWorld: 'Petrol and salt are inelastic: prices rise and people grumble but still buy. Restaurant desserts are elastic: a few dollars more and many people skip them.',
    askGrownUp: 'Ask a grown-up: which bill would they pay even if it doubled, and which would they drop?',
    graph: 'demand',
  },
  supplyDemand: { term: 'Supply & demand', friendly: 'Why prices move', text: 'When something is scarce (eggs in a shortage) and people still want it, its price goes up.' },
  hedging: { term: 'Hedging', friendly: 'Locking a price', text: 'Paying a little now to avoid a big surprise later. If prices jump, you\'re protected.' },
  opportunityCost: {
    term: 'Opportunity cost',
    friendly: 'What you gave up',
    text: 'Every choice uses money or oven space you can\'t spend on something else.',
    professor: 'The opportunity cost of a choice is the value of the best alternative you gave up, not every alternative. Four oven slots used on flan are four slots not used on bánh bò; the cost of the flan tray is the profit the best other tray would have earned. Economists count this even though no money changes hands.',
    realWorld: 'An hour spent queuing for a free concert isn’t free: it’s an hour you could have worked, played or slept.',
    askGrownUp: 'Ask a grown-up: what did they give up to be where they are today?',
    graph: 'capacity',
  },
  capacity: { term: 'Capacity', friendly: 'How much you can make', text: 'Your oven only fits so many trays. A big order can crowd out regular customers.' },
  externality: { term: 'Externality', friendly: 'Costs other people pay', text: 'Plastic bags are cheap for you, but the street and the canal pay for them later.' },
  competition: { term: 'Competition', friendly: 'Neighbours selling the same thing', text: 'Shoppers compare. You can compete on price, on quality, or by being the friendliest shop on the lane.' },
  savings: { term: 'Emergency fund', friendly: 'Rainy-day money', text: 'Money set aside so a broken fridge doesn\'t become a crisis.' },
  demandShift: { term: 'Demand shift', friendly: 'Busy days', text: 'Festivals, weather and holidays change how many people want to buy at any price.' },
  risk: { term: 'Risk & return', friendly: 'Maybe big, maybe nothing', text: 'Some choices could pay off a lot or not at all. Bigger possible rewards usually mean more uncertainty.' },
  margin: { term: 'Profit margin', friendly: 'What you keep from each sale', text: 'Price minus the cost to make it. Wholesale sells more at a thinner margin.' },
  quality: { term: 'Quality', friendly: 'Why good food pays', text: 'Better ingredients and careful baking let you charge more and bring people back.' },
  dividends: { term: 'Dividends', friendly: 'Your share of the profits', text: 'Owning part of a co-op pays you a slice of what it earns.' },
  diversification: { term: 'Diversification', friendly: 'Not all eggs in one basket', text: 'Owning different things means one bad week doesn\'t sink you. A dairy share can rise when eggs get pricey for you.' },
  interest: { term: 'Interest', friendly: 'The cost of borrowing', text: 'A loan gives you money now. You pay back more than you borrowed.' },
  debt: { term: 'Debt', friendly: 'Money you owe', text: 'Borrowing can help you grow faster, but the payments come every day, good sales or not.' },
  investment: { term: 'Investment', friendly: 'Spending to earn more later', text: 'An oven isn\'t a cost of today. It\'s something you own that helps you earn for many days.' },
  loyalty: { term: 'Customer loyalty', friendly: 'Regulars', text: 'Happy customers come back, pay a little more and ignore rivals’ sales. But regulars drift away every day (churn), faster after slow service or sold-out shelves, and a street only has so many people to win.' },
  cac: { term: 'Customer acquisition cost', friendly: 'Cost per new customer', text: 'Marketing spend ÷ new customers it brought. Worth it only if each customer earns you more than that.' },
  marketingROI: { term: 'Return on marketing', friendly: 'Did the ad pay?', text: '(Extra contribution from new customers − what the campaign cost) ÷ the cost.' },
  equity: { term: 'Owner’s equity', friendly: 'What the owners have in it', text: 'Assets minus debts: money put in plus profits kept in the business.' },
  depreciation: { term: 'Depreciation', friendly: 'Wearing out', text: 'An oven loses value as it ages. Its cost is spread over its useful life instead of hitting one day’s profit.' },
  capex: { term: 'Capital expenditure', friendly: 'Buying things that last', text: 'Money spent on equipment and rooms. It leaves your cash today but counts as a cost slowly, over years.' },
  marginal: {
    term: 'Marginal thinking',
    friendly: 'Is one more worth it?',
    text: 'Compare what one more baker, oven or tray adds with what it costs. Keep adding while the extra earns more than it costs.',
    professor: 'Decisions happen at the margin. Produce another tray while marginal revenue MR ≥ marginal cost MC; profit is maximised where MR = MC. Averages mislead: a bakery can have a healthy average margin while its last tray loses money (it sold at last call, below cost) or earns a lot (it was the tray that stopped a sell-out).',
    realWorld: 'Airlines sell the last few seats cheaply because the plane flies anyway: the marginal cost of one more passenger is almost nothing.',
    askGrownUp: 'Ask a grown-up: when was “one more” worth it, and when wasn’t it?',
  },
  labor: { term: 'Labour market', friendly: 'Hiring', text: 'When unemployment is low, workers are scarce and wages rise. Pay below the going rate and good people leave.' },
  humanCapital: { term: 'Human capital', friendly: 'Training pays', text: 'Skills are an investment too: training costs now and makes someone faster and better for as long as they stay.' },
  macro: { term: 'The economy', friendly: 'Booms and recessions', text: 'Inflation, interest rates, jobs and confidence move together and change how much people spend.' },
  inflation: { term: 'Inflation', friendly: 'Everything costs more', text: 'When prices across the economy rise, your ingredients and wages do too. Keep your menu prices in step or your margin shrinks.' },
  valuation: { term: 'Valuation', friendly: 'What your bakery is worth', text: 'Buyers pay a multiple of yearly earnings, more for growing, well-loved businesses, minus any debt.' },
  cashFlow: { term: 'Cash flow', friendly: 'Cash isn’t profit', text: 'A business can be profitable and still run out of cash: rent paid ahead, stock bought early, loan payments due.' },
  scale: { term: 'Economies of scale', friendly: 'Bigger is cheaper', text: 'Buying in bulk cuts the price per pack, but only helps if you use it before it spoils or runs out of room.' },
  contracts: { term: 'Supply contract', friendly: 'A fixed deal', text: 'Lock a price and quantity for weeks. Safe if prices rise; costly if they fall or you need less.' },
  forecasting: { term: 'Forecasting', friendly: 'Planning ahead', text: 'Use past demand (not just sales), the weather and the calendar to plan. Forecasts are ranges, and sometimes wrong.' },
  leverage: { term: 'Leverage', friendly: 'Growing with borrowed money', text: 'Debt can grow profits faster than your own money could, but payments are due whether or not the plan works.' },
  dilution: { term: 'Dilution', friendly: 'Sharing the pie', text: 'Selling part of the business brings cash with no repayments, but you own a smaller slice of every future profit.' },
  productMix: { term: 'Product mix', friendly: 'What you sell', text: 'The best-selling item isn’t always the most profitable. When ovens or hands are limited, favour what earns most per tray or per minute.' },
  expansion: { term: 'Expansion', friendly: 'A second shop', text: 'New locations add sales and new fixed costs. Each must earn its own rent, staff and fit-out.' },
  community: { term: 'Community capital', friendly: 'Goodwill', text: 'A bakery the neighbourhood loves gets loyal customers, cheap community loans and forgiveness on a bad day.' },
  competitionEntry: { term: 'Market entry', friendly: 'Profits attract rivals', text: 'When a street is very profitable, new bakeries open and push prices back down: the market moves toward equilibrium.' },
  waste: { term: 'Food waste', friendly: 'Binned food', text: 'Every binned item is money spent for nothing, and it hurts your eco score. Donating helps your neighbours instead.' },
  surplus: {
    term: 'Consumer surplus',
    friendly: 'The good-deal feeling',
    text: 'Hearts above customers show how good a deal they felt they got. A customer who would have paid $6 and paid $4.50 walks out $1.50 happier.',
    professor: 'Consumer surplus CS = Σ (WTP − p) over everyone who bought: the area under the demand curve and above the price. Lowering a price raises surplus for existing buyers and brings in new ones; raising it transfers surplus to the seller and drives some buyers away (a deadweight loss nobody gets). The game adds up each served customer’s WTP − price into the day’s total.',
    realWorld: 'Finding a $20 jumper you’d happily have paid $40 for is $20 of consumer surplus: real value, even though no money changed hands for it.',
    askGrownUp: 'Ask a grown-up: what’s the best bargain they ever got, and how much more would they have paid?',
    graph: 'surplus',
  },
};

export const NOTEBOOK_ORDER = Object.keys(NOTEBOOK);
