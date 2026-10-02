# Design notes: making Vielie Bakery sticky

An audit of the game against the five things bakery sims share (every action feels good, every order is graded, customers are people, a next goal is always on screen, upgrades create decisions), followed by a log of each change made for it.

## Stack

React 18 + TypeScript, Vite, Vitest. Pixel art is drawn in code (`src/ui/pixel`); the bakery interior is canvas layers plus DOM sprites in a 240×135 stage. All game logic is a pure, seeded reducer (`src/engine/state.ts`) over one `GameState`; the UI dispatches actions and reads selectors. Saves: `localStorage`, three slots plus a rolling backup, versioned (`version: 3`) with migration from v2, written after every action. Mobile: the same build in Capacitor shells.

## The core loop, in one line

Morning (read the news, stock up, bake trays, set prices) → open the doors → serve walk-ins in real time (tap assembly steps for bánh mì and drinks, hand pastries over) → last call → close (keep / donate / bin leftovers) → day report → next morning. Or: hand the whole day to the team and get the result instantly.

## Resources and what they buy

| Resource | Earned by | Spent on |
| --- | --- | --- |
| Cash | Sales, tips, catering, wholesale, loans, investors, quest rewards | Ingredients, wages, rent, equipment, decor, marketing, repayments |
| Safety fund | Moving cash in | Covers a bad day automatically |
| XP → level (5) | Serving, profit, quests | Unlocks recipes, equipment, decor, finance options |
| Reputation (0–100) | Satisfied customers | More walk-ins, higher willingness to pay |
| Community (0–100) | Donations, kindness, events | Community bonds, forgiveness, goal progress |
| Eco score | Sourcing, waste, packaging | Eco-minded customers pay more |
| Hearts (per regular, 0–5) | Serving a named regular well | They visit more often and tip |
| Loyal pools (per segment) | Satisfied first-timers | Regular visits that ignore rivals |
| Ingredients, baked stock, baguettes | Buying, baking | Everything sold |

## Unlocks and when they arrive

- **Levels** at 0 / 150 / 900 / 3,000 / 8,000 XP. Each level unlocks a bundle at once: recipes (22 products now, 1–4 per level), equipment (20 items, by level), decor (12), campaigns (level 2), price locks (2), co-op shares (3), loans and investors (by history), branches (stage).
- **Seasonal**: Tết gift boxes (days 24–28 and every year), mooncakes in month 8.
- **Quests**: 17, each with a cash or XP reward. **Achievements**: 20, permanent.
- **Story**: scripted events through the first 35 days (coffee rumour, egg shortage, catering, Green Week, the rival opening on day 15, Tết), then seeded random events.

## End of a session

A day report (sales, spent, made, a story line, one business tip, level-up banner), autosave, then the next morning. Every 7 days a weekly review with a goal choice; every 30 days rent and loan payments. A hand-played day takes about two minutes of service plus the morning; a delegated day is instant.

## Gaps against the checklist, ranked

| # | Gap | What exists today | What's missing |
| --- | --- | --- | --- |
| 1 | **Juice on the core actions** | Coin + heart sprites float at the register, "+$x" rises on the stage, cash in the HUD counts up (`useTween`), a synth sound per action, sparkles when an assembly finishes | No scale pop on taps; sounds never vary in pitch so repeats grate; the sparkle fires even on a botched order, so "perfect" means nothing; no moment for level-ups; the floating money lives on the stage, not next to the number it changes |
| 2 | **Every order gets graded** | The engine scores satisfaction (quality 45%, wait 35%, value 20%) into love / happy / ok; loved regulars tip $1 | The player never sees the score: no stars, no breakdown, no distinct perfect-order moment; tips don't scale with the grade |
| 3 | **Customers are people** | 8 named regulars with favourites, patience, personalities and Vietnamese lines; hearts 0–5 that rise on good orders and fall on bad ones | No permanent badges (hearts can be lost); no critic who grades harder and pays more; reactions aren't tied to the grade |
| 4 | **A next goal always on screen** | Quests with progress bars (behind a button), level meter in the HUD, scenario goal on Growth | Nothing says what the *next unlock* is or how close it is; the day report doesn't tease tomorrow; the first week has no day-by-day unlock rhythm (everything is XP-lumped) |
| 5 | **Variety inside the loop** | Weather, festivals, events, catering and wholesale orders, seasons | No daily special (one recipe pays more today); no special orders with a big tip |
| 6 | Upgrades create decisions | Already strong: ovens vs. hands, storage vs. bulk prices, staff per station, decor with real bonuses | "Let the team run today" automates the whole day; acceptable here because it's the sandbox's second mode, not a purchase |
| 7 | Light story | Bà's first month, scenario goals, endings | Few story beats after day 35 |
| 8 | Persistence | Autosave after every action, versioned, slots, backup, migration | Nothing |

Guardrails already met: no streaks, no timers on purchases, achievements are never removed, a failed day still pays XP. One tension to watch: regulars drift away over time (an economy mechanic, not a punishment for leaving), and hearts can fall. Badges (gap 3) will be the permanent layer on top.

## Plan

1. Juice: tap pop, pitch-varied sounds, perfect-only sparkle burst, level-up shake, money floating from the cash counter.
2. Visible order grade: 0–100 from accuracy, timing and quality, shown as stars and tip for ~1.5 s; perfect gets its own sound and look; tips scale with the grade.
3. Regular badges (bronze → silver → gold at 5 hearts each, never lost) and one critic, Cô Ngọc, who comes late in the day from level 2.
4. "Next unlock" bar on Today and in the report, a tease of tomorrow, and a first-week unlock schedule in config that rotates types.
5. Daily special (×1.5) and occasional special orders with a big tip.

Each step is one change, played for at least a day before the next.

## Change log

### 1. Juice on the core actions

*What changed*
- Every `Btn` pops (1 → 1.12 → 1 over 140 ms) on tap, and presses in while held. Off under reduced motion.
- Sounds play at a random pitch within ±5 % so a run of serves doesn't drone.
- The assembly sparkle (and its sound) now fires only for a mistake-free order; a botched one gets a plain pop. A mistake-free order also bursts sparks at the counter in the shop scene.
- Level-ups shake the screen once (2 px, 400 ms). Nothing else does.
- Money earned during service floats up from the cash figure in the top bar, in addition to the counter on the stage.

*Numbers to playtest*: pop scale 1.12 / 140 ms; pitch jitter ±5 %; shake 2 px / 400 ms; float 1.1 s.

*Assets to replace*: none (all synth audio and code-drawn sprites).
