import { expect, it } from 'vitest';
import { spendWarning } from '../../src/engine/advice';
import { rent } from '../../src/engine/economy';
import { createNewGame, gameReducer } from '../../src/engine/state';

it('warns before a purchase that would leave too little for rent day', () => {
  let s = gameReducer(createNewGame({ seed: 1, guided: true }), { type: 'setup', name: 'T', look: createNewGame(1).look });
  s = { ...s, day: 18, cash: rent(s) * 30 + 400 };
  expect(spendWarning(s, 100)).toBeNull();
  expect(spendWarning(s, 600)).toMatch(/Rent day is in/);
  expect(spendWarning({ ...s, day: 5 }, s.cash - 50)).toMatch(/leave you/);
});
