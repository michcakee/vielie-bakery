import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from '../../data/catalog';
import { competitorOpen, isTet, onMenu } from '../../engine/economy';
import { lightPhase } from '../../engine/time';
import type { GameState, Look, Mood, ProductId, RoleId, TraitId, Visit } from '../../engine/types';
import { TRAITS } from '../../data/world';
import { useGame } from '../GameContext';
import { decorSpot } from '../../engine/state';
import { CAGE_SPOTS, drawCounter, drawFront, drawRoom, drawWindowFront, FLOOR_SPOTS, LAMP_GLOW_Y, LAMPS_X, LAYOUT, seats, STAGE_H, STAGE_W, type Light, type SceneOpts } from '../pixel/scene';
import { PERSON_H } from '../pixel/render';
import { Person, Sprite } from '../pixel/Sprite';
import { money2 } from '../../lib/format';

/** Short English names that fit on the chalkboard. */
const BOARD_NAMES: Record<ProductId, string> = {
  banhMi: 'Banh mi',
  caPhe: 'Iced coffee',
  flan: 'Flan',
  michcake: 'Michcake',
  pateChaud: 'Meat pie',
  traTac: 'Kumquat tea',
  banhBao: 'Pork bun',
  banhChuoi: 'Banana cake',
  banhBo: 'Pandan cake',
  che: 'Bean dessert',
  banhKem: 'Party cake',
  mutDua: 'Coconut box',
  banhTrungThu: 'Mooncake',
  gressCupcake: 'Gress cupcake',
  gressTeaLight: 'Gress tea',
  gressOreo: 'Gress cookies',
  gressCoffee: 'Gress coffee',
  gressHoneycomb: 'Gress cake',
  gressBoba: 'Gress boba',
  gressPie: 'Apple pie',
  gressMilkshake: 'Milkshake',
  gressCrepe: 'Crepe cake',
  gressCake: 'Big Gress cake',
};

const MOOD_FACE: Record<Mood, string> = { love: 'heart', happy: 'star', ok: 'check', pricey: 'coin', sad: 'box', slow: 'clock', thinking: 'shop' };

export function sceneLight(s: GameState): Light {
  if (s.phase === 'closing' || s.phase === 'report' || s.phase === 'weekly') return 4;
  if (s.phase === 'service' && s.service) return lightPhase(s.service.clock) as Light;
  return 0;
}

interface Pt {
  x: number;
  y: number;
}
const P = (x: number, y: number): Pt => ({ x, y });

/** A point `p` (0..1) of the way along a path, and whether that stretch heads up the screen (away from you). */
function along(path: Pt[], p: number): Pt & { up: boolean } {
  const lens = path.slice(1).map((b, i) => Math.hypot(b.x - path[i].x, b.y - path[i].y));
  let d = Math.max(0, Math.min(1, p)) * (lens.reduce((a, b) => a + b, 0) || 1);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const t = lens[i] ? Math.min(1, d / lens[i]) : 1;
      const a = path[i];
      const b = path[i + 1];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, up: b.y < a.y - 0.5 };
    }
    d -= lens[i];
  }
  return { ...path[path.length - 1], up: false };
}

/** Happy customers sometimes stay for a while: minutes to walk to a table, sit, and walk out. */
const DINE = { walk: 8, sit: 40, out: 10 };
const DINE_TOTAL = DINE.walk + DINE.sit + DINE.out;

interface Placed extends Pt {
  v: Visit;
  /** Seen from behind (heading for the counter, or waiting at it). */
  back: boolean;
  walking: boolean;
  leaving: boolean;
  seated: boolean;
  /** Minutes at the table so far. */
  sat: number;
  /** Drawn in front of the tables. */
  front: boolean;
}

