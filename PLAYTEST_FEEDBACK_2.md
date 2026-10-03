# Viet Bake Shop: kid playtest, round 2 (phone, 375x812 and 360x640)

Replayed 2026-10-03 against the dev server at commit 45fc14f. I played days 1–5 of a new guided game by hand, with real oven taps, step taps (including wrong ones), "?" and Show me. Then I injected kid-bot saves (seed 7, `bot.kidDay`) at days 8, 14, 20, 30 and 45, and played a full morning and service at days 8 and 30 (day 30 at 360x640). Pacing numbers come from both `kid.test.ts` logs (seed 12) and the seed-7 kid run done in the browser. The browser had no `vielie*` keys before I started, and I removed every key I created afterwards. There were no console errors, only the `apple-mobile-web-app-capable` deprecation warning.

How a day feels: the morning takes 1–3 minutes and service about 3 minutes (175–182 s every day at the relaxed pace), so a day is about 4–6 minutes. Days 1–5 felt calm and readable. The bottom sheet, the glow and "Not yet!" make the counter feel fair.

---

## 1. Status of the original top 10

| # | Issue | Status | Evidence |
|---|---|---|---|
| 1 | A kid can't keep up at the counter | **Partly** | Days 1–5 are fine (relaxed pace, Bà hands out pastries, patient customers; I lost 0–5 a day). From day 10 the kid bot serves about 25–32 of 60–115 and **30–80 give up every day** (seed 7, days 10–44). The "N left" chip and the "?" pause work. |
| 2 | Steps open below the screen | **Fixed** | The bottom sheet shows the recipe and all 5 buttons at both 375x812 and 360x640. |
| 3 | Step numbers don't match the recipe | **Fixed on touch, open elsewhere** | Positions are fixed and the glow and "Not yet! Next: Cắt bánh (slice bread)" are clear. The `<kbd>` numbers are hidden only under `@media (hover:none)` (`styles.css:5049`). On a Chromebook or laptop, the buttons still read "1 Tương ớt … 4 Cắt bánh" next to a recipe that starts "1 Cắt bánh". |
| 4 | Skip to closing serves no one | **Fixed** | `skipToClose` now hands over to the owner autopilot, and the team day unlocks on day 16 without a hire. Skip and hand-over now sit under "More", which has its own problem (see N2). |
| 5 | Early days lose money, harsh copy | **Partly** | The copy is kind now ("New shops often lose a little at first. Bà did too."), and prize money has its own line. But 3 of my 5 hand-played days were red, and the kid bot is red on about half its days up to day 45 (see N1). |
| 6 | Impossible intro quests | **Fixed** | `analytics.why` waits for 11 days of history. `staff.manage` is gated on staff ("Unlocks once you have a team: training"). |
| 7 | The hire quest leads to a bad hire | **Fixed, but with a new problem** | Bà's pick, 3 applicants and an honest value line. Now no hire is ever worth it for a kid (see N1). |
| 8 | Silent rent | **Fixed** | Today showed "Rent day in 4 days: about $2,400 for the month. You have enough." |
| 9 | Too many voices | **Partly** | Events now come before intros. But toasts still land on Bà's lesson card (day 3 "Mai heard about you", day 5 "A gift from Bà", day 8 and 14 recipe and level toasts, day 14 "done!" over the Finances card), and Today stacks the lesson, "Before you open", the goal and 3 quests (see N5). |
| 10 | Report money doesn't add up | **Partly** | No more "−−$". On the level-up day (day 3) the report showed sales +$56.18, spent −$117.27, **prize +$480**, made **+$268.91**. That's $150 short. The level gift is posted (`progression.ts:276`) after `r.profit` is snapshotted, but the UI reads `t.books.otherIncome` live (`overlays.tsx:192`). |

---

## 2. New issues, ranked

**N1. High: the kid economy stalls from about day 10 to day 45 with no way forward.**
- **Where:** economy and staff (`labor.ts:58` `hireValue`, wages in `ECON.labor`).
- **What I saw:**
  - Kid bot profit by stretch: days 9–44, seed 7, mostly between −$85 and +$30 a day. Days 10–30, seed 12, mostly between −$55 and +$12.
  - Cash grows only from prizes and level gifts.
  - The Staff tab says "about 28 customers a day gave up", and Bà answers "Nobody here would pay for themselves yet. Hire when lots of people give up waiting." The best applicant adds about 18 customers for $135/day.
  - With KID_HIRE (barista on day 20), served rises to 49–73, but profit stays about 0 and day-30 cash is only $476 higher.
