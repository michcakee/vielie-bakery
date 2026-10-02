import { useEffect, useRef, useState } from 'react';
import { useGame } from './GameContext';

interface Step {
  target: string | null;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    target: null,
    title: 'Welcome to Vielie',
    body: 'Each day follows the same loop: read the morning news, plan what to bake, buy ingredients, bake and open the shop, then read the receipt. Thirty days, one season.',
  },
  {
    target: 'paper',
    title: 'Start with the news',
    body: 'Weather, events and the day of the week change how many customers come in. Everything announced here is already included in the forecast.',
  },
  {
    target: 'production',
    title: 'Plan the bake',
    body: 'Compare the forecast with how many you bake. Leftover muffins and croissants are thrown away; sourdough keeps one extra day. Oven time is limited, so the last column shows what each item earns per oven minute.',
  },
  {
    target: 'ingredients',
    title: 'Buy ingredients',
    body: 'You are short of butter and matcha for today’s plan. Press “Buy what’s missing” — the cash leaves your account now, before you have sold a single item.',
  },
  {
    target: 'bake',
    title: 'Bake and open the shop',
    body: 'When the plan fits the oven and the store room, bake. Customers arrive, and the day’s receipt shows exactly where the money went.',
  },
  {
    target: 'ledger',
    title: 'Keep an eye on the ledger',
    body: 'Cash, green score, reputation and debt stay up here. Any underlined word, anywhere, explains itself when you click it and is saved to your notebook.',
  },
];

export function Tutorial({ onShowToday }: { onShowToday: () => void }) {
  const { state, dispatch } = useGame();
  const [i, setI] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = STEPS[i];

  useEffect(() => {
    if (state.tutorialDone) return;
    onShowToday();
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    el?.classList.add('tour-highlight');
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    cardRef.current?.focus();
    return () => el?.classList.remove('tour-highlight');
  }, [i, state.tutorialDone, step.target, onShowToday]);

  if (state.tutorialDone) return null;
  const last = i === STEPS.length - 1;

  return (
    <div className="tour" role="dialog" aria-modal="false" aria-labelledby="tour-h" tabIndex={-1} ref={cardRef}>
      <p className="tour-count">
        Step {i + 1} of {STEPS.length}
      </p>
      <h2 id="tour-h">{step.title}</h2>
      <p>{step.body}</p>
      <div className="tour-actions">
        <button className="btn btn-ghost btn-small" onClick={() => dispatch({ type: 'completeTutorial' })}>
          Skip tutorial
        </button>
        <div>
          {i > 0 && (
            <button className="btn btn-small" onClick={() => setI(i - 1)}>
              Back
            </button>
          )}
          <button className="btn btn-primary btn-small" onClick={() => (last ? dispatch({ type: 'completeTutorial' }) : setI(i + 1))}>
            {last ? 'Start baking' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
