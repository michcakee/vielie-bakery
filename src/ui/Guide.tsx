import { Speaker } from './Speaker';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { FEATURES, FEATURE, type TabId } from '../data/unlocks';
import { introStep } from '../engine/unlocks';
import type { GameState } from '../engine/types';
import { useGame } from './GameContext';
import { TUTORIAL, tutorialOn, tutorialStep } from './Tutorial';
import { Btn } from './kit';
import { Sprite } from './pixel/Sprite';

/**
 * One guidance voice at a time: the active intro quest speaks through a character,
 * and "Show me" spotlights the one control to use. Never during service.
 */
interface Guide {
  showMe: (tab?: TabId, spot?: string) => void;
  /** The control being pointed at right now, so a panel can open the section it lives in. */
  spot: string | null;
  /** What the tutorial or today's lesson wants you to tap next: it shines until you do. */
  target: Target | null;
}

interface Target {
  tab?: TabId;
  spot?: string;
}

const GuideCtx = createContext<Guide>({ showMe: () => undefined, spot: null, target: null });
export const useGuide = () => useContext(GuideCtx);

/** The one control the first-day walkthrough or the active lesson is waiting for, if any. */
function currentTarget(s: GameState): Target | null {
  if (s.events.length > 0) return null;
  if (tutorialOn(s)) {
    const welcoming = s.scenario === 'family' && s.day === 1 && !s.hints.includes('intro');
    const at = tutorialStep(s);
    if (welcoming) return { spot: 'intro-next' };
    if (at < 0) return null;
    const st = TUTORIAL[at];
    return st.tab || st.spot ? { tab: st.tab, spot: st.spot } : null;
  }
  const a = s.intro?.active;
  if (!a || s.phase !== 'morning') return null;
  const at = introStep(s);
  const st = at >= 0 ? FEATURE[a].intro.steps[at] : null;
  return st && (st.tab || st.spot) ? { tab: st.tab, spot: st.spot } : null;
}

export function GuideProvider({ goTo, tab, children }: { goTo: (t: TabId) => void; tab: TabId; children: ReactNode }) {
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
  const target = currentTarget(s);
  return (
    <GuideCtx.Provider value={{ showMe, spot, target }}>
      {children}
      {spot && <Spotlight anchor={spot} onDone={endSpot} />}
      {!spot && target && <Shine target={target} tab={tab} />}
    </GuideCtx.Provider>
  );
}

const visible = (e: HTMLElement) => e.offsetParent !== null && e.getBoundingClientRect().height > 0;

/** A whole card is too big to shine: shine the first thing in it you can actually tap. */
function tappable(el: HTMLElement): HTMLElement {
  if (el.matches('button, a, input, select, summary')) return el;
  const ok = (e: HTMLElement) => visible(e) && !e.closest('.tip') && e.getAttribute('aria-checked') !== 'true' && e.getAttribute('aria-pressed') !== 'true';
  return [...el.querySelectorAll<HTMLElement>('.btn-primary:not([disabled]), .btn-go:not([disabled])')].find(ok) ?? [...el.querySelectorAll<HTMLElement>('button:not([disabled]), input, select')].find(ok) ?? el;
}

/**
 * Makes the next thing to tap shine (and a little arrow bob over it) until it's done. If it lives on
 * another tab or in a closed section, the way there shines instead: the tab, then the section.
 * Nothing is blocked or dimmed, so you can still look around.
 */
