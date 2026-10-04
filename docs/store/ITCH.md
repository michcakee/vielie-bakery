# Releasing on itch.io

The itch.io version is the web game, played in the browser on itch's page. It's free to publish and needs no Mac and no Apple account.

## 1. Build the zip

```bash
npm run itch
```

This makes `release/viet-bake-shop-sim-web-<version>.zip` with `index.html` at the top, which is what itch expects. Run it again for every update.

The itch build differs from the website in three small ways (`src/lib/host.ts`):

- no offline service worker (it doesn't belong inside itch's player),
- no "Email me a restore link" in Settings (the link would open the game outside itch, where the browser keeps a separate save); save codes still work,
- the title screen doesn't say "Works offline".

Diamonds can't be bought on itch. Players earn them with 3-star days, the same as on the website.

## 2. Create the page

Sign in at itch.io → **Dashboard → Create new project**.

| Field | Value |
| --- | --- |
| Title | Viet Bake Shop Simulator |
| Project URL | `viet-bake-shop-simulator` |
| Short description | Run a cozy Vietnamese bakery: bake bánh mì, set prices, hire a team and grow. |
| Classification | Games |
| Kind of project | **HTML** |
| Release status | Released (or *In development* for a soft launch) |
| Pricing | **$0 or donate**, or *No payments* |
| Uploads | the zip from step 1; tick **This file will be played in the browser** |
| Embed options | **Click to launch in fullscreen** |
| Mobile friendly | ticked; orientation **Default** |
| Fullscreen button | not needed with the fullscreen launch |
| Cover image | `resources/itch-cover-630x500.png` |
| Screenshots | the five computer screenshots in `docs/store/screenshots/pc/` (2880×1620); phone-shaped ones are in `docs/store/screenshots/itch/` |
| Theme → Banner | `resources/itch-banner-1920x600.png` |
| Theme → Background | `resources/itch-background-tile-48.png`, set to repeat (or just the colour `#F6EFDC`) |
| Embed background | `resources/itch-embed-bg-960x720.png` |
| Genre | Simulation |
| Tags | `cozy`, `pixel-art`, `tycoon`, `management`, `cooking`, `economy`, `singleplayer`, `business`, `food`, `casual` |
| AI disclosure | answer itch's question honestly for how the game was made |
| Community | Comments on (the easiest way to get feedback) |

**Description:** paste the *Full description* from [`STORE_LISTING.md`](STORE_LISTING.md), and change the "Fair and private" list to:

> • Free, no ads, no account
> • Earn diamonds on 3-star days to unlock the Dream team
> • Saves stay in your browser; copy a save code in Settings to back up or move your bakery

Leave out "Plays fully offline" and the line about diamond packs: neither is true on itch.

## 3. Check before going public

Save the page as a **Draft** first, then open *View page* and:

- [ ] The game starts after you click *Run game* and fills the screen
- [ ] Play day 1, close the tab, come back: **Continue** is there
- [ ] Settings → *Copy save code* works, and pasting it back loads the bakery
- [ ] Sound plays after the first tap
- [ ] Try it on a phone too

Then set **Visibility & access** to **Public**.

## Good to know

- **Saves live in the player's browser, for itch's game domain.** A new upload keeps them. Clearing site data, private windows, or a different browser start fresh, and Safari can clear a game's storage after about a week without playing. Tell players to copy a save code now and then.
- Saves on itch and on the website (`michcakee.github.io`) are separate. A save code moves a bakery between them.
- To update: run `npm run itch`, open *Edit game*, upload the new zip, tick "played in the browser" on it and delete the old file.
