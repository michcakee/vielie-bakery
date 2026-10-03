import { useCallback, useEffect, useRef, useState } from 'react';
import { PRODUCTS } from '../data/catalog';
import { onMenu } from '../engine/economy';
import { valuation } from '../engine/finance';
import { importCode } from '../engine/save';
import type { GameState } from '../engine/types';
import { activeQuests } from '../engine/progression';
import { money } from '../lib/format';
import { play } from './audio';
import { onBack } from './backButton';
import { confetti } from './pixelUi';
import { useGame } from './GameContext';
import { Hud } from './Hud';
import { Btn } from './kit';
import { ClosingPanel, DayReport, EventCard, Modal, QuestBook, Toasts, WeeklyReview } from './overlays';
import { AnalyticsPanel } from './panels/AnalyticsPanel';
import { BuildPanel } from './panels/BuildPanel';
import { CustomersPanel } from './panels/CustomersPanel';
import { EcoPanel } from './panels/EcoPanel';
import { FinancesPanel } from './panels/FinancesPanel';
import { HomePanel, readiness, type Tab } from './panels/HomePanel';
import { KitchenPanel } from './panels/KitchenPanel';
import { MarketPanel } from './panels/MarketPanel';
import { ServicePanel } from './panels/ServicePanel';
import { StaffPanel } from './panels/StaffPanel';
import { Sprite } from './pixel/Sprite';
import { BakeryScene } from './scene/BakeryScene';
import { IntroLines, Loading, NewGame, Setup, Title } from './screens/Screens';
import { GuideProvider, TabHelp, WhatNow } from './Guide';
import { FEATURE } from '../data/unlocks';
import { introStep, nextFeature, tabOn } from '../engine/unlocks';
import { Settings } from './Settings';

const TABS: { id: Tab; label: string; vi: string; icon: string; mobile: boolean }[] = [
  { id: 'today', label: 'Today', vi: 'Hôm nay', icon: 'house', mobile: true },
  { id: 'kitchen', label: 'Kitchen', vi: 'Bếp', icon: 'hot', mobile: true },
  { id: 'market', label: 'Market', vi: 'Chợ', icon: 'bag', mobile: true },
  { id: 'staff', label: 'Staff', vi: 'Nhân viên', icon: 'people', mobile: false },
  { id: 'customers', label: 'Customers', vi: 'Khách', icon: 'heart', mobile: false },
  { id: 'growth', label: 'Growth', vi: 'Mở rộng', icon: 'plant', mobile: false },
  { id: 'money', label: 'Money', vi: 'Tài chính', icon: 'coin', mobile: true },
  { id: 'analytics', label: 'Analytics', vi: 'Phân tích', icon: 'chart', mobile: false },
  { id: 'eco', label: 'Eco', vi: 'Xanh', icon: 'leaf', mobile: false },
];

