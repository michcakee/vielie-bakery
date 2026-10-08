# Playtest 4: the economy after the smaller prizes, and a hand playthrough

**When:** 8 October 2026, version 3.1.0 (after the "smaller prizes" change).
**How:** the three scripted campaigns from playtest 3 were replayed on the current code (`CAMPAIGN=1 npx vitest run tests/engine/campaign.log.test.ts`), a solo player with no hires was run for 120 days, and then days 1–24 of a Family Business game were played by hand in the real browser at desktop size: Bà's lessons, the market, baking trays by hand, every order tapped out step by step, events answered, leftovers donated.

## What the replay found

All three campaigns went bankrupt (days 63, 109 and 122). In playtest 3 none did. Two things combined:

1. **The smaller prizes removed the subsidy that was keeping bakeries alive.** Sales covered costs and nothing more. On day 22 of seed 2026, revenue was $461 and expenses $442. A solo player with no hires made about $0 a day for 120 days.
2. **Rent day was a cliff.** Rent was $80 a day, taken as one $2,400 payment on the first of the month. A player who spent $430 on a fan and a composter two days before rent day was left with $0, could not buy ingredients, and sat through eight days with no customers while wages ran. Nothing warned about the purchase.

### Changed

| Finding | Change |
| --- | --- |
| No margin anywhere | Saigon Street rent is $60 a day (was $80). Sweeps of walk-ins and rent showed rent was the lever: at $60 the campaigns end day 421 with $33–39k and the michcake lands day 144–165; walk-ins alone did nothing. |
| Spending the rent money | A confirm sheet on equipment and decor purchases that would leave less than next month's rent (within 10 days of rent day) or less than three days of wages. `spendWarning` in `src/engine/advice.ts`, `SpendBtn` in `src/ui/kit.tsx`. |
| Rent day warning came too late | Today warns 10 days ahead (was 5), and says plainly when the drawer is nearly empty: you can't buy ingredients, wages still go out, sell what you have or use the credit line. |
| Campaign bot spent its rent money | The bot keeps next month's rent plus a week of wages before hiring, buying equipment or decorating, like a sensible player. |

## What the hand playthrough found

The game ran clean: no console errors, no crashes, every lesson step worked as written, baking by hand and the step-by-step bánh mì and coffee orders all behaved. Day 24 (Tết and rent day) arrived with $1,997 after the $1,800 rent, with a one-helper team making $130–240 a day from day 12 on.

Things that got in the way, in order of cost to the player:

1. **The applicant pile offered Marketers and Pastry chefs on day 9**, at $140–170 a day, when sales were $100 a day and marketing was twenty days from unlocking. Hiring two of them (wages $350 a day) put the bakery $520 in the red in one day. **Fixed:** marketers only apply once the marketing lesson is open, managers once a second shop is in reach, delivery riders once there is a bike, and pastry chefs from level 3.
2. **Letting two people go showed up as "Wages: $841" on the report** with no explanation: three days' severance each. **Fixed:** severance is a one-off cost on the report, next to hiring fees.
3. **"Stock up on its ingredients (and baguettes for bánh mì)"** appeared when 40 baguettes were on the shelf. **Fixed:** the baguette note only shows when bánh mì ran out.
4. **The weekly review waits behind the Kitchen page.** On the morning of day 7 the Kitchen was visible with "The oven is for mornings. Come back tomorrow!" while the weekly review modal was open. Harmless but wrong. Not changed.
5. **One slow day in the rain, and the egg shortage, rainy season and canal clean-up all arrived in week 1–2.** Each costs $50–80 to say yes to. A new player who says yes to everything loses about a day's profit a week to events. Not changed; worth watching.
6. **The Today page gives contradictory advice on the same day:** "17 thought the price was too high" next to "19 wanted something that ran out". Both are true, but only one deserves the fix line. Not changed.

## Numbers from the hand run

| Day | Sales | Profit | Served | Notes |
| --- | --- | --- | --- | --- |
| 1 | $42 | −$24 | 7/9 | tutorial |
| 2 | $147 | +$85 | 27/37 | first 3-star day |
| 8 | $86 | −$258 | 14/31 | hired Kevin ($150 fee) |
| 10 | $108 | −$522 | 17/30 | two marketers on the books |
| 12 | $271 | +$59 | 49/64 | one helper again |
| 16 | $416 | +$173 | 55/75 | |
| 19 | $688 | +$129 | 103/167 | Tết shopping; street stall $250 |
| 22 | $505 | +$235 | 72/110 | oven full every morning |
| 24 | | | | rent $1,800 paid, $1,997 left |

By day 21 the report's "biggest thing to fix" pointed at the deck oven ($3,807, plus a baker), which is the right next step and about three weeks of profit away.
