# Next steps

## Current state: v3.1.0, the sandbox

Version 3 expands the v2 pixel-art bakery into a business sandbox, following the Vietnamese Bakery Sandbox PRD. Everything from v2 (the real-time shop day, scene, assembly, oven game, regulars, recipes, events, Tết) is preserved, and v2 saves migrate automatically.

**Built (PRD phases 0–8):**

- **Phase 0:** audit and architecture ([ARCHITECTURE.md](ARCHITECTURE.md)); a central `ECON` config.
- **Phases 1–2:** accounting core (tagged cash flows, three statements, ratios, break-even, depreciation, prepaid rent); real calendar; segment-based demand with elasticity, logit competition and loyal pools; staff, capacity and the labour market.
- **Phases 3–4:** macroeconomy with regimes; reacting rivals with entry and exit; supply contracts, bulk tiers, lead times, reorder rules and storage; loans, credit line, investors, community bonds and valuation.
- **Phases 5–6:** six neighbourhoods and branches; scenarios, difficulty, goals and endings; three save slots with backups; analytics ("Why did this happen?", product table, decision journal, forecasts); casual and business views; a phone layout with a More sheet.
- **Phase 7:** Capacitor Android and iOS projects, generated icons and splashes, PWA offline support, self-hosted fonts, Android back button, safe areas.
- **Phase 8:** stress, exploit and fuzz tests; input validation; a balance pass (see [docs/BALANCING.md](docs/BALANCING.md)); mobile layout fixes.

**Tests:** 98 passing (`npm test`), plus the opt-in balance survey (`npm run balance`).

## Verified

- `npm test`, `npm run typecheck` and `npm run build` pass.
- Browser: v2 save migration; a Startup game in University Hill through day 13; every tab at desktop width and at 375 px with no horizontal page scroll; no console errors.
- Engine: six months of every scenario and 400 days on Hard keep the books balanced and every number finite.

## Not verified

- **Native builds.** The Android and iOS projects have never been compiled: this machine has no JDK / Android SDK, and iOS needs a Mac. The back button, status bar and splash code paths only run inside the app.
- **Long play by a human.** The bots play months; no person has played past the second week of v3.
- **Balance for skilled players.** The survey measures a passive autopilot. A player who hires, prices and expands well should do much better; how much better hasn't been measured.
- A screen-reader pass and a formal contrast audit.

## Next highest-value steps

1. **Build on a real phone.** Follow [docs/MOBILE_BUILD.md](docs/MOBILE_BUILD.md) on a machine with Android Studio, fix anything that comes up, and test the back button and safe areas.
2. **Playtest a full first year by hand** and tune the first month: is it clear what to do after the story events end?
3. **An "active player" balance bot** that hires, raises prices when sold out and buys a second oven, to measure the skill ceiling (and to catch any dominant strategy).
4. **Owner's pay.** Show "profit after paying yourself a market wage" so solo-owner profits read realistically.
5. **Store assets:** screenshots from real builds, final listing copy, and the privacy policy published at a URL (drafts in [docs/store/](docs/store/)).
6. **Cloud save** (optional), only if a backend is ever added, and only with consent.
