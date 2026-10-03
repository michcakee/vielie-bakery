# Design notes: making Viet Bake Shop sticky

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

### 2. Every order gets graded

*What changed*
- `gradeOrder()` in the engine scores each served order 0–100: **accuracy** 45% (assembly steps for made-to-order items; the tray's bake for pastries), **speed** 35% (share of the customer's patience left), **quality** 20% (ingredients and skill). Stars at 90 / 75 / 60 / 40.
- After the player serves someone, a card shows the stars popping in, a one-word verdict, the three bars and the tip, then fades after ~1.6 s. Five stars is gold and says PERFECT!; the sparkle burst from change 1 already marks it.
- Tips now follow the grade instead of a flat $1 for loved regulars: 15% of the bill at five stars, 6% at four, capped at $1.50, plus $0.50 from regulars. Everyone can tip now, so tips rise a little overall.
- The day report names the best order of the day (score, item, customer).
- The grade is stored on the visit, so staff-served orders are graded too (for analytics later), but only the player's own serves show the card.

*Numbers to playtest*: weights 45/35/20; star cuts 90/75/60/40; tip 15%/6% capped $1.50; card lifetime 2 s.

*Also in this change*: audio starts muted (one-time default change for existing players too; Settings turns it back on).

### 3. Customers are people: loyalty badges and a critic

*What changed*
- A regular's heart meter (0–5) now **turns into a badge** when it fills: bronze, then silver, then gold. The meter starts over; the badge never goes away. Badges make the regular visit more often (+12% per badge) and are shown as a medal beside their name on Today.
- Every regular now has **2–3 reactions** of their own for a great / okay / bad order (by stars), with translations, instead of the generic lines.
- **Cô Ngọc, food critic** (level 2+, afternoons, about every three days): orders the hardest thing on the menu, has less patience, needs six more points for each star, tips double, and moves reputation (+1.5 for five stars, −1 for two or fewer). Tagged "critic" on Today.
- New achievement: Golden regular.

*Numbers to playtest*: hearts per badge 5; visit boost 0.12/badge; critic strictness +6, tip ×2, reputation +1.5 / −1; critic frequency 0.3.

### 4. A next goal always on screen

*What changed*
- `UNLOCK_SCHEDULE` (in `catalog.ts`): something new on days 2, 3, 4, 5, 6, 8, 10 and 13, rotating recipe → neighbour → recipe → decor gift → recipe → neighbour → recipe → recipe. Scheduled recipes wait for their day even when the level would allow them; scheduled neighbours arrive ahead of their level. After day 13, levels take over as before.
- `nextUnlock()` names the next thing and how close it is: the scheduled item and the days to it, or the next level with its first recipes and equipment and the XP to go.
- Today has a **Next up** card with that text and a progress bar, always visible.
- The day report ends with the tease: "Tomorrow: New recipe: Trà tắc", or "Next up: … (in 3 days)" with the bar.

*Numbers to playtest*: the schedule days; whether day-gating Gress cupcake to day 2 feels like a reward or a wait.

### 5. Variety inside the loop: daily special and special orders

