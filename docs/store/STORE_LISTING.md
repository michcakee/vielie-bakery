# Store listing (draft)

> Placeholder copy for Google Play and the App Store. Nothing has been submitted. Fields marked **TODO** need the owner's decision or details.

## Basics

| Field | Value |
| --- | --- |
| App name | Viet Bake Shop Simulator |
| Name under the icon | Viet Bake Shop Sim |
| Subtitle (iOS, 30 chars) | Run a cozy Vietnamese bakery |
| Bundle / package ID | `com.michcakee.vietbakeshop` |
| Category | Games → Simulation (secondary: Education) |
| Price | Free, with optional in-app purchases (diamond packs). No ads |
| Developer name | My-Vien Nguyen |
| Support email | myvientrannguyen@gmail.com |
| Website | https://michcakee.github.io/vielie-bakery/ |
| Privacy policy URL | https://github.com/michcakee/vielie-bakery/blob/main/docs/store/PRIVACY_POLICY.md|

## Short description (Google Play, 80 chars)

Bake bánh mì, set prices, hire a team and grow a tiny Vietnamese bakery.

## Promotional text (iOS, 170 chars)

Bà is retiring and her little bakery is yours. Bake, price, hire, borrow and grow, and learn how a real small business works without a single lecture.

## Full description

Bà (grandma) is retiring, and her tiny Vietnamese bakery on Saigon Street is yours now.

Bake baguettes and flan at dawn. Build bánh mì and pour cà phê sữa đá to order. Set your prices and watch who says "Too expensive…". Ride out egg shortages, rainy seasons, Tết rushes and the new bánh mì stand across the street.

Then grow: hire bakers and baristas, buy ovens, sign supplier contracts, take a loan or bring in an investor, open a second shop across town, and see what your bakery is worth.

A real business sandbox
• Prices, demand and competition that react like real markets
• Booms, recessions and inflation that change what customers spend
• Income statement, balance sheet and cash flow, explained in plain words
• "Why did this happen?" for every good and bad week
• Six scenarios, four difficulty levels, long-term goals and three save slots
• The Dream team: five all-rounders with their own looks who serve anything far faster than anyone you can hire, and earn the biggest tips in town

Cozy and Vietnamese
• Hand-made pixel art: a tube-house bakery, gạch bông tiles, lanterns and street life
• Regulars with habits and favourites, and Bà, who teaches you one thing a day (in Vietnamese, with English underneath)
• Tết, Trung Thu mooncakes and 13 Vietnamese recipes, from bánh mì que to one legendary final cake

Fair and private
• No ads, no account
• Optional diamond packs unlock the Dream team sooner; every 3-star day earns diamonds for free
• Plays fully offline
• Saves stay on your device

## In-app purchases (set up in App Store Connect)

Create these under *Monetization → In-App Purchases* as **Consumable**, with exactly these product IDs (the game looks them up by ID; `src/data/dream.ts`). Each needs a display name, a description, a price tier and a review screenshot of the Dream team screen (`docs/store/screenshots/` has the game; take one of the diamond shop from TestFlight). Submit them **with** the app version that adds them.

| Product ID | Reference name | Display name | Description | Price |
| --- | --- | --- | --- | --- |
| `com.michcakee.vietbakeshop.diamonds60` | Diamonds 60 | Handful of diamonds | 60 diamonds: enough to unlock Vy. | $0.99 |
| `com.michcakee.vietbakeshop.diamonds200` | Diamonds 200 | Pouch of diamonds | 200 diamonds for the Dream team. | $2.99 |
| `com.michcakee.vietbakeshop.diamonds520` | Diamonds 520 | Chest of diamonds | 520 diamonds: the whole Dream team. | $5.99 |

- Diamonds are consumables, so there's nothing to "restore": Apple doesn't require a Restore button for them. They live on the device (see the privacy policy).
- Every 3-star day also pays 5 diamonds, so everything can be earned without paying.
- *App Privacy* stays **Data Not Collected**: Apple processes the payment and the game sends nothing to us.
- Review notes for Apple: "Diamonds are an optional consumable currency for unlocking the Dream team characters (Staff tab, or the diamond counter in the top bar). They can also be earned in play: 5 per 3-star day. Nothing is random."

## Keywords (iOS, 100 chars)

bakery,tycoon,business,vietnamese,banh mi,cozy,pixel,economics,cafe,shop,manager,restaurant,cooking

("Simulator" is already in the app name, so it is left out of the keywords.)

## What's new (3.1.0)

Now called Viet Bake Shop Simulator. Meet the Dream team: Vy, Yen Vy, Hieu, Sang and Phuong Khanh, five all-rounders who serve anything at lightning speed and earn the biggest tips in town. Unlock them with diamonds: earn them on 3-star days or buy a pack. The tutorial and Bà's lessons make the next button to tap shine, with a little arrow, until you tap it. Plus a step-by-step first day with Bà, your first customer Kevin Nguyen (who later asks for a job), quests and a star shop for new looks, a clearer day report, and a new first recipe: bánh mì que. The game now asks your name, and the last recipe in the book is a secret worth playing for.

## Assets

| Asset | Source |
| --- | --- |
| App icon 1024×1024 | `resources/icon-1024.png` (`npm run icons`) |
| Play feature graphic 1024×500 | `resources/play-feature-1024x500.png` |
| Screenshots | [`docs/store/screenshots/`](screenshots/): six each for iPhone 6.9" (1320×2868) and iPad 13" (2064×2752), in the order to upload. Taken from the web build; retake from a TestFlight build if anything looks different on a real phone. |
