import { useEffect, useState } from 'react';
import { hasOldSave, slotInfo, SLOTS } from '../../engine/save';
import { DIFFICULTY, type Difficulty } from '../../data/config';
import { GOALS, LOCATIONS, LOCATION_ORDER, SCENARIOS, SCENARIO_ORDER } from '../../data/world';
import { DEFAULT_LOOK } from '../../engine/state';
import type { LocationId, Look, ScenarioId } from '../../engine/types';
import { money } from '../../lib/format';
import { play, startMusic } from '../audio';
import { useGame } from '../GameContext';
import { Btn } from '../kit';
import { LookEditor } from '../LookEditor';
import { Person, Sprite } from '../pixel/Sprite';
import { Exterior } from './Exterior';

export function Loading({ onDone }: { onDone: () => void }) {
  const { reduced } = useGame();
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const a = window.setTimeout(() => setStage(1), reduced ? 100 : 900);
    const b = window.setTimeout(onDone, reduced ? 200 : 1700);
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
          <Person look={{ ...DEFAULT_LOOK, apron: 0, accessory: 4 }} scale={5} walking />
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

export function Title({ onContinue, onNew }: { onContinue: () => void; onNew: () => void }) {
  const { state, reduced } = useGame();
  const resumable = state.phase !== 'setup';
  const old = hasOldSave();
  return (
    <main className="title-screen">
      <Exterior still={reduced} />
      <div className="title-card">
        <p className="title-hello" lang="vi">
          Chào buổi sáng!
        </p>
        <h1 className="title-logo">
          <span>Vielie</span>
          <span>Bakery</span>
        </h1>
        <p className="title-sub">
          A cozy Vietnamese bakery sandbox. Bake bánh mì and mooncakes, hire a team, outsmart rival bakeries, ride out recessions, and grow a little tiệm bánh into a citywide brand.
        </p>
        <div className="title-buttons">
          {resumable && (
            <Btn kind="go" className="big" onClick={() => (startMusic(), onContinue())} sfx="bell">
              Continue: {state.bakeryName}, day {state.day}
            </Btn>
          )}
          <Btn kind={resumable ? 'ghost' : 'go'} className={resumable ? '' : 'big'} onClick={() => (startMusic(), onNew())} sfx="bell">
            {resumable ? (
              'New game or another slot'
            ) : (
              <>
                <span lang="vi">Mở cửa!</span> Start a bakery
              </>
            )}
          </Btn>
        </div>
        {old && !resumable && <p className="small muted">The bakery has had a makeover since your last visit, so this is a fresh start.</p>}
        <p className="small muted">Saves in your browser. No account needed. Works offline.</p>
      </div>
      <div className="title-float" aria-hidden="true">
        {['banhMi', 'caPhe', 'flan', 'banhBo', 'traTac'].map((n, i) => (
          <span key={n} className={`float f${i}`}>
            <Sprite name={n} scale={3} />
          </span>
        ))}
      </div>
    </main>
  );
}

export function NewGame({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const { state, dispatch, slot, switchSlot } = useGame();
  const [chosenSlot, setChosenSlot] = useState(slot);
  const [scenario, setScenario] = useState<ScenarioId>('family');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [confirm, setConfirm] = useState(false);
  const info = slotInfo();
  const occupied = (n: number) => !!info[n - 1];
  const start = () => {
    if (chosenSlot !== slot) switchSlot(chosenSlot);
    dispatch({ type: 'newGame', options: { scenario, difficulty, name: state.bakeryName, look: state.look } });
    onStart();
  };
  return (
    <main className="setup-screen">
      <div className="setup-card wide">
        <h1>New bakery</h1>
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

        <h2 className="h3">Scenario</h2>
        <div className="scenario-grid" role="radiogroup" aria-label="Scenario">
          {SCENARIO_ORDER.map((id) => {
            const sc = SCENARIOS[id];
            return (
              <button key={id} type="button" role="radio" aria-checked={scenario === id} className={`scenario ${scenario === id ? 'on' : ''}`} onClick={() => (setScenario(id), setDifficulty(sc.difficulty))}>
                <b>{sc.name}</b>
                <span className="small muted" lang="vi">
                  {sc.vi}
                </span>
                <span className="small">{sc.blurb}</span>
                <span className="small effect">Goal: {GOALS[sc.goal].name}</span>
              </button>
            );
          })}
        </div>

        <h2 className="h3">Difficulty</h2>
        <div className="seg big-seg" role="radiogroup" aria-label="Difficulty">
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
            <button key={d} type="button" role="radio" aria-checked={difficulty === d} className={difficulty === d ? 'on' : ''} onClick={() => setDifficulty(d)}>
              {DIFFICULTY[d].name}
            </button>
          ))}
        </div>
        <p className="small muted">{DIFFICULTY[difficulty].blurb}</p>

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
        <LookEditor look={look} onChange={setLook} big={8} />
        {!sc.location && (
          <>
            <h2 className="h3">Where will you open?</h2>
            <div className="scenario-grid" role="radiogroup" aria-label="Neighbourhood">
              {LOCATION_ORDER.map((id) => {
                const l = LOCATIONS[id];
                return (
                  <button key={id} type="button" role="radio" aria-checked={location === id} className={`scenario ${location === id ? 'on' : ''}`} onClick={() => setLocation(id)}>
                    <b>{l.name}</b>
                    <span className="small muted" lang="vi">
                      {l.vi}
                    </span>
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
            dispatch({ type: 'setup', name, look, location });
          }}
        >
          <label htmlFor="setup-name">Name your bakery</label>
          <input id="setup-name" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} />
          <Btn type="submit" kind="go" className="big" sfx={null}>
            That&apos;s me!
          </Btn>
        </form>
      </div>
    </main>
  );
}

const INTRO = [
  { vi: 'Chào buổi sáng!', en: 'Good morning!' },
  { vi: 'Tiệm bánh là của con rồi.', en: 'The bakery is yours now.' },
  { vi: 'Mở cửa nào!', en: "Let's open the doors." },
];

export function IntroLines({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const next = () => {
    play('pop');
    if (i + 1 >= INTRO.length) onDone();
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
        {INTRO[i].vi}
      </p>
      <p className="intro-en">{INTRO[i].en}</p>
      <Btn kind="go" onClick={next} sfx={null} className="big">
        {i + 1 >= INTRO.length ? 'Open the doors' : 'Next'}
      </Btn>
    </div>
  );
}
