import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { createNewGame, gameReducer, type Action } from '../engine/state';
import { loadGame, loadPrefs, saveGame, savePrefs, type Prefs } from '../engine/save';
import type { GameState } from '../engine/types';
import { setAudio } from './audio';

interface Ctx {
  state: GameState;
  dispatch: Dispatch<Action>;
  hasSave: boolean;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  reduced: boolean;
}

const GameCtx = createContext<Ctx | null>(null);

/** Wraps the reducer so a bug in one action can never take down the whole game. */
function safeReducer(s: GameState, a: Action): GameState {
  try {
    return gameReducer(s, a);
  } catch (e) {
    console.error('[vielie] action failed', a.type, e);
    return s;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [saved] = useState(() => loadGame());
  const [state, dispatch] = useReducer(safeReducer, saved, (s) => s ?? createNewGame());
  const [prefs, setPrefsState] = useState<Prefs>(() => loadPrefs());
  const [osReduced, setOsReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const lastSave = useRef(0);
  const pending = useRef<number>(0);

  // Save on every meaningful change, but at most twice a second while the shop is open.
  useEffect(() => {
    const now = performance.now();
    window.clearTimeout(pending.current);
    if (state.phase !== 'service' || now - lastSave.current > 2000) {
      saveGame(state);
      lastSave.current = now;
    } else {
      pending.current = window.setTimeout(() => {
        saveGame(state);
        lastSave.current = performance.now();
      }, 600);
    }
  }, [state]);

  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setOsReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const reduced = osReduced || prefs.reducedMotion;
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  }, [reduced]);
  useEffect(() => setAudio({ sound: prefs.sound, music: prefs.music }), [prefs.sound, prefs.music]);

  const setPrefs = useCallback(
    (p: Partial<Prefs>) =>
      setPrefsState((old) => {
        const next = { ...old, ...p };
        savePrefs(next);
        return next;
      }),
    [],
  );

  const value = useMemo(() => ({ state, dispatch, hasSave: !!saved, prefs, setPrefs, reduced }), [state, saved, prefs, setPrefs, reduced]);
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): Ctx {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
