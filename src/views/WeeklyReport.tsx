import { WEEK_THEMES } from '../config/balance';
import { LineChart } from '../components/Charts';
import { Modal } from '../components/Modal';
import { useGame } from '../components/GameContext';
import { Term } from '../components/Term';
import { margin, sumIncome } from '../game/finance';
import { weeklyInsights } from '../game/insights';
import { money, pct, signedMoney } from '../lib/format';

export function WeeklyReport() {
  const { state, dispatch } = useGame();
  const week = Math.ceil(state.day / 7);
  const days = state.history.slice(-7);
  const previous = state.history.slice(-14, -7);
  const inc = sumIncome(days);
  const prevInc = previous.length ? sumIncome(previous) : null;
  const produced = days.reduce((s, d) => s + d.unitsProduced, 0);
  const wasted = days.reduce((s, d) => s + d.unitsWasted, 0);
  const cashStart = days[0]?.cashBefore ?? state.cash;
  const satisfaction = days.reduce((s, d) => s + d.satisfaction, 0) / Math.max(1, days.length);
  const insights = weeklyInsights(state, days, previous);
  const decisions = state.decisions.filter((d) => d.day > state.day - 7);
  const next = WEEK_THEMES[Math.min(WEEK_THEMES.length - 1, week)];

  return (
    <Modal label={`Vielie weekly report, week ${week}`} className="modal-weekly">
      <article className="weekly">
        <header>
          <p className="weekly-kicker">Week {week} of 4</p>
          <h2>Vielie Weekly Report</h2>
        </header>
        <dl className="weekly-figs">
          <Fig label={<Term concept="revenue" />} value={money(inc.revenue)} delta={prevInc ? inc.revenue - prevInc.revenue : null} />
          <Fig label="Costs" value={money(inc.revenue - inc.netProfit)} />
          <Fig label={<Term concept="profit">Net profit</Term>} value={money(inc.netProfit)} delta={prevInc ? inc.netProfit - prevInc.netProfit : null} tone={inc.netProfit >= 0 ? 'pos' : 'neg'} />
          <Fig label={<Term concept="margin">Margin</Term>} value={pct(margin(inc.operatingProfit, inc.revenue), 1)} />
          <Fig label="Cash change" value={signedMoney(state.cash - cashStart)} tone={state.cash >= cashStart ? 'pos' : 'neg'} />
          <Fig label="Waste" value={`${wasted} items (${pct(produced ? wasted / produced : 0)})`} />
          <Fig label="Green score" value={`${state.greenScore}/100`} />
          <Fig label="Customer satisfaction" value={`${satisfaction.toFixed(0)}/100`} />
        </dl>

        <div className="weekly-chart">
          <h3>Profit each day</h3>
          <LineChart values={days.map((d) => d.income.netProfit)} label="Daily net profit this week" zero format={(v) => money(v)} />
        </div>

        <section>
          <h3>What the numbers say</h3>
          {insights.map((i) => (
            <div className="insight" key={i.title}>
              <h4>{i.title}</h4>
              <p>{i.body}</p>
              <Term concept={i.concept}>About this idea</Term>
            </div>
          ))}
        </section>

        <section>
          <h3>Notable decisions</h3>
          {decisions.length ? (
            <ul className="decision-list">
              {decisions.map((d, i) => (
                <li key={i}>
                  <span className="muted">Day {d.day}</span> {d.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">You kept prices, packaging and equipment unchanged this week.</p>
          )}
        </section>

        <section className="weekly-next">
          <h3>{next.title}</h3>
          <p>{next.focus}</p>
        </section>
      </article>
      <button className="btn btn-bake" onClick={() => dispatch({ type: 'continue' })} autoFocus>
        Start day {state.day + 1}
      </button>
    </Modal>
  );
}

function Fig({ label, value, delta, tone }: { label: React.ReactNode; value: string; delta?: number | null; tone?: 'pos' | 'neg' }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={tone}>{value}</dd>
      {delta != null && <span className={`delta ${delta >= 0 ? 'pos' : 'neg'}`}>{signedMoney(delta)} vs last week</span>}
    </div>
  );
}
