# Economic model (v2)

Every number lives in `src/data/catalog.ts` (`CONFIG`, `INGREDIENTS`, `PRODUCTS`, `SUPPLIERS`, `UPGRADES`, `DECOR`, `LEVELS`). The logic is in `src/engine/`.

## Customers and demand

When the doors open, `buildSchedule` decides everyone who will come by today, using the day's seed:

```
walk-ins = (15 + 4 × (level − 1) + small growth by day)
           × weather × weekday × (0.72 + 0.56 × reputation/100) × momentum
           × coffee corner 1.2 × loft 1.25 × decor bonuses × festival/stall/Tết
           + marketing extra
```

- **Momentum** (0.88 to 1.12) is the share of customers served over the last 3 days. Serving people well brings more people.
- **Regulars** visit with their own frequency, which grows with hearts.
- Each shopper wants one product, picked by popularity × time of day (rush, lunch, afternoon, evening) × weather. Some have a second choice (55%): if the first is sold out, they buy the substitute.
- A few **bargain hunters** only show up if you turn on last call.
- From day 15, a shopper who wants bánh mì or coffee may go to **Bánh Mì Cô Tư** instead. The chance grows with how much more you charge than her ($2.50 / $2.10) and shrinks with your quality.

### Willingness to pay

```
max price = reference price × budget × (0.8 + 0.4 × quality/100)
            × 1.08 with a display case (pastries)
            × (0.85 + 0.35 × eco/100) for eco-minded shoppers
            × 1.15 during Tết × 1.08 on festival days
```

Budgets come from a fixed panel of 400 shoppers (mean 1.12, sd 0.22). **The demand meter uses exactly the same panel and formula**, so it tells the truth: "73% interest" means about 73% of shoppers would pay that price.

Shoppers who find the price too high leave saying "Đắt quá…". Shoppers who wait longer than their patience leave saying "Lâu quá…".

### Satisfaction

```
satisfaction = 0.45 × quality + 0.35 × (1 − wait/patience) + 0.2 × value for money
```

Above 0.72 they love it (reputation +0.1, a regular gains half a heart and tips $0.50); above 0.5 they're happy.

## Costs and profit

| Kind | Examples | When it's counted |
| --- | --- | --- |
| Ingredients used | flour in a baguette tray, coffee in a cup | when baked or made |
| Packaging | $0.03 plastic, $0.07 paper, $0.12 reusable; +$0.60 gift box | per sale |
| Fixed | rent $18/day (+$6 corner, +$12 loft), Cô Ba $20/day, loan fee share | every evening |
| Energy | $1 + $0.40 per tray (×1.2 commercial oven, ×0.4 with solar) | every evening |
| Spoilage | nightly loss of fresh ingredients (half with a working fridge) | every evening |
| Other | event costs, marketing, price-lock fees | when paid |

```
what the bakery made (profit) = sales + tips − all of the above
```

Buying ingredients and equipment changes **cash** but isn't today's cost: stock becomes inventory (valued at average cost) and equipment is an investment. The report explains this in one line.

## Quality

```
tray quality  = 0.5 × oven timing + 0.4 × ingredient quality + 6 + mastery
order quality = 0.5 × assembly accuracy + 0.4 × ingredient quality + 6 + mastery (+4 coffee station for drinks)
```

Oven timing: golden window → 85 to 100; pale → 45 to 80; dark → 40 to 80; burnt → 25. Bánh bò has the narrowest window. Mastery adds up to +12 after selling 20 / 60 / 150 of an item. Ingredient quality: wet market 55, farm 85, premium 96.

## Market

- Each ingredient's price follows a mean-reverting walk (±4.5% a day, between 0.82× and 1.25×).
- Calendar shocks (each year is 35 days): coffee ×1.55 days 6–9, eggs ×1.7 days 8–10, cheap fruit days 17–19, sugar and coconut ×1.2 during Tết.
- Suppliers: price ×0.85 / ×1.15 / ×1.35. The farm sells out of items 18% of the time. Every 10 packs from one supplier earns 1% off, up to 8%.
- **Price lock** (level 2): $5 freezes today's market price for 7 days. The report shows how much it saved.

## Finance

- **Safety fund:** move cash in or out any time outside service; optional auto-save of 10% or 25% of profitable days. If cash goes negative after the bills, the fund covers it.
- **Loan** (level 3): $300, $600 or $1,000, an 8% fee, repaid in 10 equal daily payments.
- **Marketing** (level 2): flyers $40 (3–12 customers over 3 days) or a video ad $120 (0–45, skewed low).
- **Co-op shares** (level 3): coffee, dairy and fruit co-ops. Prices drift and move with their ingredients (a dairy share rises during an egg shortage, a natural hedge). They pay a 1.5% weekly dividend.
- **Bà's envelope:** if you're broke and have nothing to sell or bake, Bà sends $40 (at most once a week), so the game can't soft-lock.

## Eco score

```
eco = 0.4 × sourcing (7-day average of suppliers' eco ratings)
    + 0.3 × waste score (100 at 0% binned, 0 at 25%; 40% with compost)
    + 0.3 × packaging (10 / 55 / 95)
    + solar 12, garden 8, compost 6, plants/flowers/bike 1 each
```

Donated food doesn't count as waste: it raises community and reputation instead.

## Progression

XP: +1 per customer served, +1 more if they loved it, profit ÷ 5 each evening, plus quest rewards. Levels at 120, 480, 1,250 and 2,600 XP unlock recipes, upgrades, decorations, loans, marketing and shares. A bot that serves everyone perfectly reaches level 3 around day 8 and level 5 around day 29.
