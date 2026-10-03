# Playtest 3: the whole game, start to finish

**When:** 3 October 2026, version 3.1.0.
**How:** a scripted player (`tests/engine/campaign.log.test.ts`) played three full guided games of Bà's bakery: two "keen" runs (seeds 2026 and 5) and one "casual" run (seed 77), for 237–421 game days each. It follows the lessons, serves one order at a time at a realistic tapping speed, restocks, bakes, hires when people give up waiting, buys equipment and decorations, and spends stars. A day-75 save was then opened in the real game at phone size, and every tab was checked for errors and sideways scrolling.

Run it again with `CAMPAIGN=1 npx vitest run tests/engine/campaign.log.test.ts`.

## How a full game goes

| | Keen (2026) | Keen (5) | Casual (77) |
| --- | --- | --- | --- |
| Level 2 / 5 / 8 | day 2 / 26 / 92 | day 2 / 25 / 90 | about day 2 / 27 / 103 |
| Michcake unlocked | day 92 | day 90 | day 103 |
| Every lesson finished | by day 59 | by day 59 | by day 59 |
| Star shop bought out | about day 51 | about day 50 | about day 55 |
| Ending | bankrupt, day 244 | still open at day 251 | still open at day 421 |
| Sales per day, day 25 → end | $500–600, flat | $450–600, flat | $430–560, flat |

## Bugs (fixed in this round)

1. **Saves could silently stop.** About 2 KB of history is saved per game day, so a year-old bakery's save is around 0.9 MB, and each slot also keeps a weekly backup. Two or three long games can fill a phone browser's storage, and a failed save was only logged to the console, so progress quietly stopped being kept. **Fixed:** days older than 120 keep only their totals in the save (about 45% smaller per day; nothing on screen looks further back in detail), and if a save ever fails, a red banner says so and points to Settings.
2. **Two staff could share a nickname** (the keen run hired two "Sunny" cooks). **Fixed:** nicknames are now unique across the team and the applicant list.

No crashes, invalid numbers or broken events turned up in about 900 simulated days, and no errors appeared in the browser on any tab of the day-75 save.

## Boredom markers

1. **Everything is over by day 90–100.** All lessons finish by day 59, the last level and the michcake arrive around day 90, and the star shop is bought out by day 50. After that a run can go 300 more days with only random events: no new recipes, quests, looks or goals. Players will stop around the michcake.
2. **The business stops growing at day 25.** Sales sit at $500–600 a day for the rest of the game, whatever is bought. Every day, 50–150 customers (200+ on festival days) are turned away because the case sold out. The oven is the limit, but a second oven ($3,800) is a long save on about $100 a day profit, and nothing points at it as *the* fix.
3. **Hiring takes the game out of your hands.** Before the first hire the player makes 15–20 orders a day by hand. After two hires it drops to about 1–10, and on many days to zero, because staff grab every order as soon as it arrives. The tapping minigame is the most fun part, and it quietly disappears.
4. **Stars pile up with nothing to buy.** 450–800 stars were earned and only about 100 could be spent.
5. **Too many levels early.** Level 2 on day 2, level 3 by day 8, level 5 by day 26: celebrations come faster than there is anything new to show for them.
6. **The last lesson can sit on the Today page for months.** "More shops" only finishes when you visit the second-neighbourhood screen. A player who isn't ready to expand sees it every morning unless they tap Later.
7. **Two stars nearly every day.** From week 2 on, the daily goal grows with your sales, so the keen player got exactly 2★ on most days for 200 days. It stops feeling like a goal.

## Balance and fairness

1. **Over-hiring bankrupts you with no warning.** One very busy festival day made the keen player hire three more people. Service was not the bottleneck, so they added nothing, and wages turned about +$100 a day into about −$330 a day. The day report never said "you're losing money because of wages", and the bakery went broke three weeks later.
2. **The only oven can be out for four days.** "Something broke" offers a cheaper repair in 4 days. If it's your only oven, that is four days with no pastries, and the choice doesn't say so.
3. **A third of first-day customers say "Too expensive".** On day 1–2, about 30% of shoppers leave over price. It teaches pricing, but it's the first thing a new player sees.

## Phone layout (day-75 save)

1. **The Kitchen page is very long.** With 7 recipes, each showing every ingredient as its own chip plus a Buy and a Quick-bake row, it's about 4,000 px tall on an iPhone.
2. **The floating "Open the shop" button covers text** at the top of the Kitchen page (the oven explanation).
3. **The Today page is long too:** lesson, Today card, What to aim for, story, rivals and two tiles.
4. Wide tables on Customers and Analytics scroll inside their cards, as intended. Nothing makes the whole page scroll sideways.

## Suggestions, most impact first

1. **Give the late game goals.** After the michcake, a "legend" goal ladder (for example sell 100 michcakes, a 5-star week, a second shop), monthly challenges, or Bà's harder "master recipes" (bake-quality goals). Spread the last three levels out so the michcake lands nearer day 150.
2. **Keep orders for the player.** Let staff take only what you don't reach, add a "Staff: help when I'm busy / do everything" switch, or make rush hours player-only, so the hands-on game survives hiring.
3. **Point at the bottleneck.** When people are turned away by a sold-out case for several days, say it plainly on the report and Today page ("You turned away 80 people for pastries. A second oven pays for itself in about N days") with a Show me.
4. **Warn before money runs out.** On the Money page of the report, "You lost $330 today. Wages are $420 a day; they serve about as many people as before." Ask for confirmation on a hire that the Staff tab already says won't pay.
5. **More to buy with stars:** new decorations, cat outfits, shop signs, staff uniforms, or a repeatable "Bà's tip" that costs stars.
6. **Shorter Kitchen rows on phones:** fold the ingredient chips into one line ("4 ingredients, all in stock") that opens on tap.
7. **Make "wait for the repair" say "no pastries for 4 days"** when it's your only oven.
8. **Ease day-1 prices** slightly (5–10%) so the first impression is happy customers, and let the price lesson do the teaching.
