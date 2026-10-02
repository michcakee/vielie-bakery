import { createContext, useContext, useEffect, useReducer, useState, type Dispatch, type ReactNode } from 'react';
import { loadGame, loadPrefs, saveGame, savePrefs, type Prefs } from '../game/persistence';
import { createNewGame, gameReducer, type Action } from '../game/state';
import type { GameState } from '../game/types';

interface Ctx {
  state: GameState;
  dispatch: Dispatch<Action>;
  hasSave: boolean;
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
}

const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [saved] = useState(() => loadGame());
  const [state, dispatch] = useReducer(gameReducer, saved, (s) => s ?? createNewGame());
  const [prefs, setPrefsState] = useState<Prefs>(() => loadPrefs());

  useEffect(() => {
    saveGame(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.motion = prefs.reducedMotion ? 'reduced' : 'full';
  }, [prefs]);

  const setPrefs = (p: Prefs) => {
    setPrefsState(p);
    savePrefs(p);
  };

  return <GameCtx.Provider value={{ state, dispatch, hasSave: !!saved, prefs, setPrefs }}>{children}</GameCtx.Provider>;
}

export function useGame(): Ctx {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

/** True when the user (OS setting or in-game preference) wants less motion. */
export function useReducedMotion(): boolean {
  const { prefs } = useGame();
  const [os, setOs] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setOs(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return os || prefs.reducedMotion;
}
