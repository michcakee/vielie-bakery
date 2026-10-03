# Viet Bake Shop: kid playtest feedback (phone, 375x812 and 360x640)

Playtested 2026-10-03 against the dev server (`http://localhost:5180`, commit 4af1ef0). I played days 1–4 by hand as a new player (default guided game, no Experienced baker), then injected bot-generated saves (seed 7) at days 10, 14, 15, 23→24, 27, 45 and 60 and played a real morning and/or service at each. Pacing numbers come from in-browser runs of `tests/engine/bot.ts` plus the two scripted logs (`playtest.log.test.ts`, `unlocks.test.ts` with `UNLOCK_LOG=1`). Your original save slots were backed up and restored afterwards (slots 1–3 and prefs are byte-identical to before).

Two things to know when reading the numbers: the bot serves every customer the instant they reach the counter, so it is far stronger than any child, and it never hires, never finishes intro quests and never dismisses toasts. Where real play and the bot disagree, I give both.

---

## 1. Top 10 issues (ranked)

1. **High: once the street gets busy, a child can't keep up at the counter, and the bakery loses money.** Day 15: my script tapped each correct step every 0.8 s and served only **26 of 77** (39 gave up). The day lost $36. The bot served 67 of 89 that day. Customers wait about 95 game minutes, which is roughly 16 real seconds.
2. **High: on a phone, the bánh mì and coffee steps open below the screen.** At 375x812 the step buttons start at y≈690–890. At 360x640 they start at y≈954 in a 664 px viewport. While you scroll down to them the clock keeps running and the queue goes off-screen.
3. **High: the numbers on the step buttons don't match the recipe order.** The recipe list says *1 Cắt bánh, 2 Chả lụa, 3 Đồ chua…* but the buttons read *1 Cắt bánh, 2 Tương ớt, 3 Đồ chua, 4 Chả lụa…* (shuffled each order). A child who taps "2" for step 2 is wrong every time.
4. **High: "Skip to closing" before the team day is unlocked closes the shop with no one served.** Day 4 at 8:37 am: **0 served of 35**, everything donated, −$112, reputation −3. The report then says "check the Staff tab", which is still locked. "Hand over the counter" shows but does nothing until `today.teamDay` unlocks.
5. **High: the first days lose money even when you play well, and the report says "Uh oh… the bakery wallet is feeling a little empty."** Day 1: −$27.65 (3 of 9 served). Day 2: −$20.20 with 17 of 19 served. The only reason cash goes up is quest prize money.
6. **High: some intro quests can't be finished.** *Analytics: why did this happen?* unlocks on day 10, but the Why card renders `null` until there are about 11 days of history, so Show me spotlights an empty 0 px box. *Staff: wages and training* (day 24) says "Train someone on your team" to a player with no staff, and Show me points at nothing. *Let the team run today* never unlocks if you never hire (fallback day 999).
7. **High: the hire quest leads you into a bad hire.** The applicants cost $127–226 a day while early profit is $50–250 a day. In a sim where I hired the cheapest cashier or baker on day 13, the bakery had **$3,100–3,400 less by day 33** than without the hire, and served no more customers (a cashier only hands out pastries). The Staff tab itself says "roughly 0 fewer people giving up".
8. **Medium: around $2,400 of rent leaves cash overnight with no message** (day 23 → 24: $8,176 → $5,776, and again on day 54). Meanwhile the Today tab says "Fixed costs today: about $68/$80 rent" and the day-2 tip says rent is "about $80 a day".
9. **Medium: too many voices at once on big mornings.** On day 15 there are 4 recipe toasts, Level 3, a weekly goal, confetti and the rival event together, and toasts sit on top of the event's answer buttons (days 3, 10 and 15). Level 2 (day 3–4) adds 3–4 recipes at once, and Level 3 (day 15) adds 6.
10. **Medium: the report's money numbers are wrong on reward days.** Day 3 showed "What we spent **−−$10.99**" and "What the bakery made +$107.83", which is more than "Today's sales +$96.84". Quest cash is counted as profit and pushes "spent" below zero (`expenses = revenue − netProfit`, `src/engine/state.ts:651/683/732`).

---

## 2. First-time experience

