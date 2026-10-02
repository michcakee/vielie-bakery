import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LEVELS, PRODUCTS, WEATHER } from '../data/catalog';
import { EVENTS } from '../engine/events';
import { ACHIEVEMENTS, activeQuests, goalMet, nextUnlock, QUESTS, WEEKLY_GOALS } from '../engine/progression';
import { keepsOvernight } from '../engine/service';
import type { LeftoverChoice, ProductId } from '../engine/types';
import { money, money2, pct, signedMoney } from '../lib/format';
import { play } from './audio';
import { onBack } from './backButton';
import { useGame } from './GameContext';
import { Btn, Meter, useTween } from './kit';
import { Sprite } from './pixel/Sprite';

export function Modal({ children, label, onClose, className = '' }: { children: ReactNode; label: string; onClose?: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // The Android back button (and any other back source) closes the newest modal first.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(
    () =>
      onBack(() => {
        if (!closeRef.current) return true; // a decision is required: swallow back instead of leaving the screen
        closeRef.current();
        return true;
      }),
    [],
  );
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('button, [href], input, select, textarea');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
      if (e.key === 'Tab' && ref.current) {
        const els = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea')];
        if (!els.length) return;
        const [a, b] = [els[0], els[els.length - 1]];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={label} ref={ref}>
        {onClose && (
          <button type="button" className="modal-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- morning news

export function EventCard() {
  const { state: s, dispatch } = useGame();
  const ev = s.events[0];
  if (!ev || s.phase !== 'morning') return null;
  const def = EVENTS[ev.id];
  return (
    <Modal label={def.title} className="event">
      <div className="event-head">
        <span className="event-icon">
          <Sprite name={def.icon === 'egg' ? 'egg' : def.icon === 'coffee' ? 'caPhe' : def.icon} scale={4} />
        </span>
        <div>
          <span className="eyebrow" lang="vi">
            {def.vi}
          </span>
          <h2>{def.title}</h2>
        </div>
      </div>
      <p className="event-text">{def.text(s)}</p>
      <div className="event-choices">
        {def.choices(s).map((c) => {
          const ok = (!c.enabled || c.enabled(s)) && (c.cost === undefined || (c.fromFund ? s.safetyFund >= c.cost : s.cash >= c.cost));
          return (
            <button key={c.id} type="button" className="choice" disabled={!ok} onClick={() => (play('pop'), dispatch({ type: 'resolveEvent', choice: c.id }))}>
              <b>{c.label}</b>
              <span>{c.detail}</span>
              {!ok && <em>{c.cost !== undefined ? 'Not enough money' : 'Not possible right now'}</em>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- closing

export function ClosingPanel() {
  const { state: s, dispatch } = useGame();
  const keys = (Object.keys(s.leftoverPlan) as (ProductId | 'baguette')[]).filter((k) => (k === 'baguette' ? s.baguettes.qty : s.display[k].qty) > 0);
  return (
    <div className="closing">
      <h2 className="closing-title">
        <span lang="vi">Đóng cửa!</span> Time to close up
      </h2>
      {keys.length === 0 ? (
        <p className="zero-waste">
          <Sprite name="leaf" scale={3} /> Nothing left over. Zero waste!
        </p>
      ) : (
        <>
          <p className="small">Some food is left. What should happen to it?</p>
          <ul className="leftovers">
            {keys.map((k) => {
              const st = k === 'baguette' ? s.baguettes : s.display[k];
              const name = k === 'baguette' ? 'Baguettes' : PRODUCTS[k].name;
              const canKeep = k !== 'baguette' && keepsOvernight(s, k);
              const choice = s.leftoverPlan[k];
              const pick = (c: LeftoverChoice) => (play('click'), dispatch({ type: 'leftover', key: k, choice: c }));
              return (
                <li key={k}>
                  <Sprite name={k} scale={3} />
                  <span className="lo-name">
                    <b>
                      {st.qty} {name}
                    </b>
                    <span className="small muted">
                      cost {money2(st.qty * st.unitCost)} to make{k !== 'baguette' && ` · could have sold for ${money2(st.qty * s.prices[k])}`}
                    </span>
                  </span>
                  <span className="seg" role="radiogroup" aria-label={`What to do with ${name}`}>
                    {canKeep && (
                      <button type="button" role="radio" aria-checked={choice === 'keep'} className={choice === 'keep' ? 'on' : ''} onClick={() => pick('keep')}>
                        Keep for tomorrow
                      </button>
                    )}
                    <button type="button" role="radio" aria-checked={choice === 'donate'} className={choice === 'donate' ? 'on' : ''} onClick={() => pick('donate')}>
                      Donate
                    </button>
                    <button type="button" role="radio" aria-checked={choice === 'bin'} className={choice === 'bin' ? 'on' : ''} onClick={() => pick('bin')}>
                      Bin it
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="muted small">Donating helps the neighbourhood (community and reputation go up). Binning is waste: it lowers your eco score. Either way, the money spent making it is gone.</p>
        </>
      )}
      <Btn kind="go" className="big" onClick={() => dispatch({ type: 'finishDay' })} sfx="bell">
        Turn off the lights
      </Btn>
    </div>
  );
}

// ---------------------------------------------------------------- report

function Count({ value, prefix = '', signed = false, digits = 2 }: { value: number; prefix?: string; signed?: boolean; digits?: number }) {
  const { reduced } = useGame();
  const v = useTween(value, 900, reduced);
  return <>{signed ? signedMoney(v, digits) : prefix + money(v, digits)}</>;
}

export function DayReport() {
  const { state: s, dispatch } = useGame();
  const r = s.lastReport;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (s.phase === 'report' && !shown) {
      play(r && r.profit > 0 ? 'level' : 'ding');
      setShown(true);
    }
  }, [s.phase, shown, r]);
  if (s.phase !== 'report' || !r) return null;
  const t = r.stats;
  const made = Object.values(t.made).reduce((a, b) => a + b, 0);
  const waste = made ? t.wasteUnits / made : 0;
  const leveled = r.levelAfter > r.levelBefore;
  const mood = r.profit > 40 ? 'LOOK AT THAT!' : r.profit > 0 ? 'Ngon quá! A good day.' : r.profit > -10 ? 'Phew. Close one.' : 'Uh oh… the bakery wallet is feeling a little empty.';
  return (
    <Modal label={`Day ${r.day} report`} className="report">
      <div className="report-head">
        <span className="eyebrow">Day {r.day}</span>
        <h2>BAKERY CLOSED!</h2>
        <p className="report-mood">{mood}</p>
      </div>
      {leveled && (
        <div className="level-up">
          <Sprite name="crown" scale={4} />
          <div>
            <b>LEVEL {r.levelAfter}!</b>
            <span>{LEVELS[r.levelAfter - 1].name}</span>
          </div>
          <span className="confetti" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => (
              <i key={i} style={{ ['--i' as string]: i }} />
            ))}
          </span>
        </div>
      )}
      <div className="report-nums">
        <div className="num pos">
          <span>Today's sales</span>
          <b>
            <Count value={t.revenue + t.tips} prefix="+" />
          </b>
        </div>
        <div className="num neg">
          <span>What we spent</span>
          <b>
            −<Count value={r.expenses} />
          </b>
        </div>
        <div className={`num big ${r.profit >= 0 ? 'pos' : 'neg'}`}>
          <span>What the bakery made</span>
          <b>
            <Count value={r.profit} signed />
          </b>
        </div>
      </div>
      <div className="report-mini">
        <span>
          <Sprite name="people" scale={2} /> {t.served} served of {t.customers}
        </span>
        <span>
          <Sprite name="trash" scale={2} /> Waste {pct(waste)}
        </span>
        <span>
          <Sprite name="leaf" scale={2} /> Eco {r.ecoBefore} → {r.ecoAfter}
        </span>
        <span>
          <Sprite name="heart" scale={2} /> {t.love} loved it
        </span>
          {t.bestOrder && (
            <span>
              <Sprite name="star" scale={2} /> best order {t.bestOrder.score}/100: {PRODUCTS[t.bestOrder.product].name} for {t.bestOrder.name}
            </span>
          )}
        <span>
          <Sprite name="people" scale={2} /> Community {r.communityDelta >= 0 ? '+' : '−'}
          {Math.abs(Math.round(r.communityDelta * 10) / 10)}
        </span>
      </div>
      <ul className="recap">
        {r.recap.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="biz-tip">
        <b>Little business tip</b>
        <p>{r.tip}</p>
      </div>
      <p className="small muted cash-line">
        Cash {money2(r.cashBefore)} → {money2(r.cashAfter)}
        {r.loanPaid > 0 && ` · paid ${money2(r.loanPaid)} on your loan`}
        {r.savedToFund > 0 && ` · saved ${money2(r.savedToFund)} to the safety fund`}. Stocking up and upgrades come out of cash but aren't counted as today's costs: they're things the bakery still owns.
      </p>
      <p className="small tomorrow">
        Tomorrow: <b>{WEATHER[s.market.tomorrow].name}</b>. {WEATHER[s.market.tomorrow].tip}
      </p>
      {(() => {
        const n = nextUnlock(s);
        return (
          <div className="report-next">
            <span className="small">
              {n.tomorrow ? 'Tomorrow: ' : 'Next up: '}
              <b>{n.text}</b>
              {!n.tomorrow && n.when && ` (${n.when})`}
            </span>
            <Meter value={n.pct} tone="xp" label={`Progress to the next unlock: ${Math.round(n.pct * 100)}%`} />
          </div>
        );
      })()}
      <Btn kind="go" className="big" onClick={() => dispatch({ type: 'nextDay' })} sfx="pop">
        {s.day % 7 === 0 ? 'See the week' : 'Sleep. Tomorrow is a new day'}
      </Btn>
    </Modal>
  );
}

export function WeeklyReview() {
  const { state: s, dispatch } = useGame();
  if (s.phase !== 'weekly') return null;
  const week = s.history.slice(-7);
  const prev = s.history.slice(-14, -7);
  const sum = (arr: typeof week, f: (h: (typeof week)[number]) => number) => arr.reduce((a, h) => a + f(h), 0);
  const profit = sum(week, (h) => h.profit);
  const served = sum(week, (h) => h.served);
  const prevServed = sum(prev, (h) => h.served);
  const trend = prev.length ? (served - prevServed) / Math.max(1, prevServed) : 0;
  return (
    <Modal label="Weekly review" className="weekly">
      <span className="eyebrow">Week {Math.ceil(s.day / 7)}</span>
      <h2>What a week!</h2>
      <div className="report-nums">
        <div className="num">
          <span>Customers served</span>
          <b>{served}</b>
          {prev.length > 0 && <em className={trend >= 0 ? 'pos' : 'neg'}>{trend >= 0 ? '▲' : '▼'} {pct(Math.abs(trend))} vs last week</em>}
        </div>
        <div className={`num ${profit >= 0 ? 'pos' : 'neg'}`}>
          <span>What the bakery made</span>
          <b>{signedMoney(profit)}</b>
        </div>
        <div className="num">
          <span>Cash + safety fund</span>
          <b>{money(s.cash + s.safetyFund)}</b>
        </div>
      </div>
      <p className="small">{trend > 0.05 ? 'Word is spreading: more people are finding your bakery.' : trend < -0.05 ? 'A quieter week. Happy customers bring friends; long queues and sold-out shelves send them away.' : 'A steady week on the lane.'}</p>
      <h3>Pick a goal for next week</h3>
      <div className="event-choices">
        {s.goalChoices.map((id) => {
          const g = WEEKLY_GOALS[id];
          return (
            <button key={id} type="button" className="choice" onClick={() => (play('pop'), dispatch({ type: 'pickGoal', id }))}>
              <b>{g.title}</b>
              <span>{g.text(g.target(s))}</span>
              <em className="reward">Reward: $40 and bonus XP</em>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- toasts

export function Toasts() {
  const { state: s, dispatch } = useGame();
  const t = s.toasts[0];
  useEffect(() => {
    if (!t) return;
    play(t.kind === 'level' || t.kind === 'unlock' ? 'level' : t.kind === 'info' ? 'ding' : 'sparkle');
    const ms = s.toasts.length > 2 ? 1400 : t.kind === 'level' || t.kind === 'unlock' ? 4200 : 2800;
    const id = window.setTimeout(() => dispatch({ type: 'dismissToast', id: t.id }), ms);
    return () => window.clearTimeout(id);
  }, [t?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!t) return null;
  return (
    <div className={`toast toast-${t.kind}`} role="status">
      <Sprite name={t.kind === 'level' ? 'crown' : t.kind === 'achievement' ? 'star' : t.kind === 'quest' ? 'check' : t.kind === 'unlock' ? 'spark' : 'note'} scale={3} />
      <div>
        <b>{t.title}</b>
        <span>{t.text}</span>
      </div>
      {(t.kind === 'level' || t.kind === 'unlock') && (
        <span className="confetti" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <i key={i} style={{ ['--i' as string]: i }} />
          ))}
        </span>
      )}
      <button type="button" className="modal-x" aria-label="Dismiss" onClick={() => dispatch({ type: 'dismissToast', id: t.id })}>
        ×
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- quest book

export function QuestBook({ onClose }: { onClose: () => void }) {
  const { state: s } = useGame();
  const active = activeQuests(s, 5);
  const goal = s.weeklyGoal;
  return (
    <Modal label="Quests and achievements" onClose={onClose} className="drawer">
      <h2>Quests</h2>
      <ul className="quests">
        {active.map((q) => {
          const v = Math.min(q.target, q.progress(s));
          return (
            <li key={q.id}>
              <div>
                <b>{q.title}</b>
                <span className="small">{q.text}</span>
              </div>
              <Meter value={v / q.target} tone="xp" label={`${q.title} progress`} />
              <span className="small muted">
                {v}/{q.target} · Reward: {q.rewardText}
              </span>
            </li>
          );
        })}
      </ul>
      {goal && (
        <p className="weekly-goal">
          <b>Weekly goal: {WEEKLY_GOALS[goal.id].title}</b> {WEEKLY_GOALS[goal.id].text(goal.target)} {goalMet(s) ? 'Done!' : ''}
        </p>
      )}
      <p className="small muted">
        {s.quests.length} of {QUESTS.length} quests complete.
      </p>
      <h2>Achievements</h2>
      <ul className="badges">
        {ACHIEVEMENTS.map((a) => {
          const got = s.achievements.includes(a.id);
          return (
            <li key={a.id} className={got ? 'got' : ''}>
              <Sprite name={got ? a.icon : 'lock'} scale={3} />
              <b>{a.title}</b>
              <span className="small">{a.text}</span>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
