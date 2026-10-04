# Contributing to Viet Bake Shop Simulator

Thanks for helping! Viet Bake Shop Simulator is a cozy pixel-art Vietnamese bakery business game for everyone. It runs entirely in the browser, with no server, accounts, ads or tracking. Please read the [code of conduct](CODE_OF_CONDUCT.md) first.

## Ways to help

- **Play and report.** Bugs, confusing moments and "I didn't know what to do" are all useful. Use the issue templates.
- **Fix a bug or polish the UI.** Small, focused pull requests are easiest to review.
- **Improve the words.** Shorter, friendlier, kid-level text is always welcome, and so are corrections to Vietnamese.
- **Art and sound.** Pixel sprites and gentle sound effects; see [CREDITS.md](CREDITS.md) for licensing.

## Getting set up

You need Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

The game opens at the address Vite prints (usually http://localhost:5173).

## Before you open a pull request

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build
```

All three must pass. The tests take about two minutes.

If you changed anything you can see, also play it at **phone size (375×812)** in your browser's device mode, and check it still works with **Reduce motion** and the larger **text sizes** in Settings.

## Ground rules for changes

- **Kids first.** Text should be short and plain. Lead with what to do, not with a business term. If you add a grown-up word, explain it in a kid sentence first.
- **Show, don't tell.** Prefer a button, a glow or a "Show me" spotlight over a paragraph.
- **One voice at a time.** Don't add pop-ups that appear on top of an event card, an intro quest or service.
- **Guided games unlock things one at a time.** New systems belong in `src/data/unlocks.ts` with an intro quest. Never mention a locked system in tips, events or pop-ups (use `featureOn`).
- **Game rules live in the engine.** `src/engine/` is plain TypeScript with no React. The UI in `src/ui/` reads state and dispatches actions. Put game logic in the reducer so team days and the autopilot obey the same rules.
- **Pacing changes need the kid test.** If you change prices, patience, XP or goals, run the kid-speed test and include its output in your pull request:

```bash
KID_LOG=1 npx vitest run tests/engine/kid.test.ts
```

- **No tracking, no ads, no network calls,** and no collecting personal information.
- **Save compatibility.** If you change the shape of the saved game, bump `SAVE_VERSION` in `src/engine/state.ts` and add a migration in `src/engine/save.ts`.

More background: [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN_NOTES.md](DESIGN_NOTES.md) and [HOW_TO_PLAY.md](HOW_TO_PLAY.md).

## Commit and pull request style

- Write commit messages that say why, not just what.
- Keep one topic per pull request.
- Fill in the pull request template, including screenshots for anything visible.

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE).
