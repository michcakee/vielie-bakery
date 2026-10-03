import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { FEATURE, type TabId } from '../data/unlocks';
import { introStep } from '../engine/unlocks';
import { useGame } from './GameContext';
import { Btn, Card } from './kit';
import { Sprite } from './pixel/Sprite';

/**
 * One guidance voice at a time: the active intro quest speaks through a character,
 * and "Show me" spotlights the one control to use. Never during service.
 */
interface Guide {
  showMe: (tab?: TabId, spot?: string) => void;
  /** The control being pointed at right now, so a panel can open the section it lives in. */
  spot: string | null;
}

const GuideCtx = createContext<Guide>({ showMe: () => undefined, spot: null });
export const useGuide = () => useContext(GuideCtx);

export function GuideProvider({ goTo, children }: { goTo: (t: TabId) => void; children: ReactNode }) {
  const [spot, setSpot] = useState<string | null>(null);
  const { state: s } = useGame();
  const endSpot = useCallback(() => setSpot(null), []);
  const showMe = (tab?: TabId, anchor?: string) => {
    if (tab) goTo(tab);
    setSpot(anchor ?? null);
  };
  useEffect(() => {
    if (s.phase === 'service' || s.phase === 'closing') setSpot(null);
  }, [s.phase]);
  return (
    <GuideCtx.Provider value={{ showMe, spot }}>
      {children}
      {spot && <Spotlight anchor={spot} onDone={endSpot} />}
    </GuideCtx.Provider>
  );
}

/** Dims everything but one control and bounces a pixel arrow at it. Esc, a tap anywhere, or using it ends it. */
function Spotlight({ anchor, onDone }: { anchor: string; onDone: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    let el: HTMLElement | null = null;
    let tries = 0;
    let raf = 0;
    const find = () => {
      el = [...document.querySelectorAll<HTMLElement>(`[data-spot="${anchor}"]`)].find((e) => e.offsetParent !== null && e.getBoundingClientRect().height > 0) ?? null;
      // A whole card is too big to point at: point at the first thing in it you can actually tap.
      if (el && el.getBoundingClientRect().height > window.innerHeight * 0.45) {
        const ok = (e: HTMLElement) => e.offsetParent !== null && !e.closest('.tip') && e.getAttribute('aria-checked') !== 'true' && e.getAttribute('aria-pressed') !== 'true';
        const inner = [...el.querySelectorAll<HTMLElement>('.btn-primary:not([disabled]), .btn-go:not([disabled])')].find(ok) ?? [...el.querySelectorAll<HTMLElement>('button:not([disabled]), input, select')].find(ok);
        if (inner) el = inner;
      }
      if (!el) {
        if (tries++ < 60) raf = requestAnimationFrame(find);
        else onDone();
        return;
      }
      el.classList.add('spot-on');
      el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
      const focusable = el.matches('button, a, input, select, [tabindex]') ? el : el.querySelector<HTMLElement>('button:not([disabled]), input, select, a[href]');
      focusable?.focus({ preventScroll: true });
      const place = () => el && setRect(el.getBoundingClientRect());
      place();
      window.addEventListener('scroll', place, true);
      window.addEventListener('resize', place);
      cleanupPlace = () => {
        window.removeEventListener('scroll', place, true);
        window.removeEventListener('resize', place);
      };
    };
    let cleanupPlace = () => undefined as void;
    raf = requestAnimationFrame(find);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onDone();
    // Any tap ends the spotlight, but the tap still goes through to what was under it.
    const tap = () => window.setTimeout(onDone, 0);
    window.addEventListener('keydown', key);
    const armed = window.setTimeout(() => window.addEventListener('pointerdown', tap, true), 250);
    const auto = window.setTimeout(onDone, 12000);
    return () => {
      cancelAnimationFrame(raf);
      cleanupPlace();
      el?.classList.remove('spot-on');
      window.removeEventListener('keydown', key);
      window.removeEventListener('pointerdown', tap, true);
      window.clearTimeout(armed);
      window.clearTimeout(auto);
    };
  }, [anchor, onDone]);
  if (!rect) return null;
  const above = rect.top > 56;
  return (
    <div className="spot-arrow" aria-hidden="true" style={{ left: rect.left + rect.width / 2 - 24, top: above ? rect.top - 56 : rect.bottom + 8 }}>
      <Sprite name="arrow" scale={6} className={above ? "point-down" : "point-up"} />
    </div>
  );
}

