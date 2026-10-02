# Next steps

## Current state (complete and working)

- Full 30-day game loop: title → tutorial → morning paper → production plan → prices → ingredients → bake → receipt → weekly report (days 7/14/21/28) → final business profile → restart.
- Economic engine (`src/game/`) is pure TypeScript, deterministic per seed, with all parameters in `src/config/balance.ts`.
- Views: Today (planner), Market (newspaper), Finances (income statement, balance sheet, break-even, charts, bank), Equipment & green, Notebook, Settings.
- Persistence in localStorage with validation; reduced-motion toggle; "unlock everything" sandbox mode.
- 39 Vitest tests (demand model, accounting identities, guards against impossible actions, investments, insights, persistence, full-season progression).
- GitHub Pages workflow (`.github/workflows/deploy.yml`), README, `docs/ECONOMIC_MODEL.md`, MIT license.

## Verified in this session

- `npm install`, `npm test` (39/39), `npm run build` (type-check + production build) all succeed.
- Played through the built game in a browser: tutorial, buying, baking, receipts, weekly report, price change on day 8, loan plus oven purchase on day 15, all the way to the day-30 report, then restart.
- Reload resumes from localStorage.
- Phone width (375 px): no horizontal scrolling, layout reflows.

## Not verified

- The GitHub Actions workflow has not been run on GitHub; it was written but not executed.
- `npm run dev` could not be checked in this session's sandbox (the app's sandboxed folder redirect confuses Vite's dev server). Production builds and `vite build --watch` work. On a normal checkout, `npm run dev` is expected to work.
- No formal screen-reader or WCAG contrast audit was done.

## Next 5 highest-value steps

1. **Balance pass for passive play.** Keeping the default plan all season still earns about $4.5k. Consider slightly higher fixed costs, or day-1 demand that differs more from the default plan, so planning matters from week 1.
2. **Run the deploy:** push to GitHub, set Pages source to "GitHub Actions" and confirm the live URL works.
3. **Product substitution:** customers who find an empty shelf buy a substitute some of the time. This makes stockouts more nuanced.
4. **Accessibility audit:** keyboard-only playthrough, screen-reader labels on the product table, contrast check of the muted text on paper.
5. **NPV view for investments:** add a discount-rate slider beside simple payback to teach time value of money.

## Known issues / rough edges

- The week-4 competitor uses a fixed rule (it doesn't react to the player).
- The investment estimate for an owned oven only credits extra capacity once the oven is above 85% utilisation, so it can look small if the player doesn't bake more. The final report explains this.
- Ticker and day-change banner are decorative; both are disabled under reduced motion.

## Commands

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

## For the next Claude session

Read this file and `docs/ECONOMIC_MODEL.md`, run `npm test` and `npm run build`, then work through the five steps above in order. Keep all new economic numbers in `src/config/balance.ts`, and add a test for each new mechanic.
