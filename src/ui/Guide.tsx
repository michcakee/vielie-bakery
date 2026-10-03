import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
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
}

const GuideCtx = createContext<Guide>({ showMe: () => undefined });
export const useGuide = () => useContext(GuideCtx);

export function GuideProvider({ goTo, children }: { goTo: (t: TabId) => void; children: ReactNode }) {
  const [spot, setSpot] = useState<string | null>(null);
  const { state: s } = useGame();
  const showMe = (tab?: TabId, anchor?: string) => {
    if (tab) goTo(tab);
    setSpot(anchor ?? null);
  };
  useEffect(() => {
    if (s.phase === 'service' || s.phase === 'closing') setSpot(null);
  }, [s.phase]);
  return (
    <GuideCtx.Provider value={{ showMe }}>
      {children}
      {spot && <Spotlight anchor={spot} onDone={() => setSpot(null)} />}
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
      el = [...document.querySelectorAll<HTMLElement>(`[data-spot="${anchor}"]`)].find((e) => e.offsetParent !== null) ?? null;
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
    const auto = window.setTimeout(onDone, 9000);
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
    <div className="spot-arrow" aria-hidden="true" style={{ left: rect.left + rect.width / 2 - 16, top: above ? rect.top - 40 : rect.bottom + 8 }}>
      <Sprite name="arrow" scale={4} className={above ? 'point-down' : 'point-up'} />
    </div>
  );
}

/** The active intro quest: a character, one or two short lines, the step to do, Show me and Later. */
export function IntroCard() {
  const { state: s, dispatch, prefs } = useGame();
  const { showMe } = useGuide();
  const intro = s.intro;
  if (!intro?.active || (s.phase !== 'morning' && s.phase !== 'report')) return null;
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