- **Why it matters:** the stars say "great day!" while the money line is red for weeks. Bà's advice contradicts itself, and nothing the kid can buy fixes the queue.
- **Fix:**
  - Add a cheap part-time helper ($40–60/day, afternoons, or drinks only), or let Bà also make drinks until the first hire.
  - Make the phin coffee station ($1,807, one fewer drink step) cheaper and suggest it.
  - Add a one-tap repeat for an order you've already made perfectly that day.
  - Change Bà's line when people give up but no hire pays: "Too many people are leaving. Try the coffee station."

**N2. High: the service controls overflow the screen as soon as anyone gives up, and "More" disappears.**
- **Where:** `ServicePanel.tsx:272–301` and `styles.css:5052` (`flex-wrap: nowrap; overflow: visible`).
- **What I saw:** at 360 px the row measured Pause R92, Normal R199, Last call R268, "1 left" R349, **More R431**. `scrollWidth` is 463 on a 345 viewport, so the page scrolls sideways and the HUD and title are clipped. At 375 the chip wraps to "5 / left" and More is off-screen too.
- **Why it matters:** "Let Bà help", "Skip to closing" and "Close up now" become unreachable at exactly the moment the kid is struggling.
- **Fix:** put the lost-chip on the goal-meter line, or make Pause and Normal icon-only on narrow screens. Add `min-width: 0` and let the row wrap.

**N3. High: the floating "Mở cửa! Open" button covers buttons and opens the shop with no check.**
- **Where:** `App.tsx:367–372` (`open-fab`), `App.tsx:234` (`open`).
- **What I saw:** on day 2 in Market, the FAB sits on top of the eggs "Stock up" button. Tapping that spot opened the shop at 9:13 with **0 baguettes and 0 flan**: 9 served of 21. It also covers "Need more condensed milk. Stock up in the Market." in the Kitchen.
- **Why it matters:** a kid loses a whole day by mis-tapping, and the report never says why (see N6).
- **Fix:**
  - Dock the open button in the tab bar or a bottom bar that reserves its own space.
  - When the case is empty or bánh mì can't be made, show a confirm sheet first: "Your case is empty! Open anyway?"

**N4. Medium: Show me points at the wrong control.**
- **Where:** `Guide.tsx:47–51`. When the card is taller than 45% of the screen, it picks the first focusable child.
- **What I saw:**
  - Prices lesson (day 3): it spotlit the glossary link "find the sweet spot", and focusing it opened a tooltip over the price buttons.
  - Market lesson (day 2): it pointed at the already-selected "1 pack" toggle, not "Stock up".
  - "What now?" → Show me for "No Bánh flan in the case yet" only switches tab: no scroll, no arrow, because todo items have no `spot`.
- **Fix:** add `data-spot` to the real target (first −/+ price button, first Stock up). Skip `.tip-term` and `[aria-checked=true]` in the fallback. Give todo items spots, and word them as actions ("Bake a tray of bánh flan").

**N5. Medium: Today is still a wall of asks, and toasts cover Bà.**
- **Where:** `HomePanel.tsx`, toast placement.
- **What I saw:**
  - Day 3: the lesson (3 steps), "Before you open" (3 items), the goal, 3 quests and a toast.
  - Days 8–45: a 7-person Neighbours list on Today. The page is 3,700 px at day 20.
  - Day 14 todo: "No Bánh flan, Bánh patê sô, Bánh chuối nướng, Bánh bò nướng, Hộp mứt dừa, Gress cupcake, Gress sandwich cookies in the case yet". That's 7 items for 4 oven trays.
- **Fix:**
  - Hold toasts while the intro card is on screen.
  - Collapse Quests while a lesson is active.
  - Move Neighbours to Customers.
  - Limit the case todo to "Bake your 4 trays: best sellers are X, Y".

**N6. Medium: the report hides the real reason for a bad day.**
- **Where:** `report.ts:42–56`, `service.ts:257`.
- **What I saw:** day 2 opened with an empty case: 12 of 21 shoppers were lost, and the tip was "Rent and running the shop cost about $78 a day". `soldOutAt` is only set when `made > 0`, so "never baked" never counts as a sell-out, and the rent tip ranks above `lostSoldOut`.
- **Fix:** count products with 0 stock at opening as sold out at 7:00, and rank the sold-out tip above the rent tip.

