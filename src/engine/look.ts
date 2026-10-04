import { EVERYDAY_HAIR } from '../data/dream';
import type { Look } from './types';

export function randomLook(rand: () => number): Look {
  return {
    skin: Math.floor(rand() * 5),
    hair: Math.floor(rand() * 4),
    // Ordinary hair only: the bright colours belong to the Dream team.
    hairColor: EVERYDAY_HAIR[Math.floor(rand() * EVERYDAY_HAIR.length)],
    shirt: Math.floor(rand() * 8),
    apron: -1,
    accessory: rand() < 0.75 ? 0 : 1 + Math.floor(rand() * 3),
  };
}
