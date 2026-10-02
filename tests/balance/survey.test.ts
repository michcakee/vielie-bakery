import { it } from 'vitest';

// Opt-in: `npm run balance`. Plays every scenario × difficulty for 180 autopilot days and prints a table.
import { createNewGame } from '../../src/engine/state';
import { valuation } from '../../src/engine/finance';
import { SCENARIOS } from '../../src/data/world';
import { autoDay } from '../engine/bot';
it.skipIf(process.env.npm_lifecycle_event !== 'balance')('balance survey', () => {
  const rows: string[] = [];
  for (const sc of Object.keys(SCENARIOS)) for (const diff of ['easy', 'normal', 'hard', 'expert'] as const) {
    const res: string[] = [];
    for (const seed of [3, 11]) {
      let s = createNewGame({ seed, scenario: sc as never, difficulty: diff });
      for (let d = 0; d < 180 && s.phase !== 'ended'; d++) s = autoDay(s);
      const last = s.history.slice(-30);
      const p = last.reduce((t, h) => t + h.profit, 0);
      const firstProfit = s.history.findIndex((h, i) => i > 3 && h.profit > 0);
      res.push(`${s.ending ? 'END:' + s.ending.kind : 'd' + s.day} cash ${Math.round(s.cash)} prof30 ${Math.round(p)} val ${Math.round(valuation(s).equityValue)} 1stProfitDay ${firstProfit}`);
    }
    rows.push(`${sc.padEnd(12)} ${diff.padEnd(7)} | ${res.join(' | ')}`);
  }
  console.log('\n' + rows.join('\n'));
}, 900000);
