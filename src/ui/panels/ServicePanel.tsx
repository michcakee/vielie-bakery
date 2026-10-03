import { useEffect, useMemo, useRef, useState } from 'react';
import { dailyGoal, salesToday, starsFor } from '../../engine/goals';
import { CONFIG, PRODUCTS } from '../../data/catalog';
import { effectivePrice, has, makeable, onMenu } from '../../engine/economy';
import { rngFor } from '../../engine/rng';
import { TWIST, twistLabel, twistSteps } from '../../engine/twists';
import { clockLabel } from '../../engine/time';
import type { ProductId, Visit } from '../../engine/types';
import { money, money2 } from '../../lib/format';
import { play } from '../audio';
import { useGame } from '../GameContext';
import { Btn } from '../kit';
import { Person, Sprite } from '../pixel/Sprite';
import { ChallengeChip } from '../Challenge';
import { tutorialOn } from '../Tutorial';

const STEP_ICON: Record<string, string> = {
  slice: 'knife',
  chaLua: 'chaLua',
  pickles: 'veg',
  herbs: 'leaf',
  sauce: 'chili',
  milk: 'condensed',
  phin: 'coffee',
  ice: 'ice',
  stir: 'spoon',
  tea: 'tea',
  kumquat: 'kumquat',
  sugar: 'sugar',
  blend: 'spoon',
  cream: 'cream',
};

export function stepsFor(p: ProductId, coffeeBar: boolean) {
  const steps = PRODUCTS[p].steps ?? [];
  return coffeeBar && PRODUCTS[p].kind === 'drink' ? steps.slice(0, -1) : steps;
}

