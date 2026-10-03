import { useState } from 'react';
import { clearAllData, clearSave, exportCode, importCode, restoreLink } from '../engine/save';
import { useGame } from './GameContext';
import { Btn } from './kit';
import { NOTEBOOK, NOTEBOOK_ORDER } from '../data/notebook';
import { CreditsPage, LegalPage } from './Legal';
import { Modal } from './overlays';

function Toggle({ label, hint, on, set }: { label: string; hint?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <span className="toggle-ui" aria-hidden="true" />
      <span>
        <b>{label}</b>
        {hint && <span className="small muted">{hint}</span>}
      </span>
    </label>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What the player has learned, behind a small arithmetic gate so it's clearly for adults. Nothing leaves the device. */
function GrownUpSummary() {
  const { state } = useGame();
  const [answer, setAnswer] = useState('');
  const [open, setOpen] = useState(false);
  const learned = NOTEBOOK_ORDER.filter((k) => state.learned.includes(k) && NOTEBOOK[k].professor);
  const total = NOTEBOOK_ORDER.filter((k) => NOTEBOOK[k].professor).length;
  const guesses = state.questProgress.predictions ?? 0;
  const right = state.questProgress.predictionsRight ?? 0;
  if (!open) {
    return (
      <div className="settings-group grownup-gate">
        <p className="small">A summary of what the player has learned, for a parent or teacher. To open it, what is 7 × 8?</p>
        <div className="btn-row">
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} inputMode="numeric" aria-label="Seven times eight" className="num-in" />
          <Btn disabled={answer.trim() !== '56'} onClick={() => setOpen(true)}>
            Open
          </Btn>
        </div>
      </div>
    );
  }
  return (
    <div className="settings-group grownup">
      <p className="small">
        <b>Concepts unlocked:</b> {learned.length} of {total}. <b>Predictions:</b> {guesses} made, {right} right{guesses ? ` (${Math.round((right / guesses) * 100)}%)` : ''}. <b>Days played:</b> {state.day}. Nothing here is sent anywhere; it is read from the save on this device.
      </p>
      {learned.length > 0 && (
        <>
          <p className="small">
            <b>Unlocked so far:</b> {learned.map((k) => NOTEBOOK[k].term).join(' · ')}
          </p>
          <p className="small">
            <b>Conversation starters:</b>
          </p>
          <ul className="small">
            {learned.slice(-5).map((k) => (
              <li key={k}>{NOTEBOOK[k].askGrownUp}</li>
            ))}
          </ul>
        </>
      )}
      <p className="small muted">Every concept has a Professor's note in the bakery notebook (Finances tab) with the formal version.</p>
    </div>
  );
}

export function Settings({ onClose, onQuit }: { onClose: () => void; onQuit: () => void }) {
  const { state, dispatch, prefs, setPrefs, slot } = useGame();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  // Typed for one email only; never saved anywhere.
  const [email, setEmail] = useState('');
  const [confirmReset, setConfirmReset] = useState('');
  const [confirmWipe, setConfirmWipe] = useState('');
  const [page, setPage] = useState<'privacy' | 'terms' | 'credits' | null>(null);

  const copy = async () => {
    const c = await exportCode(state);
    try {
      await navigator.clipboard.writeText(c);
      setMsg('Save code copied. Paste it somewhere safe.');
    } catch {
      setCode(c);
      setMsg('Copy the code from the box below.');
    }
  };

  const load = async () => {
    const s = await importCode(code);
    if (!s) {
      setMsg('Oops! That code got a bit mixed up in the kitchen. Check you copied all of it.');
      return;
    }
    dispatch({ type: 'load', state: s });
    setMsg(`Welcome back to ${s.bakeryName}, day ${s.day}!`);
  };

  const mail = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setMsg('That email doesn\'t look quite right.');
      return;
    }
    const c = await exportCode(state);
    const link = restoreLink(c);
    const subject = encodeURIComponent(`${state.bakeryName}: day ${state.day} save`);
    const body = encodeURIComponent(
      `Your bakery is saved!\n\nOpen this link on any device to carry on from day ${state.day}:\n${link}\n\nOr paste this save code into Settings → Load a save:\n${c}\n\nChúc một ngày tốt lành!`,
    );
    window.location.href = `mailto:${encodeURIComponent(email.trim())}?subject=${subject}&body=${body}`;
    setMsg('Your email app should open with a restore link. Send it to yourself to keep it.');
  };

  return (
    <Modal label="Settings" onClose={onClose} className="drawer settings">
      <h2>Settings</h2>
      <div className="settings-group">
        <Toggle label="Sound effects" on={prefs.sound} set={(v) => setPrefs({ sound: v })} />
        <Toggle label="Music" hint="A gentle pentatonic tune" on={prefs.music} set={(v) => setPrefs({ music: v })} />
        <Toggle label="Relaxed pace" hint="Slower days and more patient customers" on={prefs.relaxed} set={(v) => setPrefs({ relaxed: v })} />
        <Toggle label="English under Vietnamese" hint="Show translations in speech bubbles" on={prefs.translations} set={(v) => setPrefs({ translations: v })} />
        <Toggle label="Reduce motion" hint="Fewer moving decorations" on={prefs.reducedMotion} set={(v) => setPrefs({ reducedMotion: v })} />
        <Toggle label="Break reminder" hint="A gentle note after 30 minutes of play. Off unless you want it." on={!!prefs.breakReminder} set={(v) => setPrefs({ breakReminder: v })} />
        <Toggle label="Business view" hint="Full financial statements, ratios and elasticities instead of plain words" on={prefs.view === 'business'} set={(v) => setPrefs({ view: v ? 'business' : 'casual' })} />
        <div className="seg" role="radiogroup" aria-label="Text size">
          <span className="small">Text size:</span>
          {[1, 1.15, 1.3].map((t) => (
            <button key={t} type="button" role="radio" aria-checked={(prefs.textScale ?? 1) === t} className={(prefs.textScale ?? 1) === t ? 'on' : ''} onClick={() => setPrefs({ textScale: t })}>
              {t === 1 ? 'Normal' : t === 1.15 ? 'Large' : 'Larger'}
            </button>
          ))}
        </div>
      </div>

      <h3>Saving</h3>
      <p className="small">Your bakery saves automatically in this browser after every change. To move it to another device, or keep a backup, use a save code or email yourself a restore link.</p>
      <div className="settings-group">
        <form
          className="email-form"
          onSubmit={(e) => {
            e.preventDefault();
            void mail();
          }}
        >
          <label htmlFor="save-email">Your email</label>
          <input id="save-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Btn type="submit" kind="primary">
            Email me a restore link
          </Btn>
        </form>
        <p className="small muted">This opens your own email app with the link filled in. The game has no server and doesn't keep the address: it's used once to open that email, and that's it.</p>
        <div className="btn-row">
          <Btn onClick={() => void copy()}>Copy save code</Btn>
        </div>
        <label htmlFor="save-code" className="small">
          Load a save
        </label>
        <textarea id="save-code" rows={3} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste a save code here" />
        <Btn disabled={!code.trim()} onClick={() => void load()}>
          Load this save
        </Btn>
        {msg && (
          <p className="note" role="status">
            {msg}
          </p>
        )}
      </div>

      <div className="btn-row">
        <Btn onClick={onQuit} kind="ghost">
          Back to the title screen
        </Btn>
      </div>

      <h3>For grown-ups</h3>
      <GrownUpSummary />

      <h3>About</h3>
      <div className="btn-row">
        <Btn onClick={() => setPage('privacy')}>Privacy policy</Btn>
        <Btn onClick={() => setPage('terms')}>Terms of use</Btn>
        <Btn onClick={() => setPage('credits')}>Credits</Btn>
      </div>
      <p className="small muted">No accounts, no ads, no tracking. Everything is saved on this device only.</p>
      {page === 'credits' && <CreditsPage onClose={() => setPage(null)} />}
      {(page === 'privacy' || page === 'terms') && <LegalPage page={page} onClose={() => setPage(null)} />}

      <h3 className="danger-title">Reset bakery</h3>
      <div className="danger-zone">
        <p className="small">
          <b>This deletes {state.bakeryName} forever</b>: day {state.day}, your money, recipes, decorations and achievements. It can't be undone unless you saved a code first.
        </p>
        <label htmlFor="reset-confirm" className="small">
          Type <b>RESET</b> to confirm
        </label>
        <input id="reset-confirm" value={confirmReset} onChange={(e) => setConfirmReset(e.target.value)} autoComplete="off" />
        <Btn
          kind="danger"
          disabled={confirmReset.trim().toUpperCase() !== 'RESET'}
          onClick={() => {
            clearSave(slot);
            dispatch({ type: 'newGame' });
            setConfirmReset('');
            onClose();
            onQuit();
          }}
        >
          Delete and start over
        </Btn>
      </div>

      <h3 className="danger-title">Delete all my data</h3>
      <div className="danger-zone">
        <p className="small">
          <b>Erases everything this game has stored on this device</b>: all three save slots, their backups and your settings. The page reloads to a clean start. It can't be undone.
        </p>
        <label htmlFor="wipe-confirm" className="small">
          Type <b>DELETE</b> to confirm
        </label>
        <input id="wipe-confirm" value={confirmWipe} onChange={(e) => setConfirmWipe(e.target.value)} autoComplete="off" />
        <Btn
          kind="danger"
          disabled={confirmWipe.trim().toUpperCase() !== 'DELETE'}
          onClick={() => {
            clearAllData();
            window.location.reload();
          }}
        >
          Delete all my data
        </Btn>
      </div>
    </Modal>
  );
}
