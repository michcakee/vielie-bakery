import { useEffect, useRef, useState } from 'react';
import { hasOldSave, slotInfo, SLOTS } from '../../engine/save';
import { DIFFICULTY, type Difficulty } from '../../data/config';
import { GOALS, LOCATIONS, LOCATION_ORDER, SCENARIOS, SCENARIO_ORDER } from '../../data/world';
import { DEFAULT_LOOK } from '../../engine/state';
import type { LocationId, Look, ScenarioId } from '../../engine/types';
import { money } from '../../lib/format';
import { play, startMusic } from '../audio';
import { useGame } from '../GameContext';
import { Btn } from '../kit';
import { LookEditor, lookLocked } from '../LookEditor';
import { Person, Sprite } from '../pixel/Sprite';
import { PERSON_H, PERSON_W, winkURL } from '../pixel/render';
import { Exterior } from './Exterior';
import { CreditsPage } from '../Legal';
import { Modal } from '../overlays';
import { Settings } from '../Settings';
import { APP_VERSION, hasKeyboard, isNativeApp, typing, useFullscreen, useInstall } from '../web';

/** One picture per story, from the game's own sprites. */
const SCENARIO_ICON: Record<ScenarioId, string> = { family: 'house', startup: 'coin', recession: 'rain', expansion: 'shop', community: 'heart', competitive: 'crown' };

const BAKER: Look = { ...DEFAULT_LOOK, apron: 0, accessory: 4 };

export function Loading({ onDone }: { onDone: () => void }) {
  const { reduced } = useGame();
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const a = window.setTimeout(() => setStage(1), reduced ? 100 : 900);
    const b = window.setTimeout(onDone, reduced ? 200 : 2800);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [onDone, reduced]);
  return (
    <div className="loading" role="status">
      <div className="loading-scene" aria-hidden="true">
        <span className="loading-oven">
          <span className="loading-fire" />
        </span>
        <span className="loading-baker">
          <Person look={BAKER} scale={4} walking />
          <img className="loading-wink px" src={winkURL(BAKER)} width={PERSON_W * 4} height={PERSON_H * 4} alt="" />
          <span className="loading-sign">
            <span className="sign-body">by mich! &lt;3</span>
            <i />
            <i />
          </span>
          <span className="loading-heart">
            <Sprite name="heart" scale={3} />
          </span>
          <span className="loading-tray">
            <Sprite name="baguette" scale={3} />
          </span>
        </span>
      </div>
      <p>{stage === 0 ? 'Preheating the oven…' : 'Almost ready!'}</p>
      <span className="loading-bar">
        <span style={{ width: stage === 0 ? '55%' : '100%' }} />
      </span>
    </div>
  );
}

