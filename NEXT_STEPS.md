# Next steps

## Current state

Version 2 is a rebuild following the Vietnamese pixel-art PRD. It covers the PRD's MVP, nearly all of 1.1, and much of 1.2 and 2.0:

- Pixel-art bakery interior with day/night lighting, weather through the window, street life, animated oven, steam, fan, lanterns and customers who walk in, wait and leave.
- Cute title screen (a pixel tube-house street front), loading animation, character and bakery-name setup, and the "Chào buổi sáng!" opening with Linh as the first customer.
- 9 recipes, 14 ingredients, 3 suppliers with loyalty, an oven timing game and step-by-step bánh mì and drink assembly.
- Real-time service with patience, substitution, price rejection, last call, the helper, catering pickups and wholesale deliveries.
- Leftovers (keep, donate or bin), daily report with a story and tip, weekly review and goals.
- 14 events with choices, Tết, a competitor, Green Week, a fridge breakdown and more.
- Money: safety fund, loans, marketing risk, co-op shares, price locks, 7-day chart, notebook.
- Eco score, packaging, compost, solar, garden, community and donations.
- Levels, quests, achievements, upgrades, rooms and decorations that appear in the scene; regulars with hearts.
- Autosave, save codes and an email restore link. Sound effects and music with toggles. Reduced motion, a relaxed pace option, keyboard play and a mobile layout.
- 16 engine tests, including a 40-day bot run (59 tests in total with the old v1 suite).

## Verified

- `npm test` (59/59) and `npm run build` pass.
- Played in the browser: title, setup, intro, day 1 service (bánh mì assembly, quest toast), closing, report, autosave and resume after reload, day 2 oven game, a morning event, all six tabs, buying most of the shop (each item draws in the scene), and a busy morning rush with Cô Ba. Phone width (375px) has no horizontal scrolling.

## Not verified

- A long manual playthrough to day 35 (Tết, weekly reviews, the competitor). The engine bot covers these, but the screens haven't been looked at by a person.
- The email link on a real mail client (long links can be cut off by some clients; the save code is also included in the email body).
- A screen-reader pass and a formal contrast check.
- Balance for human players: the real-time pace may need tuning. Settings has a relaxed pace option.

## Next highest-value steps

1. **Playtest days 1–10 by hand** and tune patience, day length and starting cash.
2. **Delete the v1 code** (`src/game`, `src/views`, `src/components`, `src/config`, `src/App.tsx`, `src/styles/global.css`, `tests/*.test.ts`). It's kept in the `v1-economics-sim` tag.
3. **Seated customers** in the coffee corner, and a visible upstairs for the loft.
4. **More seasonal events:** Trung Thu with mooncakes, a rainy-season flood day, a school-holiday rush.
5. **A payback / NPV view** for equipment, to teach the time value of money.
6. **Cloud save** (optional), if a backend is ever added.