- **Medium. Title → New bakery → Make it yours → Today: 3 taps to reach the game. Good, but you land scrolled down.** After "That's me!" the Today page opened at scrollY≈219, so the hero card was half cut off and the first thing you saw was "Good morning!" with no Vietnamese headline. *Why it matters:* the first impression is a broken-looking card. *Fix:* `window.scrollTo(0,0)` when the phase or screen changes (setup → morning, report → morning, tab changes).
- **Medium. Three "next step" voices disagree on day 1.** The hero card says "Mở cửa nào! Open the doors", Bà's note says "Open the doors…", and Bà's lesson says step 1 is "Bake a tray of baguettes in the Kitchen". The Quests card adds three more goals. *Why:* a 9-year-old doesn't know which to follow. *Fix:* on day 1, show only Bà's lesson and hide the hero CTA and Quests card until step 1 is done, or make the hero CTA follow the lesson step.
- **Medium. The lesson's first step creates waste.** Bà left 12 baguettes, and the forecast was "About 7 walk-ins", but the lesson makes you bake 10 more. Bánh mì was capped at "10 can be made" by pickles anyway. I ended day 1 donating 21 baguettes and 14 flan. *Fix:* make step 1 "Bake a tray of flan" (or anything that's at 0), or say why we bake.
- **Medium. The oven timing game is harsh the first time.** The needle crosses in 3.2 s, the golden window is about 0.6 s (`BAKE_MS = 3200`, `ovenWindow 18`, `KitchenPanel.tsx:35`), and the Show me arrow sits right over the tray. My first tray was "Oops… quality 28". "Quick bake" gives a guaranteed 72, which is better than most children's first tries, and it's a tiny 24 px text link. *Fix:* slow the first 3 bakes (5 s, wider window), add one line to the lesson ("tap when it's golden!"), and make Quick bake a real button.
- **Low. Unexplained HUD icons from minute one:** sun, star 30, leaf 61, heart 20, plus a "3" badge on the quest book that never clears. Eco and community show on day 1 even though those systems are locked. *Fix:* hide eco and community chips until their feature unlocks, add a one-tap label ("Reputation 30") and use a dot instead of a count on the quest book.
- **Low. Copy that's too adult or doesn't match the game.** Bà's lesson says "keep, donate or bin", but Keep is never offered for baguettes, and on day 1 not for flan either (`overlays.tsx:126`). "Fixed costs today: about $68.00 rent" sits next to a tip saying $80. The title screen sells "ride out recessions". "Space or Enter works too" shows on phones. *Fix:* hide keyboard hints on touch and line up the wording.
- **Low. Decorative pixel icons overlap the footer text on the title screen** ("Saves in your browser…", with the sandwich and drink icons on top of the words).

## 3. Mobile UI and layout

