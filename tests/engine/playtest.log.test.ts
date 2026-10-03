import { it } from 'vitest';
import { createNewGame, gameReducer } from '../../src/engine/state';
import { nextUnlock } from '../../src/engine/progression';
import { FEATURE } from '../../src/data/unlocks';
import { finish, resolveEvents, runService, morning } from './bot';
import type { GameState } from '../../src/engine/types';

// Opt-in: PLAYTEST=1 npx vitest run tests/engine/playtest.log.test.ts
it.runIf(!!process.env.PLAYTEST)('guided playtest log, days 1-35', () => {
  let s: GameState = gameReducer(createNewGame({ seed: 2026, guided: true }), { type: 'setup', name: 'Play', look: createNewGame(1).look });
  for (let d = 0; d < 35; d++) {
    const voices: string[] = [];
    if (s.events.length) voices.push(`event:${s.events.map((e) => e.id).join('+')}`);
    if (s.intro?.active) voices.push(`intro:${s.intro.active}`);
    const coach = !s.hints.includes('coachDone') && !s.intro?.active && s.history.length === 0;
    if (coach) voices.push('coach');
    if (!s.intro?.active) voices.push(`nextUp:${nextUnlock(s).text}`);
    const toasts = s.toasts.filter((t) => t.kind === 'unlock' || t.kind === 'level').map((t) => t.title);
    console.log(`day ${s.day} | ${voices.join(' | ')}${toasts.length ? ' | toasts: ' + toasts.join(', ') : ''}`);
    s = resolveEvents(s);
    // A player who follows the intro quest the same morning.
    s = morning(s);
    if (s.intro?.active === 'staff.hire' && s.applicants.length) s = gameReducer(s, { type: 'hire', applicantId: s.applicants[0].id });
    s = finish(runService(s));
    if (s.intro?.later.length) console.log(`   deferred: ${s.intro.later.map((f) => FEATURE[f].name).join(', ')}`);
  }
});