/** Tap the steps in order to make a bánh mì or a drink. Mistakes lower quality a little. */
function Assembly({ visit, onDone, onCancel }: { visit: Visit; onDone: (process: number) => void; onCancel: () => void }) {
  const { state: s, reduced } = useGame();
  const p = visit.wants;
  const base = useMemo(() => stepsFor(p, has(s, 'coffeeBar')), [p, s.upgrades]);
  const twist = visit.twist;
  // What to tap for this customer: a "no chili" order leaves a step out, an "extra" order does one twice.
  const steps = useMemo(() => twistSteps(base, twist), [base, twist]);
  // Ingredients sit in the same spot every time, like bins on a real counter, so hands learn where to go.
  const order = useMemo(() => {
    let seed = 0;
    for (const ch of p) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
    const r = rngFor(seed, 0, 3);
    return [...base].sort(() => r() - 0.5);
  }, [base, p]);
  const [done, setDone] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [shake, setShake] = useState<string | null>(null);
  const [oops, setOops] = useState<string | null>(null);
  const hints = s.day <= 7 || mistakes > 0;
  const finished = done >= steps.length;

  useEffect(() => {
    if (!finished) return;
    play(mistakes === 0 ? 'sparkle' : 'pop');
    const t = window.setTimeout(() => onDone(Math.max(40, 100 - mistakes * 15)), reduced ? 50 : 380);
    return () => window.clearTimeout(t);
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (id: string) => {
    if (finished) return;
    if (steps[done].id === id) {
      play(id === 'slice' ? 'chop' : id === 'phin' || id === 'tea' || id === 'milk' ? 'pour' : 'plop');
      setDone(done + 1);
    } else {
      play('oops');
      setMistakes(mistakes + 1);
      setShake(id);
      const left = twist?.kind === 'skip' && twist.step === id;
      setOops(left ? `${visit.name} said: ${twistLabel(twist!).toLowerCase()}! Next: ${steps[done].label}` : `Not yet! Next: ${steps[done].label}`);
      window.setTimeout(() => setShake(null), 300);
    }
  };

  /** A button is used up once every tap it's needed for is done (never, for a left-out step). */
  const used = (id: string) => {
    const lastAt = steps.map((x) => x.id).lastIndexOf(id);
    return lastAt !== -1 && lastAt < done;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= order.length) tap(order[n - 1].id);
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="assembly" role="group" aria-label={`Making ${PRODUCTS[p].name} for ${visit.name}`}>
      <div className="ticket">
        <div className="ticket-head">
          <Sprite name={p} scale={3} />
          <div>
            <b>{PRODUCTS[p].name}</b>
            <span>for {visit.name}</span>
          </div>
        </div>
        {twist && (
          <p className={`twist-note twist-${twist.kind}`}>
            <Sprite name={twist.kind === 'rush' ? 'clock' : 'bell'} scale={2} /> <b>{twistLabel(twist)}!</b> <span className="small">+{money2(twist.kind === 'rush' ? TWIST.rushTip : TWIST.tip)} tip if you {twist.kind === 'rush' ? 'are quick' : 'get it right'}</span>
          </p>
        )}
        <ol>
          {steps.map((st, i) => (
            <li key={`${st.id}${i}`} className={i < done ? 'done' : i === done ? 'now' : ''}>
              {i < done ? <Sprite name="check" scale={2} /> : <span className="num">{i + 1}</span>}
              <Sprite name={STEP_ICON[st.id] ?? 'box'} scale={2} />
              <span>{st.label}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className={`board-build ${finished ? 'finished' : ''} ${finished && mistakes === 0 ? 'perfect' : ''}`}>
        <div className="build-stack" aria-live="polite">
          {finished ? (
            <span className="build-final">
              <Sprite name={p} scale={5} />
              <span className="sparkles" />
            </span>
          ) : (
            steps.slice(0, done).map((st, i) => (
              <span key={`${st.id}${i}`} className="build-layer" style={{ ['--i' as string]: i }}>
                <Sprite name={STEP_ICON[st.id] ?? 'box'} scale={3} />
              </span>
            ))
          )}
        </div>
        <div className="step-buttons">
          {order.map((st, i) => (
            <button
              key={st.id}
              type="button"
              className={`step-btn ${hints && !finished && steps[done]?.id === st.id ? 'glow' : ''} ${shake === st.id ? 'shake' : ''} ${used(st.id) ? 'used' : ''} ${twist?.kind === 'skip' && twist.step === st.id ? 'left-out' : ''}`}
              onClick={() => tap(st.id)}
              disabled={finished || used(st.id)}
            >
              <kbd>{i + 1}</kbd>
              <Sprite name={STEP_ICON[st.id] ?? 'box'} scale={3} />
              <span>{st.label}</span>
            </button>
          ))}
        </div>
        {oops && !finished && (
          <p className="assembly-oops" role="status">
            {oops}
          </p>
        )}
        <button type="button" className="link-btn put-down" onClick={onCancel}>
          Put it down
        </button>
      </div>
    </div>
  );
}

/** Shown for a moment after the player serves someone: stars, the three parts of the score, the tip. */
function GradeCard({ visit }: { visit: Visit }) {
  const g = visit.grade!;
  useEffect(() => {
    if (g.stars >= 4) play('chirp');
    else if (g.stars <= 2) play('sad');
  }, [g.stars]);
  const word = g.stars === 5 ? 'PERFECT!' : g.stars === 4 ? 'Great' : g.stars === 3 ? 'Good' : g.stars === 2 ? 'Hmm' : 'Oh no';
  return (
    <div className={`grade-card stars-${g.stars}`} role="status" aria-label={`${visit.name}: ${g.score} out of 100, ${g.stars} stars${g.tip ? `, tip ${money2(g.tip)}` : ''}`}>
      <div className="grade-stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= g.stars ? 'lit' : ''}>
            <Sprite name="star" scale={2} />
          </span>
        ))}
      </div>
      <b className="grade-word">{word}</b>
      <span className="grade-who">
        {visit.name} · {g.score}/100
      </span>
      <ul className="grade-parts" aria-hidden="true">
        {[
          ['Accuracy', g.accuracy],
          ['Speed', g.speed],
          ['Quality', g.quality],
        ].map(([label, v]) => (
          <li key={label as string}>
            <span>{label}</span>
            <i style={{ width: `${v}%` }} />
          </li>
        ))}
      </ul>
      {(g.tip > 0 || visit.twistTip) && <em className="grade-tip">+{money2(visit.tip ?? g.tip)} tip</em>}
      {visit.twistTip ? <span className="grade-who">Just how they asked!</span> : null}
    </div>
  );
}

/** Today's 3-star goal, filling up as you sell. */
export function GoalMeter({ compact = false }: { compact?: boolean }) {
  const { state: s } = useGame();
  const goal = s.today.goal ?? dailyGoal(s);
  const sales = salesToday(s);
  const stars = starsFor(sales, goal);
  const pct = Math.min(1, sales / goal[2]);
  const prev = useRef(stars);
  useEffect(() => {
    if (stars > prev.current) play('sparkle');
    prev.current = stars;
  }, [stars]);
  return (
    <div className={`goal-meter ${compact ? 'compact' : ''}`} role="img" aria-label={`Today's goal: ${stars} of 3 stars. Sales ${money2(sales)}; next star at ${money2(goal[Math.min(2, stars)])}`}>
      <div className="goal-bar">
        <i style={{ width: `${pct * 100}%` }} />
        {goal.map((g, i) => (
          <span key={i} className={`goal-star ${sales >= g ? 'lit' : ''}`} style={{ left: `${(g / goal[2]) * 100}%` }}>
            <Sprite name="star" scale={2} />
          </span>
        ))}
      </div>
      <span className="goal-text">
        {stars === 3 ? '3 stars! Amazing day!' : `${money(sales)} / ${money(goal[stars])} for ${stars === 0 ? 'your first star' : `star ${stars + 1}`}`}
        {s.today.lostSlow > 0 && (
          <span className="lost-chip" role="status" aria-label={`${s.today.lostSlow} customers gave up waiting`}>
            <Sprite name="faceWorried" scale={2} /> {s.today.lostSlow} left
          </span>
        )}
      </span>
    </div>
  );
}

export function ServicePanel({ paused, setPaused, speed, setSpeed, activeId, setActiveId }: { paused: boolean; setPaused: (p: boolean) => void; speed: number; setSpeed: (n: number) => void; activeId: number | null; setActiveId: (id: number | null) => void }) {
  const { state: s, dispatch } = useGame();
  const svc = s.service!;
  const waiting = svc.visits.filter((v) => v.status === 'waiting' && (!v.servedBy || v.servedBy === 'player')).sort((a, b) => (a.waitStart ?? 0) - (b.waitStart ?? 0));
  const active = waiting.find((v) => v.id === activeId) ?? null;
  const coming = svc.visits.filter((v) => v.status === 'walking').length;
  const pct = svc.clock / CONFIG.dayMinutes;
  const canLastCall = svc.clock >= CONFIG.lastCallAt - 60;
  const menu = onMenu(s);
  // The most recent order the player served, graded, for a couple of seconds. Effects are numbered in
  // serve order, so the newest coin effect names the newest serve (the clock can't: it stands still while paused).
  const lastCoin = [...svc.fx].reverse().find((f) => f.kind === 'coin' && f.visitId !== undefined && svc.clock - f.at < 14);
  const graded = lastCoin ? svc.visits.find((v) => v.id === lastCoin.visitId && v.status === 'done' && v.grade && v.servedBy === 'player') : undefined;

  // After the first customer, Bà points out that she can take the counter (once per game).
  const baTip = s.allUnlocked === false && s.lifetime.served >= 1 && !svc.auto && !s.hints.includes('baHelpTip') && !tutorialOn(s);

  useEffect(() => {
    if (activeId !== null && !active) setActiveId(null);
  }, [activeId, active, setActiveId]);

  const pick = (v: Visit) => {
    if (PRODUCTS[v.wants].kind === 'tray') {
      play('coin');
      dispatch({ type: 'serve', visitId: v.id });
    } else {
      play('pop');
      // Starting an order reserves it: nobody else takes it while you build it.
      dispatch({ type: 'claim', visitId: v.id });
      setActiveId(v.id);
    }
  };

  useEffect(() => {
    if (active) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= waiting.length && !(e.target instanceof HTMLInputElement)) pick(waiting[n - 1]);
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        setPaused(!paused);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="service">
      <div className="day-track" aria-label={`Shop open, ${clockLabel(svc.clock)}`}>
        <div className="day-fill" style={{ width: `${pct * 100}%` }} />
        <span style={{ left: '0%' }}>7am rush</span>
        <span style={{ left: '33%' }}>Lunch</span>
        <span style={{ left: '58%' }}>Afternoon</span>
        <span style={{ left: '84%' }}>Last call</span>
      </div>
      <GoalMeter />
      <ChallengeChip compact />
      <div className="service-controls">
        <Btn kind="ghost" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume' : 'Pause'} aria-pressed={paused}>
          <Sprite name={paused ? 'playIcon' : 'pause'} scale={2} /> <span className="btn-text">{paused ? 'Resume' : 'Pause'}</span>
        </Btn>
        <Btn kind="ghost" onClick={() => setSpeed(speed === 1 ? 2 : 1)} aria-pressed={speed === 2} aria-label={speed === 2 ? 'Fast speed' : 'Normal speed'}>
          <Sprite name="fast" scale={2} /> <span className="btn-text">{speed === 2 ? 'Fast' : 'Normal'}</span>
        </Btn>
        <Btn
          kind={svc.auto ? 'primary' : 'go'}
          className={`ba-help-btn ${baTip ? 'glow' : ''}`}
          data-spot="ba-help"
          aria-pressed={svc.auto}
          title={svc.auto ? 'Take the counter back' : 'Bà serves everyone for you; tap again to take over'}
          onClick={() => {
            dispatch({ type: svc.auto ? 'takeBack' : 'handOver' });
            if (!s.hints.includes('baHelpTip')) dispatch({ type: 'hint', id: 'baHelpTip' });
          }}
        >
          {svc.auto ? 'I’ll serve' : 'Bà, help!'}
          {!svc.auto && <span className="btn-sub">no tips · no XP</span>}
        </Btn>
        <Btn kind={svc.lastCall ? 'primary' : 'plain'} disabled={!canLastCall} onClick={() => dispatch({ type: 'lastCall', on: !svc.lastCall })} aria-pressed={svc.lastCall} title="Pastries 40% off for the last hour">
          {svc.lastCall ? 'LAST CALL! −40%' : canLastCall ? 'Last call' : 'Last call 5pm'}
        </Btn>
        <details className="svc-more">
          <summary>More</summary>
          <div className="svc-more-items">
            {s.staff.length > 0 && !svc.auto && (
              <Btn kind="ghost" onClick={() => dispatch({ type: 'setStaffMode', mode: (s.staffMode ?? 'help') === 'help' ? 'all' : 'help' })} title="Who takes new orders">
                {(s.staffMode ?? 'help') === 'help' ? 'Team: take every order' : 'Team: leave orders for me'}
              </Btn>
            )}
            <Btn kind="ghost" onClick={() => dispatch({ type: 'skipToClose' })} title="Finish the day instantly">
              Skip to closing
            </Btn>
            <Btn kind="ghost" onClick={() => dispatch({ type: 'closeEarly' })} sfx="bell">
              Close up now
            </Btn>
          </div>
        </details>
      </div>

      {active ? (
        <Assembly
          key={active.id}
          visit={active}
          onCancel={() => {
            dispatch({ type: 'claim', visitId: active.id, release: true });
            setActiveId(null);
          }}
          onDone={(process) => {
            dispatch({ type: 'serve', visitId: active.id, process });
            play('coin');
            setActiveId(null);
          }}
        />
      ) : (
        <div className="orders" aria-live="polite">
          {graded && <GradeCard key={graded.id} visit={graded} />}
          {baTip && (
            <div className="coach-tip" role="note">
              <p>
                <b>Busy?</b> Tap <b>Bà, help!</b> and Bà serves everyone for you. Tap <b>I’ll serve</b> to jump back in. On a slow day, <b>Skip to closing</b> under More finishes the day for you.
              </p>
              <button type="button" className="link-btn" onClick={() => dispatch({ type: 'hint', id: 'baHelpTip' })}>
                Got it
              </button>
            </div>
          )}
          {svc.auto && (
            <p className="ba-helps small">
              <Sprite name="heart" scale={2} /> Bà is running the counter: her orders earn <b>no tips and no XP</b>. Tap any order below to jump in, or tap <b>I’ll serve</b>.
            </p>
          )}
          {svc.servers.some((x) => x.id === 'ba') && !svc.auto && s.day <= 10 && (
            <p className="ba-helps small">
              <Sprite name="flan" scale={2} /> Bà is handing out the pastries. You make the bánh mì and drinks!
            </p>
          )}
          <h3 className="orders-title">
            At the counter {coming > 0 && <span className="muted">· {coming} walking in</span>}
          </h3>
          {waiting.length === 0 ? (
            <p className="empty-line">{svc.clock < 20 ? 'Doors open! The street is waking up…' : 'No one waiting. The cash register is taking a breather.'}</p>
          ) : (
            <ul>
              {waiting.map((v, i) => {
                const patience = 1 - (svc.clock - (v.waitStart ?? svc.clock)) / v.patience;
                const tray = PRODUCTS[v.wants].kind === 'tray';
                return (
                  <li key={v.id}>
                    <button type="button" className={`order ${patience < 0.3 ? 'urgent' : ''}`} onClick={() => pick(v)}>
                      <kbd>{i + 1}</kbd>
                      <Person look={v.look} scale={2} />
                      <span className="order-who">
                        <b>
                          {v.name}
                          {v.specialOrder && <span className="special-tag">big order · big tip</span>}
                          {v.critic && <span className="special-tag critic">critic</span>}
                          {v.twist && <span className={`special-tag twist twist-${v.twist.kind}`}>{twistLabel(v.twist)}</span>}
                        </b>
                        <span>{v.line}</span>
                      </span>
                      <span className="order-what">
                        <Sprite name={v.wants} scale={2} />
                        {v.qty > 1 && <b>×{v.qty}</b>}
                        <span>{money2(effectivePrice(s, v.wants) * v.qty)}</span>
                      </span>
                      <span className="order-act">{tray ? 'Hand over' : 'Make it'}</span>
                      <span className={`patience-face ${patience < 0.3 ? 'worried' : ''}`} role="img" aria-label={`${v.name} is ${patience < 0.3 ? 'getting impatient' : patience < 0.6 ? 'waiting' : 'happy to wait'}`}>
                        <Sprite name={patience < 0.3 ? 'faceWorried' : patience < 0.6 ? 'faceOk' : 'faceHappy'} scale={3} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="stock-strip" aria-label="What's left">
        {menu.map((p) => {
          const n = PRODUCTS[p].kind === 'tray' ? s.display[p].qty : makeable(s, p);
          return (
            <span key={p} className={`stock-chip ${n === 0 ? 'out' : n < 4 ? 'low' : ''}`} title={PRODUCTS[p].name}>
              <Sprite name={PRODUCTS[p].kind === 'tray' && n > 0 && s.display[p].quality < 45 ? `${p}:burnt` : p} scale={2} />
              <b>{n}</b>
              {n === 0 && <span className="sr-only">sold out</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}
