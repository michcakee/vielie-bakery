import { useEffect, useState } from 'react';
import { hasOldSave } from '../../engine/save';
import { DEFAULT_LOOK } from '../../engine/state';
import type { Look } from '../../engine/types';
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
  const { state, hasSave, reduced } = useGame();
  const resumable = hasSave && state.phase !== 'setup';
  const [confirm, setConfirm] = useState(false);
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
          A cozy Vietnamese bakery game. Bake bánh mì, pour cà phê sữa đá, meet the neighbours, and learn how a small business really works.
        </p>
        <div className="title-buttons">
          {resumable ? (
            <>
              <Btn kind="go" className="big" onClick={() => (startMusic(), onContinue())} sfx="bell">
                Continue: day {state.day}, {money(state.cash)}
              </Btn>
              {confirm ? (
                <span className="confirm-new">
                  Start over? {state.bakeryName} will be replaced.
                  <Btn kind="danger" onClick={() => (startMusic(), onNew())}>
                    Yes, new bakery
                  </Btn>
                  <Btn kind="ghost" onClick={() => setConfirm(false)}>
                    Keep mine
                  </Btn>
                </span>
              ) : (
                <Btn kind="ghost" onClick={() => setConfirm(true)}>
                  Start a new bakery
                </Btn>
              )}
            </>
          ) : (
            <Btn kind="go" className="big" onClick={() => (startMusic(), onNew())} sfx="bell">
              <span lang="vi">Mở cửa!</span> Open your bakery
            </Btn>
          )}
        </div>
        {old && !resumable && <p className="small muted">The bakery has had a makeover since your last visit, so this is a fresh start.</p>}
        <p className="small muted">Saves in your browser. No account needed.</p>
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

export function Setup() {
  const { state, dispatch } = useGame();
  const [name, setName] = useState(state.bakeryName);
  const [look, setLook] = useState<Look>(state.look);
  return (
    <main className="setup-screen">
      <div className="setup-card">
        <h1>Make it yours</h1>
        <p className="muted">Bà (grandma) is retiring and the little bakery on the lane is yours now. Who's behind the counter?</p>
        <LookEditor look={look} onChange={setLook} big={8} />
        <form
          className="rename"
          onSubmit={(e) => {
            e.preventDefault();
            play('bell');
            dispatch({ type: 'setup', name, look });
          }}
        >
          <label htmlFor="setup-name">Name your bakery</label>
          <input id="setup-name" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} />
          <Btn type="submit" kind="go" className="big" sfx={null}>
            That's me!
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
