## What this changes

<!-- One or two sentences: what and why. Link the issue if there is one (Fixes #123). -->

## Screenshots

<!-- For anything visible: before and after, at phone size (375×812). -->

## Checklist

- [ ] `npm run typecheck`, `npm test` and `npm run build` pass
- [ ] Played it at phone size (375×812), and with Reduce motion and large text if the UI changed
- [ ] Text is short and kid-friendly; any grown-up word is explained in plain words first
- [ ] Nothing mentions a system that's still locked in a guided game
- [ ] Pacing changes (prices, patience, XP, goals) include the kid test output: `KID_LOG=1 npx vitest run tests/engine/kid.test.ts`
- [ ] Save shape changes bump `SAVE_VERSION` and add a migration
- [ ] No tracking, ads, network calls or personal data
