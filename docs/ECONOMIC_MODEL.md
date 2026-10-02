# Vielie Bakery — Economic Model

This document explains the economic model behind the game: what it assumes, how each number is calculated, and where it simplifies reality. Every parameter mentioned here lives in [`src/config/balance.ts`](../src/config/balance.ts); the formulas live in [`src/game/`](../src/game). The UI never invents numbers of its own.

The model was designed with three goals:

1. **Every concept the game teaches must change an outcome.** Elasticity changes demand, waste costs money, investment changes future costs, debt costs interest.
2. **Strategy should beat luck.** All events are announced before the player plans; the only hidden randomness is a ±12% demand error around an honest forecast.
3. **The books must balance.** The simulation keeps a real (simplified) double-entry structure, and the test suite checks `assets = liabilities + equity` after full 30-day seasons.

---

## 1. Demand model

For each product, each day:

```
expected customers = baseDemand
                   × (price / referencePrice) ^ elasticity      ← price effect
                   × weekday × weather × customer taste          ← market conditions
                   × reputation × green image                    ← the bakery's standing
                   × event × sourcing × wholesale                ← situational
                   × (1 − competitor share)                      ← competition (week 4)

actual customers   = round(expected × noise),   noise ~ Uniform(0.88, 1.12)
units sold         = min(units available, actual customers)
```

The planner shows the full breakdown for every product ("Why 46 customers?"), so the forecast is always inspectable.

### Price elasticity

Demand uses a **constant-elasticity** curve, `Q = Q₀ · (P / P₀)^ε`. A 10% price rise changes demand by `1.1^ε − 1`.

| Product | Reference price | Base demand | Elasticity ε | Interpretation |
|---|---:|---:|---:|---|
| Sourdough loaf | $7.50 | 38 | −0.70 | Staple: inelastic. Raising price raises revenue. |
| Matcha cookie | $3.00 | 68 | −1.60 | Treat: elastic. Raising price lowers revenue. |
| Berry muffin | $3.75 | 48 | −1.25 | Moderately elastic. |
| Oat croissant | $4.25 | 44 | −1.05 | Close to unit-elastic. |

Because `|ε| < 1` for sourdough, revenue rises with price; for cookies (`|ε| > 1`) it falls. Profit is maximized where marginal revenue equals marginal cost, which is a higher price for inelastic goods. The player can discover this experimentally from week 2, and the weekly report measures it (section 8).

### Market conditions

| Factor | Values |
|---|---|
| Weekday traffic (Mon→Sun) | 0.90, 0.90, 0.95, 1.00, 1.10, 1.30, 1.15 |
| Weather | sunny 1.06 (40%), cloudy 1.00 (40%), rain 0.86 (20%) |
| Customer taste | mean-reverting random walk per product, 0.8–1.2 |
| Reputation | `0.85 + 0.003 × reputation` (50 → 1.00, 100 → 1.15) |
| Green image | `1 + (green − 50) / 500` (±10%); tripled on the "food-waste story" event day |

### Competition (from day 22)

Crumb & Co. prices at 92% of the reference price. The share of customers it takes is

```
share = 0.10 + 0.06 × ((yourPrice / theirPrice − 1) / 0.10) − 0.002 × (reputation − 50)
clamped to [2%, 40%]
```

So each 10% you price above them costs about 6 more percentage points of customers, and a strong reputation protects some of them. This is a simple model of price competition with brand loyalty.

---

## 2. Cost model

### Variable (marginal) costs

| Cost | How it is computed |
|---|---|
| Ingredients | Recipe quantity × **weighted-average cost** of the stock in the store room, plus a small per-item pantry cost (salt, sugar, eggs, oats) |
| Packaging | Per item sold: plastic $0.07, paper $0.14, compostable $0.24 (−60% with reusable crates) |
| Oven energy | $0.07 per oven minute (−30% with efficient oven) |
| Waste disposal | $0.20 per discarded item ($0.04 with compost station) |

Unit economics at reference prices and base ingredient prices (paper packaging):

| Product | Ingredients | Packaging | Energy | **Marginal cost** | Price | **Contribution** | Per oven minute |
|---|---:|---:|---:|---:|---:|---:|---:|
| Sourdough | $1.00 | $0.14 | $0.42 | **$1.56** | $7.50 | **$5.94** | $0.99 |
| Matcha cookie | $0.78 | $0.14 | $0.08 | **$1.00** | $3.00 | **$2.00** | $1.67 |
| Berry muffin | $0.95 | $0.14 | $0.18 | **$1.26** | $3.75 | **$2.49** | $1.00 |
| Oat croissant | $0.76 | $0.14 | $0.21 | **$1.11** | $4.25 | **$3.14** | $1.05 |

