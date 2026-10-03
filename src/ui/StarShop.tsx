import { COSMETICS, owns, STAR_CASH, starsToSpend, type CosmeticDef } from '../data/cosmetics';
import { useGame } from './GameContext';
import { Btn } from './kit';
import { LookChanger } from './LookEditor';
import { COUNTERS, FLOORS, WALLS } from './pixel/scene';
import { Person, Sprite } from './pixel/Sprite';

/** A little picture of what you're buying. */
function Preview({ c }: { c: CosmeticDef }) {
  const { state: s } = useGame();
  // Hair is shown without a hat so you can see it.
  if (c.kind === 'hair') return <Person look={{ ...s.look, hair: c.index, accessory: 0 }} scale={2} />;
  if (c.kind === 'accessory') return <Person look={{ ...s.look, accessory: c.index }} scale={2} />;
  const colour =
    c.kind === 'wall'
      ? `linear-gradient(90deg, ${WALLS[c.index].c} 0 60%, ${WALLS[c.index].accent} 60%)`
      : c.kind === 'floor'
        ? `conic-gradient(${FLOORS[c.index].b} 25%, ${FLOORS[c.index].a} 0 50%, ${FLOORS[c.index].b} 0 75%, ${FLOORS[c.index].a} 0) 0 0 / 14px 14px`
        : `linear-gradient(${COUNTERS[c.index].top} 0 30%, ${COUNTERS[c.index].body} 30%)`;
  return <span className="shop-swatch" style={{ background: colour }} />;
}

/** Spend the stars from daily goals on looks for you and the shop. */
export function StarShop() {
  const { state: s, dispatch } = useGame();
  const stars = starsToSpend(s);
  return (
    <div className="star-shop">
      <div className="quest-explain">
        <Sprite name="star" scale={3} />
        <p>
          <b>You have {stars}★ to spend.</b> Every day you can earn up to 3 stars by hitting your sales goal. Spend them here on new looks for you and your bakery. Shop paint is chosen with the Paint button under the shop picture.
        </p>
      </div>
      <ul className="cosmetic-grid">
        {COSMETICS.map((c) => {
          const have = owns(s, c.id);
          return (
            <li key={c.id} className={have ? 'owned' : ''}>
              <Preview c={c} />
              <b>{c.name}</b>
              {have ? (
                <span className="owned-tag">
                  <Sprite name="check" scale={2} /> Yours
                </span>
              ) : (
                <Btn kind={stars >= c.cost ? 'go' : 'plain'} disabled={stars < c.cost} onClick={() => dispatch({ type: 'buyCosmetic', id: c.id })} sfx="sparkle">
                  {c.cost}★
                  {stars < c.cost && <span className="btn-sub">{c.cost - stars} more</span>}
                </Btn>
              )}
            </li>
          );
        })}
      </ul>
      <div className="tip-jar">
        <Sprite name="coin" scale={3} />
        <span>
          <b>Bà’s tip jar</b>
          <span className="small">Turn {STAR_CASH.stars}★ into ${STAR_CASH.cash} for the bakery, as often as you like.</span>
        </span>
        <Btn kind={stars >= STAR_CASH.stars ? 'primary' : 'plain'} disabled={stars < STAR_CASH.stars} onClick={() => dispatch({ type: 'starsForCash' })} sfx="coin">
          {STAR_CASH.stars}★ → ${STAR_CASH.cash}
        </Btn>
      </div>
      <h2>Your look</h2>
      <LookChanger big={5} />
    </div>
  );
}
