import { useCallback, useEffect, useRef, useState } from 'react';
import { PRODUCTS } from '../data/catalog';
import { importCode } from '../engine/save';
import type { GameState } from '../engine/types';
import { activeQuests } from '../engine/progression';
import { play } from './audio';
import { useGame } from './GameContext';
import { Hud } from './Hud';
import { Btn } from './kit';
import { ClosingPanel, DayReport, EventCard, Modal, QuestBook, Toasts, WeeklyReview } from './overlays';
import { BakeryPanel, type Tab } from './panels/BakeryPanel';
import { BuildPanel } from './panels/BuildPanel';
import { EcoPanel } from './panels/EcoPanel';
import { KitchenPanel } from './panels/KitchenPanel';
import { MarketPanel } from './panels/MarketPanel';
import { MoneyPanel } from './panels/MoneyPanel';
import { ServicePanel } from './panels/ServicePanel';
import { Sprite } from './pixel/Sprite';
import { BakeryScene } from './scene/BakeryScene';
import { IntroLines, Loading, Setup, Title } from './screens/Screens';
import { Settings } from './Settings';

const TABS: { id: Tab; label: string; vi: string; icon: string }[] = [
  { id: 'bakery', label: 'Bakery', vi: 'Tiệm', icon: 'house' },
  { id: 'kitchen', label: 'Kitchen', vi: 'Bếp', icon: 'hot' },
  { id: 'market', label: 'Market', vi: 'Chợ', icon: 'bag' },
  { id: 'build', label: 'Build', vi: 'Xây', icon: 'plant' },
  { id: 'money', label: 'Money', vi: 'Tiền', icon: 'coin' },
  { id: 'eco', label: 'Eco', vi: 'Xanh', icon: 'leaf' },
];

