import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { loadGame, loadPrefs, saveGame, savePrefs, type Prefs } from '../engine/save';
import { createNewGame, gameReducer, type Action } from '../engine/state';
import type { GameState } from '../engine/types';
import { setAudio } from './audio';

interface Ctx {
  state: GameState;
  dispatch: Dispatch<Action>;
  hasSave: boolean;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  reduced: boolean;
  business: boolean;
  slot: number;
  switchSlot: (slot: number) => boolean;
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
  const [prefs, setPrefsState] = useState<Prefs>(() => loadPrefs());
  const [saved, setSaved] = useState(() => loadGame(loadPrefs().slot));
  const [state, dispatch] = useReducer(safeReducer, saved, (s) => s ?? createNewGame());
  const [osReduced, setOsReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const lastSave = useRef(0);
  const pending = useRef<number>(0);
  const slot = prefs.slot;

  // Save on every meaningful change, at most twice a second while the shop is open.
  useEffect(() => {
    if (state.phase === 'setup' && !saved) return;
    const now = performance.now();
    window.clearTimeout(pending.current);
    if (state.phase !== 'service' || now - lastSave.current > 2000) {
      saveGame(state, slot);
      lastSave.current = now;
    } else {
      pending.current = window.setTimeout(() => {
        saveGame(state, slot);
        lastSave.current = performance.now();
      }, 600);
    }
  }, [state, slot, saved]);

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
    document.documentElement.style.setProperty('--text-scale', String(prefs.textScale ?? 1));
  }, [reduced, prefs.textScale]);
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

  /** Load another save slot (or a blank bakery if it's empty). Returns true if the slot had a game. */
  const switchSlot = useCallback(
    (n: number) => {
      saveGame(state, slot);
      const s = loadGame(n);
      setPrefs({ slot: n });
      setSaved(s);
      dispatch({ type: 'load', state: s ?? createNewGame() });
      return !!s;
    },
    [state, slot, setPrefs],
  );

  const value = useMemo(
    () => ({ state, dispatch, hasSave: !!saved, prefs, setPrefs, reduced, business: prefs.view === 'business', slot, switchSlot }),
    [state, saved, prefs, setPrefs, reduced, slot, switchSlot],
  );
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): Ctx {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