/** How the game is played, in the words of the device you are on. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  const keys = hasKeyboard();
  return (
    <Modal label="How to play" onClose={onClose} className="drawer how-to">
      <h2>How to play</h2>
      <ol className="how-steps">
        <li>
          <Sprite name="hot" scale={3} />
          <span>
            <b>Morning.</b> Bake trays for the pastry case and buy ingredients.
          </span>
        </li>
        <li>
          <Sprite name="bell" scale={3} />
          <span>
            <b>Open the shop.</b> {keys ? 'Click' : 'Tap'} an order to serve it. Bánh mì and drinks are built step by step.
          </span>
        </li>
        <li>
          <Sprite name="clock" scale={3} />
          <span>
            <b>Close up.</b> Decide what happens to leftovers, then read your stars.
          </span>
        </li>
        <li>
          <Sprite name="star" scale={3} />
          <span>
            <b>Grow.</b> Stars, levels and quests unlock recipes, helpers and a bigger shop.
          </span>
        </li>
      </ol>
      {keys && (
        <>
          <h3>Keyboard</h3>
          <dl className="key-list">
            <dt>
              <kbd>Esc</kbd>
            </dt>
            <dd>Pause menu, or close a window</dd>
            <dt>
              <kbd>F</kbd>
            </dt>
            <dd>Fullscreen on and off</dd>
            <dt>
              <kbd>1</kbd>–<kbd>5</kbd>
            </dt>
            <dd>Add the numbered step when you build an order</dd>
            <dt>
              <kbd>Space</kbd>
            </dt>
            <dd>Take a tray out of the oven</dd>
            <dt>
              <kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd>
            </dt>
            <dd>Move through the main menu</dd>
          </dl>
        </>
      )}
      <Btn kind="go" onClick={onClose}>
        Got it
      </Btn>
    </Modal>
  );
}

/** The main menu: the street outside the bakery, and a list you can walk with the arrow keys. */
export function Title({ onContinue, onNew }: { onContinue: () => void; onNew: () => void }) {
  const { state, reduced, slot, switchSlot } = useGame();
  const resumable = state.phase !== 'setup';
  const old = hasOldSave();
  const [panel, setPanel] = useState<'load' | 'settings' | 'how' | 'credits' | null>(null);
  const fs = useFullscreen();
  const install = useInstall();
  const menu = useRef<HTMLElement>(null);
  const saves = slotInfo();
  const others = SLOTS.filter((n) => saves[n - 1] && !(n === slot && resumable));

  const go = (f: () => void) => () => {
    startMusic();
    f();
  };
  const items: { label: string; sub?: string; run: () => void; sfx?: 'bell' | 'click' }[] = [
    ...(resumable ? [{ label: 'Continue', sub: `${state.bakeryName} · day ${state.day}`, run: go(onContinue), sfx: 'bell' as const }] : []),
    { label: 'New game', run: go(onNew), sfx: 'bell' },
    ...(others.length ? [{ label: 'Load game', sub: `${others.length} saved ${others.length === 1 ? 'bakery' : 'bakeries'}`, run: () => setPanel('load') }] : []),
    { label: 'Settings', run: () => setPanel('settings') },
    { label: 'How to play', run: () => setPanel('how') },
    { label: 'Credits', run: () => setPanel('credits') },
    ...(install ? [{ label: 'Install game', sub: 'play offline, like an app', run: install }] : []),
  ];

  // Arrow keys walk the list, like any game menu. F toggles fullscreen.
  const toggleFs = fs.toggle;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel || typing(e)) return;
      const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
      const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = at < 0 ? 0 : (at + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) toggleFs();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, toggleFs]);
  useEffect(() => {
    if (hasKeyboard()) menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, []);

  return (
    <main className="title-screen">
      <div className="title-art">
        <Exterior still={reduced} />
      </div>
      <div className="title-card">
        <h1 className="title-logo" aria-label="Viet Bake Shop Sim">
          <span>Viet Bake</span>
          <span>Shop Sim</span>
        </h1>
        <nav className="main-menu" aria-label="Main menu" ref={menu}>
          {items.map((it) => (
            <button key={it.label} type="button" className="menu-item" onClick={() => (play(it.sfx ?? 'click'), it.run())}>
              <span className="menu-cursor" aria-hidden="true">
                <Sprite name="arrow" scale={2} />
              </span>
              <span className="menu-label">{it.label}</span>
              {it.sub && <span className="menu-sub">{it.sub}</span>}
            </button>
          ))}
        </nav>
        {old && !resumable && <p className="small muted">The bakery has had a makeover since your last visit, so this is a fresh start.</p>}
      </div>
      <footer className="title-foot">
        <span>v{APP_VERSION}</span>
        <span className="title-foot-mid">{isNativeApp() ? 'Saves on this device. No account needed.' : 'Saves in your browser. No account needed. Works offline.'}</span>
        <span className="title-by">by mich! &lt;3</span>
      </footer>
      {fs.supported && (
        <button type="button" className="fullscreen-btn" onClick={fs.toggle} aria-pressed={fs.on} title="Fullscreen (F)">
          {fs.on ? 'Exit fullscreen' : 'Fullscreen'}
        </button>
      )}
      <div className="title-float" aria-hidden="true">
        {['banhMi', 'caPhe', 'flan', 'banhBo', 'traTac'].map((n, i) => (
          <span key={n} className={`float f${i}`}>
            <Sprite name={n} scale={3} />
          </span>
        ))}
      </div>

      {panel === 'load' && (
        <Modal label="Load game" onClose={() => setPanel(null)} className="drawer">
          <h2>Load game</h2>
          <ul className="load-list">
            {SLOTS.map((n) => {
              const i = saves[n - 1];
              return (
                <li key={n}>
                  <button
                    type="button"
                    className="load-slot"
                    disabled={!i}
                    onClick={() => {
                      play('bell');
                      startMusic();
                      if (n !== slot) switchSlot(n);
                      setPanel(null);
                      onContinue();
                    }}
                  >
                    <b>Slot {n}</b>
                    <span>{i ? `${i.name} · ${i.day ? `day ${i.day}` : 'old save'}` : 'Empty'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
      {panel === 'settings' && <Settings onClose={() => setPanel(null)} onQuit={() => setPanel(null)} />}
      {panel === 'how' && <HowToPlay onClose={() => setPanel(null)} />}
      {panel === 'credits' && <CreditsPage onClose={() => setPanel(null)} />}
    </main>
  );
}

export function NewGame({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const { state, dispatch, slot, switchSlot } = useGame();
  const [chosenSlot, setChosenSlot] = useState(slot);
  const [scenario, setScenario] = useState<ScenarioId>('family');
  // First run: Bà's bakery on the gentlest setting; everything else is behind "More options".
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [confirm, setConfirm] = useState(false);
  const [moreOpts, setMoreOpts] = useState(false);
  const [experienced, setExperienced] = useState(false);
  const { prefs, setPrefs } = useGame();
  const graduated = !!prefs.graduated || experienced;
  const info = slotInfo();
  const occupied = (n: number) => !!info[n - 1];
  const start = () => {
    if (chosenSlot !== slot) switchSlot(chosenSlot);
    dispatch({ type: 'newGame', options: { scenario, difficulty, name: state.bakeryName, look: state.look, guided: !experienced } });
    if (experienced) setPrefs({ graduated: true });
    onStart();
  };
  return (
    <main className="setup-screen">
      <div className="setup-card wide">
        <h1>New bakery</h1>
        <h2 className="h3">Choose your story</h2>
        <p className="small muted">Six ways to run a bakery. Same game, different money, place and goal.</p>
        <div className="scenario-grid stories" role="radiogroup" aria-label="Story">
          {SCENARIO_ORDER.map((id) => {
            const sc = SCENARIOS[id];
            const locked = id !== 'family' && !graduated;
            return (
              <button key={id} type="button" role="radio" aria-checked={scenario === id} disabled={locked} className={`scenario ${scenario === id ? 'on' : ''} ${locked ? 'locked' : ''}`} onClick={() => (setScenario(id), setDifficulty(sc.difficulty))}>
                <span className="scenario-head">
                  <Sprite name={locked ? 'lock' : SCENARIO_ICON[id]} scale={3} />
                  <b>{sc.name}</b>
                  {id === 'family' && <span className="start-here">Start here</span>}
                </span>
                <span className="small">{sc.blurb}</span>
                <span className="scenario-facts">
                  <span>Start with {money(sc.cash)}{sc.loan ? `, owe ${money(sc.loan)}` : ''}</span>
                  <span>{sc.location ? LOCATIONS[sc.location].name : 'You choose the neighbourhood'}</span>
                  <span>Difficulty: {DIFFICULTY[sc.difficulty].name}</span>
                </span>
                <span className="small effect">{locked ? 'Locked: finish Bà’s first week to open it' : `Goal: ${GOALS[sc.goal].name}. ${GOALS[sc.goal].blurb}`}</span>
              </button>
            );
          })}
        </div>
        {!graduated && (
          <p className="small">
            The other five stories open after Bà’s first week (day 8). Played before?{' '}
            <button type="button" className="link-btn" onClick={() => setPrefs({ graduated: true })}>
              Unlock them now
            </button>
          </p>
        )}

        <h2 className="h3">Save slot</h2>
        <div className="slot-row" role="radiogroup" aria-label="Save slot">
          {SLOTS.map((n) => {
            const i = info[n - 1];
            return (
              <div key={n} className={`slot ${chosenSlot === n ? 'on' : ''}`}>
                <button type="button" role="radio" aria-checked={chosenSlot === n} className="slot-pick" onClick={() => (setChosenSlot(n), setConfirm(false))}>
                  <b>Slot {n}</b>
                  {i ? (
                    <span className="small">
                      {i.name} · {i.day ? `day ${i.day}` : 'old save'}
                    </span>
                  ) : (
                    <span className="small muted">Empty</span>
                  )}
                </button>
                {i && n !== slot && (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      switchSlot(n);
                      onStart();
                    }}
                  >
                    Load this bakery
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button type="button" className="link-btn" aria-expanded={moreOpts} onClick={() => setMoreOpts(!moreOpts)}>
          {moreOpts ? 'Fewer options' : 'More options'}
        </button>
        {moreOpts && (
        <>
        <label className="toggle">
          <input type="checkbox" checked={experienced} onChange={(e) => setExperienced(e.target.checked)} />
          <span className="toggle-ui" aria-hidden="true" />
          <span>
            <b>Experienced baker</b>
            <span className="small muted">Everything unlocked from day 1, no intro quests. For players who know the game.</span>
          </span>
        </label>
        <h2 className="h3">Difficulty</h2>
        <div className="seg big-seg" role="radiogroup" aria-label="Difficulty">
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
            <button key={d} type="button" role="radio" aria-checked={difficulty === d} className={difficulty === d ? 'on' : ''} onClick={() => setDifficulty(d)}>
              {DIFFICULTY[d].name}
            </button>
          ))}
        </div>
        <p className="small muted">{DIFFICULTY[difficulty].blurb}</p>
        </>
        )}

        <div className="btn-row">
          {occupied(chosenSlot) && !confirm ? (
            <Btn kind="go" className="big" onClick={() => setConfirm(true)}>
              Start (replaces slot {chosenSlot})
            </Btn>
          ) : (
            <Btn kind={confirm ? 'danger' : 'go'} className="big" onClick={start} sfx="bell">
              {confirm ? `Yes, replace ${info[chosenSlot - 1]?.name ?? 'it'}` : 'Start this bakery'}
            </Btn>
          )}
          <Btn kind="ghost" onClick={onBack}>
            Back
          </Btn>
        </div>
      </div>
    </main>
  );
}

export function Setup() {
  const { state, dispatch } = useGame();
  const [name, setName] = useState(state.bakeryName);
  const [player, setPlayer] = useState(state.playerName ?? '');
  const [look, setLook] = useState<Look>(state.look);
  const sc = SCENARIOS[state.scenario];
  const [location, setLocation] = useState<LocationId>(state.location);
  return (
    <main className="setup-screen">
      <div className="setup-card wide">
        <h1>Make it yours</h1>
        <p className="muted">
          {sc.inherited ? "Bà (grandma) is retiring and the little bakery on the lane is yours now. Who's behind the counter?" : `${sc.name}: you have ${money(sc.cash)} to build a bakery from scratch. Who's running it?`}
        </p>
        <LookEditor look={look} onChange={setLook} big={8} state={state} />
        {!sc.location && (
          <>
            <h2 className="h3">Where will you open?</h2>
            <div className="scenario-grid" role="radiogroup" aria-label="Neighbourhood">
              {LOCATION_ORDER.map((id) => {
                const l = LOCATIONS[id];
                return (
                  <button key={id} type="button" role="radio" aria-checked={location === id} className={`scenario ${location === id ? 'on' : ''}`} onClick={() => setLocation(id)}>
                    <b>{l.name}</b>
                    <span className="small">{l.blurb}</span>
                    <span className="small effect">
                      Rent {money(l.rent * 30)}/month · foot traffic {l.traffic.toFixed(2)}× · spending {l.income.toFixed(2)}×
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="small muted">Cheap rent usually means fewer passers-by; a busy street costs more every month. That trade-off is opportunity cost.</p>
          </>
        )}
        <form
          className="rename"
          onSubmit={(e) => {
            e.preventDefault();
            play('bell');
            dispatch({ type: 'setup', name, look, location, player });
          }}
        >
          <div className="rename-fields">
            <span className="field">
              <label htmlFor="setup-player">What’s your name?</label>
              <input id="setup-player" value={player} maxLength={16} placeholder="First name or nickname" autoComplete="off" onChange={(e) => setPlayer(e.target.value)} />
            </span>
            <span className="field">
              <label htmlFor="setup-name">Name your bakery</label>
              <input id="setup-name" value={name} maxLength={28} autoComplete="off" onChange={(e) => setName(e.target.value)} />
            </span>
          </div>
          <Btn type="submit" kind="go" className="big" sfx={null} disabled={lookLocked(look, state)}>
            That&apos;s me!
          </Btn>
        </form>
      </div>
    </main>
  );
}

const INTRO = [
  { vi: 'Tiệm bánh là của con rồi.', en: 'The bakery is yours now.' },
  { vi: 'Mở cửa nào!', en: "Let's open the doors." },
];

const INTRO_GUIDED = [
  { vi: 'Tiệm bánh là của con rồi.', en: 'The bakery is yours now.' },
  { vi: 'Bà sẽ chỉ con từng bước.', en: 'I’ll show you, one step at a time.' },
];

export function IntroLines({ onDone, guided = false }: { onDone: () => void; guided?: boolean }) {
  const { state } = useGame();
  const lines = guided ? INTRO_GUIDED : INTRO;
  const [i, setI] = useState(0);
  const next = () => {
    play('pop');
    if (i + 1 >= lines.length) onDone();
    else setI(i + 1);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="intro-box" role="dialog" aria-label="Opening">
      <p className="intro-vi" lang="vi" key={i}>
        {lines[i].vi}
      </p>
      <p className="intro-en">{i === 0 && state.playerName ? `The bakery is yours now, ${state.playerName}.` : lines[i].en}</p>
      <Btn kind="go" onClick={next} sfx={null} className="big" data-spot="intro-next">
        {i + 1 >= lines.length ? (guided ? 'Let’s start!' : 'Open the doors') : 'Next'}
      </Btn>
    </div>
  );
}
