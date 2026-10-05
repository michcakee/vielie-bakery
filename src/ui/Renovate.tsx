import { MAX_TIER, RENOVATIONS } from '../data/shopfit';
import { levelOf } from '../engine/economy';
import { canShop } from '../engine/state';
import { money } from '../lib/format';
import { play } from './audio';
import { useGame } from './GameContext';
import { ConfirmBtn, LevelLock } from './kit';
import { Sprite } from './pixel/Sprite';

/** The bakery's own levels: renovations you pay for, which change the room, the front and how many come in. */
export function Renovate() {
  const { state: s, dispatch } = useGame();
  const tier = s.shopTier ?? 0;
  const level = levelOf(s.xp);
  const next = RENOVATIONS[tier + 1];
  return (
    <section className="renovate" aria-label="Renovate the bakery" data-spot="renovate">
      <div className="reno-head">
        <b>
          Bakery level {tier + 1} of {MAX_TIER + 1}: {RENOVATIONS[tier].name}
        </b>
        <ol className="reno-steps" aria-hidden="true">
          {RENOVATIONS.map((r) => (
            <li key={r.tier} className={r.tier <= tier ? 'done' : ''} />
          ))}
        </ol>
      </div>
      {next ? (
        <div className="reno-next">
          <Sprite name="spark" scale={2} />
          <div>
            <b>Next: {next.name}</b>
            <span className="small">{next.blurb}</span>
            <span className="small">
              <b>{next.perk}.</b>
            </span>
          </div>
          {level < next.level ? (
            <LevelLock level={next.level} />
          ) : (
            <ConfirmBtn
              kind={s.cash >= next.cost ? 'primary' : 'plain'}
              disabled={!canShop(s) || s.cash < next.cost}
              title={`Renovate: ${next.name}?`}
              lines={[`It costs ${money(next.cost)}, and you’d have ${money(s.cash - next.cost)} left.`, `${next.perk}, for good.`, 'Rent, wages and ingredients still need paying every day.']}
              warn={s.cash - next.cost < 500 ? 'That leaves very little for ingredients and bills. Maybe wait a few days?' : null}
              onConfirm={() => (play('sparkle'), dispatch({ type: 'renovate' }))}
            >
              Renovate {money(next.cost)}
              {s.cash < next.cost && <span className="btn-sub">{money(next.cost - s.cash)} more</span>}
            </ConfirmBtn>
          )}
        </div>
      ) : (
        <p className="small">The grandest bakery on the street. Bà would be so proud.</p>
      )}
    </section>
  );
}