/** Where each visible customer is right now: feet position, which way they face, what they're doing. */
function placeCustomers(s: GameState): Placed[] {
  const svc = s.service;
  if (!svc) return [];
  const clock = svc.clock;
  const lane = LAYOUT.entry.y;
  const slot = (i: number) => P(LAYOUT.queueX[Math.min(i, 3)], LAYOUT.queueY);
  const door = P(LAYOUT.entry.x, STAGE_H + 16);
  const entry = P(LAYOUT.entry.x, lane);
  const base = { walking: false, leaving: false, seated: false, sat: 0, front: false };
  const waiting = svc.visits.filter((v) => v.status === 'waiting').sort((a, b) => (a.waitStart ?? 0) - (b.waitStart ?? 0) || a.id - b.id);
  const out: Placed[] = waiting.map((v, i) => ({ ...base, v, ...slot(i), back: true }));

  // Who stays to eat: happy customers take the first free chair, in the order they were served.
  const chairs = seats(s.upgrades.includes('corner'));
  const freeAt = chairs.map(() => -1);
  const chairOf = new Map<number, number>();
  const happy = svc.visits
    .filter((v) => v.status === 'done' && v.doneAt !== undefined && v.paid !== undefined && v.walkStart !== undefined && (v.mood === 'love' || v.mood === 'happy') && (v.id * 7 + s.day) % 5 < 3)
    .sort((a, b) => a.doneAt! - b.doneAt! || a.id - b.id);
  for (const v of happy) {
    const k = freeAt.findIndex((t) => t <= v.doneAt!);
    if (k < 0) continue;
    freeAt[k] = v.doneAt! + DINE_TOTAL;
    chairOf.set(v.id, k);
  }

  let freeSlot = waiting.length;
  for (const v of svc.visits) {
    if (v.status === 'walking') {
      const p = Math.min(1, (clock - (v.walkStart ?? v.arrive)) / CONFIG.walkMinutes);
      // When the queue is full, newcomers wait just inside the door.
      const target = freeSlot < 4 ? slot(freeSlot) : P(40, 138);
      freeSlot++;
      const at = along([door, entry, target], p);
      out.push({ ...base, v, x: at.x, y: at.y, back: true, walking: p < 1 });
    } else if (v.status === 'done' && v.doneAt !== undefined && v.mood && v.mood !== 'thinking' && v.walkStart !== undefined) {
      const t = clock - v.doneAt;
      const from = v.paid !== undefined ? slot(0) : slot(1);
      const k = chairOf.get(v.id);
      if (k !== undefined && t < DINE_TOTAL) {
        const chair = chairs[k];
        if (t < DINE.walk) {
          const at = along([from, P(from.x, lane), P(chair.x, lane), chair], t / DINE.walk);
          out.push({ ...base, v, x: at.x, y: at.y, back: false, walking: true, leaving: true, front: true });
        } else if (t < DINE.walk + DINE.sit) out.push({ ...base, v, ...chair, back: false, seated: true, sat: t - DINE.walk, front: true });
        else {
          const at = along([chair, P(chair.x, lane), P(entry.x + 4, lane), door], (t - DINE.walk - DINE.sit) / DINE.out);
          out.push({ ...base, v, x: at.x, y: at.y, back: at.up, walking: true, leaving: true, front: true });
        }
      } else if (t < 12) {
        const at = along([from, P(from.x - 6, lane), P(entry.x + 4, lane), door], t / 12);
        out.push({ ...base, v, x: at.x, y: at.y, back: false, walking: true, leaving: true });
      }
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

interface Station {
  x: number;
  feet: number;
  /** Faces the back wall while working here (the oven, the coffee corner). */
  back?: boolean;
}

/** Where each kind of worker stands when they aren't serving anyone (stage px; feet = bottom). */
const STATIONS: Record<RoleId | 'ba', Station> = {
  // along the service counter, left to right
  pastryChef: { x: 60, feet: LAYOUT.staffFeet },
  helper: { x: 82, feet: LAYOUT.staffFeet },
  ba: { x: 104, feet: LAYOUT.staffFeet },
  cook: { x: 124, feet: LAYOUT.staffFeet },
  cashier: { x: 144, feet: LAYOUT.staffFeet },
  // at the back wall
  barista: { x: 152, feet: 63, back: true },
  baker: { x: 187, feet: 66, back: true },
  // out on the shop floor, left of the counter
  manager: { x: 30, feet: 80 },
  marketer: { x: 36, feet: 98 },
  delivery: { x: 34, feet: 116 },
};
/** Where a worker from the back wall comes to serve, nearest the register first. */
const LANES = [124, 104, 82, 60];
/** Staff come in from the left, behind the counter. */
const STAFF_DOOR: Station = { x: 8, feet: 68 };

interface Worker {
  id: string;
  role: RoleId | 'ba';
  trait?: TraitId;
  look: Look;
  name: string;
  home: Station;
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
    .map((e) => {
      const home = STATIONS[e.role] ?? STATIONS.helper;
      const id = `staff:${e.id}`;
      // two workers with the same job stand side by side
      const twin = s.staff.filter((x) => x.branch === null && x.role === e.role).findIndex((x) => x.id === e.id);
      return { id, role: e.role, trait: e.trait, look: e.look, name: e.name, home: { ...home, x: home.x - twin * 18, feet: home.feet + (twin % 2) * 3 }, serving: visitOf(id), busyUntil: slot(id)?.busyUntil ?? 0 };
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
 * Workers come in when the shop opens, wait at their station, and serve from behind the counter.
 * Moves are timed by distance so nobody zooms across the room.
 */
function StaffLayer({ s, open, ovenOn, reduced }: { s: GameState; open: boolean; ovenOn: boolean; reduced: boolean }) {
  const clock = s.service?.clock ?? 0;
  const workers = workersOnShift(s);
  const started = useRef(new Map<string, { visit: number | null; clock: number }>());
  const motion = useRef(new Map<string, { x: number; y: number; at: number; dur: number }>());
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
        const atCounter = w.home.feet >= LAYOUT.staffFeet && w.home.x >= LAYOUT.counter.x;
        // Counter staff serve from where they stand; the barista comes over from the coffee corner.
        const spot: Station = serving ? (atCounter ? w.home : { x: LANES[lane++ % LANES.length], feet: LAYOUT.staffFeet }) : arriving ? STAFF_DOOR : w.home;
        const m = motion.current.get(w.id);
        if (!m || m.x !== spot.x || m.y !== spot.feet)
          motion.current.set(w.id, { x: spot.x, y: spot.feet, at: now, dur: !m || reduced || arriving ? 0 : Math.min(2400, 250 + (Math.abs(spot.x - m.x) + Math.abs(spot.feet - m.y)) * 12) });
        const mv = motion.current.get(w.id)!;
        const moving = now - mv.at < mv.dur;
        const span = Math.max(0.5, w.busyUntil - st.clock);
        const progress = serving ? Math.min(1, Math.max(0, (clock - st.clock) / span)) : 0;
        const baking = !serving && ovenOn && (w.role === 'baker' || w.role === 'pastryChef');
        return (
          <div
            key={w.id}
            className={`staff worker ${serving ? 'is-serving' : ''} ${baking ? 'is-baking' : ''} ${arriving ? 'is-away' : ''} ${!moving && (open || baking) ? 'bob' : ''}`}
            style={{ left: spot.x, top: spot.feet - PERSON_H, zIndex: spot.feet, transitionDuration: `${mv.dur}ms` }}
          >
            <Person look={w.look} scale={1} walking={moving} back={!!spot.back && !moving} />
            {serving && (
              <span className="making">
                <Sprite name={w.serving!.wants} scale={1} />
                <i style={{ width: `${progress * 100}%` }} />
              </span>
            )}
          </div>
        );
      })}
      <div className={`staff player ${open ? 'bob' : ''}`} style={{ left: LAYOUT.player.x, top: LAYOUT.player.feet - PERSON_H, zIndex: LAYOUT.player.feet }}>
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
  const frontRef = useRef<HTMLCanvasElement>(null);
  const windowRef = useRef<HTMLCanvasElement>(null);
  const scale = useStageScale(wrap);
  const light = sceneLight(s);
  const tet = isTet(s.day);
  const opts: SceneOpts = useMemo(
    () => ({ weather: s.market.weather, light, decor: s.decor, upgrades: s.upgrades, tet, competitor: competitorOpen(s.day), style: s.style, prize: s.decor.includes('trophy') ? (s.story?.result ?? 'second') : undefined }),
    [s.market.weather, light, s.decor, s.upgrades, tet, s.day, s.style, s.story?.result],
  );

  useEffect(() => {
    const layers: [React.RefObject<HTMLCanvasElement>, (ctx: CanvasRenderingContext2D, o: SceneOpts) => void][] = [
      [roomRef, drawRoom],
      [windowRef, drawWindowFront],
      [counterRef, drawCounter],
      [frontRef, drawFront],
    ];
    for (const [ref, draw] of layers) {
      const ctx = ref.current?.getContext('2d');
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, STAGE_W, STAGE_H);
      draw(ctx, opts);
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
  const plantSpot = decorSpot(s.style, 'plant');
  // During Tết the hoa mai is out for everyone; it takes a spot the plant isn't using.
  const maiSpot = s.decor.includes('hoaMai') ? decorSpot(s.style, 'hoaMai') : [2, 1, 0].find((i) => !s.decor.includes('plant') || i !== plantSpot)!;
  const sayAt = (x: number) => Math.max(84, Math.min(STAGE_W * scale - 84, (x + 8) * scale));

  const customer = ({ v, x, y, back, walking, leaving, seated, sat }: Placed) => {
    const waiting = v.status === 'waiting';
    const patience = waiting ? 1 - (clock - (v.waitStart ?? clock)) / v.patience : 1;
    return (
      <div key={v.id} className={`cust ${leaving ? 'leaving' : ''} ${leaving && v.mood === 'love' ? 'hop' : ''} ${seated ? 'seated' : ''}`} style={{ left: x, top: y - PERSON_H, zIndex: Math.round(y) }}>
        <Person look={v.look} scale={1} walking={walking && !reduced} back={back} />
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
        {seated && sat < 26 && v.mood && (
          <div className="bubble dine">
            <Sprite name={MOOD_FACE[v.mood]} scale={1} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`stage-wrap light-${light} ${open ? 'is-open' : ''} ${reduced ? 'still' : ''}`} ref={wrap} style={{ height: STAGE_H * scale }}>
      <div className="stage" style={{ transform: `translateX(${(-STAGE_W / 2) * scale}px) scale(${scale})` }} aria-hidden="true">
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
        {/* the frame, middle bar, sill and pots sit in front of everything outside */}
        <canvas ref={windowRef} width={STAGE_W} height={STAGE_H} className="layer" />

        {/* hanging things: lamp glow, string lights, lanterns, the fan, the songbird */}
        {LAMPS_X.map((lx) => (
          <div key={lx} className="lamp" style={{ left: lx + 4, top: LAMP_GLOW_Y }} />
        ))}
        {s.decor.includes('stringLights') && (
          <div className="string-lights">
            {Array.from({ length: 18 }).map((_, i) => (
              <i key={i} style={{ left: 8 + i * 13, top: 4 + (i % 2) * 2, animationDelay: `${(i % 5) * 0.3}s` }} />
            ))}
          </div>
        )}
        {(s.decor.includes('lanterns') || tet) &&
          [12, 44, 226].map((x, i) => (
            <div key={x} className="sway" style={{ left: x, top: 4, animationDelay: `${i * 0.4}s` }}>
              <Sprite name={i === 1 && !tet ? 'lanternY' : 'lantern'} scale={1} />
            </div>
          ))}
        {s.upgrades.includes('fan') && (
          <div className="fan" style={{ left: 112, top: -4 }}>
            <Sprite name="fan" scale={1} />
          </div>
        )}
        {s.decor.includes('birdcage') && (
          <div className="sway cage" style={{ left: CAGE_SPOTS[decorSpot(s.style, 'birdcage')].x, top: CAGE_SPOTS[decorSpot(s.style, 'birdcage')].y }}>
            <Sprite name="birdcage" scale={1} />
          </div>
        )}

        {/* oven and coffee */}
        <div className={`oven-fire ${baking ? 'hot' : ''} ${open || ovenOn ? 'on' : ''}`} style={{ left: LAYOUT.oven.x + 8, top: LAYOUT.oven.y + 14, width: LAYOUT.oven.w - 16, height: 19 }} />
        {(open || baking) && !reduced && (
          <div className="steam" style={{ left: LAYOUT.coffee.x, top: LAYOUT.coffee.y - 22 }}>
            <i />
            <i />
            <i />
          </div>
        )}

        {/* plants on the floor, behind anyone who walks past */}
        {s.decor.includes('plant') && (
          <div className="sway slow" style={{ left: FLOOR_SPOTS[plantSpot].x, top: FLOOR_SPOTS[plantSpot].y }}>
            <Sprite name="plant" scale={1} />
          </div>
        )}
        {(s.decor.includes('hoaMai') || tet) && (
          <div className="sway slow" style={{ left: FLOOR_SPOTS[maiSpot].x, top: FLOOR_SPOTS[maiSpot].y }}>
            <Sprite name="hoaMai" scale={1} />
          </div>
        )}

        {/* staff stand behind the counter, so the counter is drawn over their legs */}
        <div className="plane">
          <StaffLayer s={s} open={open} ovenOn={ovenOn} reduced={reduced} />
        </div>
        <canvas ref={counterRef} width={STAGE_W} height={STAGE_H} className="layer" />

        {/* pastries in the glass case, and the baguette basket on the counter */}
        <div className="case" style={{ left: LAYOUT.case.x + 2, top: LAYOUT.case.y + 1 }}>
          {trays.map((p) => (
            <div key={p} className="case-item">
              <Sprite name={s.display[p].quality < 45 ? `${p}:burnt` : s.display[p].quality >= 95 ? `${p}:perfect` : p} scale={1} className={s.display[p].fresh && s.display[p].fresh! >= s.day * 100 ? 'fresh' : ''} />
              <span className="case-count">{s.display[p].qty}</span>
            </div>
          ))}
        </div>
        {s.baguettes.qty > 0 && (
          <div className="basket" style={{ left: 130, top: 53 }}>
            <Sprite name="baguette" scale={1} />
          </div>
        )}

        {/* the queue and anyone walking; then the tables; then people sitting at them */}
        <div className="plane">{placed.filter((c) => !c.front).map(customer)}</div>
        <canvas ref={frontRef} width={STAGE_W} height={STAGE_H} className="layer" />
        <div className="plane">{placed.filter((c) => c.front).map(customer)}</div>

        {/* coins and hearts */}
        {fx.map((f) => (
          <div
            key={f.id}
            className={`fx fx-${f.kind}`}
            style={f.kind === 'coin' ? { left: LAYOUT.register.x + 3, top: LAYOUT.register.y - 8 } : { left: LAYOUT.queueX[0] + 4, top: LAYOUT.queueY - PERSON_H - 8 }}
          >
            {f.kind === 'coin' && <Sprite name="coin" scale={1} />}
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
          <div className="neon" style={{ left: (LAYOUT.window.x + 5) * scale, top: (LAYOUT.window.y + 3) * scale, fontSize: Math.max(9, 4.4 * scale) }}>
            Bánh mì
          </div>
        )}
        <div className="board" style={{ left: (LAYOUT.board.x + 2) * scale, top: (LAYOUT.board.y + 1) * scale, width: (LAYOUT.board.w - 4) * scale, fontSize: Math.max(9, 4.6 * scale) }}>
          <div className="board-title">{tet ? 'Happy New Year!' : 'Menu'}</div>
          {menu.slice(0, 4).map((p) => (
            <div key={p} className="board-row">
              <span>{BOARD_NAMES[p]}</span>
              <span>{s.prices[p].toFixed(2)}</span>
            </div>
          ))}
        </div>
        {/* One customer bubble at a time, kept inside the scene so it never covers the whole room. */}
        {placed
          .filter(({ v, leaving }) => v.line && ((v.status === 'waiting' && clock - (v.waitStart ?? 0) < 14) || (leaving && clock - (v.doneAt ?? 0) < 7)))
          .slice(-1)
          .map(({ v, x, y }) => (
            <div key={v.id} className="say" style={{ left: sayAt(x), top: (y - PERSON_H + 2) * scale }}>
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
          <div key={`chat${chat.slot}`} className="say staff-say" style={{ left: sayAt(chat.x), top: (chat.feet - PERSON_H + 2) * scale }}>
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
