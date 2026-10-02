import type { Look } from './types';

export function randomLook(rand: () => number): Look {
  return {
    skin: Math.floor(rand() * 5),
    hair: Math.floor(rand() * 4),
    hairColor: Math.floor(rand() * 6),
    shirt: Math.floor(rand() * 8),
    apron: -1,
    accessory: rand() < 0.75 ? 0 : 1 + Math.floor(rand() * 3),
  };
}
