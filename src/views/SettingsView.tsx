import { useState } from 'react';
import { useGame } from '../components/GameContext';

export function SettingsView() {
  const { state, dispatch, prefs, setPrefs } = useGame();
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="panel settings" aria-labelledby="set-h">
      <h2 id="set-h">Settings</h2>
      <div className="set-row">
        <div>
          <h3>Reduce motion</h3>
          <p className="muted">Turns off the ticker, counters and tray animations. Your system setting is also respected.</p>
        </div>
        <label className="switch">
          <input type="checkbox" checked={prefs.reducedMotion} onChange={(e) => setPrefs({ ...prefs, reducedMotion: e.target.checked })} />
          <span>{prefs.reducedMotion ? 'On' : 'Off'}</span>
        </label>
      </div>
      <div className="set-row">
        <div>
          <h3>Unlock everything</h3>
          <p className="muted">Skip the weekly unlocks: pricing, equipment, loans and sourcing are available from day 1. Good for a second playthrough.</p>
        </div>
        <label className="switch">
          <input type="checkbox" checked={state.sandbox} onChange={(e) => dispatch({ type: 'setSandbox', on: e.target.checked })} />
          <span>{state.sandbox ? 'On' : 'Off'}</span>
        </label>
      </div>
      <div className="set-row">
        <div>
          <h3>Tutorial</h3>
          <p className="muted">Walk through the daily loop again.</p>
        </div>
        <button className="btn" onClick={() => dispatch({ type: 'restartTutorial' })}>
          Replay tutorial
        </button>
      </div>
      <div className="set-row">
        <div>
          <h3>Start over</h3>
          <p className="muted">Your progress is saved in this browser automatically. Starting over erases it.</p>
        </div>
        {confirm ? (
          <div className="confirm">
            <button className="btn btn-danger" onClick={() => dispatch({ type: 'newGame' })}>
              Erase and start day 1
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirm(false)}>
              Keep playing
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={() => setConfirm(true)}>
            Start a new game
          </button>
        )}
      </div>
      <p className="muted seed">Market seed {state.seed}. The same seed always produces the same weather, prices and events.</p>
    </section>
  );
}