export default function App() {
  const { dispatch } = useGame();
  const [screen, setScreen] = useState<'loading' | 'title' | 'game'>('loading');
  const [restore, setRestore] = useState<GameState | null>(null);

  useEffect(() => {
    const m = window.location.hash.match(/^#restore=(.+)$/);
    if (!m) return;
    void importCode(decodeURIComponent(m[1])).then((s) => {
      if (s) setRestore(s);
      history.replaceState(null, '', window.location.pathname + window.location.search);
    });
  }, []);

  const done = useCallback(() => setScreen('title'), []);
  return (
    <>
      {screen === 'loading' && <Loading onDone={done} />}
      {screen === 'title' && <Title onContinue={() => setScreen('game')} onNew={() => (dispatch({ type: 'newGame' }), setScreen('game'))} />}
      {screen === 'game' && <Game onQuit={() => setScreen('title')} />}
      {restore && (
        <Modal label="Restore a saved bakery" onClose={() => setRestore(null)}>
          <h2>Welcome back!</h2>
          <p>
            Load <b>{restore.bakeryName}</b> from day {restore.day}? It replaces the bakery saved in this browser.
          </p>
          <div className="btn-row">
            <Btn kind="go" onClick={() => (dispatch({ type: 'load', state: restore }), setRestore(null), setScreen('game'))}>
              Load it
            </Btn>
            <Btn kind="ghost" onClick={() => setRestore(null)}>
              Not now
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

/** Drives the shop clock in real time while the doors are open. */
function useServiceClock(running: boolean, rate: number) {
  const { dispatch } = useGame();
  const last = useRef(0);
  useEffect(() => {
    if (!running) return;
    last.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.5, (now - last.current) / 1000);
      last.current = now;
      dispatch({ type: 'tick', minutes: dt * rate });
    }, 100);
    return () => window.clearInterval(id);
  }, [running, rate, dispatch]);
}

function useServiceSounds(s: GameState) {
  const prev = useRef({ walking: 0, lost: 0 });
  useEffect(() => {
    if (s.phase !== 'service' || !s.service) return;
    const walking = s.service.visits.filter((v) => v.status === 'walking').length;
    const lost = s.today.lostPrice + s.today.lostSlow + s.today.lostSoldOut;
    if (walking > prev.current.walking) play('bell');
    if (lost > prev.current.lost) play('sad');
    prev.current = { walking, lost };
  }, [s]);
}

function Game({ onQuit }: { onQuit: () => void }) {
  const { state: s, dispatch, prefs } = useGame();
  const [tab, setTab] = useState<Tab>('bakery');
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [drawer, setDrawer] = useState<'quests' | 'settings' | null>(null);
  const [hidden, setHidden] = useState(false);
  const intro = s.phase === 'morning' && s.day === 1 && s.history.length === 0 && !s.hints.includes('intro');

  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  useEffect(() => {
    if (s.phase === 'service') setTab('bakery');
    if (s.phase !== 'service') setPaused(false);
  }, [s.phase]);

  const rate = (prefs.relaxed ? 4 : 6) * speed;
  const running = s.phase === 'service' && !paused && !hidden && drawer === null;
  useServiceClock(running, rate);
  useServiceSounds(s);

  if (s.phase === 'setup') return <Setup />;

  const service = s.phase === 'service';
  const first = s.service?.visits.find((v) => v.status === 'waiting');
  const firstHint = service && s.lifetime.served === 0 && first ? `${first.name} wants ${PRODUCTS[first.wants].name}! Tap the order to make it.` : null;
  const open = () => {
    dispatch({ type: 'open' });
    setTab('bakery');
  };

  return (
    <div className={`app phase-${s.phase}`}>
      <a className="skip-link" href="#panel">
        Skip to controls
      </a>
      <Hud onQuests={() => setDrawer('quests')} onSettings={() => setDrawer('settings')} questCount={activeQuests(s).length} />
      <div className="layout">
        <section className="scene-col" aria-label="Your bakery">
          <BakeryScene
            onCustomer={(v) => {
              if (PRODUCTS[v.wants].kind === 'tray') {
                play('coin');
                dispatch({ type: 'serve', visitId: v.id });
              } else setActiveId(v.id);
            }}
          />
          {intro && (
            <IntroLines
              onDone={() => {
                dispatch({ type: 'hint', id: 'intro' });
                open();
              }}
            />
          )}
          {firstHint && (
            <div className="coach" role="status">
              <Sprite name="bell" scale={2} /> {firstHint}
            </div>
          )}
          {paused && service && (
            <button type="button" className="paused-veil" onClick={() => setPaused(false)}>
              Paused. Tap to continue
            </button>
          )}
        </section>

        <section className="panel-col" id="panel">
          {!service && s.phase !== 'closing' && (
            <nav className="tabs" role="tablist" aria-label="Bakery sections">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="tabpanel" className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => (play('click'), setTab(t.id))}>
                  <Sprite name={t.icon} scale={2} />
                  <span className="tab-label">{t.label}</span>
                  <span className="tab-vi" lang="vi">
                    {t.vi}
                  </span>
                </button>
              ))}
            </nav>
          )}
          <div className="tabpanel" role={service || s.phase === 'closing' ? undefined : 'tabpanel'} id="tabpanel" aria-labelledby={service ? undefined : `tab-${tab}`}>
            {service ? (
              <ServicePanel paused={paused} setPaused={setPaused} speed={speed} setSpeed={setSpeed} activeId={activeId} setActiveId={setActiveId} />
            ) : s.phase === 'closing' ? (
              <ClosingPanel />
            ) : (
              <>
                {tab === 'bakery' && <BakeryPanel goTo={setTab} onOpen={open} />}
                {tab === 'kitchen' && <KitchenPanel />}
                {tab === 'market' && <MarketPanel />}
                {tab === 'build' && <BuildPanel />}
                {tab === 'money' && <MoneyPanel />}
                {tab === 'eco' && <EcoPanel />}
              </>
            )}
          </div>
        </section>
      </div>

      {s.phase === 'morning' && !intro && tab !== 'bakery' && (
        <div className="open-fab">
          <Btn kind="go" onClick={open} disabled={s.events.length > 0} sfx="bell">
            <span lang="vi">Mở cửa!</span> Open
          </Btn>
        </div>
      )}

      <EventCard />
      <DayReport />
      <WeeklyReview />
      <Toasts />
      {drawer === 'quests' && <QuestBook onClose={() => setDrawer(null)} />}
      {drawer === 'settings' && <Settings onClose={() => setDrawer(null)} onQuit={onQuit} />}
    </div>
  );
}
