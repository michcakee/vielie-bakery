import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CONFIG, PRODUCTS } from '../../data/catalog';
import { competitorOpen, isTet, onMenu } from '../../engine/economy';
import { lightPhase } from '../../engine/time';
import type { GameState, Look, Mood, ProductId, RoleId, TraitId, Visit } from '../../engine/types';
import { TRAITS } from '../../data/world';
import { useGame } from '../GameContext';
import { decorSpot } from '../../engine/state';
import { CAGE_SPOTS, drawCounter, drawRoom, FLOOR_SPOTS, LAMPS_X, LAYOUT, STAGE_H, STAGE_W, type Light, type SceneOpts } from '../pixel/scene';
import { PERSON_H } from '../pixel/render';
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

/** Bà's look: grey bun, glasses, green apron. */
export const BA_LOOK: Look = { skin: 1, hair: 1, hairColor: 6, shirt: 5, apron: 0, accessory: 1 };

/** Where each kind of worker stands when they aren't serving anyone (stage px; feet = bottom). */
const STATIONS: Record<RoleId | 'ba', { x: number; feet: number }> = {
  // Spread along the counter, in two rows so heads overlap as little as possible.
  manager: { x: 112, feet: 101 },
  cook: { x: 126, feet: 105 },
  ba: { x: 140, feet: 101 },
  helper: { x: 155, feet: 105 },
  barista: { x: 168, feet: 100 },
  cashier: { x: 200, feet: 106 },
  baker: { x: 216, feet: 102 },
  pastryChef: { x: 226, feet: 105 },
  marketer: { x: 34, feet: 110 },
  delivery: { x: 8, feet: 98 },
};

interface Worker {
  id: string;
  role: RoleId | 'ba';
  trait?: TraitId;
  look: Look;
  name: string;
  home: { x: number; feet: number };
  serving: Visit | null;
  busyUntil: number;
}

function workersOnShift(s: GameState): Worker[] {
  const svc = s.service;
  const slot = (id: string) => svc?.servers.find((x) => x.id === id);
  const visitOf = (id: string) => {
    const sl = slot(id);
    return sl && sl.visitId !== null ? (svc!.visits.find((v) => v.id === sl.visitId) ?? null) : null;
  };
  const out: Worker[] = s.staff
    .filter((e) => e.branch === null)
    .slice(0, 6)
    .map((e, i) => {
      const home = STATIONS[e.role] ?? STATIONS.helper;
      const id = `staff:${e.id}`;
      // two workers with the same job stand side by side
      const twin = s.staff.filter((x) => x.branch === null && x.role === e.role).findIndex((x) => x.id === e.id);
      return { id, role: e.role, trait: e.trait, look: e.look, name: e.name, home: { x: home.x - twin * 15 + (i % 2), feet: home.feet }, serving: visitOf(id), busyUntil: slot(id)?.busyUntil ?? 0 };
    });
  // "Bà, help!" (the owner slot) and Bà handing out pastries are the same Bà on screen.
  const ba = slot('owner') ?? slot('ba');
  if (ba) {
    const busy = [slot('owner'), slot('ba')].find((x) => x && x.visitId !== null);
    out.push({ id: 'ba', role: 'ba', look: BA_LOOK, name: 'Bà', home: STATIONS.ba, serving: busy ? visitOf(busy.id) : null, busyUntil: busy?.busyUntil ?? ba.busyUntil });
  }
  return out;
}

/** Now and then an idle worker says something in character. One line at a time. */
function staffChat(s: GameState): { slot: number; x: number; feet: number; line: { vi: string; en: string } } | null {
  const clock = s.service?.clock ?? 0;
  const slot = Math.floor(clock / 75);
  if (clock < 30 || clock - slot * 75 > 16) return null;
  const idle = workersOnShift(s).filter((w) => !w.serving && w.trait);
  if (!idle.length) return null;
  const w = idle[(slot + s.day) % idle.length];
  const lines = TRAITS[w.trait!].lines;
  // Early birds get sleepy after lunch.
  const line = w.trait === 'earlyBird' ? (clock >= 300 ? lines[2] : lines[(slot + s.day) % 2]) : lines[(slot + s.day) % lines.length];
  return { slot, x: w.home.x, feet: w.home.feet, line };
}

/**
 * Workers walk in through the door when the shop opens, wait at their station, and walk to the
 * counter to serve. Moves are timed by distance so nobody zooms across the room.
 */