function Shine({ target, tab }: { target: Target; tab: TabId }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  // Tabs sit in a row with neighbours: point at them from above or below, not from the side.
  const [inRow, setInRow] = useState(false);
  useEffect(() => {
    let lit: HTMLElement | null = null;
    const find = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find(visible) ?? null;
    const pick = (): HTMLElement | null => {
      const dialog = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].pop();
      const inView = (e: HTMLElement | null) => (e && (!dialog || dialog.contains(e)) ? e : null);
      if (target.spot) {
        const el = inView(find(`[data-spot="${target.spot}"]`));
        if (el) return tappable(el);
        // On the right tab but tucked in another section: shine that section's button.
        const sec = inView(find(`[data-section-for~="${target.spot}"]`));
        if (sec) return sec;
      }
      if (target.tab && target.tab !== tab) return inView(find(`[data-spot="tab-${target.tab}"]`)) ?? inView(find('[data-spot="tab-more"]'));
      return null;
    };
    const tick = () => {
      const el = pick();
      if (el !== lit) {
        lit?.classList.remove('shine', 'shine-rel');
        lit = el;
        // Newly lit and off screen: bring it into view once (scrolling away afterwards is fine).
        const r = el?.getBoundingClientRect();
        if (el && r && (r.top < 0 || r.bottom > window.innerHeight)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      if (el && !el.classList.contains('shine')) {
        // The light sweep needs a positioned box; leave ones that already are (fixed, absolute) alone.
        if (getComputedStyle(el).position === 'static') el.classList.add('shine-rel');
        el.classList.add('shine');
      }
      setRect(el ? el.getBoundingClientRect() : null);
      setInRow(!!el?.closest('.tabs, .sub-tabs, .more-grid, .seg'));
    };
    tick();
    const id = window.setInterval(tick, 250);
    window.addEventListener('scroll', tick, true);
    window.addEventListener('resize', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('scroll', tick, true);
      window.removeEventListener('resize', tick);
      lit?.classList.remove('shine', 'shine-rel');
    };
  }, [target.spot, target.tab, tab]);
  if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return null;
  // Beside the control if there's room (covers no text), otherwise above or below it.
  const mid = rect.top + rect.height / 2 - 16;
  const place =
    !inRow && rect.left >= 40
      ? { left: rect.left - 38, top: mid, dir: 'point-right' }
      : !inRow && rect.right + 40 <= window.innerWidth
        ? { left: rect.right + 6, top: mid, dir: 'point-left' }
        : rect.top > 48
          ? { left: rect.left + rect.width / 2 - 16, top: rect.top - 38, dir: 'point-down' }
          : { left: rect.left + rect.width / 2 - 16, top: rect.bottom + 4, dir: 'point-up' };
  return (
    <div className="shine-arrow" aria-hidden="true" style={{ left: place.left, top: place.top }}>
      <Sprite name="arrow" scale={4} className={place.dir} />
    </div>
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
  const { state: s, dispatch } = useGame();
  const { showMe } = useGuide();
  const intro = s.intro;
  // One voice at a time: a morning event is answered first, then the lesson speaks.
  if (!intro?.active || s.events.length > 0 || (s.phase !== 'morning' && s.phase !== 'report')) return null;
  const f = FEATURE[intro.active];
  const at = introStep(s);
  const steps = f.intro.steps;
  const now = at >= 0 ? steps[at] : null;
  // Lesson 1 is the first day; each system Bà teaches after that is the next lesson.
  const lesson = FEATURES.findIndex((x) => x.id === f.id) + 2;
  return (
    <section className="tutorial-bar lesson-card" aria-label={`Today's lesson: ${f.name}`} data-spot="intro-card">
      <div className="tut-head">
        <Speaker who={f.intro.who} />
        <div>
          <span className="tut-count">
            Today’s lesson · Lesson {lesson} · from {f.intro.who}
          </span>
          <b className="tut-title">{f.name.replace(/^[^:]*: /, '').replace(/^./, (c) => c.toUpperCase())}</b>
        </div>
        <button type="button" className="link-btn tut-skip" onClick={() => dispatch({ type: 'introLater' })}>
          Later
        </button>
      </div>
      {/* Only Bà speaks Vietnamese; everyone else's line is shown in English. */}
      {f.intro.who === 'Bà' ? (
        <>
          <p className="handwrite lesson-line" lang="vi">
            {f.intro.vi}
          </p>
          <p className="small muted lesson-en">“{f.intro.en}”</p>
        </>
      ) : (
        <p className="handwrite lesson-line">“{f.intro.en}”</p>
      )}
      {now && (
        <p className="tut-text">
          <b>
            Step {at + 1}
            {steps.length > 1 ? ` of ${steps.length}` : ''}:
          </b>{' '}
          {now.text}
        </p>
      )}
      <div className="tut-foot">
        <ol className="tut-dots" aria-hidden="true">
          {steps.map((_, i) => (
            <li key={i} className={i < at || at === -1 ? 'done' : i === at ? 'now' : ''} />
          ))}
        </ol>
        <span className="small muted">{intro.replay ? 'Replay: no reward' : `+${f.intro.xp} XP`}</span>
        {now && (now.tab || now.spot) && (
          <Btn kind="primary" onClick={() => showMe(now.tab, now.spot)}>
            Show me
          </Btn>
        )}
      </div>
    </section>
  );
}

/** One line at the top of every tab: what it's for, in kid words. */
export const TAB_HELP: Record<TabId, { what: string; icon: string }> = {
  today: { what: 'Your day at a glance. Check the goal, then open the doors!', icon: 'house' },
  kitchen: { what: 'Bake trays for the pastry case and set your prices.', icon: 'hot' },
  market: { what: 'Buy ingredients here. They go in your pantry, then you bake them in the Kitchen', icon: 'bag' },
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
    now.push({ text: 'When you’re ready, open the shop on the Today tab.', tab: 'today', spot: 'open' });
  } else if (phase === 'service')
    now.push(
      { text: 'Tap a customer’s order. Pastries are one tap. Bánh mì and drinks: tap the steps in order (the glowing one is next).' },
      { text: 'Serve the person with the worried face first, before they leave!' },
      { text: 'Fill the star bar at the top: more sales, more stars.' },
      { text: 'Too busy? Tap Bà, help! and Bà serves for you, but her orders earn no tips and no XP. Tap I’ll serve to take over again.' },
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
