import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CONFIG, PRODUCTS } from '../../data/catalog';
import { translate } from '../../data/people';
import { competitorOpen, isTet, onMenu } from '../../engine/economy';
import { lightPhase } from '../../engine/time';
import type { GameState, Mood, ProductId, Visit } from '../../engine/types';
import { useGame } from '../GameContext';
import { drawCounter, drawRoom, LAYOUT, STAGE_H, STAGE_W, type Light, type SceneOpts } from '../pixel/scene';
import { Person, Sprite } from '../pixel/Sprite';
import { money2 } from '../../lib/format';

const MOOD_FACE: Record<Mood, string> = { love: 'heart', happy: 'star', ok: 'check', pricey: 'coin', sad: 'box', slow: 'clock', thinking: 'shop' };

export function sceneLight(s: GameState): Light {
  if (s.phase === 'closing' || s.phase === 'report' || s.phase === 'weekly') return 4;
  if (s.phase === 'service' && s.service) return lightPhase(s.service.clock) as Light;
  return 0;
}

interface Placed {
  v: Visit;
  x: number;
  walking: boolean;
  leaving: boolean;
}

/** Where each visible customer stands right now. */
function placeCustomers(s: GameState): Placed[] {
  const svc = s.service;
  if (!svc) return [];
  const clock = svc.clock;
  const waiting = svc.visits.filter((v) => v.status === 'waiting').sort((a, b) => (a.waitStart ?? 0) - (b.waitStart ?? 0) || a.id - b.id);
  const out: Placed[] = waiting.map((v, i) => ({ v, x: LAYOUT.queueX[Math.min(i, 3)], walking: false, leaving: false }));
  let freeSlot = waiting.length;
  for (const v of svc.visits) {
    if (v.status === 'walking') {
      const p = Math.min(1, (clock - (v.walkStart ?? v.arrive)) / CONFIG.walkMinutes);
      const target = freeSlot < 4 ? LAYOUT.queueX[freeSlot] : 26;
      freeSlot++;
      out.push({ v, x: LAYOUT.doorX + (target - LAYOUT.doorX) * p, walking: p < 1, leaving: false });
    } else if (v.status === 'done' && v.doneAt !== undefined && clock - v.doneAt < 12 && v.mood && v.mood !== 'thinking' && v.walkStart !== undefined) {
      const p = Math.min(1, (clock - v.doneAt) / 12);
      const from = v.paid !== undefined ? LAYOUT.queueX[0] : LAYOUT.queueX[1];
      out.push({ v, x: from + (LAYOUT.doorX - 14 - from) * p, walking: true, leaving: true });
    }
  }
  return out;
}

function useStageScale(ref: React.RefObject<HTMLDivElement>) {
  const [scale, setScale] = useState(3);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Whole device pixels only: the largest integer multiple that fits, expressed in CSS pixels.
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      setScale(Math.max(1, Math.floor((el.clientWidth * dpr) / STAGE_W)) / dpr);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, [ref]);
  return scale;
}

interface Props {
  onCustomer?: (v: Visit) => void;
  baking?: boolean;
  caption?: React.ReactNode;
}

