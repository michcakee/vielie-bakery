import { DECOR } from '../data/catalog';
import { decorSpot, DEFAULT_STYLE, MOVABLE } from '../engine/state';
import { useGame } from './GameContext';
import { Btn } from './kit';
import { COUNTERS, FLOORS, PATTERNS, WALLS } from './pixel/scene';

const SPOT_NAMES = ['left', 'middle', 'right'];

/** Paint the walls, pick a floor and a counter, and move your decorations. Free, and it changes straight away. */
export function Painter() {
  const { state: s, dispatch } = useGame();
  const style = s.style ?? DEFAULT_STYLE;
  const wall = WALLS[style.wall % WALLS.length];
  const movable = MOVABLE.filter((d) => s.decor.includes(d));
  return (
    <div className="painter" data-spot="painter">
      <p className="small muted">It’s your shop: paint it how you like. It’s free, and you can change it any time.</p>
      <fieldset>
        <legend>Wall colour</legend>
        <div className="paint-swatches">
          {WALLS.map((w, i) => (
            <button key={w.name} type="button" className={`paint-swatch ${style.wall === i ? 'on' : ''}`} aria-pressed={style.wall === i} onClick={() => dispatch({ type: 'setStyle', key: 'wall', value: i })}>
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
        <legend>Floor</legend>
        <div className="paint-swatches">
          {FLOORS.map((f, i) => (
            <button key={f.name} type="button" className={`paint-swatch ${style.floor === i ? 'on' : ''}`} aria-pressed={style.floor === i} onClick={() => dispatch({ type: 'setStyle', key: 'floor', value: i })}>
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
            <button key={c.name} type="button" className={`paint-swatch ${style.counter === i ? 'on' : ''}`} aria-pressed={style.counter === i} onClick={() => dispatch({ type: 'setStyle', key: 'counter', value: i })}>
              <i style={{ background: `linear-gradient(${c.top} 0 30%, ${c.body} 30%)` }} />
              {c.name}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Move your decorations</legend>
        {movable.length === 0 ? (
          <p className="small muted">Plants, the hoa mai tree and the songbird cage can be moved once you own them.</p>
        ) : (
          <ul className="move-list">
            {movable.map((d) => (
              <li key={d}>
                <span>
                  <b>{DECOR[d].name}</b> <span className="small muted">on the {SPOT_NAMES[decorSpot(style, d)]}</span>
                </span>
                <Btn kind="ghost" onClick={() => dispatch({ type: 'moveDecor', id: d })} sfx="pop">
                  Move
                </Btn>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </div>
  );
}
