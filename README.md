# Viet Bake Shop

**Bake something good. Build something yours. Learn how business works.**

Viet Bake Shop is a cozy pixel-art business sandbox about a Vietnamese bakery. Bà (grandma) is retiring and her little shop on Gress Island Lane is yours. Bake baguettes and flan at dawn, build bánh mì and pour cà phê sữa đá to order, and set your prices. Then grow: hire a team, sign supplier contracts, borrow or bring in investors, outlast rival bakeries through booms and recessions, open shops across town, and find out what your bakery is worth.

The economics are never a lecture. You learn elasticity when customers say "Đắt quá…", fixed costs on a rainy Monday, cash flow when a profitable month still leaves you short for rent, leverage when a loan payment lands in a recession, and market entry when a copycat opens across the street because your margins were too good.

No backend, no accounts, no ads, no tracking. It plays offline, and saves stay on your device.

**Play:** https://michcakee.github.io/vielie-bakery/ · **Guide:** [HOW_TO_PLAY.md](HOW_TO_PLAY.md)

---

## What's in the game

**Run the counter or run the business.** Play a shop day by hand in real time (customers arrive, you assemble orders step by step, pull trays from the oven when they're golden) or hand the day to your team and get the results instantly. Switch any time, even mid-day.

**A real economy underneath:**

- **Demand:** ten customer segments with their own budgets, tastes, hours and loyalty; willingness to pay by product elasticity, quality, reputation and real income; regulars who come back and drift away.
- **Competition:** rival bakeries with strategies (discounter, matcher, premium, copycat, chain) that react to your prices, close when they run out of cash, and open when your street gets too profitable.
- **Macroeconomy:** booms, recessions and inflation shift prices, wages, interest rates, unemployment and how much people spend.
- **Operations:** six neighbourhoods, oven and labour capacity, dry and cold storage, spoilage, four suppliers with lead times, bulk prices, contracts, price locks and reorder rules.
- **People:** eight staff roles, a weekly applicant pool driven by unemployment, wages set by the labour market, morale, training and quitting.
- **Finance:** income statement, balance sheet and cash-flow statement that always reconcile; depreciation; prepaid rent; amortised loans priced by credit risk; a credit line; investors; community bonds; valuation and buyout offers.
- **Growth:** equipment, renovations, marketing campaigns with measured ROI, and branches in other neighbourhoods.
- **Understanding:** "Why did this happen?", break-even, product margins per oven tray and per labour minute, forecasts, a decision journal, and a notebook of plain-language business concepts.

**Sandbox:** six scenarios (Family Business, Startup, Survive the Recession, Rapid Expansion, Community Bakery, Competitive Market), four difficulty levels that change the economy rather than just the numbers, long-term goals, three save slots with automatic backups, and endings: sell to a buyer, retire, or go bankrupt.

**Cozy and Vietnamese:** a tube-house bakery with gạch bông tiles, lanterns and street life; 13 recipes from bánh mì que to bánh trung thu, with the michcake as the final unlock; regulars with habits and favourites; Bà teaching in Vietnamese with English underneath; Tết and Trung Thu.

**For everyone:** casual and business views, adjustable text size, keyboard play, reduced motion, screen-reader labels, and a phone layout with a bottom tab bar.

## Platforms

| Platform | How |
| --- | --- |
| Web | GitHub Pages, installable as a PWA, works offline after the first visit |
| Android | Capacitor project in `android/` |
| iOS | Capacitor project in `ios/` |

The native projects are generated and configured but haven't been compiled or submitted yet. See [docs/MOBILE_BUILD.md](docs/MOBILE_BUILD.md).

## Run locally

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm test` | All tests (about two minutes) |
| `npm run typecheck` | TypeScript, strict |
| `npm run build` | Typecheck and production build into `dist/` |
| `npm run balance` | Balance survey: every scenario × difficulty for 180 days |
| `npm run icons` | Regenerate every app icon and splash from the pixel sprite |
| `npm run mobile:sync` | Build and copy into the Android and iOS projects |
| `npm run mobile:android` / `mobile:ios` | Sync and open Android Studio / Xcode |

## How it's built

React 18 + TypeScript (strict) + Vite. The simulation is pure TypeScript with a seeded random number generator: one `GameState`, changed only by `gameReducer`, shared by the web and mobile builds. Every economic parameter lives in `src/data/config.ts`. All art is pixel art drawn in code; fonts are self-hosted.

```
src/data/     config (ECONOMIC_CONFIG), catalog, world, people, notebook
src/engine/   simulation: state, service, economy, market, macro, labor,
              competitors, finance, accounting, branches, forecast,
              analytics, events, progression, save
src/ui/       React screens, panels, pixel scene, charts, native glue
tests/        engine, accounting, stress/exploit and balance suites
android/ ios/ Capacitor native projects
```

## Documentation

| Doc | |
| --- | --- |
| [HOW_TO_PLAY.md](HOW_TO_PLAY.md) | Player guide |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Audit, decisions, layout and rules |
| [docs/ECONOMIC_MODEL.md](docs/ECONOMIC_MODEL.md) | Every formula |
| [docs/BALANCING.md](docs/BALANCING.md) | How the numbers were tuned, and the survey results |
| [docs/TESTING.md](docs/TESTING.md) | Test suites, invariants, manual QA |
| [docs/MOBILE_BUILD.md](docs/MOBILE_BUILD.md) | Android and iOS builds, icons, store checklist |
| [docs/store/](docs/store/) | Store listing, privacy policy and content rating drafts |
| [NEXT_STEPS.md](NEXT_STEPS.md) | Status and roadmap |

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: install, test, build, publish `dist/` to GitHub Pages. The Vite `base` is relative, so it works under any repository name.

## Credits and licensing

Design, code, pixel art, sounds and music by michcakee with Claude. All art and audio are original and generated in code. Fonts: [VT323](https://fonts.google.com/specimen/VT323) and [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro), SIL Open Font License, self-hosted in `public/fonts`.

Code is MIT licensed (see [LICENSE](LICENSE)).
