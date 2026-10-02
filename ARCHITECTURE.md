# Architecture

## Phase 0 audit (v2, before the sandbox expansion)

| Area | What exists |
| --- | --- |
| Framework | React 18 + TypeScript (strict), Vite 5, Vitest. Only runtime deps: react, react-dom (lucide-react is a leftover from v1). |
| Frontend | `src/ui`: App shell with tabs, a pixel scene (canvas layers + DOM sprites in a scaled 240×135 stage), panels per tab, overlays (event card, report, weekly review, toasts, quest book, settings). |
| Backend | None. Static site on GitHub Pages via `.github/workflows/deploy.yml` (install → test → build → publish). |
| Storage | `localStorage` (`vielie-bakery-save-v2`), validated on load; prefs in a separate key; save codes (deflate + base64url) and an email restore link. |
| State | One `GameState` changed only by `gameReducer` (`src/engine/state.ts`). Engine is pure TS with seeded RNG. |
| Mechanics | Real-time shop day (customers with budgets, patience, substitution), trays + made-to-order assembly, three suppliers with loyalty and price locks, events with choices, leftovers, eco score, quests, achievements, levels, decor, loans (flat fee), co-op shares, marketing, weekly goals. |
| Assets | All pixel art generated in code (`src/ui/pixel`), no image files. Synth audio. Google Fonts (VT323, Be Vietnam Pro). |
| Vietnamese content | 9 recipes, 8 named regulars, Vietnamese order lines with translations, tube-house street front, gạch bông floor, Tết, Bà's story. |
| Mobile | Responsive layout with bottom tab bar and safe-area padding; no native wrapper, no offline support (fonts load from Google). |
| Tests | 16 engine tests incl. a 40-day bot; 43 legacy v1 tests (unused code kept in `src/game`, `src/views`, `src/components`, `src/config`). |

### Technical debt found

- Waste and donated food were never expensed (their cost vanished from inventory without hitting profit).
- Equipment purchases weren't depreciated, so there was no balance sheet and no way to show profit ≠ cash.
- A compressed 35-day "year" can't support multi-year play, seasons or monthly rent.
- Loans were a flat fee, with no interest rate, term or amortization.
- One store, no staff model, and service capacity was only "the player's speed".
- Demand used one budget distribution for every product (no product-specific elasticity, no customer segments).
- Fonts load from the network, which breaks an offline mobile app.

## Decisions

1. **Extend, don't rebuild.** The real-time shop day, scene, assembly, oven game, characters, recipes and events stay. New systems are layered into the existing engine.
2. **One engine for every platform.** `src/engine` stays pure TypeScript with no DOM or React imports, shared by web and mobile.
3. **Mobile via Capacitor, not React Native.** The UI is DOM + canvas pixel art. React Native would mean rewriting every screen and sprite. Capacitor wraps the same build into iOS and Android projects, works offline (assets ship in the app) and keeps one codebase and one save format. This follows the PRD's own rule: reuse the existing architecture when practical.
4. **Real money scale and a real calendar.** Prices and costs move to Little Saigon–style numbers (bánh mì $6.50, rent ≈ $1,800/month, $16–24/hour wages). Calendar: 7-day weeks, 30-day months, 12 lunar-style months (Tết in month 1, Trung Thu in month 8).
5. **Play the day or delegate it.** You can run the counter yourself in real time, or let staff run the day through the same customer and service simulation, instantly. This makes multi-year sandbox play possible without a second, inconsistent engine.
6. **Branches use an aggregated model.** Extra locations are simulated with the same demand equations at the product level (no individual visits), so a large chain stays fast.
7. **Accounting through cash flows.** Every cash movement is tagged (operating / investing / financing) and every P&L item is recorded per day. The income statement, balance sheet and cash-flow statement are derived from those records, and tests check that they reconcile.
8. **Saves are versioned and migrated.** v2 saves are upgraded, not wiped, and the old save is kept as a backup.

## Layout

```
src/
  data/          content + balancing (no logic)
    config.ts      ECONOMIC_CONFIG: every economic parameter
    catalog.ts     products, ingredients, suppliers, equipment, decor, levels
    world.ts       neighbourhoods, customer segments, competitors, scenarios, staff roles
    people.ts      named regulars, names, Vietnamese lines
    notebook.ts    plain-language notes on each concept
  engine/        pure, deterministic simulation
    calendar.ts    dates, seasons, festivals
    state.ts       GameState, reducer, day lifecycle
    service.ts     customer schedule, real-time clock, serving, staff auto-serve
    economy.ts     prices, willingness to pay, demand, eco score, traffic
    market.ts      ingredient markets, co-op shares
    macro.ts       inflation, rates, unemployment, confidence, regimes
    labor.ts       staff, hiring pool, morale, capacity
    competitors.ts rival bakeries, market share, reactions
    finance.ts     loans, investors, bonds, valuation
    accounting.ts  cash-flow tags, statements, ratios, break-even
    branches.ts    extra locations (aggregated model)
    forecast.ts    demand forecasts and ingredient needs
    analytics.ts   period aggregation, "why did this happen?"
    events.ts      events with choices
    progression.ts quests, achievements, goals
    save.ts        slots, versioning, migration, codes
  ui/            React (web and Capacitor)
    native.ts      platform glue: service worker on the web; back button, status bar, splash in the app
    backButton.ts  one back stack for Escape, on-screen back and the Android back button
android/ ios/    Capacitor native projects (capacitor.config.ts at the root)
scripts/         make-icons.mjs: every icon and splash from the pixel sprite
public/          fonts (self-hosted, OFL), manifest, service worker, icons
```

Rules: the UI only calls the reducer and engine selectors. Formulas never live in components. Every tunable number lives in `src/data/config.ts` or `catalog.ts`.

## Data flow

```
UI event ──► dispatch(Action) ──► gameReducer(state, action) ──► new GameState ──► React re-render
                                     │
                                     ├─ input guard: non-finite numbers are dropped, amounts clamped
                                     ├─ engine modules (pure functions of state + seed + day)
                                     └─ accounting: move() tags cash, accrue() books P&L
GameState ──► save.ts (slot + rolling backup, versioned) ──► localStorage
```

- **Determinism:** randomness comes only from `rngFor(seed, day, salt)`, so a day replays identically from the same state. Tests rely on this.
- **Validation:** the engine never trusts the UI. Every action is checked against phase, cash, limits (for example the borrowing limit) and ranges; the stress suite fuzzes this.
- **Performance:** a delegated day takes about 50–80 ms on a laptop; branches use an aggregated model so a chain stays fast.

## Platforms

One build serves everything. `vite build` → `dist/`, which GitHub Pages serves directly and `cap sync` copies into the Android and iOS projects. `src/ui/native.ts` is the only platform-specific code, and it lazy-loads the Capacitor plugins so the web bundle doesn't carry them. See [docs/MOBILE_BUILD.md](docs/MOBILE_BUILD.md).

## Known technical debt (v3)

- The v1 simulator and the retired v2 Bakery and Money panels were deleted in v3.0.0; the v1 code is still available at the `v1-economics-sim` git tag.
- `state.ts` is large (the reducer plus the day lifecycle). Splitting the day lifecycle into its own module would make it easier to read.
- The test suite takes about two minutes because of the long playthroughs; they could move to a nightly job if CI time matters.
