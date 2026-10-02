# Vielie Bakery

**Bake something good. Build something yours. Learn how business works.**

Vielie Bakery is a cozy pixel-art game about running a tiny Vietnamese neighbourhood bakery. Bà (grandma) is retiring and the shop on the lane is yours now. Bake baguettes and flan at dawn, assemble bánh mì and pour cà phê sữa đá to order, set your prices, deal with egg shortages, rainy seasons and a new bánh mì stand across the street, and slowly turn a tiny tiệm bánh into the bakery the whole street loves.

The economics are never a lecture. You learn supply and demand when eggs cost 70% more, elasticity when customers say "Đắt quá…", fixed costs on a rainy Monday, hedging when you lock the coffee price before a bad harvest, and opportunity cost every time you choose between a bigger oven and solar panels.

It's a static site: no backend, no accounts, no tracking. Progress saves in your browser.

**Play:** https://michcakee.github.io/vielie-bakery/

---

## How a day works

1. **Morning.** Read the market news. Sometimes there's a decision to make (a catering order, a heatwave, a rumour about coffee prices). Stock up at one of three suppliers, bake trays in the oven (pull them out when they're golden), and set prices while watching the live demand meter.
2. **Open the doors.** The shop runs in real time from 7am to 7pm. Customers walk in, order in Vietnamese (with English underneath) and wait. Hand over pastries from the case with one tap; make bánh mì and drinks step by step. Slow service, empty shelves or high prices send people away.
3. **Last call.** From 5pm, put pastries 40% off to clear the case.
4. **Close up.** Keep leftovers in the fridge, donate them to the neighbourhood, or bin them.
5. **Report.** Today's sales, what we spent, what the bakery made, a short story of the day and one friendly business tip.
6. **Every 7 days:** a weekly review and a new goal.

## Features

- **Vietnamese menu:** bánh mì, cà phê sữa đá and bánh flan to start; bánh patê sô and trà tắc, bánh chuối nướng and pandan bánh bò, and bánh kem as you level up; mứt dừa gift boxes during Tết.
- **Tactile cooking:** tap the steps in order (cắt bánh → chả lụa → đồ chua → rau thơm → tương ớt), and time the oven for a golden bake. Quality affects price tolerance, reputation and tips.
- **Customers with personalities:** Linh is always late, Minh comes back every morning for his coffee, Bà Tư notices quality, Nam hunts discounts, Mai pays more at a green bakery. Regulars build hearts.
- **Market:** daily price swings, calendar shocks, three suppliers (cheap wet market, eco farm co-op, premium), loyalty discounts, and price locks.
- **Events with real choices:** coffee rumours, rainy season, egg shortage, catering orders, Green Week, heatwave, a competitor, a broken fridge, a street festival, a wholesale deal, a food vlogger, and Tết.
- **Money:** a safety fund with auto-save, bank loans with a clear repayment schedule, risky marketing, co-op shares with dividends, a 7-day chart, and a bakery notebook that collects 23 ideas as you meet them.
- **Sustainability:** an eco score from sourcing, waste and packaging; donations; compost, solar and a herb garden.
- **Progression:** five bakery levels, 15 quests, 15 achievements, 12 upgrades and rooms, 12 decorations that appear in the shop.
- **Your bakery:** name it, pick your hairstyle, hair colour, skin tone, shirt, apron and accessory.
- **Saving:** automatic in the browser, plus save codes and an "email me a restore link" option to move to another device.
- **Sound:** small synthesized effects and an original pentatonic tune, both with mute toggles.
- **Accessible:** keyboard play (number keys serve and assemble, Space bakes), visible focus, reduced-motion mode, a relaxed pace option, and screen-reader labels. Works on phones with a bottom tab bar.

## Technology

- React 18 + TypeScript (strict), built with Vite.
- All art is original pixel art drawn in code: character-grid sprites rendered to canvas, plus a hand-painted interior and street front. No image files.
- Game logic is pure TypeScript with a seeded random number generator, so a seed always produces the same market and customers.
- Vitest for tests. No runtime dependencies beyond React.

## Architecture

```
src/
  data/        catalog (recipes, ingredients, suppliers, upgrades, decor, levels),
               people (regulars, names, Vietnamese lines), notebook
  engine/      pure game logic, no React
    state.ts       GameState, createNewGame, the reducer (every action)
    service.ts     customer schedule, real-time shop clock, serving
    economy.ts     prices, willingness to pay, demand meter, eco score, traffic
    market.ts      daily weather, ingredient prices, co-op shares, headlines
    events.ts      morning events and their choices
    progression.ts quests, achievements, levels, weekly goals
    report.ts      end-of-day story and business tip
    save.ts        localStorage, validation, save codes
  ui/          React
    App.tsx        screens, tabs, the real-time clock
    scene/         the animated bakery interior
    pixel/         palette, sprites, renderer, scene painter
    panels/        Bakery, Kitchen, Market, Build, Money, Eco, service
    screens/       loading, title (street front), setup, intro
tests/engine/  engine tests, including a bot that plays 40 days
```

There is a single source of truth (`GameState`) changed only through `gameReducer`. The UI never keeps its own copy of game data.

The earlier v1 game (a 30-day economics simulator) is still in `src/game`, `src/views`, `src/components` and `tests/*.test.ts`, and tagged as `v1-economics-sim` in git. The new app doesn't use it; it can be deleted.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: it installs, runs the tests, builds and publishes `dist/` to GitHub Pages. The Vite `base` is relative, so it works under any repository name.

## Roadmap

See [NEXT_STEPS.md](NEXT_STEPS.md). Ideas: a seated coffee corner with customers who stay, a second-floor room you can see, more Vietnamese recipes (bánh da lợn, bánh pía), seasonal events like Trung Thu (mid-autumn mooncakes), real audio recordings, and an optional cloud save.

## Credits & licensing

Design, code, pixel art, sounds and music by michcakee with Claude. All art and audio are original and generated in code, so there are no third-party assets to license. Fonts: [VT323](https://fonts.google.com/specimen/VT323) and [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro), both under the SIL Open Font License, loaded from Google Fonts.

Code is MIT licensed (see [LICENSE](LICENSE)).