*What changed*
- From day 3, each morning one everyday menu item is **today's special** and sells for ×1.5. Customers accept the higher price as readily as the usual one (their willingness to pay rises with it), so the special is pure upside if you bake enough. Shown as a card on Today with the price.
- From level 2, about one day in three someone walks in with a **big order** (three trays' worth, two drinks, or a whole cake), has extra patience and budget, and leaves a bonus tip of 40% of the bill on top of the graded tip. Tagged "big order · big tip" in the queue, with their own order lines.

*Numbers to playtest*: special ×1.5 from day 3; big-order chance 0.35/day, qty 3, budget ×1.5, patience ×1.4, bonus tip 40%.

---

## Phase 1 audit (task brief, Part 1): stack, builds, status

**Stack.** React 18 + TypeScript (strict), Vite 5, Vitest. The simulation is a pure, seeded reducer (`src/engine`) over one `GameState`; the UI (`src/ui`) only dispatches actions. Pixel art is drawn in code (`src/ui/pixel`), audio is synthesised in code (`src/ui/audio.ts`). No backend.

**State and saves.** `localStorage`: three save slots (`vielie-bakery-v3-slot-N`), each with a rolling backup, plus a prefs key. The save format is versioned (`version: 3`) with migration from v2 and in-place filling of content added later. Written after every action. Save codes (deflate + base64) and a player-initiated "email me a restore link" (opens the player's own mail app via `mailto:`; the game sends nothing).

**Builds.** Web: `vite build` → `dist/`, published by GitHub Actions to GitHub Pages (HTTPS), installable PWA with a same-origin-only service worker. Mobile: the same `dist/` copied by Capacitor 7 into `android/` and `ios/` (not yet compiled on a machine with the SDKs).

**Gameplay status against Part 2.** Plan items 1–5 above are done (see the change log): juice, grading, regulars with badges and a critic, day structure with an end-of-day summary (the pre-existing report, now with best order and the next-unlock tease), unlock schedule in config, daily special and special orders. Also already present: upgrades that shift the bottleneck (ovens vs. hands, storage vs. bulk; decor has small mechanical bonuses) and versioned auto-save. Remaining from the brief: story beats at day milestones (Phase 3, item 8). Bà's scripted first month exists; nothing fires at later milestones.

**Day length.** A hand-played day is about 2 minutes of service plus the morning, 3–5 minutes in all; a delegated day is instant.

## Legal gaps (task brief, Part 3)

### Data that leaves the device

None initiated by the game. The only outbound paths are started by the player and carry only what they chose:

| Path | Where | What | Notes |
| --- | --- | --- | --- |
| `mailto:` restore link (Settings) | the player's own mail app | the save code, to an address the player typed | the address is **stored in local prefs** (`prefs.email`); see L1 |
| Clipboard (Settings → copy save code) | the device clipboard | the save code | local only |
| Service worker (`public/sw.js`) | same origin only | caches the app shell | `fetch` of the game's own files; no third-party requests |

No `fetch`, XHR, WebSocket or beacon to any other host. No analytics, ads, crash reporting, accounts, logins, purchases, chat or leaderboards. Fonts are self-hosted (no Google Fonts requests). Capacitor plugins used: App (back button), StatusBar, SplashScreen; none make network calls.

### Gaps, ranked

| # | Gap | Rule | Fix (Phase 2) |
| --- | --- | --- | --- |
| L1 | Settings stores an **email address** in local prefs for the restore link | §0 no emails; §1 no personal information | Stop storing it: ask for the address only when the button is pressed, or drop the feature and keep save codes |
| L2 | A product is named **"Gress oreos"** (Oreo is a Mondelez brand); the schedule tease repeats it | §3 no real brand names | Rename to "Gress sandwich cookies" (the id can stay). Needs your OK since you named it |
| L3 | No `privacy.html`, no `terms.html`, no Credits screen; Settings has no links to them | §4 required pages | Draft both with `[OWNER: fill in]` placeholders, add a Credits screen, link all three from Settings; reachable from web and app |
| L4 | "Reset bakery" wipes **one slot**; there is no single "delete all my data" (all slots, backups, prefs) | §4 delete-data button | Add "Delete all my data" that clears every game key |
| L5 | **Flash rate**: the assembly sparkle twinkles at 2.5 flashes/s and the five-star variant at 4 flashes/s | §5 no more than 3 flashes/s | Slow both below 3/s (they already stop under reduced motion) |
| L6 | ~~Cute Cubes font had no licence file~~ **Resolved:** replaced by Pixelify Sans (SIL OFL 1.1, Google Fonts) | §3 | Done |
| L7 | The Android manifest requests `INTERNET` (Capacitor's template default; the game never uses it) | §1 keep the surface tiny | Remove it from the manifest; Capacitor serves from a local scheme |
| L8 | All in-game text, pixel art and audio are **AI-generated** (Claude, with the owner) | §7 list AI-generated content | Listed in CREDITS.md |
| L9 | Staff applicants use the owner's friends' **real first names** (Vy, Sang, Hieu, Yen Vy, Phuong Khanh, Vien) | §3 no real people's names | The owner's deliberate choice, first names only; keep, noted here |
| L10 | Accessibility not formally checked: contrast of muted text on cream, labels on icon buttons, and the new grade card | §5 | Contrast and label pass in Phase 2 |

Already fine: no secrets in the repo (`.gitignore` excludes `.env` and `.env.*`); HTTPS on GitHub Pages; mute and reduced-motion toggles exist; the store drafts say no data is collected, which matches the code; no purchases; keyboard play works (number keys, Space, Escape, Tab focus traps in modals).

### Brand and character sweep

Grepped for common brands and characters (Oreo, Nutella, Starbucks, Coca-Cola, Pepsi, Disney, Pokémon, Sanrio, Papa's, Good Pizza, Nestlé, Highlands, Phúc Long, Trung Nguyên, Cộng, Gong Cha, Grab, Shopee, Facebook, Instagram, TikTok, YouTube). Only hit: "oreos" (L2). Rival bakeries (Bánh Mì Cô Tư, Tiệm Bánh Hồng Phát, Saigon Express, Boba & Bánh, Metro Café, Riverside Pâtisserie, SweetMart Bakery, Chè Chị Bảy) and the neighbourhoods are invented. The regulars are fictional.

## Assets to replace

None: all art and audio are original code, and every font is OFL.


### Phase 2: legal cleanup

*What changed*
- **L1** The restore-link address is no longer stored: it's typed, used once to open the player's mail app, and dropped. An address left in older prefs is deleted on load.
- **L2** "Gress oreos" is now "Gress sandwich cookies" (id unchanged, so saves and tests are untouched).
- **L3** `public/privacy.html` and `public/terms.html` drafted with `[OWNER: fill in]` placeholders for legal name, contact email, governing state and dates. Settings → About links to Privacy policy, Terms of use and Credits; the two legal pages open in-app (an iframe of the same static file, so web and app show one text) with an "open in a new tab" link. The Credits screen renders `CREDITS.md` directly, so the file stays the single source.
- **L4** Settings → "Delete all my data" (type DELETE): clears all three slots, their backups, the old v2 save and preferences, then reloads to a clean start. The per-slot "Reset bakery" stays.
- **L5** Flash rate: the assembly sparkle now blinks 1.25×/s (was 2.5), the five-star variant 1.4×/s (was 4). Under reduced motion they don't animate at all.
- **L7** Android `INTERNET` permission removed; the app runs from bundled files and makes no requests. Noted in MOBILE_BUILD for live-reload dev builds.
- **L10** Contrast: muted text, the green heading colour and the green "good" figures were all under 4.5:1 on cream; darkened to pass. The five-star verdict uses ink instead of a light brown.
- `.gitignore` now excludes keystores, signing keys, provisioning profiles and Firebase config files.
- Title street: passers-by now stand on the pavement (feet at the kerb) instead of floating over the shop fronts.

*Decisions left to you*: L9 (friends' first names) kept on your say-so. L6 was resolved by swapping to Pixelify Sans (OFL).

### Phase 3, item 8: light story beats

*What changed*
- `src/data/story.ts`: five milestone beats at days 45, 90, 180, 365 and 730 (the lane notices you, a letter from Bà, the sidewalk party at half a year, Bà's recipe notebook at one year, two years). Two to four lines each, one "Carry on" button, and a small gift (community, reputation or XP). They fire for every scenario, on the morning of the day, through the normal event card, so they never interrupt service.

*Numbers to playtest*: the milestone days; whether the gifts feel like a nod or a bribe (they're small on purpose).

### Playtest checklist (after Phase 2 and 3)
- New player understands the first order: yes, Linh's bánh mì with glowing steps on days 1–3.
- Feedback within 100 ms on every tap: button pop 140 ms starts immediately; sounds are synchronous.
- Perfect vs okay without reading: gold card, five popping stars, PERFECT!, sparkle sound and spark burst vs a cream card with fewer stars.
- Next unlock visible with a bar: Today's Next up card and the report tease.
- Day in 3–8 minutes: 3–5 minutes hand-played.
- Save survives reload: yes (autosave after every action; checked by reloading the pane).
- Slower, noisier, more confusing: audio now starts muted; the grade card is the only new overlay and fades in 2 s.


## Phase 4: release check (Part 3, section 8)

| Check | Result | Notes |
| --- | --- | --- |
| Network calls (`fetch`, XHR, websockets, SDK init) listed and justified | **Pass** | One: `public/sw.js` fetches the game's own files for offline caching (same origin only). Listed under "Data that leaves the device". No SDKs. |
| `CREDITS.md` covers every asset and library | **Pass** | All fonts (all OFL), libraries and generated content listed. |
| Privacy policy matches the code | **Pass** | No data collected; local saves; restore link opens the user's own mail app and keeps nothing; delete-data in Settings. |
| No brand names or copyrighted characters | **Pass** | "Oreos" renamed. Grep for common brands/characters is clean. |
| Delete-data button works | **Pass** | Settings → Delete all my data: verified in the browser that every `vielie-*` key is removed and the game reloads to a fresh title screen. |
| Purchase flows show real price and confirmation | **N/A** | No purchases. |
| Accessibility (section 5) | **Pass, with notes** | Keyboard: number keys, Space, Escape, Tab-trapped modals. Icon buttons and sprites have labels or are `aria-hidden`. Contrast: muted text, headings and figures raised past 4.5:1 on cream; a full automated audit on a real device is still worth doing. Colour is never the only signal (wrong-step shake plus "oops" sound; sold-out chips carry a screen-reader "sold out"). Mute and reduced-motion toggles; sparkles under 3 flashes/s and off under reduced motion. |

### Things only you can do
1. Fill in the `[OWNER: fill in]` placeholders in `public/privacy.html` and `public/terms.html` (legal name, contact email, governing state, dates), and in `docs/store/STORE_LISTING.md` (developer name, support email, privacy policy URL).
2. ~~Font licence~~ Done: Pixelify Sans (OFL) replaced Cute Cubes.
3. Store accounts and forms: Google Play Console and Apple Developer accounts, the Data safety / App Privacy questionnaires (answers in `docs/store/`), screenshots from real builds, and the signed builds themselves (see `docs/MOBILE_BUILD.md`; this machine has no Android SDK or Xcode).
4. Confirm your friends are happy having their first names in the game (L9).


---

## Visual upgrade brief: Phase 0 audit (report only)

### Stack and rendering
React 18 + TypeScript + Vite; one codebase for web (GitHub Pages, PWA) and mobile (Capacitor shells, same `dist/`). The bakery scene is a **240×135 logical stage**: three `<canvas>` layers painted by code (`src/ui/pixel/scene.ts`: room, street through the window, counter) plus DOM sprites on top (`<img>` from code-generated PNGs via `spriteURL`, people as `<span>` with a generated sprite-sheet background). The whole stage is scaled with a CSS `transform: scale()` whose factor is **`containerWidth / 240`, fractional** (`useStageScale` in `BakeryScene.tsx`), so pixels are uneven at most widths even though `image-rendering: pixelated` is set. The title street is a separate 240×135 canvas (`Exterior.tsx`) stretched to its container the same way. All UI around the stage is ordinary DOM/CSS. No engine.

### Current art (all drawn in code, no image files except the generated icons)
| Set | Size | Count | Pixel art? |
| --- | --- | --- | --- |
| Food and ingredient sprites | 16 wide × 9–13 tall (most 16×12) | 37 | Yes, hand-drawn character grids |
| Small icons (coin, heart, star, gear, weather, UI) | 8×8, 8×7, 8×6, 8×5 | 40 | Yes |
| People (customers, staff, owner) | 12×19 (+ hair/accessory layers), 2 walk frames | generated per look | Yes |
| Decor and props (plant, lanterns, moto, birdcage, fan, medals) | 6×7 to 18×11 | 11 | Yes |
| Room, counter, oven, equipment, tables, street, title street | procedural rects on the 240×135 canvases | – | Yes, but no outlines/shading rules |
| App icons and splash | rendered from the bánh mì sprite | – | Yes |

Mismatches: items are 16 wide but 9–13 tall (no fixed cell); icons mix 8×8 and 8×7/8×6/8×5; people are 12×19, which is neither 16 nor 32; the canvas furniture uses pure `--ink` (#3b2a25) outlines on sprites but no outlines on most props; shading is mostly flat with occasional `rgba` overlays (gradients forbidden by the brief). Light source isn't consistent. Text glyphs standing in for sprites: `★ ☆` (quality stars in the Market), `✦` (assembly sparkles in CSS), `→` (arrows in copy), `‹ ›` (look editor), `✓`. No emoji.

### Screens and interactive elements
Loading · Title (street canvas, Continue / New game) · New game (slot ×3, scenario ×6, difficulty ×4, Start, Back) · Setup (look editor arrows ×12, name, location picker, "That's me") · Intro lines · **Game**: HUD (quests, settings, 5 stats, level meter), stage, 9 tabs (Today, Kitchen, Market, Staff, Customers, Growth, Finances, Analytics, Eco; phone shows 4 + More sheet), Service panel (pause, speed, last call, hand over, skip, close, order list, assembly step buttons, stock strip), Closing (keep/donate/bin per item), Day report, Weekly review (goal picker), Event card (choices), Quest book, Settings (toggles, text size, save code, legal links, reset, delete all), Privacy/Terms (iframe), Credits, Ending modal. Roughly 200 buttons across the panels (price steppers, buy buttons, hire/fire/train, loans, campaigns, equipment, decor, menu toggles, plan steppers).

### Text
`Be Vietnam Pro` (OFL) for body and labels; `VT323` (OFL) for the pixel voice (70 CSS rules: buttons, menu board, speech bubbles, stat figures); `Pixelify Sans` (OFL) on headings, the wordmark, HUD name, tab labels and numbers (uppercased); one `ui-monospace` rule (save code box). The brief's advice matches: move the 70 VT323 uses to Pixelify Sans and retire VT323. Vietnamese letters: Pixelify Sans lacks them, so diacritics in headings fall back to VT323 today.

### Game events visuals can react to (already exist as actions, fx or toasts)
`open` (doors), `bake` (tray in; oven mini-game `process`), tray out of the oven (`bakedToday` changes; quality known), `serve` (grade, mood, tip; fx `coin`, `heart`, `sparkle`), customer leaves (`sad`/`slow`/`pricey` fx), `lastCall`, `closeEarly`/`finishDay`, `nextDay`, level-up toast, unlock toast, quest/achievement toasts, badge won, critic impressed, special order arrives, story beat, loan/purchase (cash change), weekly goal met. Missing hooks: "burnt" as a distinct state (today a pale/dark/burnt tray only lowers quality), oven "ding" when a bake finishes on a team day, and a per-ingredient "added" event (assembly steps are UI-only).

### Problems
1. **Fractional stage scaling** (biggest): the stage scales to the container, so at 390 px wide it's 1.625×; sprite pixels alternate 1 and 2 device pixels. Fix: integer scale in device pixels, letterbox the rest.
2. People, stage props and DOM `<img>` sprites are positioned at fractional coordinates after scaling (no rounding).
3. No fixed sprite cells, no outline/light rules, so new props (tables, lamps) don't match the sprite sheet's look.
4. Tap targets: price steppers are 38 px, look-editor arrows 36 px, the stock-strip chips and the tab bar's hit areas are under 48 px; buttons are fine.
5. Palette: the UI uses cream/mint tokens (14 CSS variables) but `styles.css` still carries 94 raw hex colours, and the scene painter has its own `PAL` and `ROOM` objects; three sources of colour.
6. Colour contrast was fixed in Phase 2, but the brief's palette (pastel-16) would need re-checking: `--ink #58525a` on `--cream #eeede3` is 5.1:1 (OK); pastel-on-pastel labels would not be.
7. Unicode glyphs for stars and sparkles render in whatever font is available (inconsistent on Android vs iOS).
8. Audio is synthesised (no files), which is fine; pitch jitter and mute exist; no separate music/SFX volume.

### Recommendation: base sprite size
Keep a **16 px base unit**: pad every item/ingredient/icon to a **16×16** cell (small icons stay 8×8 as half-cells); redraw people at **16×24** (two cells tall), not 32×32: the stage is only 135 px high and a 32 px character would be a quarter of the room, and the queue of four at the counter wouldn't fit. Furniture on the canvas snaps to 16-px multiples. Global scale: an **integer device-pixel scale** chosen per viewport (3× on a 1080-wide phone, 4× on desktop), with the stage letterboxed on a wallpaper pattern. That keeps every existing sprite usable (they're already ≤16 wide) and only requires padding, outline and light-direction cleanup rather than redrawing from scratch.

### §11: where the systems live (for Phases 6–9)
Money, prices, costs, inventory, customers, time, staff, rivals and the macroeconomy are already **one pure, seeded simulation module** (`src/engine/`, 18 files) over a single `GameState`, with every parameter in `src/data/config.ts` (`ECON`, `DIFFICULTY`) and content in `src/data/*.ts`. Saves are versioned (`version: 3`) with migration. Nothing economic is hard-coded in UI components: the UI calls engine selectors (`willingToPay`, `acceptance`, `demandCurve`, `breakEven`, `forecast`, `nextUnlock`, `gradeOrder`…). Tests already prove accounting identities, elasticity behaviour, rival undercutting, capacity limits and bankruptcy (106 tests). Of the brief's §13 concept list, the mechanics for 1–3, 5–7, 9–11, 13, 14, 16 and 17 exist; missing are day-old discounting with spoilage (4; today unsold trays keep or bin), consumer-surplus display (8), price discrimination/bundles (12), comparative advantage/trade (15), size anchoring (18), the Predict → Notice → Name → Transfer loop (the notebook has plain-language entries but no predictions or player-data graphs), difficulty presets named Sprinkle/Pro (four exist: Easy–Expert), and the Test Kitchen replay (determinism already allows it: same seed, same day).

### Phase 0 summary line
```
Phase 0 – done (report only)
Changed: DESIGN_NOTES.md (this section)
New assets: none
Hooks added to game logic: none
Known issues: fractional stage scaling; no fixed sprite cells; 3 colour sources; a few sub-48px targets; unicode star/sparkle glyphs
Next step proposed: Phase 1 (palette tokens as the single colour source, Pixelify Sans everywhere, integer device-pixel stage scaling with letterbox) after your go-ahead; the brief's pastel-16 palette would replace the cream/mint/yellow scheme you chose this week, so confirm which palette wins before I start
```

```
Phase 1 – done
Changed: src/ui/styles.css (tokens, hex remap, fonts, letterbox), src/ui/pixel/palette.ts + scene.ts + screens/Exterior.tsx (nearest-palette remap), src/ui/scene/BakeryScene.tsx + screens/Exterior.tsx (integer device-pixel scale), public/fonts (VT323 out, Press Start 2P in), CREDITS.md, OFL.txt
New assets: Press Start 2P (CodeMan38, SIL OFL 1.1, Google Fonts)
Hooks added to game logic: none
Known issues: skin and hair tones kept outside the palette on purpose; night sky now slate; the stage is letterboxed at most widths (by design)
Next step proposed: Phase 2
```

```
Phase 2 – done
Changed: src/ui/pixelUi.ts (new: runtime 9-slice panel images, cursor, touch sparkle), src/main.tsx, src/ui/styles.css (kit: panels, button states, 48 px targets, coin spin, bubbles, faces, recipe book, cursor), src/ui/pixel/sprites.ts (faces, arrow, cursor hand), src/ui/panels/ServicePanel.tsx (patience face), src/ui/scene/BakeryScene.tsx (item in bubbles), src/ui/panels/KitchenPanel.tsx (recipe book with tabs and padlocks)
New assets: none (all generated in code)
Hooks added to game logic: none
Known issues: bánh bao, chè and mooncake have no sprite yet (Phase 3); border-image panels can't show rounded CSS corners, so everything is pixel-notched by design
Next step proposed: Phase 3 (fixed 16×16 cells, missing sprites, burnt and perfect variants, glyphs to sprites)
```

```
Phase 3 – done
Changed: src/ui/pixel/render.ts (fixed 16×16 / 8×8 cells, :burnt and :perfect variants, 16×24 person cells), src/ui/pixel/Sprite.tsx, src/ui/pixel/sprites.ts (bánh bao, chè, mooncake, pork, beans, pandan, lotus), src/ui/scene/BakeryScene.tsx (feet on the floor, burnt/perfect trays in the case), src/ui/panels/ServicePanel.tsx (burnt chips), src/ui/panels/StaffPanel.tsx + src/ui/LookEditor.tsx + styles (★☆‹›✦ glyphs replaced by sprites)
New assets: none (all drawn in code)
Hooks added to game logic: none (burnt = tray quality under 45, perfect = 95+, both already in state)
Known issues: light direction and per-material shade counts were not hand-audited across all 97 sprites; night-sky colours are approximations
Next step proposed: Phase 4 (oven ding, burnt smoke, coin arc, customer hop, level-up confetti, new sounds)
```

```
Phase 4 – done
Changed: src/ui/audio.ts (plop, pfft, chirp, confetti), src/ui/panels/KitchenPanel.tsx (oven result: bell bounce + ding, or smoke puffs + worried face + pfft; perfect bake sparkles), src/ui/scene/BakeryScene.tsx (customers who loved it hop; coins arc toward the HUD), src/ui/panels/ServicePanel.tsx (ingredients plop and squash into the stack; grade card chirps for 4–5 stars, sighs for 1–2), src/ui/pixelUi.ts + App.tsx (palette confetti and a fanfare on level-up), styles (button squash 110%/90%)
New assets: none
Hooks added to game logic: none (the oven result is read from the bake's quality in the UI)
Known issues: effects were verified in the DOM and by ear-less inspection; the burnt path shares the same component as the ding path but wasn't triggered in the pane (a tray must be left past the end of the dial)
Next step proposed: Phase 5 (ambient: cat past the window, plant sway, wordmark bob)
```

```
Phase 5 – done
Changed: src/ui/pixel/sprites.ts (cat), src/ui/scene/BakeryScene.tsx (a cat crosses the window every ~48 s), styles (cat walk, wordmark bob; the plant already swayed; the window sky already follows the time of day; the title street already had clouds, walkers, a moto and steam)
New assets: none
Hooks added to game logic: none
Known issues: none
Next step proposed: Phase 6 (simulation core: diminishing returns for extra bakers, the brief's lesson tests, Sprinkle/Pro labels)
```

```
Phase 6 – done (simulation core)
Design note: the model already lived in one pure, seeded, config-driven module (src/engine), so this phase added what the brief's §13.4 lacked rather than extracting anything.
Changed: src/engine/economy.ts (crowdingFactor: the k-th baker or pastry chef works at 1 − 0.15·(k−1), floor 0.4, halved by a renovation, so a third helper adds less than the second), src/data/config.ts (crowding, crowdingFloor; difficulty labels Sprinkle / Normal / Pro / Expert), tests/engine/lessons.test.ts (new: elastic treat past the revenue peak loses revenue while coffee keeps it; an identical-goods rival undercutting 30% takes most walk-ins; a third baker adds less than the second; a second oven raises 45-day profit when ovens are the bottleneck; random walk-in noise stays within ±10%)
Hooks added to game logic: crowding factor in laborTrays (visible as slightly fewer trays for teams of three or more bakers)
Known issues: NPV is not shown to the player yet (concept 13 UI comes with Phase 9); 'Sprinkle' and 'Pro' are labels over the existing easy/hard presets, whose parameters are in DIFFICULTY
Next step proposed: Phase 7 (recipe mastery, best-day records, end-of-day structure checks)
```

```
Phase 7 – done (engagement structure)
Changed: src/engine/progression.ts (masteryTier; bronze/silver/gold medal toast at 40/120/300 lifetime sales of a recipe), src/data/config.ts (masteryTiers), src/ui/panels/KitchenPanel.tsx (medals and 'N to the next medal' in the recipe book), src/ui/overlays.tsx ('Best day ever!' in the report when today beats every earlier day), src/ui/panels/HomePanel.tsx (neighbours you haven't met yet shown as silhouettes: a customer album), src/ui/Settings.tsx + App.tsx (optional 30-minute break reminder, off by default)
Hooks added to game logic: mastery tier tracked in questProgress for the one-time toast
Checked against the banned list (§12.4): no purchases, loot, timers, streaks, FOMO, guilt messages, autoplay, leaderboards or data collection exist. Regulars drifting away and hearts dropping are economy mechanics, not punishments for leaving: nothing changes while the game is closed.
Session shape: a hand-played day is 3–5 minutes; the day ends on the report and 'Next day' is a button.
Known issues: none
Next step proposed: Phase 8 (Predict → Notice → Name → Transfer loop for concepts 1–8, Notebook pages with Professor Notes and player-data graphs)
```

```
Phase 8 – done (concepts 1–8, the five-step loop)
Changed: src/engine/types.ts (Prediction, Guess, surplus), src/engine/state.ts (setPrice records a pending prediction; 'predict' action; settlePrediction at closing: result by ±10%, +5 XP for guessing, +10 for a right guess, opens the notebook page), src/engine/service.ts (consumer surplus Σ(WTP − price) per day), src/data/notebook.ts (Professor's notes, Real World cards, Ask-a-grown-up questions and a graph kind for opportunity cost, profit, demand and price, inventory/newsvendor, fixed/sunk costs, marginal thinking, elasticity habits vs treats, consumer surplus), src/ui/panels/KitchenPanel.tsx (Predict card with three picture choices), src/ui/overlays.tsx (the report shows the result beside the guess), src/ui/panels/FinancesPanel.tsx (notebook pages expand: kid text, a chart from the player's own days, Professor's note, Real World, Ask a grown-up)
Hooks added to game logic: pendingPrediction on setPrice; predict action; settlement at closeBooks; today.surplus in serve
Playtest: changing bánh mì's price shows the Predict card, a guess locks in, and the report names the result; every notebook formula was checked against the intro-micro standard (π = TR − TC; Q(p) = N(1 − F(p)); Lerner; newsvendor F(Q*) = (p − c)/(p − s); MR = MC; CS = Σ(WTP − p))
Known issues: 'Lately it sold about 0 a day' on day 1 (no history yet): the text could hide the number until there is a history
Next step proposed: Phase 9 (concepts 9–18, Test Kitchen, Grown-up summary)
```

```
Phase 9 – done (concepts 9–18, Test Kitchen, Grown-up summary)
Changed: src/data/config.ts (dayOld, combo, sizes), src/engine/economy.ts (isDayOld; kept trays sell at −30% the next day), src/engine/service.ts (combo deal: 35% of coffee or bánh mì buyers add the other at 15% off; drink sizes small/medium/large at ×0.85 / ×1 / ×1.25, chosen 20/55/25%), src/engine/state.ts (setCombo, setSizes; 'comparative' learned when two roles are on staff), src/data/notebook.ts (Professor's notes, Real World and Ask-a-grown-up for diminishing returns, scale, supply shocks and pass-through, interest/NPV, competition (Bertrand/Hotelling), hidden quality, risk/diversification, bundling, comparative advantage, anchoring), src/ui/panels/KitchenPanel.tsx (deal toggles, day-old chips), src/ui/panels/AnalyticsPanel.tsx (Test Kitchen: replay today with one price changed, side-by-side table; unlocks with concept 7 or level 3), src/ui/Settings.tsx (Grown-up summary behind a 7×8 gate: concepts unlocked, prediction accuracy, conversation starters; nothing leaves the device)
Hooks added to game logic: day-old price; combo add-on sale; size price multiplier; two toggle actions; 'comparative' on hire
Simplifications stated in the Professor's notes: sizes change price only (same ingredients); customers never bargain; reputation lags by a moving average
Tests: day-old discount, combo adds sales, sizes lift drink revenue, replaying the same morning is deterministic (the Test Kitchen's premise); 113 passing
Known issues: trade between shops (the second half of concept 15) is taught, not simulated; the quiz at chapter ends (§13.8, optional) is not built; the Test Kitchen only varies price (batch size and menu are one-line additions)
Next step proposed: a human playtest of the first fortnight; then retune concept pacing from the prediction-accuracy numbers in the Grown-up summary
```

## Onboarding, Unlocks and Intro Quests: Phase A audit (report only, no code changed)

Measured on a fresh Family Business game, day 1 morning, after the intro lines, in the browser pane (desktop 1200 px and phone 375 px). "Controls" = visible buttons, inputs, radios and links inside the tab panel; "numbers" = numeric tokens in the panel text.

### A1. What a day-1 player sees

| Tab (desktop order) | Cards | Controls casual | Controls business | Numbers casual / business | Phone scroll depth |
|---|---|---|---|---|---|
| Today | 6 (economy, Getting started, Next up, note from Bà, Open for business, Quests) | 6 | 6 | 30 / 34 | 2.7 screens |
| Kitchen | 6 (forecast, oven, menu & prices, what's on the menu, production plan, recipe book) | 29 | 29 | 62 / 71 | 6 screens |
| Market | 4 (news, storage, stock up, supply contracts) | 29 | 29 | 63 / 64 | 3.2 screens |
| Staff | 4 (capacity, team, 11 applicants, roles) | 13 | 13 | 59 / 61 | (More menu) |
| Customers | 3 (who comes in, rivals, marketing) | 13 | 13 | 55 / 55 | (More menu) |
| Growth | 7 (stage, equipment, building, more shops, worth, decorate, you & your bakery) | 32 | 50 | 119 / 175 | (More menu) |
| Finances | 7 casual (safety fund, loans, credit line, investors, bonds, co-op shares, notebook) + statements in business | 35 | 35 | 40 / 40 | 3 screens |
| Analytics | 2 (analytics placeholder, 7-day forecast) | 2 | 2 | 68 / 68 | (More menu) |
| Eco | 5 (score, sourcing, packaging, green upgrades, community) | 5 | 5 | 19 / 19 | (More menu) |
| **Total** | **44 cards** | **164** | **182** | **515 / 587** | |

Plus the HUD (quest button, settings button, 5 stats, level bar) and Settings (7 toggles, 3 slots, text size, delete data, about). On a phone the bar shows Today, Kitchen, Market, Finances and a More sheet with Staff, Customers, Growth, Analytics, Eco, Quests, Settings: 9 destinations are one or two taps away on day 1.

Verdict: the day-1 surface is 164 controls and roughly 500 numbers across 44 cards. The casual/business toggle only removes 18 controls and 72 numbers (statements, ratios, the avatar editor rows). Nothing is hidden by progress except: marketing (level 2), investors and co-op shares (level 3 / 30 days), community bonds (community 50), more shops (level 4), the buy-out offer (day 60), the Test Kitchen (lesson or level 3), and locked recipes, upgrades and decor by level.

### A2. Feature inventory (what exists, where it lives, which actions)

| Feature | UI file | Engine actions | Day-1 visible? |
|---|---|---|---|
| Open the counter, serve orders, pause, speed, last call, hand over, skip, close early | `App.tsx`, `panels/ServicePanel.tsx` | `open`, `tick`, `serve`, `lastCall`, `handOver`, `skipToClose`, `closeEarly` | yes |
| Autopilot / team day | `panels/HomePanel.tsx` | `runDay` (internally `autoBake`, `autoStock`, `buy`, `bake`, `openShop(true)`, `fastForward`, `finishDay`) | yes (button on day 1) |
| Bake trays, quick bake, bake the plan | `panels/KitchenPanel.tsx` | `bake`, `autoBake` | yes |
| Prices (±, demand meter, elasticity in business) | KitchenPanel `PriceRow` | `setPrice` | yes (3 products) |
| Menu on/off toggles, category filter | KitchenPanel | `setMenu` | yes |
| Production plan trays, auto-stock toggle | KitchenPanel | `setPlan`, `setAutoStock` | yes |
| Recipe book (locked recipes listed) | KitchenPanel | none | yes |
| Prediction card | KitchenPanel `PredictCard` | `predict` | after the first price change |
| Combo and drink sizes toggles | KitchenPanel | `setCombo`, `setSizes` | yes |
| Daily special | HomePanel | none (engine picks from day 3) | day 3 |
| Market: 4 suppliers, pack sizes 1/5/10/20, stock up, auto-reorder, price lock, contracts | `panels/MarketPanel.tsx` | `buy`, `setReorder`, `clearReorder`, `lockPrice`, `signContract`, `cancelContract` | yes, all |
| Staff: hire (11 applicants, the six friends first), fire, wage, train, assign | `panels/StaffPanel.tsx` | `hire`, `fire`, `setWage`, `train`, `assign` | yes |
| Customers: segments, rivals, marketing campaigns | `panels/CustomersPanel.tsx` | `campaign` | yes (marketing at level 2) |
| Growth: equipment, building, branches, worth and retire, decor, rename, avatar | `panels/BuildPanel.tsx` | `buyUpgrade`, `sellEquipment`, `openBranch`, `closeBranch`, `retire`, `buyDecor`, `rename`, `setLook` | yes |
| Finances: plain words or statements, safety fund, savings rate, loans, credit line, investors, bonds, co-op shares, notebook | `panels/FinancesPanel.tsx` | `fund`, `savingsRate`, `takeLoan`, `repayLoan`, `repayCredit`, `raiseEquity`, `issueBond`, `trade`, `buyBack` | yes (mostly) |
| Analytics: trends, product earnings, price experiments, forecast buy, why, journal, economy, Test Kitchen | `panels/AnalyticsPanel.tsx` | `buyForecast`, `runDay` and `setPrice` on a cloned state | yes (sparse until 7 days of history) |
| Eco: score, sourcing, packaging, green upgrades, community | `panels/EcoPanel.tsx` | `setPackaging`, `buyUpgrade` | yes |
| Closing: leftovers keep/donate/bin, report, next day | `overlays.tsx` | `leftover`, `finishDay`, `nextDay` | yes |
| Events with choices | `overlays.tsx`, `engine/events.ts` | `resolveEvent` | from day 3 |
| Quests, weekly goals, achievements, unlock schedule, story beats | `engine/progression.ts`, `data/story.ts`, HomePanel | `pickGoal`, `hint` | yes |
| Settings: business view, relaxed pace, sound, music, translations, motion, break reminder, slots, delete data | `Settings.tsx` | `load`, `newGame` | yes |

Progress state available for gating today: `s.day`, `s.history.length`, `levelOf(s.xp)`, `s.quests` (done ids), `s.questProgress`, `s.learned`, `s.hints`, `s.unlocked` (recipes), `s.unlockedRegulars`, `s.staff.length`, `s.lifetime.served`. There is no feature-unlock list in `GameState` yet.

### A3. Overlap: guidance voices on days 1–10

Fourteen separate voices can speak in the first ten days, with no shared priority:

1. Intro lines overlay (day 1, once, `IntroLines` in `App.tsx`).
2. "A note from Bà" card (day 1 only, HomePanel).
3. "Getting started" coach card, 4 steps with Show me buttons (days 1–4 or until skipped).
4. First-customer hint banner in service (`firstHint`, until the first serve).
5. Quests card (3 active, always) and the HUD quest button with a count.
6. "Next up" tease (every day from day 1: "New recipe: Gress cupcake, tomorrow").
7. "Before you open" warnings with Go buttons (from day 2).
8. Unlock toasts: recipe day 2, regular day 3, recipe day 4, decor gift day 5, recipe day 6, regular day 8, recipe day 10.
9. Learned-concept toasts (notebook): inventory on the first buy, elasticity on the first price change, fixed cost on rent, then variable cost, margin, waste, forecasting, competition, inflation, scale, risk, surplus, comparative.
10. Inline `Tip` concept chips (inventory, fixed cost, opportunity cost, marginal analysis, externality, hedge, dividend, supply contract, investment).
11. Morning events for story scenarios: coffee rumour day 3, rainy season day 5, egg shortage day 8, catering day 10 (then 12, 14, 15, 17, 19, 21, 23, 30, 31, 33).
12. Daily special card (from day 3).
13. Grade cards, reaction lines, badges and tips during service; level-up toast with confetti (level 2 at 150 XP, usually day 2–3).
14. Closing report, leftovers modal, prediction settle, weekly goal pick (day 1 and every 7 days).

Collisions: the coach's "buy ingredients" step duplicates quest "Stock up" and the market warning; "Next up" and the unlock toast announce the same recipe twice (tease, then arrival); the day-3 coffee rumour event, the day-3 regular toast, the first daily special and the level-2 toast can all land on one morning; the Quests card lists "Oven on!" and "Price explorer" while the coach says the same thing in different words.

### A4. Existing timing (first 35 days)

| Day | What already happens |
|---|---|
| 1 | Intro, Bà's note, coach step 1, weekly goal pick, 11 applicants (six friends first), everything else open |
| 2 | Gress cupcake recipe unlock; coach step 4 completes after 2 closed days |
| 3 | Regular Mai; daily special starts; coffee rumour event; level 2 around here (marketing opens) |
| 4 | Trà tắc recipe; coach card disappears |
| 5 | String lights decor gift; rainy season event |
| 6 | Light gress tea recipe |
| 8 | Regular Chú Hùng; egg shortage event; new applicant pool (days 8, 15, 22, 29: `day % 7 === 1`) |
| 10 | Bánh patê sô recipe; catering offer |
| 12, 14, 15, 17, 19, 21, 23 | Green week, heatwave, competitor (old lane), fridge or fruit fest, festival, wholesale or influencer, Tết coming |
| 13 | Gress sandwich cookies recipe |
| 30, 31, 33 | Influencer, catering, premium sale; investors open after 30 days; month start pays rent ahead |
| 45 | First story beat |

Rent is paid at month start (`isMonthStart`), which can fall inside the first week depending on the start date; the coach mentions rent on day 1 either way.

### A5. Engine coupling of autopilot and bot actions

- `runDay` does not dispatch actions. It calls the internal functions `autoBake` then `autoStock` (which calls `buy(next, id, 'cho', packs)`) and `bake()` directly, then `openShop(true)`, `fastForward` (serves via the same `serve` path) and `finishDay`. UI-only gating would not stop the bot: gates must live in the engine, as `featureOn(s, id)` checks inside `autoStock`, `autoBake`, `receiveDeliveries` (reorder rules, deliveries, contracts) and in the reducer guards for each action.
- `plan.autoStock` defaults on, and `autoStock` always buys from the wet market, so the autopilot ignores supplier choice and pack discounts. If "autopilot" unlocks before "suppliers", that is consistent.
- `startDay` already runs every day regardless of unlocks: applicant refresh (`day % 7 === 1`), rival reactions, unlock schedule, loyal churn, specials, events. Hiding the Staff tab does not stop applicants from refreshing, and `weeklyApplicants` puts `FRIENDS` first each week until they are hired, so the six friends will still be first whenever the tab opens.
- Reorder rules, contracts, loans, campaigns, investors and bonds only act if they exist in state, so locking their actions is enough: nothing accrues from a feature the player could never touch.
- `UNLOCK_SCHEDULE` (recipes, regulars, decor) is a separate day-driven list in `data/catalog.ts` applied by `applySchedule`; a feature-unlock list should sit beside it, not replace it.
- Old saves: `fillNewContent` in `engine/save.ts` is the place to mark every feature unlocked for any save with `day > 1`, so existing players lose nothing. The "Experienced baker" toggle can set the same full list at `newGame`.
- Tests that call `createNewGame` and then dispatch deep actions on day 1 (stress, lessons, balance survey) will need the full-unlock flag or they become no-ops under gating.

### A6. Proposed unlock plan (for sign-off)

Ids are `FEATURE_UNLOCKS` entries; "trigger" is a quest or a day, whichever comes first unless marked "quest only". Chapter numbering matches the brief's Phases B–F.

| Chapter | Feature id | What opens | Trigger | Intro quest |
|---|---|---|---|---|
| 1 Open the doors (days 1–3) | `core.open`, `core.serve` | Today tab, Mở cửa, service, closing report | day 1 | "First bánh mì" (exists) |
| 1 | `kitchen.bake` | Kitchen tab, bake and quick bake for the 3 starter products | day 1 | "Oven on!" (exists) |
| 1 | `market.wetMarket` | Market tab, wet market only, pack sizes 1 and 5 | day 1 | "Stock up" (exists) |
| 1 | `kitchen.prices` | ± price and demand meter (no elasticity) | day 2 or quest "First bánh mì" | "Price explorer" (exists) |
| 1 | `kitchen.recipeBook`, `kitchen.menu` | recipe book and on/off toggles | day 2 (with the Gress cupcake unlock) | new: "Put the cupcake on the menu" |
| 1 | `finances.plain` | Finances tab, In plain words and notebook only | after the first closing (history ≥ 1) | "In the black" (exists) |
| 2 Regulars and the special (days 3–5) | `today.special`, `today.predict` | daily special card, prediction card | day 3 | new: "Bake extra of the special" |
| 2 | `market.packSizes` | 10 and 20 packs with discounts | quest "Smart shopper" or day 4 | exists |
| 2 | `customers.whoComes` | Customers tab: segments and neighbours only | regular Mai (day 3) | new: "Serve Mai three times" |
| 2 | `finances.safetyFund` | safety fund card | quest "In the black" or day 5 | "Rainy-day money" (exists) |
| 3 The team (days 5–8) | `staff.hire` | Staff tab, applicants (friends first), capacity | day 5 or 40 customers served | "Not alone anymore" (exists) |
| 3 | `kitchen.plan`, `today.teamDay` | production plan, auto-stock toggle, "Let the team run today" | first hire, quest only | new: "Let the team run a day" |
| 3 | `staff.train`, `staff.wage`, `staff.assign` | training, wages, roles | second hire or day 10 | new: "Train a friend" |
| 3 | `growth.decor` | Growth tab with Decorate only | day 5 (string lights gift) | "Make it yours" (exists) |
| 4 Supply and money (days 8–14) | `market.autoReorder` | auto-reorder rules | three stock-ups or day 8 | new: "Set one reorder rule" |
| 4 | `market.suppliers` | the other 3 suppliers | day 8 egg shortage event | new: "Buy from a second supplier" |
| 4 | `market.contracts`, `market.priceLock` | contracts and locks | learned `inflation` or day 14 | new: "Sign a contract" |
| 4 | `finances.loans` | bank loans | day 10 catering offer, or cash below 5 days of rent | new: "Borrow and repay" |
| 4 | `growth.equipment`, `growth.building` | equipment and building | level 2 or day 10 | "Room to grow" (exists) |
| 4 | `customers.marketing` | campaigns | level 2 (exists) | new: "Run one campaign" |
| 5 Reading the numbers (days 12–20) | `analytics.basic` | Analytics tab: trends, products, why, journal | history ≥ 7 days | new: "Read one week" |
| 5 | `finances.business` | business view toggle and statements | history ≥ 7 and the grown-up summary seen | none (optional) |
| 5 | `eco.all` | Eco tab | day 12 green week event | "Green bakery" (exists) |
| 5 | `kitchen.combo`, `kitchen.sizes` | combo and drink sizes | level 2 and day 15 | new: "Try a combo day" |
| 5 | `analytics.testKitchen`, `analytics.forecastBuy` | Test Kitchen, buy from forecast | level 3 or lesson (exists) | exists |
| 6 Owner (day 20+) | `finances.creditLine`, `finances.investors`, `finances.bonds`, `finances.shares` | existing gates (level 3, 30 days, community 50) | unchanged | "Investor" achievement |
| 6 | `growth.branches`, `growth.retire` | more shops (level 4), buy-out (day 60) | unchanged | "Second shop" (exists) |

Everything in the table is off at `newGame` unless "Experienced baker" is ticked, and fully on for any loaded save with `day > 1`. Day-1 surface under this plan: Today (3 cards, 3 controls), Kitchen (3 cards, about 8 controls), Market (2 cards, about 10 controls): roughly 20 controls instead of 164, and the phone bar shows 3 tabs with no More sheet until Chapter 2.

### Phase A summary line

Phase A – done (report only). Changed: DESIGN_NOTES.md. Unlocks added/changed: none (plan proposed above, 30 ids over 6 chapters). Tests: 113 passing, new: none. Known issues: autopilot bypasses actions so gating must be engine-side; tests and old saves need a full-unlock path; 14 overlapping guidance voices on days 1–10. Next step proposed: sign off the table, then Phase B builds `FEATURE_UNLOCKS`, `featureOn()`, the save migration and the Experienced-baker toggle with no content changes.

## Onboarding, Unlocks and Intro Quests: Phases B–F

### Phase B – done
Changed: `src/data/unlocks.ts` (new), `src/engine/unlocks.ts` (new), `src/engine/state.ts`, `src/engine/types.ts`, `src/engine/progression.ts`, `src/engine/save.ts`, `src/data/catalog.ts`, `tests/engine/unlocks.test.ts` (new), `tests/engine/stress.test.ts`.
Unlocks added: 26 feature ids over 6 chapters (table below). Recipe days moved to 4, 6, 9, 11 and 13 so a recipe and a system never share a morning.
Tests: 118 passing; new: guided day-1 locks, 40-day guided run (one unlock a day at most, never on a recipe day, prerequisites first, no locked action ever changes state), intro quest loop (finish, replay, Later, Experienced baker), v3 migration at day 50 and day 5 with a loan, scenario starting unlocks.
Known issues: none open.

How it works:
- `FEATURES` is the single source of truth: chapter, tab, fallback day, optional trigger (unlocks early), optional gate (hard condition such as a level), prerequisites, teaser, and the intro quest (speaker, Vietnamese line, translation, 1–3 steps, the "why" shown after, XP).
- `GameState.allUnlocked === false` marks a guided game; missing or `true` means everything is open. Tests, old saves and Experienced bakers therefore need no flag. New games from the UI pass `guided: true`. (The brief named the field `unlocked`; that name was taken by recipes, so it is `features`.)
- Gating is in the reducer: `actionFeature()` maps each action to a feature (buying from another supplier or more than 5 packs needs `market.suppliers`); a locked action returns the same state. Actions that only remove an obligation (repay, cancel, fire, close, clear a rule) are never gated, so nobody gets stuck.
- The autopilot calls internal functions, not actions, so `autoStock` checks `market.wet` and buys in 5-pack lots until bulk tiers unlock. `runDay` and `handOver` need `today.teamDay`. The daily special is only picked once `today.special` is on.
- Each morning `applyFeatureUnlocks` adds at most one feature: due ones sorted by fallback day, a fired trigger counts as "due today", and `urgent` (only the team day) jumps the queue. Never on a recipe day.
- Save version 4. v3 saves get every feature whose fallback day has passed plus anything already in use (loans, staff, contracts, deliveries, campaigns, branches, safety fund, extra equipment, deals, a production plan), with their intro quests marked done.

### Phase C – done
Changed: `src/ui/App.tsx`, `src/ui/GameContext.tsx`, `src/ui/Guide.tsx` (new), `src/ui/kit.tsx`, `src/ui/panels/HomePanel.tsx`, `src/ui/panels/KitchenPanel.tsx`, `src/ui/panels/MarketPanel.tsx`, `src/ui/screens/Screens.tsx`, `src/ui/Settings.tsx`, `src/engine/save.ts` (prefs `graduated`), `src/ui/styles.css`.
- Day 1 of a fresh guided game shows **Today and Kitchen only**, with **10 controls** across both tabs (Phase A: 164). Acceptance was under a third (55).
- Bà's first lesson replaces the old coach: bake a tray, open and serve, close up and choose leftovers. Done by doing; Skip is there.
- Casual view is the default; Business view appears in Finances and Settings only once `finances.income` unlocks, and the context ignores a stored business preference until then.
- New game: one Start button for Bà's bakery on Sprinkle (the brief asked the owner to choose Sprinkle or Normal; Sprinkle was picked for younger players, Normal is one tap away). Scenarios, difficulty and Experienced baker sit under More options. Other scenarios are locked with "Finish Bà's first week to unlock" until any game reaches day 8 (`prefs.graduated`) or Experienced baker is ticked. Guided scenarios start with the chapters their mechanics need (`SCENARIO_START`).
- Experienced baker: on the new-game screen and in Settings (confirm once).

### Phases D and E – done
- Intro quests for every feature, spoken by Bà, Mai, Chú Tư (farm co-op), Cô Lan (bank officer) or Cô Ngọc (critic); Vietnamese line plus translation; Show me and Later; XP only, never power.
- Spotlight: dims everything but one control, bouncing pixel arrow, focus moves there; Esc, any tap, or 9 seconds ends it. Never during service or closing.
- NEW: a dot on tabs (and the More button) and a chip on cards until seen; the tab on screen clears its own.
- Phone: locked tabs are hidden from the bar and the More sheet; More disappears while it would be empty. Desktop: locked tabs are padlocks whose tooltip is the teaser.
- One voice: while an intro quest is active, Bà's lesson and Next up step aside; while a morning event is waiting, the intro card waits too. Next up now teases the next system or recipe, whichever is sooner. Quests that need a locked system are hidden.
- Panel gating: Kitchen (prices, menu and recipe book, plan, deals, prediction), Market (suppliers, 10/20 packs, reorder, locks, contracts), Staff (applicants; training needs staff management), Customers (who comes in, rivals, marketing), Growth (equipment and building, decor, branches and worth), Finances (safety fund, loans, credit, investors, bonds, co-op shares), Analytics (why, trends and the rest, economy, Test Kitchen), Eco (whole tab).
- Casual view trims secondary numbers: Today shows cash, sales and customers; price rows show what you keep; market rows say "pricey today" instead of percentages; applicant rows drop the value estimate; equipment drops book values.
- Quest book: "Getting to know your bakery" lists deferred quests (Start) and finished ones (Show me again).

### Phase F – partial
Done: an opt-in scripted playtest (`PLAYTEST=1 npx vitest run tests/engine/playtest.log.test.ts`) logs each morning's voices for 35 days, plus a browser check at 375 px of day 1 and day 14 (event answered first, then Bà's intro card; Show me spotlights the team button).

The calendar a guided game follows (seed 2026, a player who opens every day):

| Day | New system | Same morning |
|---|---|---|
| 2 | Market: the wet market | |
| 3 | Kitchen: prices | Mai arrives; coffee rumour event |
| 4 | – | Gress cupcake recipe |
| 5 | Today's special | rainy season event; string lights gift |
| 6 | – | Trà tắc recipe |
| 7 | Customers: who comes in | |
| 8 | Market: more suppliers | Chú Hùng; egg shortage event |
| 9 | – | Light gress tea recipe |
| 10 | Analytics: why did this happen? | catering offer |
| 11 | – | Bánh patê sô recipe |
| 12 | Staff: your first hire | Green Week event |
| 13 | – | Gress sandwich cookies recipe |
| 14 | Let the team run today | heatwave event |
| 15–22 | Finances, menu, Eco, rivals, decor, safety fund, equipment, plan | rival opens day 15 |
| 23–30 | trends, contracts, training, deals, loans, marketing | Tết days 24–28 |
| 35 | The economy | |

Findings and fixes:
- Twelve mornings had a story event and a new intro quest together. Fixed: the intro card waits until the event is answered.
- The tab on screen kept its NEW dot until you left and came back. Fixed.
- The spotlight restarted its timers on every re-render. Fixed.
- Not changed: reaching level 2 (usually day 2 or 3) still adds a batch of level recipes at once. That is the existing level pacing, not a system unlock; worth watching in a real playtest.

Still to do: the real playtest with 2–3 kids (brief §8 Phase F), watching for every "what do I do?" and every tap on something locked, then retuning fallback days and triggers in `src/data/unlocks.ts`.

## Playtest round 1 and the "real bakery game" pass (2026-10-03)

Source: `PLAYTEST_FEEDBACK.md` (a scripted phone playtest as a 9–12 year old) plus research on successful cooking and restaurant games. The brief from the owner: a conventional bakery game, not a reading textbook; engaging, never lost, every function used and its importance clear, instructions upfront.

### Models borrowed from
- **Papa's games (Flipline):** short shifts, every order scored with stars and tips, ingredient bins in fixed places, upgrades that make rushes manageable. We already scored orders; we added fixed ingredient positions and a helper for the busy part of the counter.
- **Good Pizza, Great Pizza:** one cheese pizza on day 1 and one new thing per day; customer happiness visible instantly. We kept one new system a morning and moved level recipes to one a morning too.
- **Cooking Fever:** every level has a 3-star goal. Every day now has three sales targets, a live star meter and XP per star.
- **Mobile first-session research:** playable in under a minute, action over text, hints at the moment they're needed. Day 1 is one guide (Bà's lesson), a "?" button answers "what now?" at any time, and each tab has one line saying what it's for.

### What changed (commits 93393e8 → 45fc14f)
- **Fair counter:** customers extra patient for 3 weeks in guided games; relaxed pace by default; Bà hands out pastries until a cashier is hired; bottom-sheet assembly on phones with every step button on screen; fixed ingredient spots; strong next-step glow for a week; "Not yet! Next: …" on wrong taps; a "N left" chip; compact controls with More.
- **Goal and rewards:** daily 3-star goal; levels at 150 / 800 / 2,200 / 4,500 / 7,500 / 11,000 / 15,500 XP with a $100 × level gift; one recipe a morning.
- **Never lost:** "What now?" sheet; tab help lines; day 1 shows only Bà's lesson (bake flan → open and serve → close); the welcome lines lead into it; spotlight targets the first tappable control in a card and opens the right Kitchen section.
- **Every function used:** "Try this tomorrow" in the report names one unlocked feature not yet used; tips, events and level toasts never mention locked systems; hiring shows Bà's pick and honest value.
- **Honest money:** prize money is its own report line; rent-day toast and 5-day countdown; confirmation sheets for loans, investors and new shops; price guesses compare buyers per 10 shoppers.
- **Phone layout:** Kitchen sections (Bake / Prices / Menu / Plan), 44px tap targets on touch, "Money" tab label, no floating title icons, day-track labels fit.
- **Kid safety:** parent gate (type a number written in words) for email and the grown-up summary; no lottery reference; kid-first wording in all intro-quest lessons.

### Pacing is now tested against a kid, not the instant bot
`tests/engine/bot.ts` has `runServiceKid` / `kidDay`: one order at a time, oldest first, ~2 s for a pastry and ~9 s for a bánh mì or drink at the relaxed pace, with an occasional wrong tap. `tests/engine/kid.test.ts` plays 30 guided days and requires the bakery to survive, at least 18 days with a star, and level 3. Logs: `KID_LOG=1` (add `KID_SLOW=0.6` for a practiced kid, `KID_HIRE=1` to hire Bà's pick).

| Kid player | Typical day 10–30 | Stars | Level by day 30 |
|---|---|---|---|
| New kid, no hire | ~25 served of 50–80, roughly break-even | 1–2 | 3 |
| Practiced kid | ~40 served, +$40–60 | 2 | 4 |
| Kid who hires Bà's pick | 50–65 served, almost nobody lost | 2–3 | 4 |

Still open: a real playtest with children; a mid-game story arc for days 36–60; "look at" intro steps still finish when you arrive rather than when you tap the thing.

### Playtest round 2 (`PLAYTEST_FEEDBACK_2.md`) and fixes (ff4cd58 → 428a55a)
Round 2 found days 1–5 calm and fair, but from about day 10 a kid couldn't grow: wages of about $135 a day never paid back, and the controls overflowed the screen at 360px. Fixes:
- **Part-time helper** role ($9/h, serves anything at 1.5× staff time); one always applies. Kid bot with helpers: 50–80 served a day, almost nobody lost, profit positive. The next bottleneck is baking enough, which points to equipment.
- **Controls** wrap and go icon-only under 420px; the "N left" chip sits on the goal line.
- **"Open anyway?"** check when the case is empty or there are no baguettes ("Go bake first").
- **Spotlight** prefers the primary button and skips glossary links and selected toggles. To-dos are single actions with Show me.
- **Report:** an empty case counts as sold out ("people wanted flan, but the case was empty"). Profit reads the live books so level gifts add up.
- **Pacing:** goals follow recent sales after 3 days; weekly goals +8%; levels 150 / 800 / 1,700 / 3,300 / 5,600 / 8,600 / 12,500. Investors need level 5 and co-op shares level 6 in guided games.
- **Smaller fixes:** toasts at the top on phones, a fixed "More" label, Neighbours moved to Customers, the Money tab opens on Yesterday for new players, price guesses shown "of every 100", grammar.

Kid bot after round 2 (seed 12):
- **No hire:** level 4 on day 23, about 2 stars a day.
- **Hires Bà's pick:** level 4 on day 17, and 68–71 served by day 20–30.

### Six additions after tester round 3
- **Order twists** (`src/engine/twists.ts`): skip a step, double a step, or a rush order, on made-to-order dishes only; 30% of them from day 5 in guided games. Models: Papa’s games and Cooking Fever order variations. The bonus tip is paid only for a flawless assembly (or a quick serve for rush), so staff-served twists pay nothing extra.
- **Daily challenge** (`src/engine/challenge.ts`): one of seven kinds each morning, with targets a little above the last three days. Pays 20 XP and about $8.
- **Staff traits** (`TRAITS` in `src/data/world.ts`): speed, quality or tip effects, shown before hiring, plus chatter in the scene.
- **Paint and arrange** (`ShopStyle`): wall colour and pattern, floor, counter, and three spots each for the plant, hoa mai and birdcage. Free on purpose: it is self-expression, not a money sink.
- **Lantern Festival arc** (`src/engine/arc.ts`): ten chapters from day 36, about three days apart, ending on day 61. Lane hearts come from choices and from 2-star days; 16 wins. Both endings give a prize on the wall, cash and XP, so nobody loses badly. Older saves past day 36 start it the next morning.
- **Collection book** (`src/ui/Collection.tsx`): neighbours, recipes and medals, story chapters, events seen and decorations, with a total count.
- **Characters** redrawn again as 16×26 chibis with tinted outlines, after the reference style the owner picked. All new random streams are separate, so existing schedules and balance tests are unchanged.
