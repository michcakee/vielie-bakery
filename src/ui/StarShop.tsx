import { useEffect, useRef } from 'react';
import { COSMETICS, owns, STAR_CASH, starsToSpend, type CosmeticDef } from '../data/cosmetics';
import { DECO_SETS, DECOS, PLACE_SIZE, type DecoId } from '../data/shopfit';
import { useGame } from './GameContext';
import { Btn } from './kit';
import { LookChanger } from './LookEditor';
import { DRAW_DECO, drawGarland } from './pixel/decor';
import { COUNTERS, FLOORS, WALLS } from './pixel/scene';
import { Person, Sprite } from './pixel/Sprite';

/** A little pixel picture of a star-shop decoration. */
function DecoPreview({ id }: { id: DecoId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const d = DECOS[id];
  const w = d.kind === 'garland' ? 44 : d.kind === 'floor' ? PLACE_SIZE[id].w : 18;
  const h = d.kind === 'garland' ? 16 : d.kind === 'floor' ? PLACE_SIZE[id].h : 14;
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    if (d.kind === 'garland') {
      ctx.fillStyle = '#f7efd8';
      ctx.fillRect(0, 0, w, h);
      drawGarland(ctx, id, w + 8);
    } else if (d.kind === 'floor') DRAW_DECO[id]?.(ctx);
    else if (id === 'wallClock') {
      ctx.fillStyle = '#3e4a36';
      ctx.beginPath();
      ctx.arc(9, 7, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f7f0dc';
      ctx.beginPath();
      ctx.arc(9, 7, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3e4a36';
      ctx.fillRect(9, 3, 1, 4);
      ctx.fillRect(9, 7, 3, 1);
    } else {
      // the moto
      ctx.fillStyle = '#d0634f';
      ctx.fillRect(3, 6, 12, 3);
      ctx.fillRect(6, 4, 6, 2);
      ctx.fillStyle = '#f4dc8c';
      ctx.fillRect(7, 3, 4, 1);
      ctx.fillStyle = '#3e4a36';
      ctx.fillRect(14, 3, 1, 3);
      for (const x of [1, 11]) {
        ctx.fillRect(x, 9, 6, 5);
        ctx.fillStyle = '#cfd6c4';
        ctx.fillRect(x + 1, 10, 4, 3);
        ctx.fillStyle = '#3e4a36';
      }
    }
  }, [id, d.kind, w, h]);
  const k = d.kind === 'garland' ? 2 : 3;
  return <canvas ref={ref} width={w} height={h} className="deco-preview" style={{ width: w * k, height: h * k }} />;
}

/** A little picture of what you're buying. */
function Preview({ c }: { c: CosmeticDef }) {
  const { state: s } = useGame();
  // Hair is shown without a hat so you can see it.
  if (c.kind === 'hair') return <Person look={{ ...s.look, hair: c.index, accessory: 0 }} scale={2} />;
  if (c.kind === 'accessory') return <Person look={{ ...s.look, accessory: c.index }} scale={2} />;
  if (c.kind === 'deco') return <DecoPreview id={c.id as DecoId} />;
  const colour =
    c.kind === 'wall'
      ? `linear-gradient(90deg, ${WALLS[c.index].c} 0 60%, ${WALLS[c.index].accent} 60%)`
      : c.kind === 'floor'
        ? `conic-gradient(${FLOORS[c.index].b} 25%, ${FLOORS[c.index].a} 0 50%, ${FLOORS[c.index].b} 0 75%, ${FLOORS[c.index].a} 0) 0 0 / 14px 14px`
        : `linear-gradient(${COUNTERS[c.index].top} 0 30%, ${COUNTERS[c.index].body} 30%)`;
  return <span className="shop-swatch" style={{ background: colour }} />;
}

function Item({ c }: { c: CosmeticDef }) {
  const { state: s, dispatch } = useGame();
  const stars = starsToSpend(s);
  const have = owns(s, c.id);
  return (
    <li className={have ? 'owned' : ''}>
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
}

/** Spend the stars from daily goals on looks for you and the shop. */
export function StarShop() {
  const { state: s, dispatch } = useGame();
  const stars = starsToSpend(s);
  const byId = (id: string) => COSMETICS.find((c) => c.id === id)!;
  return (
    <div className="star-shop">
      <div className="quest-explain">
        <Sprite name="star" scale={3} />
        <p>
          <b>You have {stars}★ to spend.</b> Every day you can earn up to 3 stars by hitting your sales goal. Spend them here on new looks for you and your bakery. Shop paint and garlands are chosen with the Paint button under the shop picture, where you can also drag decorations around.
        </p>
      </div>
      <ul className="cosmetic-grid">
        {COSMETICS.filter((c) => c.kind !== 'deco').map((c) => (
          <Item key={c.id} c={c} />
        ))}
      </ul>
      <h2>Decorations</h2>
      <p className="small muted">Collect a whole set to dress the shop in one style. Looks only: they never change your sales.</p>
      {DECO_SETS.map((set) => {
        const have = set.items.filter((id) => owns(s, id)).length;
        return (
          <section key={set.id} className={`deco-set ${have === set.items.length ? 'complete' : ''}`} aria-label={set.name}>
            <h3>
              {set.name} <span className="small muted">{have === set.items.length ? 'Complete!' : `${have} of ${set.items.length}`}</span>
            </h3>
            <ul className="cosmetic-grid">
              {set.items.map((id) => (
                <Item key={id} c={byId(id)} />
              ))}
            </ul>
          </section>
        );
      })}
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
