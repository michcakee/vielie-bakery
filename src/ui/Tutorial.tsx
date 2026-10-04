import type { GameState } from '../engine/types';
import type { TabId } from '../data/unlocks';
import { useGame } from './GameContext';
import { useGuide } from './Guide';
import { Btn } from './kit';
import { Speaker } from './Speaker';

interface Step {
  title: string;
  text: string;
  icon: string;
  /** Where "Show me" points. */
  tab?: TabId;
  spot?: string;
  /** A step you finish by reading it: the button that moves on. */
  next?: { label: string; hint: string };
  done: (s: GameState) => boolean;
}

/** Bà's first day, one step at a time. Each step is finished by doing it. */
export const TUTORIAL: Step[] = [
  {
    title: 'This is your bakery',
    text: 'Customers come in at the door, line up at the counter and buy what’s in the glass case. Let’s run your first day together.',
    icon: 'shop',
    spot: 'tut-next',
    next: { label: 'Let’s go!', hint: 'tut:welcome' },
    done: (s) => s.hints.includes('tut:welcome'),
  },
  {
    title: 'Bake something to sell',
    text: 'The case is empty. Go to the Kitchen and tap Bake on the bánh mì que (crispy breadsticks). Tap “Take it out” when it shines: that’s the golden zone.',
    icon: 'hot',
    tab: 'kitchen',
    spot: 'bake-banhMiQue',
    done: (s) => s.traysToday > 0 || s.history.length > 0,
  },
  {
    title: 'Open the shop',
    text: 'Go back to Today and tap the big green Open button. Customers will start walking in.',
    icon: 'bell',
    tab: 'today',
    spot: 'open',
    done: (s) => s.phase !== 'morning' || s.history.length > 0,
  },
  {
    title: 'Serve your first customer',
    text: 'Kevin Nguyen is first through the door! Tap his shining order under “At the counter”. Pastries take one tap. For bánh mì and drinks, tap the glowing step each time.',
    icon: 'people',
    spot: 'first-order',
    done: (s) => s.lifetime.served > 0 || s.history.length > 0,
  },
  {
    title: 'Bà can help, a little',
    text: 'Too busy? Tap “Bà, help!” and she serves for you, but her orders earn no tips and no XP. Tap “I’ll serve” to take over again.',
    icon: 'heart',
    spot: 'tut-next',
    next: { label: 'Got it', hint: 'baHelpTip' },
    done: (s) => s.hints.includes('baHelpTip') || s.history.length > 0,
  },
  {
    title: 'Close up',
    text: 'Keep serving until 6pm, or tap More → Skip to closing. Then choose what happens to leftovers (donating is kind).',
    icon: 'clock',
    done: (s) => s.phase === 'closing' || s.phase === 'report' || s.history.length > 0,
  },
  {
    title: 'See your stars',
    text: 'Tap the shining “Turn off the lights”. The report shows your stars and what to try tomorrow. Tomorrow Bà teaches you one new thing.',
    icon: 'star',
    spot: 'lights-off',
    done: (s) => s.history.length > 0,
  },
];

/** True while the first-day walkthrough is running (guided games only). */
export function tutorialOn(s: GameState): boolean {
  return s.allUnlocked === false && !s.hints.includes('coachDone') && s.history.length === 0;
}

/** Which step is next (the first one not done yet), or -1 when the day is finished. */
export function tutorialStep(s: GameState): number {
  return TUTORIAL.findIndex((st) => !st.done(s));
}

/** A bar pinned at the top: step N of 7, one instruction, one button. */
export function TutorialBar() {
  const { state: s, dispatch } = useGame();
  const { showMe } = useGuide();
  // Bà's welcome lines come first; the walkthrough starts once they're done.
  const welcoming = s.scenario === 'family' && s.day === 1 && !s.hints.includes('intro');
  if (!tutorialOn(s) || welcoming || s.phase === 'report' || s.events.length) return null;
  const at = tutorialStep(s);
  if (at < 0) return null;
  const st = TUTORIAL[at];
  return (
    <aside className="tutorial-bar" role="region" aria-label={`Tutorial, step ${at + 1} of ${TUTORIAL.length}`} aria-live="polite">
      <div className="tut-head">
        <Speaker who="Bà" />
        <div>
          <span className="tut-count">
            Bà · step {at + 1} of {TUTORIAL.length}
          </span>
          <b className="tut-title">{st.title}</b>
        </div>
        <button type="button" className="link-btn tut-skip" onClick={() => dispatch({ type: 'hint', id: 'coachDone' })}>
          Skip tutorial
        </button>
      </div>
      <p className="tut-text speech">{st.text}</p>
      <div className="tut-foot">
        <ol className="tut-dots" aria-hidden="true">
          {TUTORIAL.map((_, i) => (
            <li key={i} className={i < at ? 'done' : i === at ? 'now' : ''} />
          ))}
        </ol>
        {st.next ? (
          <Btn kind="go" onClick={() => dispatch({ type: 'hint', id: st.next!.hint })} sfx="pop" data-spot="tut-next">
            {st.next.label}
          </Btn>
        ) : (
          st.tab &&
          st.spot && (
            <Btn kind="primary" onClick={() => showMe(st.tab, st.spot)}>
              Show me
            </Btn>
          )
        )}
      </div>
    </aside>
  );
}
