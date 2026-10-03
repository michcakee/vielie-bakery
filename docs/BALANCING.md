# Balancing

All tunable numbers are in `src/data/config.ts` (`ECON`, `DIFFICULTY`), with prices, recipes and equipment in `src/data/catalog.ts` and neighbourhoods, segments and scenarios in `src/data/world.ts`. Change a number there, then run:

```bash
npm run balance
```

That plays every scenario × difficulty for 180 days with two seeds, using a **passive autopilot** (it never hires, borrows, changes prices or buys equipment; the team simply runs each day with automatic restocking). It prints cash, profit over the last 30 days, the owner's valuation and the first profitable day.

The passive bot is the **floor**: what a bakery earns if you make no decisions. A good player should beat it clearly; a bad one (overpriced, overstaffed, over-borrowed) should do worse.

## Targets

| Measure | Target | Why |
| --- | --- | --- |
| Passive solo shop, Normal | Profitable, but modest | Cozy and forgiving, yet leaves room for decisions to matter |
| Owner's net margin | 20–45% (solo owner, no wage paid to themselves) | Realistic for an owner-operated café or bakery |
| Difficulty spread, Sprinkle → Expert | 25–40% less profit | Difficulty should be felt in results, not just in events |
| Recession scenario | Clearly below Family Business | The economy has to matter |
| Capacity | Busy days sell out; normal days don't | Otherwise prices and demand shocks don't matter (see below) |
| "Build value" goal ($1M) | Not reachable passively in the first year | A goal you can't miss isn't a goal |

## The October 2026 balance pass

### What the survey found

The first survey of v3 showed the economy was broken in the player's favour:

| Scenario (Normal) | Profit, month 6 | Valuation, month 6 |
| --- | --- | --- |
| Family Business | $17,250 | $1.23M |
| Survive the Recession | $16,300 | $1.02M |
| Competitive Market | $18,100 | $1.53M |

Every difficulty landed within about 10% of every other, and the recession barely mattered.

**The cause:** loyal customer pools only ever grew. By day 150 a one-oven shop had 824 regulars making 180 visits a day, against 131 customers it could actually serve. A shop that is always sold out ignores demand: a recession that cuts traffic 30% doesn't reduce sales at all, and neither does a rival's price cut or a harder difficulty.

A probe of one passive bakery at day 150 showed the rest: $24,700 monthly revenue, $1,350 rent, no wages (the owner works for free) and a 65% net margin.

### What changed

| Change | Where |
| --- | --- |
| Regulars **churn** 1.4% a day, plus 6% per point of satisfaction below 0.75 | `ECON.demand.loyalChurn`, `loyalChurnUnhappy` |
| New regulars slow toward a **neighbourhood cap** of 4 days' foot traffic | `ECON.demand.loyalCapDays` |
| **Rent ×1.8**: Old Lane $80/day (≈$2,400/month) … Downtown $225/day | `LOCATIONS[*].rent` |
| Difficulty scales **rent, utilities and maintenance** (0.85× … 1.3×) and **churn** (0.7× … 1.7×) | `DIFFICULTY[*].costMult`, `churnMult` |
| Valuation base multiple 3 → **2.5**× earnings | `ECON.valuation.baseMultiple` |
| "Build value" goal $250k → **$1M** | `GOALS.value`, `goalProgress` |

### Results after the pass

Two seeds per row, day 180, passive autopilot.

| Scenario | Difficulty | Profit, last 30 days | Cash | Owner's valuation | First profitable day |
| --- | --- | --- | --- | --- | --- |
| Family Business | Easy | $7,700–8,000 | $41k | $390–430k | 4 |
| | Normal | $7,050 | $37k | $345–355k | 4–6 |
| | Hard | $6,000 | $32–34k | $300–320k | 4–7 |
| | Expert | $5,300–5,400 | $29k | $255–280k | 4 |
| Startup (University Hill) | Normal | $7,600–7,700 | $44–45k | $445–450k | 7–8 |
| | Expert | $5,800–6,200 | $34–37k | $315–320k | 7–10 |
| Survive the Recession | Normal | $6,000–6,200 | $29–30k | $250k | 4–5 |
| | Expert | $4,400–4,500 | $22–23k | $170–190k | 5–7 |
| Rapid Expansion | Normal | $10,500 | $55–58k | $720–750k | 12–13 |
| Community Bakery | Normal | $6,900–7,100 | $37k | $350–360k | 4–6 |
| Competitive Market | Normal | $9,700–10,700 | $49–50k | $590–655k | 12–13 |
| | Expert | $6,900–7,400 | $33–35k | $390–400k | 13 |

- **Profit fell** by about 60%, to roughly $5–11k a month: a realistic income for a busy owner-run bakery.
- **Difficulty now matters:** Expert earns 30–37% less than Easy in every scenario.
- **The recession bites:** about 14% below Family Business on Normal, 17% on Expert.
- **Busier, pricier neighbourhoods** (Rapid Expansion, Competitive Market) earn more but take longer to turn a profit, because of fit-out and higher rent.
- The $1M goal is out of reach passively in the first six months everywhere, and needs real growth (staff, a bigger oven, a second shop) to reach.

## Known gaps

- **The owner's labour is free.** Solo-owner profit includes what the owner would earn as a wage elsewhere. That's realistic for small businesses, but the game doesn't show it yet. Planned: "profit after paying yourself."
- **Only the floor is measured.** An "active" bot (hires the bottleneck role, prices sold-out items up, buys a second oven) would measure the ceiling and catch dominant strategies.
- **First profitable day 4** for inherited shops is generous. That's deliberate for Family Business (Bà's regulars), less so for Community Bakery.
- Tips are about 7% of revenue and go to the business; with staff, they'd usually go to the team.

## Rules of thumb for future tuning

- Check `lostSoldOut` against `lostPrice` in the day summaries. If sold-out losses dominate on ordinary days, demand is too high for capacity and price changes stop mattering.
- Keep each change in `config.ts` or `world.ts`, never in a formula, and rerun `npm run balance` plus `npm test` (the accounting identities must still hold).
- Note each pass here, with before and after numbers.