export function BakeryScene({ onCustomer, baking = false, caption }: Props) {
  const { state: s, prefs, reduced } = useGame();
  const wrap = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef<HTMLCanvasElement>(null);
  const scale = useStageScale(wrap);
  const light = sceneLight(s);
  const tet = isTet(s.day);
  const opts: SceneOpts = useMemo(
    () => ({ weather: s.market.weather, light, decor: s.decor, upgrades: s.upgrades, tet, competitor: competitorOpen(s.day) }),
    [s.market.weather, light, s.decor, s.upgrades, tet, s.day],
  );

  useEffect(() => {
    const r = roomRef.current?.getContext('2d');
    const c = counterRef.current?.getContext('2d');
    if (r) r.imageSmoothingEnabled = false;
    if (c) c.imageSmoothingEnabled = false;
    if (r) {
      r.clearRect(0, 0, STAGE_W, STAGE_H);
      drawRoom(r, opts);
    }
    if (c) {
      c.clearRect(0, 0, STAGE_W, STAGE_H);
      drawCounter(c, opts);
    }
  }, [opts]);

  const placed = placeCustomers(s);
  const open = s.phase === 'service';
  const ovenOn = baking || (s.phase === 'morning' && s.traysToday > 0);
  const trays = (Object.keys(s.display) as ProductId[]).filter((p) => s.display[p].qty > 0).slice(0, 4);
  const menu = onMenu(s);
  const clock = s.service?.clock ?? 0;
  const fx = s.service?.fx.filter((f) => clock - f.at < 8) ?? [];
  const rainy = s.market.weather === 'rainy';
  const diverted = s.service?.visits.filter((v) => v.divertedTo && v.status === 'done' && clock - (v.doneAt ?? 0) < 25) ?? [];

  return (
    <div className={`stage-wrap light-${light} ${open ? 'is-open' : ''} ${reduced ? 'still' : ''}`} ref={wrap} style={{ height: STAGE_H * scale }}>
      <div className="stage" style={{ transform: `translateX(${-120 * scale}px) scale(${scale})` }} aria-hidden="true">
        <canvas ref={roomRef} width={STAGE_W} height={STAGE_H} className="layer" />

        {/* street life through the window */}
        <div className="street" style={{ left: LAYOUT.window.x + 2, top: LAYOUT.window.y + 2, width: LAYOUT.window.w - 4, height: LAYOUT.window.h - 4 }}>
          {!reduced && (
            <>
              <div className="mover moto m1">
                <Sprite name={tet ? 'motoFlowers' : 'moto'} scale={1} />
              </div>
              {open && (
                <div className="mover moto m2 flip">
                  <Sprite name="moto" scale={1} />
                </div>
              )}
              <div className="mover walker w1">
                <Person look={{ skin: 2, hair: 3, hairColor: 1, shirt: 3, apron: -1, accessory: 0 }} scale={1} walking />
              </div>
              {diverted.slice(0, 2).map((v, i) => (
                <div key={v.id} className={`mover walker cross c${i}`}>
                  <Person look={v.look} scale={1} walking />
                </div>
              ))}
            </>
          )}
          {rainy && <div className="rain" />}
        </div>
        {rainy && <div className="rain door-rain" style={{ left: LAYOUT.door.x + 3, top: LAYOUT.door.y + 3, width: LAYOUT.door.w - 6, height: 24 }} />}


        {/* ceiling: lights, lanterns, fan, bird */}
        <div className="lamp" style={{ left: 66 }} />
        <div className="lamp" style={{ left: 138 }} />
        {s.decor.includes('stringLights') && (
          <div className="string-lights">
            {Array.from({ length: 18 }).map((_, i) => (
              <i key={i} style={{ left: 4 + i * 13, top: 7 + (i % 2) * 2, animationDelay: `${(i % 5) * 0.3}s` }} />
            ))}
          </div>
        )}
        {(s.decor.includes('lanterns') || tet) &&
          [44, 118, 222].map((x, i) => (
            <div key={x} className="sway" style={{ left: x, top: 6, animationDelay: `${i * 0.4}s` }}>
              <Sprite name={i === 1 && !tet ? 'lanternY' : 'lantern'} scale={1} />
            </div>
          ))}
        {s.upgrades.includes('fan') && (
          <div className="fan" style={{ left: 86, top: 6 }}>
            <Sprite name="fan" scale={1} />
          </div>
        )}
        {s.decor.includes('birdcage') && (
          <div className="sway" style={{ left: 11, top: 18 }}>
            <Sprite name="birdcage" scale={1} />
          </div>
        )}

        {/* oven and coffee */}
        <div className={`oven-fire ${baking ? 'hot' : ''} ${open || ovenOn ? 'on' : ''}`} style={{ left: LAYOUT.oven.x + 6, top: LAYOUT.oven.y + 15, width: LAYOUT.oven.w - 12, height: 18 }} />
        {(open || baking) && !reduced && (
          <div className="steam" style={{ left: LAYOUT.coffee.x + 4, top: LAYOUT.coffee.y - 16 }}>
            <i />
            <i />
            <i />
          </div>
        )}
        {(open || ovenOn) && !reduced && (
          <div className="steam chimney" style={{ left: LAYOUT.oven.x + 15, top: LAYOUT.oven.y - 22 }}>
            <i />
            <i />
          </div>
        )}

        {/* staff */}
        {s.staff.some((e) => e.branch === null && e.role === 'cashier') && (
          <div className="staff bob" style={{ left: LAYOUT.helper.x, top: LAYOUT.helper.feet - 19 }}>
            <Person look={{ skin: 1, hair: 1, hairColor: 6, shirt: 6, apron: 1, accessory: 5 }} scale={1} />
          </div>
        )}
        <div className={`staff player ${open ? 'bob' : ''}`} style={{ left: LAYOUT.player.x, top: LAYOUT.player.feet - 19 }}>
          <Person look={s.look} scale={1} />
        </div>

        <canvas ref={counterRef} width={STAGE_W} height={STAGE_H} className="layer" />

        {/* pastries in the glass case */}
        <div className="case" style={{ left: LAYOUT.case.x + 1, top: LAYOUT.case.y + 2 }}>
          {trays.map((p) => (
            <div key={p} className="case-item">
              <Sprite name={p} scale={1} className={s.display[p].fresh && s.display[p].fresh! >= s.day * 100 ? 'fresh' : ''} />
              <span className="case-count">{s.display[p].qty}</span>
            </div>
          ))}
        </div>
        {s.baguettes.qty > 0 && (
          <div className="basket" style={{ left: 208, top: 88 }}>
            <Sprite name="baguette" scale={1} />
          </div>
        )}

        {/* decorations on the floor */}
        {s.decor.includes('plant') && (
          <div className="sway slow" style={{ left: 28, top: 84 }}>
            <Sprite name="plant" scale={1} />
          </div>
        )}
        {(s.decor.includes('hoaMai') || tet) && (
          <div className="sway slow" style={{ left: 88, top: 84 }}>
            <Sprite name="hoaMai" scale={1} />
          </div>
        )}

        {/* customers */}
        {placed.map(({ v, x, walking, leaving }) => {
          const top = LAYOUT.queueY - 19;
          const waiting = v.status === 'waiting';
          const patience = waiting ? 1 - (clock - (v.waitStart ?? clock)) / v.patience : 1;
          return (
            <div key={v.id} className={`cust ${leaving ? 'leaving' : ''}`} style={{ left: x, top }}>
              <Person look={v.look} scale={1} walking={walking && !reduced} />
              {waiting && (
                <button type="button" tabIndex={-1} className={`bubble ${patience < 0.3 ? 'urgent' : ''}`} onClick={() => onCustomer?.(v)}>
                  <Sprite name={v.wants} scale={1} />
                  {v.qty > 1 && <b>×{v.qty}</b>}
                  <span className="patience" style={{ width: `${Math.max(0, patience) * 100}%` }} />
                </button>
              )}
              {leaving && v.mood && (
                <div className={`mood mood-${v.mood}`}>
                  <Sprite name={MOOD_FACE[v.mood]} scale={1} />
                </div>
              )}
            </div>
          );
        })}

        {/* coins and hearts */}
        {fx.map((f) => (
          <div key={f.id} className={`fx fx-${f.kind}`} style={{ left: f.kind === 'coin' ? LAYOUT.register.x : LAYOUT.queueX[0] + 4, top: LAYOUT.register.y - 6 }}>
            {f.kind === 'coin' && (
              <>
                <Sprite name="coin" scale={1} />
              </>
            )}
            {f.kind === 'heart' && <Sprite name="heart" scale={1} />}
            {f.kind === 'sparkle' &&
              [0, 1, 2, 3].map((i) => (
                <span key={i} className={`spark-fly s${i}`}>
                  <Sprite name="spark" scale={1} />
                </span>
              ))}
          </div>
        ))}

        <div className="lighting" />
      </div>

      {/* Text lives outside the scaled stage so browsers never shrink it below a readable size. */}
      <div className="stage-text" aria-hidden="true">
        {s.decor.includes('sign') && (
          <div className="neon" style={{ left: 64 * scale, top: 9 * scale, fontSize: Math.max(10, 5 * scale) }}>
            Bánh mì
          </div>
        )}
        <div className="board" style={{ left: (LAYOUT.board.x + 2) * scale, top: (LAYOUT.board.y + 1) * scale, width: (LAYOUT.board.w - 4) * scale, fontSize: Math.max(9, 4.6 * scale) }}>
          <div className="board-title">{tet ? 'Chúc Mừng Năm Mới' : 'Thực đơn'}</div>
          {menu.slice(0, 5).map((p) => (
            <div key={p} className="board-row">
              <span>{PRODUCTS[p].name.replace('Bánh ', 'B. ').replace('Hộp ', '')}</span>
              <span>{s.prices[p].toFixed(2)}</span>
            </div>
          ))}
        </div>
        {placed
          .filter(({ v, leaving }) => v.line && ((v.status === 'waiting' && clock - (v.waitStart ?? 0) < 14) || (leaving && clock - (v.doneAt ?? 0) < 7)))
          .slice(-2)
          .map(({ v, x }) => (
            <div key={v.id} className="say" style={{ left: (x + 6) * scale, top: (LAYOUT.queueY - 30) * scale }}>
              {v.status !== 'done' && (
                <span className="say-item">
                  <Sprite name={v.wants} scale={2} />
                  {v.qty > 1 && <b>×{v.qty}</b>}
                </span>
              )}
              {v.line}
              {prefs.translations && translate(v.line) && <em>{translate(v.line)}</em>}
            </div>
          ))}
        {fx
          .filter((f) => f.kind === 'coin' && f.amount !== undefined)
          .map((f) => (
            <div key={f.id} className="fx-amount" style={{ left: (LAYOUT.register.x + 7) * scale, top: (LAYOUT.register.y - 8) * scale }}>
              +{money2(f.amount!)}
            </div>
          ))}
      </div>
      {caption && <div className="stage-caption">{caption}</div>}
    </div>
  );
}
