import { REGULARS } from '../data/people';
import type { Look } from '../engine/types';
import { Person } from './pixel/Sprite';
import { BA_LOOK } from './scene/BakeryScene';

/** Faces for the people who teach a lesson but aren't regulars. */
const OTHERS: Record<string, Look> = {
  'the bank officer': { skin: 2, hair: 0, hairColor: 0, shirt: 1, apron: -1, accessory: 2 },
  'the farm co-op': { skin: 3, hair: 3, hairColor: 1, shirt: 3, apron: 0, accessory: 0 },
};

/** Who is talking, as a little pixel portrait: Bà, a regular, or someone from the lane. */
export function Speaker({ who }: { who: string }) {
  const name = who.replace(/^the /, '');
  const look = who === 'Bà' ? BA_LOOK : (REGULARS.find((r) => r.name.toLowerCase() === name.toLowerCase())?.look ?? OTHERS[who] ?? BA_LOOK);
  return (
    <span className="speaker" aria-hidden="true">
      <Person look={look} scale={2} />
    </span>
  );
}