/** The active intro quest: a character, one or two short lines, the step to do, Show me and Later. */
export function IntroCard() {
  const { state: s, dispatch, prefs } = useGame();
  const { showMe } = useGuide();
  const intro = s.intro;
  // One voice at a time: a morning event is answered first, then the intro quest speaks.
  if (!intro?.active || s.events.length > 0 || (s.phase !== 'morning' && s.phase !== 'report')) return null;
  const f = FEATURE[intro.active];
  const at = introStep(s);
  return (
    <Card className="intro-card" title={f.intro.who} icon="note" fresh={!intro.replay} spot="intro-card">
      <p className="handwrite" lang="vi">
        {f.intro.vi}
      </p>
      {prefs.translations && <p className="small muted">“{f.intro.en}”</p>}
      <ol className="coach-steps">
        {f.intro.steps.map((st, i) => {
          const done = i < at || at === -1 ? true : st.done(s, intro.base);
          return (
            <li key={i} className={done ? 'done' : i === at ? 'now' : ''}>
              {done ? <Sprite name="check" scale={2} /> : <span className="num">{i + 1}</span>}
              <span>
                {st.text}{' '}
                {i === at && (st.tab || st.spot) && (
                  <button type="button" className="link-btn" onClick={() => showMe(st.tab, st.spot)}>
                    Show me
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="btn-row">
        <Btn kind="ghost" onClick={() => dispatch({ type: 'introLater' })}>
          Later
        </Btn>
        <span className="small muted">{intro.replay ? 'Replaying: no reward this time.' : `Reward: ${f.intro.xp} XP`}</span>
      </div>
    </Card>
  );
}

/** One line at the top of every tab: what it's for, in kid words. */
export const TAB_HELP: Record<TabId, { what: string; icon: string }> = {
  today: { what: 'Your day at a glance. Check the goal, then open the doors!', icon: 'house' },
  kitchen: { what: 'Bake trays for the pastry case and set your prices.', icon: 'hot' },
  market: { what: 'Buy ingredients. No flour, no bread!', icon: 'bag' },
  staff: { what: 'Hire helpers when customers give up waiting.', icon: 'people' },
  customers: { what: 'Who comes in, what they love, and the bakeries you compete with.', icon: 'heart' },
  growth: { what: 'Spend money to make more money: ovens, decorations, more shops.', icon: 'plant' },
  money: { what: 'Did we make money? Sales minus costs = profit.', icon: 'coin' },
  analytics: { what: 'Find out why a day went well or badly.', icon: 'chart' },
  eco: { what: 'Be kind to the planet: less waste, greener packaging.', icon: 'leaf' },
};

export function TabHelp({ tab }: { tab: TabId }) {
  const h = TAB_HELP[tab];
  return (
    <p className="tab-help">
      <Sprite name={h.icon} scale={2} /> {h.what}
    </p>
  );
}

const DAY_STEPS = [
  { id: 'morning', icon: 'hot', text: 'Get ready', sub: 'Bake and buy' },
  { id: 'service', icon: 'shop', text: 'Open', sub: 'Serve customers' },
  { id: 'closing', icon: 'trash', text: 'Close', sub: 'Leftovers' },
  { id: 'report', icon: 'star', text: 'Report', sub: 'Stars and money' },
] as const;

/** The "What now?" sheet: how a day works, and the one or two things to do right now. */
export function WhatNow({ onClose, goTo, todo }: { onClose: () => void; goTo: (t: TabId) => void; todo: { text: string; tab: TabId; spot?: string }[] }) {
  const { state: s } = useGame();
  const { showMe } = useGuide();
  const intro = s.intro?.active ? FEATURE[s.intro.active] : null;
  const at = intro ? introStep(s) : -1;
  const step = intro && at >= 0 ? intro.intro.steps[at] : null;
  const phase = s.phase === 'ended' || s.phase === 'setup' ? 'morning' : s.phase;
  const now: { text: string; tab?: TabId; spot?: string }[] = [];
  if (s.events.length) now.push({ text: 'Answer the news card first: pick one choice.' });
  else if (phase === 'morning') {
    if (step) now.push({ text: step.text, tab: step.tab, spot: step.spot });
    for (const w of todo.slice(0, 2)) now.push({ text: w.text, tab: w.tab, spot: w.spot });
    now.push({ text: 'When you’re ready, open the doors (Mở cửa!) on the Today tab.', tab: 'today', spot: 'open' });
  } else if (phase === 'service')
    now.push(
      { text: 'Tap a customer’s order. Pastries are one tap. Bánh mì and drinks: tap the steps in order (the glowing one is next).' },
      { text: 'Serve the person with the worried face first, before they leave!' },
      { text: 'Fill the star bar at the top: more sales, more stars.' },
    );
  else if (phase === 'closing') now.push({ text: 'Choose what to do with leftovers. Donating makes the neighbours happy.' });
  else now.push({ text: 'Read how the day went, then tap the button at the bottom for the next morning.' });
  return (
    <div className="confirm-veil" onClick={onClose}>
      <div className="confirm-sheet what-now" role="dialog" aria-modal="true" aria-label="What should I do now?" onClick={(e) => e.stopPropagation()}>
        <h3>What now?</h3>
        <ol className="day-steps" aria-label="How a day works">
          {DAY_STEPS.map((d) => (
            <li key={d.id} className={d.id === phase ? 'on' : ''}>
              <Sprite name={d.icon} scale={3} />
              <b>{d.text}</b>
              <span>{d.sub}</span>
            </li>
          ))}
        </ol>
        <ul className="now-list">
          {now.map((n, i) => (
            <li key={i}>
              <span>{n.text}</span>
              {(n.tab || n.spot) && (
                <Btn
                  kind="ghost"
                  onClick={() => {
                    onClose();
                    if (n.spot) showMe(n.tab, n.spot);
                    else if (n.tab) goTo(n.tab);
                  }}
                >
                  Show me
                </Btn>
              )}
            </li>
          ))}
        </ul>
        <div className="btn-row">
          <Btn kind="primary" onClick={onClose}>
            Got it!
          </Btn>
        </div>
      </div>
    </div>
  );
}
