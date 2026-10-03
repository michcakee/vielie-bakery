import { describe, expect, it } from 'vitest';
import { levelOf } from '../../src/engine/economy';
import { createNewGame, gameReducer } from '../../src/engine/state';
import { DEFAULT_LOOK } from '../../src/engine/state';
import { kidDay } from './bot';
import { hireValue } from '../../src/engine/labor';
import { featureOn } from '../../src/engine/unlocks';
import type { GameState } from '../../src/engine/types';

/** Hire Bà's pick, like the Staff tab suggests, once hiring is open (at most two helpers). */
function hirePick(s: GameState): GameState {
  if (!featureOn(s, 'staff.hire') || s.phase !== 'morning' || s.staff.length >= 2) return s;
  const best = [...s.applicants].map((a) => ({ a, v: hireValue(s, a.role, a.skill) })).sort((x, y) => y.v.addsValue - y.v.cost - (x.v.addsValue - x.v.cost))[0];
  return best && best.v.addsValue >= best.v.cost * 0.6 ? gameReducer(s, { type: 'hire', applicantId: best.a.id }) : s;
}

// Pacing checked against a child-speed player, not the instant-serve bot.
describe('a kid playing a guided game', () => {
  it('30 days: the bakery survives, most days earn a star, and levels keep coming', () => {
    let s = gameReducer(createNewGame({ seed: 12, guided: true }), { type: 'setup', name: 'Kid', look: DEFAULT_LOOK });
    const rows: string[] = [];
    let starDays = 0;
    let levelDays: number[] = [];
    let lastLevel = 1;
    for (let d = 0; d < 30 && !s.ending; d++) {
      if (process.env.KID_HIRE) s = hirePick(s);
      s = kidDay(s, Number(process.env.KID_SLOW ?? 1));
      const r = s.lastReport!;
      if ((r.stars ?? 0) >= 1) starDays++;
      const lvl = levelOf(s.xp);
      if (lvl > lastLevel) levelDays.push(r.day);
      lastLevel = lvl;
      rows.push(`d${r.day} staff ${s.staff.map((e) => e.role).join('+') || '-'} served ${r.stats.served}/${r.stats.customers} lost ${r.stats.lostSlow} profit ${r.profit.toFixed(0)} stars ${r.stars} cash ${Math.round(s.cash)} lvl ${lvl} xp ${s.xp}`);
    }
    if (process.env.KID_LOG) console.log(rows.join('\n') + `\nlevels on days ${levelDays.join(', ')}`);
    expect(s.ending).toBeFalsy();
    expect(s.cash).toBeGreaterThan(0);
    expect(starDays).toBeGreaterThanOrEqual(18);
    expect(levelOf(s.xp)).toBeGreaterThanOrEqual(3);
  });
});
