# Testing

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run balance
```

`npm test` runs every suite with Vitest (about two minutes, mostly the long playthroughs). The GitHub Pages workflow runs `npm ci`, `npm test` and `npm run build` on every push to `main`, and nothing deploys if a test fails.

## What's covered

The engine is pure TypeScript with a seeded random number generator, so every test is deterministic: the same seed always gives the same market, customers and events.

| Suite | What it checks |
| --- | --- |
| `tests/engine/game.test.ts` | The first day, the core loop (stock, bake, open, serve, close, report), leftovers, events, weekly reviews, a 60-day mixed hand-played / staff-run season, save slots, backups, save codes and v2 → v3 save migration. |
| `tests/engine/economics.test.ts` | **Accounting identities**: assets − liabilities equals equity built from profits, through loans, equipment, investors, bonds, shares and a branch; each day's cash-flow statement explains the change in cash exactly; profit ≠ cash. **Formulas**: loan amortisation, depreciation, prepaid rent, break-even, ratios, valuation, product margins per tray. **Systems**: capacity limits, wages following the labour market, cashier auto-serve, rivals reacting and closing, inflation and recessions, the calendar (Tết on day 24, Trung Thu), seeded events, forecasts, "Why did this happen?", bankruptcy and bailouts. |
| `tests/engine/stress.test.ts` | **Long playthroughs**: every scenario for six months on autopilot, and 400 days on Hard with a hands-on player, checking the books, cash and every number in the state. **Exploits and bad input**: NaN / Infinity / negative / huge numbers in every numeric action, buying and reselling equipment for profit, borrowing past the limit, repaying a loan twice, absurd prices, and random action sequences (fuzzing). **Goals and endings**: goal progress stays in range, a reached goal is recorded once, retiring sells the owner's share. |
| `tests/balance/survey.test.ts` | Skipped in `npm test`. `npm run balance` plays every scenario × difficulty for 180 days and prints cash, last-month profit, valuation and the first profitable day. See [BALANCING.md](BALANCING.md). |
| `tests/*.test.ts` | The original v1 economics simulator (kept, unused by the app). |

`tests/engine/bot.ts` is the test player: `morning` (restock, bake, resolve events), `runService` (real-time ticks, serve everyone), `finish` (close, report, weekly goal), `playDay` and `autoDay` (delegate the whole day to staff and the autopilot).

### Invariants checked after every stress step

- `cash`, `xp`, `reputation` and **every number anywhere in the state** are finite
- No negative stock, display, baguettes or loan balances
- The balance sheet balances (equity from the statements = equity from contributions and retained profit)
- Every wage and every menu price is positive

## Bugs the stress tests found

- `buy` with `NaN` packs passed every `<` / `>` guard and turned cash into `NaN`. The reducer now drops any action containing a non-finite number.
- `takeLoan` trusted the UI's borrowing limit; a crafted action could borrow $20 billion. The engine now enforces `borrowingLimit`.
- Unknown campaign kinds threw instead of being ignored.

## Manual QA checklist

Run `npm run dev` and check, at desktop width and at 375 px (phone):

- [ ] Title → New game → each scenario and difficulty → setup → day 1
- [ ] Play a day by hand (bánh mì assembly, oven timing, last call, leftovers, report)
- [ ] Run a day with the team (instant), and "Hand over the counter" / "Skip to closing" mid-day
- [ ] Every tab and the More sheet; no horizontal page scrolling at 375 px
- [ ] Hire, train, change a wage, fire; take and repay a loan; buy equipment
- [ ] Analytics: "Why did this happen?", break-even, product table, decision journal
- [ ] Settings: business view, text size, sound, reduced motion
- [ ] Reload: the game resumes; a save code restores on another browser
- [ ] Offline: after one visit to a production build, reload with the network off
- [ ] Android back button (in the app): closes sheets and modals, then switches to Today, then minimises

Last run (2 October 2026): every tab at 375 px with no overflow after fixing wide tables in Analytics; no console errors.
