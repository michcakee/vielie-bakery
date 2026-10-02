# Economic model (v3 sandbox)

Every tunable number lives in **`src/data/config.ts`** (`ECON`, `DIFFICULTY`), with content data in `src/data/catalog.ts` (products, ingredients, suppliers, equipment) and `src/data/world.ts` (neighbourhoods, customer segments, staff roles, rivals, scenarios, goals). The formulas are in `src/engine/`. Nothing in `src/ui` computes economics; it only calls engine functions.

Money is in US dollars at Little Saigon–style prices. Time: 7-day weeks, 30-day months, 12 months a year (360 days). Day 1 is the 8th of month 12, so the first Tết lands on days 24–28.

---

## 1. Customers and demand

### Foot traffic

```
market traffic = (24 + 6 × (level − 1))
                 × neighbourhood traffic × weekday × season
                 × weather × macro traffic (0.7 + 0.6 × confidence/100)
                 × festival / street fair / construction / viral effects

walk-ins       = market traffic × (0.72 + 0.56 × reputation/100) × momentum
                 × room and decor bonuses + campaign reach
```

- **Momentum** (0.88–1.12) is the share of recent customers you actually served. Serving people well brings more of them.
- Each walk-in belongs to a **customer segment** (students, families, office workers, tourists, Vietnamese elders, Vietnamese families, budget shoppers, premium shoppers, coffee regulars, event buyers). The mix depends on the neighbourhood and shifts with festivals, seasons and the economy (budget shoppers +40% and premium −40% in a recession).

### Regulars (loyal pools)

A satisfied first-time customer may join their segment's **loyal pool**. About 22% of each pool visits on a given day. Loyal customers pay ~8% more, wait longer and ignore rivals more often.

```
chance to become a regular = segment loyalty × (satisfaction − 0.4) × 0.6
                             × (1 − regulars / neighbourhood cap)
neighbourhood cap          = market traffic × 4
daily churn                = (1.4% + 6% × max(0, 0.75 − yesterday's satisfaction)) × difficulty
```

Churn and the cap matter: without them the pool only grew, and every shop eventually had more customers than its ovens could serve, which made prices, recessions and rivals irrelevant (see [BALANCING.md](BALANCING.md)).

### Willingness to pay

Each shopper draws a budget from a lognormal panel. The highest price they'll pay:

```
WTP = reference price × habit factor × price index × budget
      × segment income × √(neighbourhood income) × real spending power
      × quality (0.8–1.2) × reputation (0.9–1.12)
      × heritage bonus (elders on traditional items) × display case 1.08 (pastries)
      × eco (eco-minded shoppers) × loyal 1.08 × festival (Tết, Trung Thu)

habit factor = 1 + 0.45 × (1 − elasticity)
budget spread σ = 0.2 × √elasticity × segment sensitivity × macro sensitivity
```

Low-elasticity items (cà phê, bánh mì) have a narrow budget spread and a habit premium: raising their price loses fewer customers. Cakes and gift boxes are the opposite.

**The demand meter uses exactly the same panel and formula**, so "73% interest" means about 73% of today's shoppers would pay that price.

### Competition (logit choice)

When rivals sell the same item, a shopper picks a bakery with probability proportional to `exp(utility)`:

```
utility = −3.2 × ln(price / reference) + 1.5 × (quality − 60)/40
          + 1.1 × (reputation − 50)/50 + 0.5 × marketing
          + 0.7 home advantage (they walked into your shop) + 1.8 if loyal
```

Rivals have strategies: **discount** (undercuts you), **matcher** (copies your price), **premium** (invests in quality when you beat them), **copycat** (starts selling your best-seller), **chain** (keeps raising marketing). They react weekly, follow inflation monthly, lose money and close when their cash runs out, and **new rivals open** when your operating margin is above 20% and you hold most of the street.

### Satisfaction

```
satisfaction = 0.45 × quality + 0.35 × (1 − wait/patience) + 0.2 × value for money
```

It drives reputation (which drifts toward a target set by recent satisfaction), loyalty, tips and churn.

---

## 2. Production and capacity

```
trays per day = min(oven trays, labour trays)
labour trays  = owner 4 + Σ bakers (2 + 0.6 × skill) × productivity × mixer 1.3
```

- **Productivity** depends on skill, morale and training.
- Made-to-order items (bánh mì, drinks) take counter time: the owner needs 3–3.6 minutes an order, a specialist 2.2–2.6. Customers whose patience runs out leave (`lostSlow`).
- Shelf life, display space, dry and cold storage limit how much you can make ahead. Overflowing storage spoils three times faster.

**Quality** of a tray or order = 0.5 × process (oven timing / assembly accuracy) + 0.4 × ingredient quality + 6 + mastery (up to +12) + staff and equipment bonuses.

---

## 3. Costs, accounting and cash

Every cash movement is tagged (operating, investing, financing), and every P&L item is recorded per day in `Books`. The three statements are derived from those records.

| Item | How it's counted |
| --- | --- |
| Ingredients (COGS) | When used, at the inventory's average cost |
| Packaging, gift boxes | Per sale |
| Rent | Paid a month ahead (prepaid asset), expensed daily. Old Lane $80/day … Downtown $225/day, × rent index × difficulty |
| Wages | Hourly × 8h × 1.1 payroll overhead, by role and the labour market |
| Utilities | $12 + $0.80/tray + equipment, × price index × difficulty (solar −60%) |
| Maintenance | Per equipment item, × price index × difficulty |
| Depreciation | Equipment cost spread over its life (5 years; rooms 10; decor 3) |
| Spoilage, waste | Expired, spoiled or binned stock at cost |
| Interest | Accrued daily, paid monthly |
| Marketing, events, fees | When incurred |