export default function App() {
  const { dispatch } = useGame();
  const [screen, setScreen] = useState<'loading' | 'title' | 'new' | 'game'>('loading');
  const [restore, setRestore] = useState<GameState | null>(null);

  useEffect(() => {
    const m = window.location.hash.match(/^#restore=(.+)$/);
    if (!m) return;
    void importCode(decodeURIComponent(m[1])).then((s) => {
      if (s) setRestore(s);
      history.replaceState(null, '', window.location.pathname + window.location.search);
    });
  }, []);

  useEffect(() => onBack(() => (screen === 'new' ? (setScreen('title'), true) : false)), [screen]);

  const done = useCallback(() => setScreen('title'), []);
  return (
    <>
      {screen === 'loading' && <Loading onDone={done} />}
      {screen === 'title' && <Title onContinue={() => setScreen('game')} onNew={() => setScreen('new')} />}
      {screen === 'new' && <NewGame onBack={() => setScreen('title')} onStart={() => setScreen('game')} />}
      {screen === 'game' && <Game onQuit={() => setScreen('title')} />}
      {restore && (
        <Modal label="Restore a saved bakery" onClose={() => setRestore(null)}>
          <h2>Welcome back!</h2>
          <p>
            Load <b>{restore.bakeryName}</b> from day {restore.day}? It replaces the bakery in the current save slot.
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

function Ending({ onQuit }: { onQuit: () => void }) {
  const { state: s } = useGame();
  const e = s.ending!;
  const v = valuation(s);
  return (
    <Modal label="The end of this story" className="report">
      <div className="report-head">
        <span className="eyebrow">Day {e.day}</span>
        <h2>{e.kind === 'sold' ? 'SOLD!' : e.kind === 'bankrupt' ? 'Closed for good' : 'Retired'}</h2>
        <p className="report-mood">{e.text}</p>
      </div>
      <div className="report-nums">
        <div className="num">
          <span>Customers served</span>
          <b>{s.lifetime.served.toLocaleString('en-US')}</b>
        </div>
        <div className="num">
          <span>Lifetime sales</span>
          <b>{money(s.lifetime.revenue)}</b>
        </div>
        <div className={`num big ${e.kind !== 'bankrupt' ? 'pos' : ''}`}>
          <span>{e.kind !== 'bankrupt' ? 'Sale price' : 'What was left'}</span>
          <b>{money(e.kind !== 'bankrupt' ? e.value : Math.max(0, v.equityValue))}</b>
        </div>
      </div>
      <p className="small">
        {s.achievements.length} achievements · {s.learned.length} ideas in your notebook · reputation {Math.round(s.reputation)} · community {Math.round(s.community)}.
      </p>
      <Btn kind="go" className="big" onClick={onQuit}>
        Back to the title screen
      </Btn>
    </Modal>
  );
}

function Game({ onQuit }: { onQuit: () => void }) {
  const { state: s, dispatch, prefs, reduced } = useGame();
  // Optional break reminder: one gentle toast after 30 minutes, only if the player turned it on.
  const [breakNote, setBreakNote] = useState(false);
  useEffect(() => {
    if (!prefs.breakReminder) return;
    const h = window.setTimeout(() => setBreakNote(true), 30 * 60 * 1000);
    return () => window.clearTimeout(h);
  }, [prefs.breakReminder]);
  // One screen shake per level-up. Nothing else shakes.
  const [shake, setShake] = useState(false);
  const shakenFor = useRef(0);
  useEffect(() => {
    const t = s.toasts.find((x) => x.kind === 'level' && x.id > shakenFor.current);
    if (!t) return;
    shakenFor.current = t.id;
    if (reduced) return;
    confetti();
    play('confetti');
    setShake(true);
    const h = window.setTimeout(() => setShake(false), 450);
    return () => window.clearTimeout(h);
  }, [s.toasts, reduced]);
  const [tab, setTab] = useState<Tab>('today');
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [drawer, setDrawer] = useState<'quests' | 'settings' | 'more' | 'help' | null>(null);
  const [hidden, setHidden] = useState(false);
  const intro = s.phase === 'morning' && s.day === 1 && s.history.length === 0 && !s.hints.includes('intro') && s.scenario === 'family';

  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  useEffect(() => {
    if (s.phase === 'service') setTab('today');
    if (s.phase !== 'service') setPaused(false);
  }, [s.phase]);
  useEffect(
    () =>
      onBack(() => {
        if (drawer) {
          setDrawer(null);
          return true;
        }
        if (activeId !== null) {
          setActiveId(null);
          return true;
        }
        if (tab !== 'today' && s.phase !== 'service') {
          setTab('today');
          return true;
        }
        return false;
      }),
    [drawer, activeId, tab, s.phase],
  );

  // A new phase (morning, service, report) always starts at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.querySelector('.modal.report')?.scrollTo({ top: 0 });
  }, [s.phase, s.day]);

  // Whatever tab you're looking at counts as seen: its NEW badges clear.
  const newHere = (s.newFeatures ?? []).some((f) => FEATURE[f].tab === tab);
  useEffect(() => {
    if (newHere && s.phase !== 'service') dispatch({ type: 'hint', id: `tab:${tab}` });
  }, [newHere, tab, s.phase, dispatch]);

  const rate = (prefs.relaxed ? 4 : 6) * speed;
  const running = s.phase === 'service' && !paused && !hidden && drawer === null;
  useServiceClock(running, rate);
  useServiceSounds(s);

  if (s.phase === 'setup') return <Setup />;

  const service = s.phase === 'service';
  const first = s.service?.visits.find((v) => v.status === 'waiting' && !v.servedBy);
  const firstHint = service && s.lifetime.served === 0 && first ? `${first.name} wants ${PRODUCTS[first.wants].name}! Tap the order to make it.` : null;
  const [openCheck, setOpenCheck] = useState<string[] | null>(null);
  const reallyOpen = () => {
    setOpenCheck(null);
    dispatch({ type: 'open' });
    setTab('today');
  };
  // Opening with nothing to sell wastes a whole day: ask once.
  const open = () => {
    const missing: string[] = [];
    if (s.baguettes.qty === 0 && onMenu(s).some((p) => PRODUCTS[p].kind === 'sandwich')) missing.push('No baguettes, so no bánh mì today.');
    const trays = onMenu(s).filter((p) => PRODUCTS[p].kind === 'tray');
    if (trays.length && trays.every((p) => s.display[p].qty === 0)) missing.push('The pastry case is empty.');
    if (missing.length) setOpenCheck(missing);
    else reallyOpen();
  };
  const goTo = (t: Tab) => {
    if (!tabOn(s, t)) return;
    setTab(t);
    setDrawer(null);
    window.scrollTo({ top: 0 });
    dispatch({ type: 'hint', id: `tab:${t}` });
    // "Open the X tab" steps of the active intro quest count as done when you get there.
    const a = s.intro?.active;
    const at = a ? introStep(s) : -1;
    if (a && at >= 0) {
      const st = FEATURE[a].intro.steps[at];
      if (st.visit && st.tab === t) dispatch({ type: 'hint', id: `visit:${a}` });
    }
  };
  const current = TABS.find((t) => t.id === tab)!;
  const visibleTabs = TABS.filter((t) => tabOn(s, t.id));
  const moreTabs = visibleTabs.filter((t) => !t.mobile);
  const lockedTabs = TABS.filter((t) => !tabOn(s, t.id));
  const isNew = (id: Tab) => (s.newFeatures ?? []).some((f) => FEATURE[f].tab === id);
  const teaser = nextFeature(s);

  return (
    <GuideProvider goTo={goTo}>
    <div className={`app phase-${s.phase}${s.phase === 'morning' && !intro && tab !== 'today' ? ' has-fab' : ''}${shake ? ' shake' : ''}`}>
      <a className="skip-link" href="#panel">
        Skip to controls
      </a>
      <Hud onQuests={() => setDrawer('quests')} onSettings={() => setDrawer('settings')} onHelp={() => setDrawer('help')} questCount={activeQuests(s).length} />
      <div className="layout">
        <section className="scene-col" aria-label="Your bakery">
          <BakeryScene
            onCustomer={(v) => {
              if (v.servedBy) return;
              if (PRODUCTS[v.wants].kind === 'tray') {
                play('coin');
                dispatch({ type: 'serve', visitId: v.id });
              } else setActiveId(v.id);
            }}
          />
          {intro && (
            <IntroLines
              guided={s.allUnlocked === false}
              onDone={() => {
                dispatch({ type: 'hint', id: 'intro' });
                // Guided games go to Bà's first lesson (bake first); others open straight away.
                if (s.allUnlocked !== false) open();
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
              {visibleTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  data-spot={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="tabpanel"
                  className={`tab ${tab === t.id ? 'on' : ''} ${t.mobile ? '' : 'desktop-only'}`}
                  onClick={() => (play('click'), goTo(t.id))}
                >
                  <Sprite name={t.icon} scale={2} />
                  <span className="tab-label">{t.label}</span>
                  <span className="tab-vi" lang="vi">
                    {t.vi}
                  </span>
                  {isNew(t.id) && <span className="new-dot" aria-label="new" />}
                </button>
              ))}
              {/* Desktop shows what's coming as padlocks; phones hide locked tabs entirely. */}
              {lockedTabs.map((t) => (
                <span key={t.id} className="tab locked desktop-only" title={teaser && FEATURE[teaser.id].tab === t.id ? teaser.teaser : 'Unlocks as your bakery grows'}>
                  <Sprite name="lock" scale={2} />
                  <span className="tab-label">{t.label}</span>
                  <span className="tab-vi" lang="vi">
                    {t.vi}
                  </span>
                </span>
              ))}
              {moreTabs.length > 0 && (
              <button type="button" className={`tab mobile-only ${!current.mobile ? 'on' : ''}`} aria-haspopup="dialog" onClick={() => (play('click'), setDrawer('more'))}>
                <Sprite name="gear" scale={2} />
                <span className="tab-label">More</span>
                <span className="tab-vi" lang="vi">
                  Thêm
                </span>
                {moreTabs.some((m) => isNew(m.id)) && <span className="new-dot" aria-label="new" />}
              </button>
              )}
            </nav>
          )}
          <div className="tabpanel" role={service || s.phase === 'closing' ? undefined : 'tabpanel'} id="tabpanel" aria-labelledby={service ? undefined : `tab-${tab}`}>
            {service ? (
              <ServicePanel paused={paused} setPaused={setPaused} speed={speed} setSpeed={setSpeed} activeId={activeId} setActiveId={setActiveId} />
            ) : s.phase === 'closing' ? (
              <ClosingPanel />
            ) : (
              <>
                {tab !== 'today' && <TabHelp tab={tab} />}
                {tab === 'today' && <HomePanel goTo={goTo} onOpen={open} onRunDay={() => dispatch({ type: 'runDay' })} />}
                {tab === 'kitchen' && <KitchenPanel />}
                {tab === 'market' && <MarketPanel />}
                {tab === 'staff' && <StaffPanel />}
                {tab === 'customers' && <CustomersPanel />}
                {tab === 'growth' && <BuildPanel />}
                {tab === 'money' && <FinancesPanel />}
                {tab === 'analytics' && <AnalyticsPanel />}
                {tab === 'eco' && <EcoPanel />}
              </>
            )}
          </div>
        </section>
      </div>

      {s.phase === 'morning' && !intro && tab !== 'today' && (
        <div className="open-fab">
          <Btn kind="go" onClick={open} disabled={s.events.length > 0} sfx="bell">
            <span lang="vi">Mở cửa!</span> Open
          </Btn>
        </div>
      )}

      {openCheck && (
        <div className="confirm-veil" onClick={() => setOpenCheck(null)}>
          <div className="confirm-sheet" role="dialog" aria-modal="true" aria-label="Open anyway?" onClick={(e) => e.stopPropagation()}>
            <h3>Wait! Open anyway?</h3>
            <ul>
              {openCheck.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <div className="btn-row">
              <Btn
                kind="primary"
                onClick={() => {
                  setOpenCheck(null);
                  goTo('kitchen');
                }}
              >
                Go bake first
              </Btn>
              <Btn kind="ghost" onClick={reallyOpen}>
                Open anyway
              </Btn>
            </div>
          </div>
        </div>
      )}

      {breakNote && (
        <div className="break-note" role="status">
          <Sprite name="tea" scale={3} />
          <span>You’ve been baking for 30 minutes. Good time for a break? Your bakery is saved.</span>
          <Btn kind="ghost" onClick={() => setBreakNote(false)}>
            Okay
          </Btn>
        </div>
      )}
      <EventCard />
      <DayReport />
      <WeeklyReview />
      <Toasts />
      {s.ending && <Ending onQuit={onQuit} />}
      {drawer === 'quests' && <QuestBook onClose={() => setDrawer(null)} />}
      {drawer === 'help' && <WhatNow onClose={() => setDrawer(null)} goTo={goTo} todo={s.phase === 'morning' ? readiness(s) : []} />}
      {drawer === 'settings' && <Settings onClose={() => setDrawer(null)} onQuit={onQuit} />}
      {drawer === 'more' && (
        <Modal label="More sections" onClose={() => setDrawer(null)} className="drawer sheet">
          <h2>More</h2>
          <div className="more-grid">
            {moreTabs.map((t) => (
              <button key={t.id} type="button" className={`more-item ${tab === t.id ? 'on' : ''}`} onClick={() => goTo(t.id)} data-spot={`tab-${t.id}`}>
                <Sprite name={t.icon} scale={3} />
                <b>{t.label}</b>
                {isNew(t.id) && <span className="new-chip">NEW</span>}
                <span className="small muted" lang="vi">
                  {t.vi}
                </span>
              </button>
            ))}
            <button type="button" className="more-item" onClick={() => setDrawer('quests')}>
              <Sprite name="book" scale={3} />
              <b>Quests</b>
            </button>
            <button type="button" className="more-item" onClick={() => setDrawer('settings')}>
              <Sprite name="gear" scale={3} />
              <b>Settings</b>
            </button>
          </div>
        </Modal>
      )}
    </div>
    </GuideProvider>
  );
}
