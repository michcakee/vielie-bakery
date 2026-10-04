import { DECOR } from '../data/catalog';
import { cosmeticFor, owns, type CosmeticKind } from '../data/cosmetics';
import { AWNINGS, clampPlace, DECOS, GARLAND_NAMES, GARLANDS, SIGNS, UNIFORMS } from '../data/shopfit';
import { Sprite } from './pixel/Sprite';
import { DEFAULT_STYLE } from '../engine/state';
import { useGame } from './GameContext';
import { Btn } from './kit';
import { APRONS } from './pixel/palette';
import { COUNTERS, FLOORS, PATTERNS, WALLS } from './pixel/scene';
import { floorPieces } from './scene/BakeryScene';
import { Renovate } from './Renovate';
import { Exterior } from './screens/Exterior';

/** Good places to put things, for the Move button (dragging works anywhere). */
const PRESETS = [
  { x: 8, y: 58 },
  { x: 8, y: 92 },
  { x: 8, y: 118 },
  { x: 214, y: 82 },
  { x: 198, y: 84 },
  { x: 48, y: 140 },
  { x: 150, y: 136 },
];

/** Paint the walls, pick a floor and a counter, dress the shop front, and move your decorations. Free, and it changes straight away. */
export function Painter({ canDrag = false }: { canDrag?: boolean }) {
  const { state: s, dispatch } = useGame();
  const style = s.style ?? DEFAULT_STYLE;
  const wall = WALLS[style.wall % WALLS.length];
  const pieces = floorPieces(s);
  const lockedPaint = (kind: CosmeticKind, i: number) => {
    const c = cosmeticFor(kind, i);
    return !!c && !owns(s, c.id);
  };
  const nameOf = (id: string) => (id === 'plant' || id === 'hoaMai' ? DECOR[id].name : DECOS[id as keyof typeof DECOS].name);
  const move = (id: string, x: number, y: number) => {
    // The next preset spot that actually moves it somewhere else.
    const at = PRESETS.map((p) => clampPlace(id, p.x, p.y));
    const now = at.findIndex((p) => Math.abs(p.x - x) < 3 && Math.abs(p.y - y) < 3);
    for (let k = 1; k <= at.length; k++) {
      const next = at[(now + k + at.length) % at.length];
      if (Math.abs(next.x - x) >= 3 || Math.abs(next.y - y) >= 3) return dispatch({ type: 'placeDecor', id, x: next.x, y: next.y });
    }
  };
  return (
    <div className="painter" data-spot="painter">
      <Renovate />
      <p className="small muted">It’s your shop: paint it how you like. It’s free, and you can change it any time.</p>
      <fieldset>
        <legend>Wall colour</legend>
        <div className="paint-swatches">
          {WALLS.map((w, i) => (
            <button key={w.name} type="button" className={`paint-swatch ${style.wall === i ? 'on' : ''} ${lockedPaint('wall', i) ? 'locked' : ''}`} aria-pressed={style.wall === i} disabled={lockedPaint('wall', i)} title={lockedPaint('wall', i) ? `Unlock in the star shop (${cosmeticFor('wall', i)!.cost}★)` : undefined} onClick={() => dispatch({ type: 'setStyle', key: 'wall', value: i })}>
              {lockedPaint('wall', i) && <span className="paint-lock"><Sprite name="lock" scale={1} /> {cosmeticFor('wall', i)!.cost}★</span>}
              <i style={{ background: `linear-gradient(90deg, ${w.c} 0 60%, ${w.accent} 60%)` }} />
              {w.name}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Wall pattern</legend>
        <div className="paint-swatches">
          {PATTERNS.map((name, i) => (
            <button key={name} type="button" className={`paint-swatch ${style.pattern === i ? 'on' : ''}`} aria-pressed={style.pattern === i} onClick={() => dispatch({ type: 'setStyle', key: 'pattern', value: i })}>
              <i
                style={{
                  background:
                    i === 0
                      ? `repeating-linear-gradient(90deg, ${wall.c} 0 6px, ${wall.accent} 6px 9px)`
                      : i === 1
                        ? wall.c
                        : i === 2
                          ? `radial-gradient(${wall.accent} 2px, ${wall.c} 2.5px) 0 0 / 8px 8px`
                          : `conic-gradient(${wall.accent} 25%, ${wall.c} 0 50%, ${wall.accent} 0 75%, ${wall.c} 0) 0 0 / 12px 12px`,
                }}
              />
              {name}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Along the top of the wall</legend>
        <div className="paint-swatches">
          {GARLANDS.map((g, i) => {
            const locked = g !== 'bunting' && !owns(s, g);
            return (
              <button key={g} type="button" className={`paint-swatch ${(style.garland ?? 0) === i ? 'on' : ''} ${locked ? 'locked' : ''}`} aria-pressed={(style.garland ?? 0) === i} disabled={locked} title={locked ? `In the star shop (${DECOS[g].cost}★)` : undefined} onClick={() => dispatch({ type: 'setStyle', key: 'garland', value: i })}>
                {locked && (
                  <span className="paint-lock">
                    <Sprite name="lock" scale={1} /> {DECOS[g].cost}★
                  </span>
                )}
                <i className={`garland-swatch g-${g}`} />
                {GARLAND_NAMES[g]}
              </button>
            );
          })}
        </div>
        <p className="small muted">More garlands, and things for the floor, are in the star shop. Tết and the Mid-Autumn festival bring their own decorations.</p>
      </fieldset>
      <fieldset>
        <legend>Floor</legend>
        <div className="paint-swatches">
          {FLOORS.map((f, i) => (
            <button key={f.name} type="button" className={`paint-swatch ${style.floor === i ? 'on' : ''} ${lockedPaint('floor', i) ? 'locked' : ''}`} aria-pressed={style.floor === i} disabled={lockedPaint('floor', i)} title={lockedPaint('floor', i) ? `Unlock in the star shop (${cosmeticFor('floor', i)!.cost}★)` : undefined} onClick={() => dispatch({ type: 'setStyle', key: 'floor', value: i })}>
              {lockedPaint('floor', i) && <span className="paint-lock"><Sprite name="lock" scale={1} /> {cosmeticFor('floor', i)!.cost}★</span>}
              <i style={{ background: f.tiles ? `conic-gradient(${f.b} 25%, ${f.a} 0 50%, ${f.b} 0 75%, ${f.a} 0) 0 0 / 12px 12px` : `repeating-linear-gradient(${f.a} 0 5px, ${f.line} 5px 6px)` }} />
              {f.name}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Counter</legend>
        <div className="paint-swatches">
          {COUNTERS.map((c, i) => (
            <button key={c.name} type="button" className={`paint-swatch ${style.counter === i ? 'on' : ''} ${lockedPaint('counter', i) ? 'locked' : ''}`} aria-pressed={style.counter === i} disabled={lockedPaint('counter', i)} title={lockedPaint('counter', i) ? `Unlock in the star shop (${cosmeticFor('counter', i)!.cost}★)` : undefined} onClick={() => dispatch({ type: 'setStyle', key: 'counter', value: i })}>
              {lockedPaint('counter', i) && <span className="paint-lock"><Sprite name="lock" scale={1} /> {cosmeticFor('counter', i)!.cost}★</span>}
              <i style={{ background: `linear-gradient(${c.top} 0 30%, ${c.body} 30%)` }} />
              {c.name}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Move things around</legend>
        {pieces.length === 0 ? (
          <p className="small muted">Plants, the hoa mai tree and star-shop pieces like the goldfish tank can be moved once you have them.</p>
        ) : (
          <>
            <p className="small muted">{canDrag ? 'Drag anything on the floor in the picture above, or tap Move.' : 'Tap Move, or open Paint under the shop picture and drag things anywhere on the floor.'}</p>
            <ul className="move-list">
              {pieces.map((p) => (
                <li key={p.id}>
                  <b>{nameOf(p.id)}</b>
                  <Btn kind="ghost" onClick={() => move(p.id, p.x, p.y)} sfx="pop">
                    Move
                  </Btn>
                </li>
              ))}
            </ul>
          </>
        )}
      </fieldset>
      <fieldset>
        <legend>Shop front</legend>
        <div className="front-preview">
          <Exterior still front={{ tier: s.shopTier, awning: style.awning, sign: style.sign }} name={s.bakeryName} />
        </div>
        <span className="small">Awning</span>
        <div className="paint-swatches">
          {AWNINGS.map((a, i) => (
            <button key={a.name} type="button" className={`paint-swatch ${(style.awning ?? 0) === i ? 'on' : ''}`} aria-pressed={(style.awning ?? 0) === i} onClick={() => dispatch({ type: 'setStyle', key: 'awning', value: i })}>
              <i style={{ background: `repeating-linear-gradient(90deg, ${a.c} 0 6px, #f7f0dc 6px 12px)` }} />
              {a.name}
            </button>
          ))}
        </div>
        <span className="small">Sign</span>
        <div className="paint-swatches">
          {SIGNS.map((g, i) => (
            <button key={g.name} type="button" className={`paint-swatch ${(style.sign ?? 0) === i ? 'on' : ''}`} aria-pressed={(style.sign ?? 0) === i} onClick={() => dispatch({ type: 'setStyle', key: 'sign', value: i })}>
              <i style={{ background: g.c, boxShadow: `inset 0 -5px 0 ${g.text}` }} />
              {g.name}
            </button>
          ))}
        </div>
        <p className="small muted">The sign shows your bakery’s name; change it under “You &amp; your bakery” in Growth. Renovations change the front too.</p>
      </fieldset>
      <fieldset>
        <legend>Team aprons</legend>
        <div className="paint-swatches">
          {UNIFORMS.map((u, i) => (
            <button key={u.name} type="button" className={`paint-swatch ${(style.uniform ?? 0) === i ? 'on' : ''}`} aria-pressed={(style.uniform ?? 0) === i} onClick={() => dispatch({ type: 'setStyle', key: 'uniform', value: i })}>
              <i style={{ background: u.apron < 0 ? `conic-gradient(${APRONS[0]} 0 25%, ${APRONS[2]} 0 50%, ${APRONS[4]} 0 75%, ${APRONS[6]} 0)` : APRONS[u.apron] }} />
              {u.name}
            </button>
          ))}
        </div>
        <p className="small muted">Everyone you hire wears it. The Dream team keep their own look.</p>
      </fieldset>
    </div>
  );
}