**N7. Medium: Finances "find yesterday's profit" opens on "30 days" and ticks done instantly.**
- **Where:** `FinancesPanel.tsx:404` (`useState<Range>('month')`), and the visit step `unlocks.ts:258`.
- **What I saw:** the card showed the 30-day profit (+$784.85), and "done!" covered it at once.
- **Fix:** open on Yesterday when that quest is active, and complete it on a tap of the profit line.

**N8. Medium: goals and weekly goals are tuned above a kid's capacity, and levels stall.**
- **What I saw:**
  - The 3-star goal jumped from $35/60/80 (day 5) to $85/155/210 (day 8). The kid bot earned 1–2 stars on most days after day 7.
  - Weekly goal "Serve 225 customers this week" on day 30, when a kid serves about 30 a day.
  - Levels: L2 on day 2 and L3 on day 9, then L4 not before day 31 (seed 7) or not by day 30 (seed 12). L5 (4,500 XP) is around day 75 at about 50 XP a day.
- **Fix:** scale goals by served capacity (recent served, not walk-ins). Cap weekly serve goals at about 6× the recent daily serves. Lower L4 and L5 to about 1,600 and 3,000 XP, or add XP for lessons and the stars streak.

**N9. Medium: the Money tab at day 45 is an adult finance course.**
- **What I saw:** safety fund, loans, credit line at 20%, 40% equity, community bonds and **co-op share trading** ("natural hedge", dividends) all appear at once for a kid who is breaking even. The confirm sheets themselves are clear and good.
- **Fix:** show only the safety fund and loans until the kid has had a profitable week. Put shares behind Experienced or a later level.

**N10. Low: grammar and copy.**
- Day-1 report: "Linh, Minh all came stopped by today." (`report.ts:33`).
- "0.7 of every 10 shoppers bought it" (prediction card and report): use "about 7 in 100".
- The cash line "Cash $3,248.93 → $3,236.86" on a +$23.86 day reads as a loss. Explain or hide it in the first week.
- The quest reward "String lights" stays listed after Bà already gave string lights (day 5).
- "Gress" is still unexplained.
- The day-5 event mentions patê sô and bánh bao, which aren't unlocked.
- The price-lock hint shows on day 4 because it's gated on level 2, not `market.contracts` (`MarketPanel.tsx:67`).
- "Skill ·" is blank on applicants.

**N11. Low: layout odds.**
- The order-grade card ("GOOD Hà 69/100") still overlays the next customer card.
- The third goal star sits at `left:100%` and is clipped.
- When on a More page, the 5th tab reads "Staff / Thêm", so "More" disappears.
- "Kitchen" is clipped to "Kitcher" with 5 tabs.
- The prediction card appears off-screen below the prices without scrolling into view.
- The Growth page is 7,000 px at day 45.

---

## 3. What works well now

- **The counter is fair in week 1.** The bottom sheet, the fixed button spots, the glowing next step, "Not yet! Next: Cắt bánh (slice bread)" and Bà handing out pastries. A day takes about 3 minutes of service.
- **The oven game.** The learning needle (5.2 s, wider gold zone) gave me "Perfect bake! Quality 93" on the first real try. Quick bake is a full-size button.
- **The "?" sheet.** The 4-step day strip is clear, it pauses the clock during service, and the service tips are kid-sized.
- **Day 1 is one voice.** "Chào buổi sáng! → The bakery is yours → I'll show you, one step at a time" leads straight into the flan lesson, and the lesson's Show me lands on the right Bake button.
- **Stars give every day a target.** "Best day ever! (was $114)", "Three stars! +50 XP" and the 3-star meter during service are motivating.
- **Kind reports.** "New shops often lose a little at first. Bà did too." The price lesson now compares per 10 shoppers and praises a right guess.
- **Grown-up decisions in plain words.** "Take $10,000 from an investor? … They get 40.0% of the profit every good month, forever." "Borrow $2,000? … $76 more than you borrowed."
- **Rent countdown, autopilot day by day 16, a 2-choice coffee rumour, the newspaper seller instead of lottery tickets.** All earlier fixes landed.
