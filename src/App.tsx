import { BookOpen, Croissant, Landmark, Newspaper, Settings, Sprout } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { PRODUCT_ORDER, WEEKDAYS } from './config/balance';
import { BakeryScene, type SceneMode } from './components/BakeryScene';
import { useGame, useReducedMotion } from './components/GameContext';
import { HeaderBar, weekTheme } from './components/HeaderBar';
import { Ticker } from './components/Ticker';
import { Tutorial } from './components/Tutorial';
import { demandBreakdown, weekdayIndex } from './game/economy';
import { getEvent } from './game/events';
import type { ByProduct } from './game/types';
import { DayReport } from './views/DayReport';
import { FinalReport } from './views/FinalReport';
import { FinancesView } from './views/FinancesView';
import { InvestmentsView } from './views/InvestmentsView';
import { MarketView } from './views/MarketView';
import { NotebookView } from './views/NotebookView';
import { PlannerView } from './views/PlannerView';
import { SettingsView } from './views/SettingsView';
import { TitleScreen } from './views/TitleScreen';
import { WeeklyReport } from './views/WeeklyReport';

type Tab = 'today' | 'market' | 'books' | 'invest' | 'notebook' | 'settings';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'today', label: 'Today', icon: <Croissant size={16} aria-hidden="true" /> },
  { id: 'market', label: 'Market', icon: <Newspaper size={16} aria-hidden="true" /> },
  { id: 'books', label: 'Finances', icon: <Landmark size={16} aria-hidden="true" /> },
  { id: 'invest', label: 'Equipment & green', icon: <Sprout size={16} aria-hidden="true" /> },
  { id: 'notebook', label: 'Notebook', icon: <BookOpen size={16} aria-hidden="true" /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} aria-hidden="true" /> },
];

const BAKE_MS = 1500;

export default function App() {
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  return screen === 'title' ? <TitleScreen onPlay={() => setScreen('game')} /> : <Game onHome={() => setScreen('title')} />;
}

function Game({ onHome }: { onHome: () => void }) {
  const { state, dispatch } = useGame();
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<Tab>('today');
  const [progress, setProgress] = useState<number | null>(null);
  const raf = useRef(0);
  const timer = useRef(0);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(timer.current);
    },
    [],
  );

  const bake = () => {
    if (reduced) {
      dispatch({ type: 'bake' });
      return;
    }
    // The timer finishes the day even if the tab is hidden; rAF only drives the visuals.
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / BAKE_MS);
      setProgress(k);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    setProgress(0);
    raf.current = requestAnimationFrame(tick);
    timer.current = window.setTimeout(() => {
      cancelAnimationFrame(raf.current);
      dispatch({ type: 'bake' });
      setProgress(null);
    }, BAKE_MS);
  };

  const showToday = useCallback(() => setTab('today'), []);

  if (state.phase === 'final') {
    return (
      <div className="app">
        <HeaderBar onHome={onHome} />
        <FinalReport />
      </div>
    );
  }

  const baking = progress !== null;
  const mode: SceneMode = state.phase === 'morning' ? (baking ? 'baking' : 'morning') : 'evening';
  const r = state.lastResult;
  const empty: ByProduct<number> = { sourdough: 0, matcha: 0, muffin: 0, croissant: 0 };
  let shelf: ByProduct<number>;
  if (mode === 'baking') shelf = state.plan;
  else if (mode === 'evening' && r) shelf = Object.fromEntries(PRODUCT_ORDER.map((p) => [p, r.products[p].wasted + r.products[p].carriedOver])) as ByProduct<number>;
  else shelf = { ...empty, sourdough: state.dayOld.qty };
  const forecastCustomers = PRODUCT_ORDER.reduce((s, p) => s + demandBreakdown(state, state.market, p, state.prices[p]).expected, 0);
  const event = getEvent(state.market.eventId);
  const chalk = mode === 'evening' ? 'See you  tomorrow' : event ? 'Big news today' : 'Fresh    today';

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to the planner
      </a>
      <HeaderBar onHome={onHome} />
      <Ticker />
      <DayBanner day={state.day} />
      <div className="layout">
        <aside className="shopfront" aria-label="Your bakery">
          <BakeryScene
            mode={mode}
            weather={state.market.weather}
            shelf={shelf}
            progress={mode === 'baking' ? progress ?? 1 : 1}
            customers={mode === 'baking' ? forecastCustomers : mode === 'morning' ? 25 : 0}
            owned={state.owned}
            greenScore={state.greenScore}
            competitor={state.market.competitorActive}
            chalk={chalk}
          />
          <div className="shopfront-caption">
            <p className="week-focus">{weekTheme(state.day).focus}</p>
            {mode === 'evening' && r && (
              <p className="muted">
                {r.unitsWasted} items binned, {r.products.sourdough.carriedOver} loaves kept for tomorrow.
              </p>
            )}
          </div>
        </aside>

        <main className="work" id="main">
          <nav className="tabs" role="tablist" aria-label="Bakery sections">
            {TABS.map((t) => (
              <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="tabpanel" className={`tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="tabpanel" role="tabpanel" id="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === 'today' && <PlannerView onBake={bake} baking={baking} />}
            {tab === 'market' && <MarketView />}
            {tab === 'books' && <FinancesView />}
            {tab === 'invest' && <InvestmentsView />}
            {tab === 'notebook' && <NotebookView />}
            {tab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {state.phase === 'report' && <DayReport />}
      {state.phase === 'weekly' && <WeeklyReport />}
      {state.phase === 'morning' && <Tutorial onShowToday={showToday} />}
    </div>
  );
}

/** Brief "new day" card each morning. */
function DayBanner({ day }: { day: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<number | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    setShown(day);
    const t = window.setTimeout(() => setShown(null), 1600);
    return () => window.clearTimeout(t);
  }, [day, reduced]);
  if (shown === null) return null;
  return (
    <div className="day-banner" aria-hidden="true">
      <span className="day-banner-num">Day {shown}</span>
      <span className="day-banner-week">{WEEKDAYS[weekdayIndex(shown)]}</span>
    </div>
  );
}