**Profit ≠ cash.** Buying stock, prepaying rent and buying equipment move cash today without being today's cost; loan principal moves cash without touching profit. The cash-flow statement explains every day's change in cash, and tests check that it reconciles exactly.

**Balance sheet identity** (tested every day): assets − liabilities = owner contributions + retained profit + today's profit − distributions.

---

## 4. Markets and inventory

- **Ingredient prices** follow a mean-reverting random walk (±4.5% a day × difficulty volatility, between 0.78× and 1.3×), plus calendar shocks (coffee harvest, egg shortage, fruit season, Tết sugar), supply disruptions and inflation.
- **Suppliers**: wet market (cheap, low quality), farm co-op (eco, sometimes out of stock), premium (best quality), distributor (lead time, minimum order, bulk prices). Loyalty discounts up to 8%.
- **Bulk tiers**: 5 packs −5%, 10 packs −10%, 20 packs −15%.
- **Contracts** lock a price and quantity for 2–26 weeks; cancelling costs two weeks of deliveries. **Price locks** freeze today's price for 7 days for a fee. **Reorder rules** buy automatically below a threshold.

---

## 5. Labour

```
market wage = role base wage × wage index × tightness × (0.85 + 0.05 × skill)
tightness   = 1.08 if unemployment < 4%, 0.93 if > 7%
applicants  = 2 + unemployment × 40 (+0–2) per week
morale      → 60 + 120 × (wage / market wage − 1), +10 with a manager, −20 in distress
```

Staff below 25 morale may quit (10% a day). Training costs $220 and three days, and raises skill permanently. The hiring screen shows each role's **marginal value** (extra trays, fewer lost customers) against its daily cost.

---

## 6. Macroeconomy

A sticky **Markov chain** of regimes (normal, boom, recession, high inflation), checked monthly. Indicators move 30% of the way toward the regime's targets each month, with noise:

| Regime | Inflation | Rate | Unemployment | Confidence |
| --- | --- | --- | --- | --- |
| Normal | 3% | 4.5% | 4.5% | 60 |
| Boom | 4% | 5.5% | 3.5% | 76 |
| Recession | 1.5% | 2.5% | 8.5% | 34 |
| Inflation | 9% | 8% | 5% | 44 |

Daily, the price index grows with inflation, the wage index with inflation plus labour tightness, and incomes with inflation plus growth. **Real spending power** = income index ÷ price index feeds willingness to pay; confidence feeds foot traffic.

---

## 7. Finance

- **Loans**: rate = central rate + risk spread (2.5% / 4.5% / 8% for low / medium / high credit risk) + difficulty spread. Amortised monthly (`pmt`). Total borrowing is capped at `max($3,000, monthly revenue × 4 / 2.5 / 1 by risk) − existing debt`. Missed payments add a $75 fee and raise risk; three misses is a default.
- **Credit line**: $500 + 12% of the last 30 days' revenue, drawn automatically when cash runs short; expensive (central rate + 16%).
- **Investors**: from day 30, sell a stake at the current valuation (at most 49% in total). They take their share of profits monthly; you can buy them back at the higher of their investment and current value.
- **Community bonds**: with community ≥ 50, raise up to $120 per community point at 4% for a year.
- **Valuation**:
  ```
  multiple     = 2.5 + 4 × revenue growth + 0.6 × (reputation − 50)/50 + regime adjustment + 0.2 per branch   (1–8)
  enterprise   = max(asset value, annualised EBITDA × multiple)
  equity value = enterprise + cash − debt
  your share   = equity value × (1 − investor stake)
  ```
  Buyers occasionally make offers; from day 60 you can also **sell up and retire** at your share's value.

---

## 8. Growth, risk and events

- **Branches** use an aggregated version of the same demand equations (no individual customers), with their own staff, rent, fit-out and books.
- **Events**: scripted first-month story events, then seeded random events (price spikes, disruptions, rent renewals, inspections, viral posts, construction, equipment failures, raise requests, price wars, regime changes, buyout offers, Trung Thu). Each has choices with visible costs and consequences.
- **Bankruptcy**: three days without cash or credit ends the game; Bà can bail you out (twice on Easy, once on Normal, never on Hard or Expert).

---

## 9. Difficulty

Difficulty changes the environment, not just the numbers on the price tags:

| | Easy | Normal | Hard | Expert |
| --- | --- | --- | --- | --- |
| Ingredient price volatility | 0.6× | 1× | 1.5× | 2× |
| Event frequency | 0.7× | 1× | 1.25× | 1.5× |
| Chance a regime persists each month | 92% | 88% | 84% | 78% |
| Weight of bad regimes | 0.4× | 1× | 1.5× | 2× |
| Rival aggression | 0.6× | 1× | 1.4× | 1.8× |
| Forecast error | 6% | 12% | 20% | 28% |
| Extra loan spread | −1% | 0 | +2% | +3.5% |
| Bà's bailouts | 2 | 1 | 0 | 0 |
| Customer patience | 1.25× | 1× | 0.9× | 0.82× |
| Rent, utilities, maintenance | 0.85× | 1× | 1.15× | 1.3× |
| Regulars' churn | 0.7× | 1× | 1.35× | 1.7× |

---

## 10. Explaining results

- **"Why did this happen?"** compares two periods and ranks the biggest drivers (traffic, weather, prices, stock-outs, rivals, costs).
- **Break-even** shows the daily sales needed to cover fixed costs at the current contribution margin, and how it moves with price, wage and rent changes.
- **Product table** shows margin per item, per oven tray and per labour minute, because the best-seller is not always the most profitable.
- **Decision journal** records each decision with the metric it should move and settles it a week later.
