import { CHALLENGE, challengeProgress, challengeText } from '../engine/challenge';
import { useGame } from './GameContext';
import { Sprite } from './pixel/Sprite';

/** Today's small task: a line of text, a count, and a tick when it's done. */
export function ChallengeChip({ compact = false }: { compact?: boolean }) {
  const { state: s } = useGame();
  const c = s.challenge;
  if (!c || c.day !== s.day) return null;
  const now = Math.min(c.target, challengeProgress(s, c));
  const counted = c.id !== 'noLeave';
  return (
    <p className={`challenge-chip ${c.done ? 'done' : ''} ${compact ? 'compact' : ''}`} data-spot="challenge">
      <Sprite name={c.done ? 'check' : 'gift'} scale={2} />
      <span>
        {!compact && <b>Daily challenge: </b>}
        {challengeText(c)}
        {counted && !c.done && ` (${now}/${c.target})`}
        {c.done ? ' · done!' : !compact ? ` · +${CHALLENGE.xp} XP` : ''}
      </span>
    </p>
  );
}