function StaffLayer({ s, open, ovenOn, reduced }: { s: GameState; open: boolean; ovenOn: boolean; reduced: boolean }) {
  const clock = s.service?.clock ?? 0;
  const workers = workersOnShift(s);
  const started = useRef(new Map<string, { visit: number | null; clock: number }>());
  const motion = useRef(new Map<string, { x: number; at: number; dur: number }>());
  const [, redraw] = useState(0);
  // When the clock stands still (paused, closing up), redraw once a walk ends so feet stop moving.
  useEffect(() => {
    let left = 0;
    for (const m of motion.current.values()) left = Math.max(left, m.at + m.dur - performance.now());
    if (left <= 0) return;
    const id = setTimeout(() => redraw((n) => n + 1), left + 30);
    return () => clearTimeout(id);
  });
  const now = performance.now();
  let lane = 0;
  return (
    <>
      {workers.map((w, i) => {
        const vid = w.serving?.id ?? null;
        const prev = started.current.get(w.id);
        if (!prev || prev.visit !== vid) started.current.set(w.id, { visit: vid, clock });
        const st = started.current.get(w.id)!;
        const serving = open && w.serving;
        // Staggered arrival: the first few minutes of the day, each worker is still on the way in.
        const arriving = open && !serving && w.id !== 'ba' && clock < 4 + i * 5;
        const x = serving ? LAYOUT.queueX[0] + 6 - 17 * lane++ : arriving ? LAYOUT.doorX : w.home.x;
        const feet = serving ? 106 : w.home.feet;
        const m = motion.current.get(w.id);
        if (!m || m.x !== x) motion.current.set(w.id, { x, at: now, dur: !m || reduced || arriving ? 0 : Math.min(2400, 250 + Math.abs(x - m.x) * 12) });
        const mv = motion.current.get(w.id)!;
        const moving = now - mv.at < mv.dur;
        const span = Math.max(0.5, w.busyUntil - st.clock);
        const progress = serving ? Math.min(1, Math.max(0, (clock - st.clock) / span)) : 0;
        const baking = !serving && ovenOn && (w.role === 'baker' || w.role === 'pastryChef');
        return (
          <div
            key={w.id}
            className={`staff worker ${serving ? 'is-serving' : ''} ${baking ? 'is-baking' : ''} ${arriving ? 'is-away' : ''} ${!moving && (open || baking) ? 'bob' : ''}`}
            style={{ left: x, top: feet - PERSON_H, transitionDuration: `${mv.dur}ms` }}
          >
            <Person look={w.look} scale={1} walking={moving} />
            {serving && (
              <span className="making">
                <Sprite name={w.serving!.wants} scale={1} />
                <i style={{ width: `${progress * 100}%` }} />
              </span>
            )}
          </div>
        );
      })}
      <div className={`staff player ${open ? 'bob' : ''}`} style={{ left: LAYOUT.player.x, top: LAYOUT.player.feet - PERSON_H }}>
        <Person look={s.look} scale={1} />
      </div>
    </>
  );
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
    () => ({ weather: s.market.weather, light, decor: s.decor, upgrades: s.upgrades, tet, competitor: competitorOpen(s.day), style: s.style, prize: s.decor.includes('trophy') ? (s.story?.result ?? 'second') : undefined }),
    [s.market.weather, light, s.decor, s.upgrades, tet, s.day, s.style, s.story?.result],
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
  const chat = open && !reduced ? staffChat(s) : null;
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
              <div className="mover cat" aria-hidden="true">
                <Sprite name="cat" scale={1} />
              </div>
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
        {LAMPS_X.map((lx) => (
          <div key={lx} className="lamp" style={{ left: lx + 4 }} />
        ))}
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
          <div className="sway" style={{ left: CAGE_SPOTS[decorSpot(s.style, 'birdcage')], top: 18 }}>
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

        {/* staff: everyone on shift stands at their station and walks to the counter to serve */}
        <StaffLayer s={s} open={open} ovenOn={ovenOn} reduced={reduced} />

        <canvas ref={counterRef} width={STAGE_W} height={STAGE_H} className="layer" />

        {/* pastries in the glass case */}
        <div className="case" style={{ left: LAYOUT.case.x + 1, top: LAYOUT.case.y + 2 }}>
          {trays.map((p) => (
            <div key={p} className="case-item">
              <Sprite name={s.display[p].quality < 45 ? `${p}:burnt` : s.display[p].quality >= 95 ? `${p}:perfect` : p} scale={1} className={s.display[p].fresh && s.display[p].fresh! >= s.day * 100 ? 'fresh' : ''} />
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
          <div className="sway slow" style={{ left: FLOOR_SPOTS[decorSpot(s.style, 'plant')], top: 84 }}>
            <Sprite name="plant" scale={1} />
          </div>
        )}
        {(s.decor.includes('hoaMai') || tet) && (
          <div className="sway slow" style={{ left: FLOOR_SPOTS[s.decor.includes('hoaMai') ? decorSpot(s.style, 'hoaMai') : 2], top: 84 }}>
            <Sprite name="hoaMai" scale={1} />
          </div>
        )}

        {/* customers */}
        {placed.map(({ v, x, walking, leaving }) => {
          const top = LAYOUT.queueY - PERSON_H;
          const waiting = v.status === 'waiting';
          const patience = waiting ? 1 - (clock - (v.waitStart ?? clock)) / v.patience : 1;
          return (
            <div key={v.id} className={`cust ${leaving ? 'leaving' : ''} ${leaving && v.mood === 'love' ? 'hop' : ''}`} style={{ left: x, top }}>
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
      <div className="stage-text" aria-hidden="true" style={{ width: STAGE_W * scale, marginLeft: (-STAGE_W / 2) * scale }}>
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
        {/* One customer bubble at a time, kept inside the scene so it never covers the whole room. */}
        {placed
          .filter(({ v, leaving }) => v.line && ((v.status === 'waiting' && clock - (v.waitStart ?? 0) < 14) || (leaving && clock - (v.doneAt ?? 0) < 7)))
          .slice(-1)
          .map(({ v, x }) => (
            <div key={v.id} className="say" style={{ left: Math.max(84, Math.min(STAGE_W * scale - 84, (x + 8) * scale)), top: (LAYOUT.queueY - PERSON_H + 2) * scale }}>
              {v.status !== 'done' && (
                <span className="say-item">
                  <Sprite name={v.wants} scale={1} />
                  {v.qty > 1 && <b>×{v.qty}</b>}
                </span>
              )}
              {v.line}
            </div>
          ))}
        {chat && (
          <div key={`chat${chat.slot}`} className="say staff-say" style={{ left: Math.max(84, Math.min(STAGE_W * scale - 84, (chat.x + 8) * scale)), top: (chat.feet - PERSON_H + 2) * scale }}>
            {chat.line.vi}
            {prefs.translations && <em>{chat.line.en}</em>}
          </div>
        )}
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