Sourdough has the highest contribution per item, but cookies earn the most **per oven minute**. When the oven is full, that is the relevant number. This is the game's lesson about **opportunity cost** and constrained optimization.

### Fixed costs

Rent $110 + wages $165 + admin $25 = **$300 per day**, paid whether or not anything sells. Base energy (fridges, lights) adds $22/day.

### Capacity

The oven has 420 minutes per day (546 with the efficient oven). At reference prices, unconstrained demand needs roughly 580 minutes, so **capacity binds**. The player must choose a product mix, and extra capacity has a measurable value.

### Ingredient prices and inventory

Each ingredient price follows a **mean-reverting random walk**:

```
p(t) = p(t−1) + 0.25 × (base − p(t−1)) + p(t−1) × volatility × N(0,1)
clamped to [0.7 × base, 1.4 × base]; event multipliers apply for one day only
```

Volatility: flour 4%, butter 6%, matcha 8%, berries 10%. Buying at least the bulk quantity in one order (for example 50 kg of flour) gives a 10% discount. Berries lose 30% of their stock each night and butter 2%, so stockpiling perishables is a trap. Inventory is valued at weighted-average cost.

Local sourcing (from day 22) multiplies ingredient prices by 1.20 and demand by 1.05.

---

## 3. Profit calculation

Each day produces an income statement:

```
Revenue                = Σ fresh units sold × price + day-old loaves × 50% price
− Cost of goods sold   = ingredient cost of units sold + packaging
= Gross profit
− Operating expenses   = wages + rent + admin + energy + waste + depreciation
= Operating profit
− Interest             = loan × 14% / 365 + overdraft × 36% / 365
= Net profit

Waste expense = ingredient cost of discarded items + overnight ingredient spoilage + disposal fees
Operating margin = operating profit / revenue
```

**Cash is not profit.** Ingredients are paid for when bought (cash out in the morning, recorded as inventory). They only become an expense when used. Equipment is capitalized and depreciated, and depreciation is a non-cash expense. The end-of-day receipt points out when the bakery was profitable but cash fell.

### Balance sheet

```
Assets      = cash + ingredient inventory + day-old bread (at cost) + equipment (cost − accumulated depreciation)
Liabilities = bank loan + overdraft
Equity      = owner's starting capital + retained earnings (cumulative net profit)
```

`tests/game.test.ts` plays three full seasons with different strategies and asserts that `assets = liabilities + equity` and that `equity = starting capital + Σ net profit`.

### Break-even

```
contribution ratio = (revenue − ingredients/packaging − waste − energy) / revenue    (last 7 days)
break-even revenue = (fixed costs + depreciation + interest) / contribution ratio
```

The planner also projects today's profit from the plan before baking. If the plan cannot reach break-even, it says so.

---

## 4. Investment calculations

Each upgrade is estimated from the bakery's **own last seven days** of trading. A typical-day assumption is used only before any trading has happened.

| Upgrade | Cost | Daily benefit estimate |
|---|---:|---|
| Efficient oven | $4,200 | energy saved (30% × oven minutes × $0.07) **+** extra capacity × contribution per oven minute, counting only capacity that would have served customers who were turned away |
| Compost station | $700 | wasted items × ($0.20 − $0.04) |
| Reusable crates | $1,400 | units sold × packaging cost × 60% **+** 6% demand uplift × daily contribution |
| Solar roof | $5,200 | 55% of energy costs |

```
simple payback (days) = cost / daily benefit
simple annual return  = daily benefit × 365 / cost
depreciation per day  = cost / (5 × 365)
```

These are deliberately **simple** measures: no discounting, no maintenance, and the assumption that recent trading continues. The UI labels them "simple payback" and explains the basis. Whether an investment "pays back before day 30" is shown separately. Equipment keeps its book value on the balance sheet, so a long-payback investment is not penalized in the final net-worth figure.

The efficient oven usually has the highest return because capacity is the binding constraint. That is a real business insight (investing in a bottleneck pays most), not a balancing accident. The tests check that a loan-financed oven increases end-of-season equity.

### Forward contracts (hedging)

From day 8 the player can sign one forward contract per ingredient: a fixed daily delivery for the next 7 days at **today's market price + 4%**. Deliveries arrive each morning and are paid for at the locked price regardless of the market (if cash is short, the bank covers the gap as overdraft, because a contract is an obligation).

```
locked price = today's price × 1.04
hedge gain   = Σ (market price on delivery day − locked price) × quantity delivered
```

Because prices mean-revert, the expected gain is slightly negative (the premium is the cost of certainty). Contracts pay off when the player locks a cheap day or an event shocks the market (dairy shortage: butter ×1.6). Deliveries move cash into inventory and never touch profit directly; profit only changes through the cost of the ingredients when they are used. The tests check that the balance sheet still balances with contracts running.

