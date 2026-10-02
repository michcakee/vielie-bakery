# Vielie Bakery

**Run a bakery. Learn how money moves.**

Vielie Bakery is a browser game about running a small, sustainable bakery for 30 days. Each morning you read the local paper, plan production, set prices, buy ingredients and bake. Each evening a receipt shows where every dollar went. Along the way the game teaches supply and demand, elasticity, marginal cost, break-even, cash flow, investment returns, debt and externalities, by making each one change the outcome of your decisions.

It is a static site: no backend, no accounts, no tracking. Progress saves in your browser.

---

## Why it exists

Most people learn economics as definitions and diagrams. Vielie Bakery takes the opposite approach: you meet each idea at the moment it costs or earns you money. You learn what price elasticity is by raising the cookie price and watching customers disappear. You learn why fixed costs matter on a rainy Monday when the shop loses money anyway. And you learn that profit isn't cash on the day you buy an oven.

## Gameplay

**The daily loop**

1. **Morning paper:** weather, events and the day of the week. Every event is announced before you plan.
2. **Production plan:** compare the forecast with what you bake. The oven has limited minutes.
3. **Prices** (from week 2): demand responds to every change through each product's elasticity.
4. **Ingredients:** buy what the plan needs. Prices move daily; bulk is cheaper; berries spoil.
5. **Bake and open the shop:** trays fill, customers arrive.
6. **Receipt:** an income statement for the day, plus notes on stockouts, waste and cash.
7. **Weekly report** every 7 days, with insights generated from your own data.
8. **Day 30:** a final business profile describing your strategy, not a letter grade.

**Progression**

| Week | Theme | Unlocks |
|---|---|---|
| 1 | Learning the ovens | Production, ingredients, packaging |
| 2 | Pricing and demand | Price changes, forward contracts |
| 3 | Investment and finance | Equipment, bank loans |
| 4 | Competition and sustainability | Crumb & Co. opens next door; local sourcing |

**Products:** sourdough loaf (inelastic, keeps a second day), matcha cookie (elastic, most profit per oven minute), berry muffin (perishable berries), oat croissant (butter-heavy, high waste risk).

**Investments:** efficient oven, compost station, reusable delivery crates and solar roof. Each shows its expected gain, simple payback period and annual return, calculated from your own recent trading.

## Economics concepts in play

| Concept | Where it changes the game |
|---|---|
| Supply and demand | Events shift demand curves and ingredient supply |
| Price elasticity | Constant-elasticity demand; the weekly report measures your observed elasticity |
| Fixed vs variable cost | $300/day fixed costs; ingredients, packaging and energy per item |
| Marginal cost and contribution | Shown per item in the planner |
| Opportunity cost | Limited oven minutes; contribution per oven minute |
| Inventory | Weighted-average cost, spoilage, day-old bread |
| Waste | Discarded items cost ingredients plus disposal and hurt the green score |
| Revenue, gross, operating and net profit, margin | Daily receipt, income statement |
| Break-even | Projected before baking; calculated from your last 7 days |
| Liquidity | Overdraft at 36% APR if cash runs out; cash runway |
| Hedging | Forward contracts lock ingredient prices for a week, at a 4% premium |
| Debt and interest | 14% APR loans with daily interest |
| Investment, ROI, payback, depreciation | Equipment capitalized and depreciated over 5 years |
| Competition | Rival bakery takes share when you price above it |
| Externalities | Packaging and waste choices; the green score feeds demand and reputation |

The full model, with every formula and its limitations, is documented in **[docs/ECONOMIC_MODEL.md](docs/ECONOMIC_MODEL.md)**.

## Technology

- React 18 + TypeScript (strict) + Vite 5
- Plain modern CSS with design tokens (CSS variables). No UI framework.
- Hand-built SVG illustrations (storefront, products, charts)
- `lucide-react` icons
- Vitest for the simulation tests
- Fonts: Young Serif, Hanken Grotesk and Spline Sans Mono (Google Fonts)

## Architecture

```
src/
  config/balance.ts     ← every economic parameter, in one place
  game/                 ← pure, UI-free simulation (deterministic, testable)
    types.ts            game state and result types
    rng.ts              seeded PRNG: same seed → same weather, prices, events
    market.ts           daily market generation (prices, taste, weather, events)
    events.ts           12 market events
    economy.ts          demand model, unit economics, capacity, energy
    simulation.ts       runs one trading day → income statement, new state
    finance.ts          income statement totals, balance sheet, break-even
    investments.ts      payback and return analysis
    sustainability.ts   green score breakdown
    forecast.ts         projected P&L for the current plan
    insights.ts         data-driven weekly insights (incl. observed elasticity)
    profile.ts          final 30-day business profile
    education.ts        plain-language concept explanations
    persistence.ts      localStorage save/load with validation
    state.ts            reducer: every player action, with guards
  components/           reusable UI (storefront scene, ticker, term popovers…)
  views/                screens (planner, market, finances, equipment, reports…)
tests/                  simulation, accounting and progression tests
```

Game logic never touches React; React never computes economics. The reducer (`gameReducer`) is the only way state changes, and it rejects impossible actions such as spending money you don't have, baking beyond oven capacity or ingredients, or using locked features.

## Local setup

Requires Node 18+.

```bash
npm install
npm run dev        # start the dev server
npm test           # run the simulation test suite
npm run build      # type-check and build to dist/
npm run preview    # serve the production build
```

## Deployment (GitHub Pages)

The workflow in `.github/workflows/deploy.yml` installs dependencies, runs the tests, builds and publishes `dist/` to GitHub Pages on every push to `main`.

1. Push this repository to GitHub.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually).

`vite.config.ts` uses a relative `base` (`./`), so the build works at any repository path without configuration.

## Educational design

- **Teach at the moment it matters.** Concepts unlock when they first affect you: your first waste, your first full oven, your first loss day. Any underlined word explains itself on click.
- **Economics notebook.** Every concept you meet is collected with a short definition and a Vielie example.
- **Inspectable model.** The planner shows why the forecast is what it is, factor by factor. Investments show their calculation.
- **Gradual complexity.** One new system per week.
- **No single right answer.** Green choices cost money; borrowing can be smart or dangerous; high prices trade customers for margin. The final report describes your strategy rather than grading it.
- **Accessible.** Keyboard navigable, visible focus states, ARIA labels on charts and meters, respects `prefers-reduced-motion` (plus an in-game toggle), responsive down to phone width.

## Future improvements

- Product substitution (a customer who misses a croissant might buy a muffin)
- Staff scheduling as a variable cost
- Net present value alongside simple payback for investments
- A strategic competitor that responds to your prices
- More products and seasonal ingredients
- Sound design (generated, no external assets)
- Shareable end-of-season summary card

## License

MIT. See [LICENSE](LICENSE).