- **High. During service the controls push the counter down.** Pause, Normal, Last call, Hand over, Skip to closing and Close up take about 250 px above "At the counter", and the scene takes another 200 px. At 360x640 only one customer card is visible. *Fix:* during service collapse the controls into one row of icon buttons (or a ⋯ menu), shrink the scene, and pin the active order panel to the bottom of the screen above the queue.
- **High. The assembly panel needs scrolling (see Top 10 #2).** *Fix:* open the assembly as a bottom sheet with the 4–5 step buttons in a 2x3 grid fully visible, and auto-scroll on open.
- **Medium. Score cards and toasts land on top of the queue.** The order-grade card (stars, Accuracy/Speed/Quality bars) and achievement toasts appear over the next customer and the stock chips. In one screenshot three semi-transparent layers overlapped (grade card, "Quest complete: First bánh mì", next order). *Fix:* during service, show the grade as a small floating chip above the scene, and queue achievements until closing.
- **Medium. The spotlight often highlights a whole card taller than the screen.** On day 2 Market "Show me" scrolled to the middle of a 6-ingredient card. The arrow and title were off-screen, and the 9-second timer ran out before you'd see what to tap. The day-10 analytics spotlight targeted a 0-height element. *Fix:* target the specific button (the first "Stock up", a "+" button), never a card, and skip the spotlight when the target has no size.
- **Medium. Pages get very long.** At day 15 the Kitchen page was 10,682 px with 84 buttons. At day 60 it was 12,262 px with 117 controls, and Market had 85 controls, 50 of them under 36 px. The Today tab at day 14+ carries a full Neighbours list, quests and a season card. *Fix:* use collapsible sections per card (closed by default after first visit), move Neighbours to Customers, and give the Kitchen tabs (Bake / Prices / Menu / Plan).
- **Medium. Small tap targets.** Show me 58x24, Skip 27x24, Quick bake 24 px, Donate/Bin 34 px, Auto-reorder and Lock price 24 px, the period pills on Finances 34 px, and glossary links 22 px. *Fix:* 44 px minimum height for anything tappable, with "Show me" as a small button rather than an underlined link.
- **Medium. The floating "Mở cửa! Open" button covers content.** On Kitchen it sits over "Quick bake", and on Market over a "Stock up" button. *Fix:* reserve bottom padding equal to the FAB height plus the tab bar, or dock the button in the tab bar.
- **Low. The bottom tab bar with 5 tabs is cramped.** "Finances" touches its box edges at 375 px, and every tab carries a NEW dot at once after a save load. *Fix:* shorter label ("Money"), or icon-only with the label on the active tab.
- **Low. The service timeline strip overflows** ("Afternoon" and "Last call" collide and "Last c" is clipped at 375 px, `ServicePanel.tsx:225`).
- **Low. The day report opens scrolled to the middle** (day 1 opened at the "served" chips, not the header). *Fix:* reset `.modal.report` scrollTop on open.
- **Low. The HUD drops the heart chip during service at 375 px** (the clock chip pushes it off). That's fine, but the eco chip is clipped at the right edge.
- **What's good:** the More sheet is clean and big. The character creator arrows are 44 px+. The pixel art is crisp and charming. Vietnamese over English works well in speech bubbles.

## 4. Service and core gameplay

- **High. Counter speed and patience don't fit a child (Top 10 #1).** At Normal (6 game-minutes a second, `App.tsx:218`) a day is about 120–128 real seconds (I measured 125 s, 120 s, 120 s, 120 s). Base patience is 95 game minutes (`config.ts:21`), about 16 s. A 5-step bánh mì plus scrolling takes a child 8–12 s, so a queue of three means someone leaves. "Relaxed pace" (4 min/s, more patient customers) is hidden in Settings and off by default (`save.ts:319`). *Fix:* make Relaxed the default for the guided game. Scale patience with day or level instead of difficulty only. Let staff or a "helper Bà" serve automatically in the early game when the queue reaches 3.
- **High. "Skip to closing" and "Hand over the counter" before the team day (Top 10 #4).** Cause: `skipToClose` calls the gated `handOver`, which returns the same state, then `fastForward` runs with no servers (`state.ts:1133`). *Fix:* hide both buttons until `today.teamDay`, or let skip work with the owner autopilot regardless of the unlock.
- **Medium. A wrong step gives almost no feedback.** I tapped Tương ớt out of order and saw no visible message. A shake class exists, but nothing says "Not yet! First: Chả lụa". The "next step glows" hint (`ServicePanel.tsx:50`, days ≤ 3) was hard to see in screenshots, and the glowing button was usually off-screen. *Fix:* add a short Bà line on a wrong tap, and make the glow stronger (a pulsing border plus the arrow sprite).
- **Medium. Multi-step coffee.** Cà phê sữa đá is 4 steps (Sữa đặc → Pha phin → Đá → Khuấy), also shuffled. Most orders are drinks or bánh mì, so nearly every order is a 4–5 tap puzzle. Fine for a mini-game, too many for a rush. *Fix:* from day 4 on, let a correctly made item be "remembered" (one tap for a repeat order), or offer an "auto-assemble at 70 quality" button like Quick bake.
- **Medium. Customers leave with only a tiny bubble.** "Lâu quá… Taking too long" and "Thôi, mình đi đây" appear in the scene while you are scrolled down in the assembly. *Fix:* show a counter chip ("2 left 😟") next to the timeline, and a gentle sound.
- **Low. Today's special says "Bake extra" for made-to-order items** (Chè ba màu, Cà phê sữa đá). It was Cà phê sữa đá on both days 10 and 14.
- **Low. "Bánh flan was the star today: 2 sold" next to "slower than expected: 2 of 16 sold"** on day 1 is contradictory. Skip "star" when sales are under 5.
- **Low. "Linh came back today" on day 1.**

## 5. Onboarding and unlocks

- **High. Impossible or empty intro quests (Top 10 #6).**
  - `analytics.why`: the gate is `history.length >= 5` (`unlocks.ts:192`), but `Why()` returns `null` until `before.length >= span/2`, about 11 days (`AnalyticsPanel.tsx:217`). On day 10 the Analytics tab shows only "Every number here comes from the same simulation…" and nothing to tap. *Fix:* gate on `history.length >= 11`, or render a "Come back in N days" state with one example explanation.
  - `staff.manage` (day 24 fallback): the step is "Train someone on your team" with no staff. *Fix:* add `gate: s => s.staff.length > 0`.
  - `today.teamDay`: `fallbackDay: 999` and the trigger needs staff, so non-hirers never get team days or a working skip. That pushes kids toward the money-losing hire (#7).
- **High. The hire quest teaches a bad decision (Top 10 #7).** There are 11 applicants on day 12–14 (overwhelming) and the "Skill" field is blank in text. The "after" line says "How many more is the **marginal product**". *Fix:* offer a cheap part-time "helper" ($40–60/day) who serves the counter, show only 3 applicants, and make the projected effect honest (if 0 fewer people give up, say "not needed yet").
- **Medium. Prices intro (day 3) teaches the wrong lesson.** I raised bánh mì from $6.50 to $6.75. The report said "4 a day became 7 (more)" because the street got busier, so a child concludes higher price means more sales. *Fix:* compare against the same number of shoppers ("Out of every 10 shoppers, 6 bought it before, 5 now") or say "more people came today, so…".
- **Medium. Systems are offered before they unlock.** Day 3's "Coffee rumours" event offers a price lock, which is part of `market.contracts` on day 24. Report tips mention the Staff tab (day 1, 4, 15) and the safety fund (day 3) while they're locked. The Level 2 and 3 toasts list "Bamboo steamer stack, Storage room, POS system" and "Solar panels, Online ordering…", but Growth equipment only unlocks around day 20. The day-2 Storage card says "Bulk is cheaper per pack" before bulk exists. *Fix:* filter tips, toasts and event choices through `featureOn`.
- **Medium. Two voices at once.** Toasts appear over event modals and over the intro card's Show me and Later buttons (days 3, 10 and 15). When a quest completes, its "done" toast lands on top of the card you were told to read (Finances day 14, Investors day 45, Branches day 60). *Fix:* hold toasts while an event modal or spotlight is active, and position "done" toasts at the top of the screen.
- **Medium. "Visit" quests finish instantly.** "Open Finances and find yesterday's profit", "Look at the investors card" and "Look at a second neighbourhood" complete the moment you arrive, before reading. *Fix:* make the step a tap on the specific number or card ("Tap yesterday's profit").
- **Low. Recipe bursts.** Level 2 adds Bánh bao, Gress coffee and Gress cupcake (and flags Bánh trung thu) together. Level 3 adds 6 recipes on day 15, the morning a rival opens. *Fix:* drip level recipes over the following days, one per morning, like systems.
- **Low. "Later" works and the quest book lists deferred quests with Start.** Mixing $-reward quests and intro quests in one book is a lot, and the book never shows Bà's day-1 lesson. Consider two tabs: "Bà's lessons" and "Goals".
- **Low. Name confusion.** "Gress" (Gress powder, Gress Island Lane, nine Gress recipes) isn't Vietnamese and isn't explained. If it's an in-world brand, have a character introduce it once.

## 6. Pacing, XP and leveling

Bot run, guided, seed 7. The bot serves instantly, never hires and never finishes intro quests, so real players will have less XP and cash.

| Day | Level | XP | Cash | Profit that day | Served / customers | New system that morning |
|---|---|---|---|---|---|---|
| 2 | 1 | 30 | $2,601 | −$8 | 10/10 | Market: wet market |
| 3 | 1 | 141 | $2,733 | +$63 | 21/32 | Kitchen: prices |
| 4 | 2 | 164 | $2,810 | −$11 | 23/33 | (Level 2: 3–4 recipes) |
| 5 | 2 | 246 | $2,906 | +$50 | 38/46 | Today's special |
| 7 | 2 | 333 | $3,086 | +$42 | 35/42 | Customers: regulars |
| 8 | 2 | 372 | $3,185 | +$35 | 36/44 | Market: suppliers |
| 10 | 2 | 476 | $3,538 | +$89 | 50/59 | Analytics: why (empty) |
| 12 | 2 | 629 | $3,964 | +$126 | 55/74 | Staff: hire |
| 14 | 2 | 816 | $4,517 | +$219 | 61/89 | Finances: income (team day never, no hire) |
| 15 | 3 | 1,115 | $5,295 | +$685 | 67/89 | Menu (+6 recipes, rival opens) |
| 16–22 | 3 | 1,195–1,891 | $5.5k–7.6k | $150–540 | ~70–88 / 86–156 | Eco, rivals, decor, cash/safety fund, equipment, contracts, analytics |
| 24 | 3 | 2,084 | **$5,776** (−$2,400 rent) | +$206 | 77/109 | Staff: training (no staff) |
| 25 | 3 | 2,176 | $6,063 | +$206 | 75/113 | Combos and sizes |
| 27 | 3 | 2,385 | $6,757 | +$281 | 82/122 | Bank loans |
| 30 | 3 | 2,687 | $7,738 | +$261 | 81/101 | Marketing |
| 34 | 4 | 3,054 | $8,943 | +$189 | 66/96 | (Level 4: 4 recipes) |
| 35 | 4 | 3,132 | $9,164 | +$148 | 66/93 | The economy |
| 45 | 4 | 4,052 | $11,916 | +$179 | 70/102 | Investors and bonds |
| 50 | 4 | 4,531 | $13,267 | +$371 | 79/118 | Test Kitchen |
| 54 | 4 | 4,897 | $12,065 (rent) | +$171 | 65/98 | – |
| 60 | 4 | 5,499 | $13,936 | +$189 | 76/100 | More shops |

My own hand-played days: day 1 −$27.65 (3/9 served), day 2 −$20.20 (17/19), day 3 +$107.83 (17/27, includes quest cash), day 4 −$112 (skip to closing, 0/35), day 15 −$35.77 (26/77).

- **High. Real players earn much less than the calendar assumes.** The calendar and level curve are tuned on the instant-serve bot. A child serving a third of customers will level more slowly and see red reports on busy days. *Fix:* tune and test pacing with a "child bot" (serve with a 6–10 s delay per order, 15% wrong taps, quick-bake only) in `tests/engine/bot.ts`, and keep the unlock calendar on fallback days so systems still arrive.
- **Medium. Profit plateaus from day 15 to day 60** at about $150–300 a day, and customers served stay at 65–88 out of 90–150 because capacity never grows unless you hire or buy equipment. There's a dull stretch from day 36 to day 59 with only 2 unlocks (investors day 45, Test Kitchen day 50) and no level-up (Level 4 at day 34, Level 5 at 8,000 XP ≈ day 90+). *Fix:* add a mid-game goal arc (Trung Thu prep, a "second oven" quest, a competition with Cô Tư), move Level 5 to about 6,000 XP, or add Level 6–8 with cosmetic rewards.
- **Medium. The XP curve is front-loaded and then flat.** Level 2 comes at 150 XP (day 3), Level 3 at 900 (day 15), Level 4 at 3,000 (day 34), Level 5 at 8,000 (about day 90). That's 12 days, then 19, then about 56 between levels. *Fix:* use gaps of roughly 10–15 days per level through Level 6.
- **Medium. Monthly rent shock (Top 10 #8).** Cash falls by about $2,400 on day 24 and day 54 with no message, while daily "Fixed costs today: about $80 rent" implies it's already being paid. *Fix:* show a morning card on rent day ("Rent day! $2,400 for this month: Bà says this is why we save") and a countdown in the Today tab from 5 days before.
- **Low. Cash rises early mostly from quest prizes ($40–$150), not sales.** That's OK as a cushion, but the report should show "Prize money +$90" as its own line.

## 7. Difficulty and failure

- **Medium. Going broke takes a long time and is forgiving.** A "lazy" sim (never restocks, so an empty shop from day 4) survived until Bà's rescue on day 57 and bankruptcy on day 87 (Normal; Sprinkle gives two rescues). The rescue text is kind ("Con ơi, take this and be more careful"). But the bankruptcy text says "The bank called in the loans" when the player never took a loan. *Fix:* pick the ending text by cause (no loans → "the money ran out"), and add a gentle warning card 2 days before distress.
- **Medium. Red days feel like failure.** "Uh oh… the bakery wallet is feeling a little empty" appeared on 3 of my 4 hand-played days, including a near-perfect day 2. *Fix:* in the first week, frame losses as normal ("New shops often lose a little at first: Bà did too!"), and lead the report with what went well.
- **Medium. One-tap loans, investors and branches.** "Take this loan" ($5,000 default, bank offers up to $42,000), "Accept the investment" (5% of the bakery) and "Open ($12,363)" for a branch have no confirmation. Opening University Hill on day 60 dropped cash from $13,936 to $1,573, a few weeks before the next $2,400 rent. Over 40 days the bakery ended about $18,300 behind not opening (the $12,363 spent plus about $5,900 less profit). *Fix:* add a confirm sheet that restates the monthly cost in kid words ("You'll pay $432 every month for a year"), and warn when the result leaves less than one month of rent.
- **Low. The loan intro triggers early when cash is low** (`trigger: day >= 14 && cash < rent*5`, `unlocks.ts:474`), so a struggling child is introduced to borrowing at their most stressed. *Fix:* invert it, so a low-cash trigger introduces the safety fund or "cut costs" tips, and loans keep their calendar day.

## 8. Content, tone and learning

- **Medium. Vocabulary is above 9–12 in the "why" lines:** opportunity cost, marginal product, economies of scale, leverage cuts both ways, macroeconomy, "the central bank's 4.5% plus a risk margin", elasticities (Settings), "Stocking up and upgrades come out of cash but aren't counted as today's costs" (on every report). *Fix:* keep the term but lead with a kid sentence, e.g. "Money you spend on flour can't buy anything else. Grown-ups call this *opportunity cost*." Show the cash-vs-profit footnote only once a week.
- **Medium. Hedging on day 3.** The coffee rumour asks a child to choose between a price lock, stockpiling and "Take the risk". It's a lovely story, but it's day 3. *Fix:* move it after `market.contracts`, or reduce it to two choices ("Buy extra coffee now" / "Wait and see").
- **Low. Asking for an email in Settings** ("Your email → Email me a restore link"). It only opens the mail app, but a children's game asking for an email is a red flag for COPPA/age-appropriate design reviews. *Fix:* move it behind the "For grown-ups" gate. The gate itself, "what is 7 × 8?", is too easy for the 9–12 target. Use a parent-style gate (type a number word, or hold a button for 3 s).
- **Low. "The woman who sells lottery tickets on the corner"** (day-45 story) is culturally accurate, but it's a gambling reference in a kids' game. Consider "the woman who sells newspapers".
- **What's good:** the Vietnamese lines with translations, Bà's warmth, food-shelf donating, the eco and community ideas, and the prediction card ("What do you think will happen?") are excellent teaching moments for this age.

## 9. Bugs

- **High. Skip to closing serves no one before the team day** (`state.ts:1133–1136` + `ACTION_FEATURE.handOver`, `unlocks.ts:621`). Repro: day 4, open, tap Skip to closing → 0 served.
- **High. The "Why did this happen?" intro has no content when it unlocks** (`AnalyticsPanel.tsx:217` vs `unlocks.ts:192`).
- **High. The "Train someone" quest shows with zero staff, and Show me spotlights nothing** (`staff.manage` has no staff gate).
- **Medium. The report shows a double minus and a negative "spent"** on days with quest cash: "−−$10.99" (`overlays.tsx:222` + `state.ts:651`).
- **Medium. Today and the report open scrolled down** after setup and on report open.
- **Medium. A dead "Hand over the counter" button before the team day** (`ServicePanel.tsx:240` shows it unconditionally).
- **Low. "1 trays left"** (plural).
- **Low. "last week about 0.0 customers a day gave up waiting"** on the Staff tab on day 24, while the day-23 report showed 32 of 109 not served (sold-out vs slow are probably counted separately; the wording implies nobody was lost).
- **Low. Toasts carried inside a saved game reappear on load** (bot saves had 6 queued toasts). Consider not persisting `toasts`.
- **Console:** no errors during play (only Vite HMR and React DevTools info from earlier sessions).

## 10. What works well: keep it

- Three taps from title to playing, the character creator, and "Bà's bakery on Sprinkle" as the one-button start.
- Day 1 really is just Today + Kitchen. The More sheet is tidy, and tabs appear one at a time with NEW dots.
- Bà's voice, the Vietnamese-first lines with translations, and named regulars with tiny stories (Linh is always in a hurry, Bà Tư tells the whole street).
- The demand meter ("Looks affordable", "Lots of interest!") and "you keep $3.83" per item: concrete, honest and readable.
- The price prediction card and the next-day reveal, the best teaching mechanic in the game.
- Leftovers → donate to the food shelf, with community going up: a kind default.
- "Finances: In plain words: You're making money" with sales / ingredients / running the shop / what the bakery made, and "Profit and cash aren't the same".
- Forgiving failure: Bà's rescue, a slow slide rather than sudden death, nothing scary.
- Pixel art, palette and the oven mini-game idea are charming. Just slow the first few bakes.