---

## 5. Debt and interest

- **Bank loan** (from day 15): borrow in $500 steps up to $6,000 at 14% APR. Interest accrues daily as `principal × APR / 365`.
- **Overdraft:** if closing costs exceed cash, the bank covers the gap automatically at 36% APR. This is the game's liquidity lesson: a profitable bakery can still run out of cash.
- **Repayment** clears the overdraft first, because it is the most expensive debt.

Borrowing is worth it when the investment's return exceeds the interest rate. At 14% APR a $4,000 loan costs about $1.53/day, far less than a capacity-constrained oven earns.

---

## 6. Sustainability mechanics

The green score (0–100) is computed from concrete choices, never awarded arbitrarily:

| Component | Points |
|---|---:|
| Starting point | 45 |
| Packaging: plastic / paper / compostable | −15 / 0 / +12 |
| Local sourcing | +12 |
| Efficient oven / compost / reusable crates / solar | +5 / +8 / +10 / +15 |
| Food waste (7-day average) | −0.9 per % of output wasted (halved with compost), max −35 |

The green score matters economically in two ways:

1. **Demand:** ±10% via the green-image multiplier, tripled on the food-waste news day.
2. **Reputation:** each day reputation moves 25% of the way toward `0.7 × customer satisfaction + 0.3 × green score`, and reputation itself multiplies demand.

Customer satisfaction combines the share of customers served (stockouts disappoint) and price fairness relative to the usual price.

**Trade-offs are real.** Compostable packaging costs $0.10 more per item than paper. At ~170 items a day that is about $17/day, against a modest demand gain. Local sourcing raises every ingredient cost by 20%. Solar pays back over months. None of these is automatically "correct". The game explains **externalities**: plastic is cheapest for the bakery because part of its true cost (landfill, litter) is paid by the town.

---

## 7. Market events

Twelve events, each announced in the morning paper with an explanation of its economic meaning. About 38% of days have a random event. Four are scheduled to anchor the learning arc: farmers' market (day 6), festival (13), food-waste story (20), holiday (27).

| Event | Effect | Concept |
|---|---|---|
| Steady rain | weather = rain; sourdough ×1.15, cookies ×0.85 | demand shifts |
| Street festival | all demand ×1.45 | opportunity cost (oven fills) |
| Dairy shortage | butter price ×1.6 | supply shock |
| Viral matcha | cookie demand ×1.9 | elasticity / demand spike |
| Farmers' market | demand ×1.15, berries ×0.7 | inventory |
| Energy spike | energy cost ×2 | variable cost |
| Tour bus | croissants ×1.5, muffins ×1.3 | demand |
| Competitor sale (week 4) | competitor prices ×0.8 | competition |
| Bank holiday | demand ×1.2, sourdough ×1.4 | demand planning |
| Packaging clearance | packaging ×0.5 | variable cost |
| Bumper harvest | flour ×0.75 | stock up vs. tie up cash |
| Food-waste story | green effect on demand ×3 | externality |

---

## 8. Insights from player data

The weekly report generates at most two insights, chosen by importance from the week's actual results:

- **Observed price elasticity.** If a product's average price moved ≥5% between weeks, the game divides each day's customer count by that day's recorded non-price multiplier (weather, events, reputation, competition). It then computes the **arc (midpoint) elasticity** of the adjusted quantities. With the ±12% noise this recovers the true elasticity within a reasonable margin, which a unit test verifies.
- **Waste by product** (when >12% of a product's output was discarded).
- **Missed sales** (customers turned away × price), noting whether the oven was full.
- **Below break-even** or the **cost structure** of each sales dollar.
- **Liquidity warning** when cash covers less than three days of fixed costs.

No insight is shown unless the data supports it.

---

## 9. Limitations

This is a teaching model, not a forecast of a real bakery:

- Demand curves are constant-elasticity with fixed parameters; real elasticities vary with price level and over time.
- Products are independent. There are no substitutes or complements between them (a customer who misses a croissant does not buy a muffin instead).
- Staff costs are fixed; there is no hiring, overtime or labour scheduling.
- Investment appraisal uses simple payback and simple return without discounting (no NPV/IRR), and assumes recent volumes continue.
- No taxes, no seasonality beyond weekday and events, no inflation.
- The competitor follows a fixed rule and does not react strategically to the player.
- Reputation and green-score weights are designer choices, chosen to be plausible and explainable rather than empirically estimated.
- 30 days is too short for most real payback periods; the game shows annual figures alongside daily ones for this reason.

These simplifications keep every number explainable to a younger player while keeping the core relationships (price ↔ demand, capacity ↔ opportunity cost, cash ↔ profit, investment ↔ return, externalities ↔ reputation) economically sound.
