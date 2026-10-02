/** Short, friendly notes the player collects as they run into each idea. */
export const NOTEBOOK: Record<string, { term: string; friendly: string; text: string }> = {
  revenue: { term: 'Revenue', friendly: "Today's sales", text: 'All the money customers paid you. Not the same as what you keep!' },
  profit: { term: 'Profit', friendly: 'What the bakery made', text: 'Sales minus everything it cost to make them and keep the doors open.' },
  variableCost: { term: 'Variable cost', friendly: 'Ingredient money', text: 'Costs that grow with every item you make: flour, eggs, coffee, cups.' },
  fixedCost: { term: 'Fixed cost', friendly: 'The bills', text: 'Rent and wages cost the same whether you sell 5 bánh mì or 50. Selling more spreads them thinner.' },
  inventory: { term: 'Inventory', friendly: 'The pantry', text: 'Ingredients and food you own but haven\'t sold yet. Cash turned into stuff, and some of it spoils.' },
  elasticity: { term: 'Price sensitivity', friendly: 'How customers react to price', text: 'Raise a price and fewer people buy. How many fewer depends on the product, the weather and your quality.' },
  supplyDemand: { term: 'Supply & demand', friendly: 'Why prices move', text: 'When something is scarce (eggs in a shortage) and people still want it, its price goes up.' },
  hedging: { term: 'Hedging', friendly: 'Locking a price', text: 'Paying a little now to avoid a big surprise later. If prices jump, you\'re protected.' },
  opportunityCost: { term: 'Opportunity cost', friendly: 'What you gave up', text: 'Every choice uses money or oven space you can\'t spend on something else.' },
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
  waste: { term: 'Food waste', friendly: 'Binned food', text: 'Every binned item is money spent for nothing, and it hurts your eco score. Donating helps your neighbours instead.' },
};

export const NOTEBOOK_ORDER = Object.keys(NOTEBOOK);
