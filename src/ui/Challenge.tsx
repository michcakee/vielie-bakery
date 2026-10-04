import { challengeProgress, challengeReward, challengeText, isOpening, OPENING, openingOn } from '../engine/challenge';
import { useGame } from './GameContext';
import { Sprite } from './pixel/Sprite';

/** Today's small task: a line of text, a count, and a tick when it's done. Opening-week days get a bigger card. */
export function ChallengeChip({ compact = false }: { compact?: boolean }) {
  const { state: s } = useGame();
  const c = s.challenge;
  if (!c || c.day !== s.day) return null;
  const now = Math.min(c.target, challengeProgress(s, c));
  const counted = c.id !== 'noLeave' && c.target > 1;
  const reward = challengeReward(s, c);
  if (isOpening(c) && !compact) {
    const ev = OPENING[c.id];
    return (
      <div className={`opening-event ${c.done ? 'done' : ''}`} data-spot="challenge">
        <Sprite name={c.done ? 'check' : 'party'} scale={3} />
        <div>
          <b className="opening-title">Today: {ev.title}</b>
          <span className="small">{ev.blurb}</span>
          <span className="opening-goal">
            <b>Goal:</b> {challengeText(c)}
            {counted && !c.done && ` (${now}/${c.target})`}
            {c.done ? ' · done!' : ` · +${reward.xp} XP and $${reward.cash}`}
          </span>
        </div>
      </div>
    );
  }
  return (
    <p className={`challenge-chip ${c.done ? 'done' : ''} ${compact ? 'compact' : ''}`} data-spot="challenge">
      <Sprite name={c.done ? 'check' : 'gift'} scale={2} />
      <span>
        {!compact && <b>{isOpening(c) ? `${OPENING[c.id].title}: ` : 'Daily challenge: '}</b>}
        {compact && isOpening(c) && <b>{OPENING[c.id].title}: </b>}
        {challengeText(c)}
        {counted && !c.done && ` (${now}/${c.target})`}
        {c.done ? ' · done!' : !compact ? ` · +${reward.xp} XP` : ''}
      </span>
    </p>
  );
}

/** "Tomorrow: The Food Critic visits", for the day report during the opening week. */
export function OpeningTomorrow() {
  const { state: s } = useGame();
  const id = openingOn(s, s.day + 1);
  if (!id) return null;
  return (
    <p className="opening-tomorrow">
      <Sprite name="party" scale={2} /> <b>Tomorrow: {OPENING[id].title}.</b> {OPENING[id].blurb}
    </p>
  );
}
