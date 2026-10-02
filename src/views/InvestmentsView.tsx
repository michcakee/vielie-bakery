import { Check, Lock } from 'lucide-react';
import { INVESTMENTS, INVESTMENT_ORDER, SOURCING, UNLOCKS } from '../config/balance';
import { useGame } from '../components/GameContext';
import { Term } from '../components/Term';
import { analyseInvestment } from '../game/investments';
import { canAfford, isUnlocked } from '../game/state';
import { greenBreakdown } from '../game/sustainability';
import type { InvestmentId, SourcingId } from '../game/types';
import { days, money, money2, pct } from '../lib/format';

export function InvestmentsView() {
  const { state } = useGame();
  const unlocked = isUnlocked(state, 'finance');
  return (
    <div className="investments">
      <section className="panel" aria-labelledby="inv-h">
        <div className="panel-head">
          <h2 id="inv-h">Equipment</h2>
          <p className="panel-sub">
            Investment means spending cash now to save or earn more later. Estimates use your own recent trading, so they change as your bakery changes. Equipment
            is recorded as an asset and spread over five years as <Term concept="depreciation">depreciation</Term>.
          </p>
        </div>
        {!unlocked && (
          <p className="locked-panel">
            <Lock size={14} aria-hidden="true" /> Equipment can be bought from day {UNLOCKS.finance}. Study the numbers now — they update every day.
          </p>
        )}
        <div className="inv-list">
          {INVESTMENT_ORDER.map((id) => (
            <InvestmentCard key={id} id={id} />
          ))}
        </div>
      </section>

      <div className="two-col">
        <SourcingPanel />
        <GreenPanel />
      </div>
    </div>
  );
}

function InvestmentCard({ id }: { id: InvestmentId }) {
  const { state, dispatch } = useGame();
  const cfg = INVESTMENTS[id];
  const a = analyseInvestment(state, id);
  const owned = state.owned.includes(id);
  const unlocked = isUnlocked(state, 'finance');
  const affordable = canAfford(state, cfg.cost);
  const withinGame = a.paybackDays <= 30 - state.day;

  return (
    <article className={`inv ${owned ? 'is-owned' : ''}`} aria-labelledby={`inv-${id}`}>
      <header className="inv-head">
        <h3 id={`inv-${id}`}>{cfg.name}</h3>
        <span className="inv-cost">{money(cfg.cost)}</span>
      </header>
      <ul className="inv-effects">
        {cfg.effects.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
      <dl className="inv-numbers">
        <div>
          <dt>Expected gain</dt>
          <dd>
            {money2(a.dailyBenefit)}/day, {money(a.annualBenefit)}/year
          </dd>
        </div>
        <div>
          <dt>Simple payback</dt>
          <dd>{Number.isFinite(a.paybackDays) ? `${days(a.paybackDays)} (${a.paybackYears.toFixed(2)} years)` : 'Never at current volume'}</dd>
        </div>
        <div>
          <dt>
            <Term concept="roi">Annual return</Term>
          </dt>
          <dd>{pct(a.simpleAnnualReturn)}</dd>
        </div>
      </dl>
      <details className="inv-details">
        <summary>How this is calculated</summary>
        <ul>
          {a.lines.map((l) => (
            <li key={l.label}>
              {l.label}: <b>{money2(l.perDay)}</b> a day
            </li>
          ))}
          <li>
            Payback = {money(cfg.cost)} ÷ {money2(a.dailyBenefit)} a day. Return = yearly savings ÷ cost.
          </li>
          <li>{a.basis}</li>
        </ul>
      </details>
      <p className="inv-tradeoff">
        <b>Trade-off:</b> {cfg.tradeoff}
      </p>
      {!owned && Number.isFinite(a.paybackDays) && (
        <p className="muted inv-horizon">{withinGame ? 'Would pay for itself before day 30.' : 'Pays back after this 30-day season — its value continues in the business.'}</p>
      )}
      <footer>
        {owned ? (
          <span className="owned-badge">
            <Check size={14} aria-hidden="true" /> Installed
          </span>
        ) : (
          <button className="btn btn-primary" disabled={!unlocked || !affordable || state.phase !== 'morning'} onClick={() => dispatch({ type: 'buyInvestment', id })}>
            {!unlocked ? `Available day ${UNLOCKS.finance}` : affordable ? `Buy for ${money(cfg.cost)}` : `Need ${money(cfg.cost - state.cash)} more cash`}
          </button>
        )}
      </footer>
    </article>
  );
}

function SourcingPanel() {
  const { state, dispatch } = useGame();
  const unlocked = isUnlocked(state, 'competition');
  return (
    <section className="panel" aria-labelledby="src-h">
      <h2 id="src-h">Ingredient sourcing</h2>
      <p className="panel-sub">
        Local ingredients cost more, but customers and the planet notice. Is the extra demand worth the higher <Term concept="variableCost">variable cost</Term>?
      </p>
      {!unlocked && (
        <p className="locked-panel">
          <Lock size={14} aria-hidden="true" /> Local farm contracts open on day {UNLOCKS.competition}.
        </p>
      )}
      <div className="choice-row" role="radiogroup" aria-labelledby="src-h">
        {(Object.keys(SOURCING) as SourcingId[]).map((id) => {
          const cfg = SOURCING[id];
          const on = state.sourcing === id;
          return (
            <button key={id} role="radio" aria-checked={on} className={`choice ${on ? 'is-on' : ''}`} disabled={!unlocked || state.phase !== 'morning'} onClick={() => dispatch({ type: 'setSourcing', sourcing: id })}>
              <span className="choice-title">{cfg.name}</span>
              <span className="choice-meta">
                Ingredients ×{cfg.ingredientCostMult.toFixed(2)}, demand ×{cfg.demandMult.toFixed(2)}
              </span>
              <span className="choice-desc">{cfg.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GreenPanel() {
  const { state } = useGame();
  const parts = greenBreakdown(state);
  return (
    <section className="panel" aria-labelledby="green-h">
      <h2 id="green-h">What makes your green score</h2>
      <p className="panel-sub">
        Not a badge: it raises or lowers demand by up to 10%, and feeds your reputation. Waste and packaging are{' '}
        <Term concept="externality">externalities</Term> — costs that land on the town as well as on you.
      </p>
      <ul className="green-list">
        {parts.map((p) => (
          <li key={p.label}>
            <span>{p.label}</span>
            <b className={p.points > 0 && p.label !== 'Starting point' ? 'pos' : p.points < 0 ? 'neg' : ''}>
              {p.label === 'Starting point' ? '' : p.points > 0 ? '+' : '−'}
              {Math.abs(Math.round(p.points))}
            </b>
          </li>
        ))}
        <li className="green-total">
          <span>Green score</span>
          <b>{state.greenScore}</b>
        </li>
      </ul>
    </section>
  );
}
