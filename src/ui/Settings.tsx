import { useState } from 'react';
import { clearSave, exportCode, importCode, restoreLink } from '../engine/save';
import { useGame } from './GameContext';
import { Btn } from './kit';
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

export function Settings({ onClose, onQuit }: { onClose: () => void; onQuit: () => void }) {
  const { state, dispatch, prefs, setPrefs } = useGame();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [email, setEmail] = useState(prefs.email);
  const [confirmReset, setConfirmReset] = useState('');

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
    setPrefs({ email: email.trim() });
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
        <p className="small muted">This opens your own email app with the link filled in. The game has no server: your email stays on this device and is never sent anywhere by us.</p>
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
            clearSave();
            dispatch({ type: 'newGame' });
            setConfirmReset('');
            onClose();
            onQuit();
          }}
        >
          Delete and start over
        </Btn>
      </div>
    </Modal>
  );
}
