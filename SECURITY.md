# Security policy

## How the game handles data

Viet Bake Shop has no server, no accounts, no ads and no analytics. Saves and settings stay in the player's own browser (local storage). The only time data leaves the device is when a player chooses to copy a save code or to open their own email app with a restore link, and that feature sits behind a grown-ups check.

Because players are children, we treat anything that could expose personal information, run someone else's code, or send data off the device as a serious issue.

## Supported versions

Only the latest version, the one deployed at https://michcakee.github.io/vielie-bakery/ and the `main` branch, gets security fixes.

## Reporting a vulnerability

**Please don't open a public issue for security problems.**

Report it privately through GitHub instead: go to this repository's **Security** tab, then **Report a vulnerability**. Include:

- What the problem is and what someone could do with it.
- Steps to reproduce it, such as a save code, a link or a browser.
- Any idea you have for a fix.

You should hear back within 7 days. Once the problem is fixed, we'll credit you in the release notes unless you'd rather stay anonymous.

## In scope

- Save codes or restore links that can run script or break out of the game.
- Anything that sends player data off the device without the player choosing to.
- Vulnerable dependencies that are actually used by the shipped game.

## Out of scope

- Editing your own save or local storage to cheat. It's a single-player game, so that only affects you.
- Problems that need someone else's unlocked device.
