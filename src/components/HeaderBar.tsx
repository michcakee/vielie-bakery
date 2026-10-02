import { GAME_LENGTH_DAYS, WEEKDAYS, WEEK_THEMES } from '../config/balance';
import { weekdayIndex } from '../game/economy';
import { money } from '../lib/format';
import { AnimatedNumber } from './AnimatedNumber';
import { useGame } from './GameContext';
import { Term } from './Term';

export function weekTheme(day: number) {
  return WEEK_THEMES[Math.min(WEEK_THEMES.length - 1, Math.floor((day - 1) / 7))];
}

export function HeaderBar({ onHome }: { onHome: () => void }) {
  const { state } = useGame();
  const debt = state.loan + state.overdraft;
  const theme = weekTheme(state.day);
  return (
    <header className="ledger-bar" data-tour="ledger">
      <button className="wordmark" onClick={onHome} aria-label="Vielie Bakery, back to title screen">
        <span>Vielie</span>
        <span className="wordmark-sub">Bakery</span>
      </button>
      <div className="ledger-day">
        <div className="day-dial" aria-hidden="true">
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" className="dial-track" />
            <circle cx="18" cy="18" r="15" className="dial-fill" style={{ strokeDasharray: `${(state.day / GAME_LENGTH_DAYS) * 94.2} 94.2` }} />
          </svg>
        </div>
        <div>
          <p className="ledger-day-main">
            Day {state.day} <span className="muted">of {GAME_LENGTH_DAYS}</span>, {WEEKDAYS[weekdayIndex(state.day)]}
          </p>
          <p className="ledger-day-theme">{theme.title}</p>
        </div>
      </div>
      <dl className="ledger-figures">
        <div className="fig fig-cash">
          <dt>Cash</dt>
          <dd>
            <AnimatedNumber value={state.cash} format={(v) => money(v)} />
          </dd>
        </div>
        <div className="fig">
          <dt>
            <Term concept="externality">Green</Term>
          </dt>
          <dd>
            <AnimatedNumber value={state.greenScore} format={(v) => Math.round(v).toString()} />
            <small>/100</small>
          </dd>
        </div>
        <div className="fig">
          <dt>Reputation</dt>
          <dd>
            <AnimatedNumber value={state.reputation} format={(v) => Math.round(v).toString()} />
            <small>/100</small>
          </dd>
        </div>
        <div className={`fig ${debt > 0 ? 'fig-debt' : ''}`}>
          <dt>
            <Term concept="interest">Debt</Term>
          </dt>
          <dd>
            <AnimatedNumber value={debt} format={(v) => money(v)} />
          </dd>
        </div>
      </dl>
    </header>
  );
}
