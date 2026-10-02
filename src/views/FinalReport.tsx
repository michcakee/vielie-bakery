import { RotateCcw } from 'lucide-react';
import { LineChart } from '../components/Charts';
import { useGame } from '../components/GameContext';
import { Term } from '../components/Term';
import { businessProfile, finalSummary } from '../game/profile';
import { money, pct, signedMoney } from '../lib/format';

export function FinalReport() {
  const { state, dispatch } = useGame();
  const s = finalSummary(state);
  const profile = businessProfile(state, s);

  return (
    <main className="final" aria-labelledby="final-h">
      <header className="final-head">
        <p className="final-kicker">Vielie Bakery after 30 days</p>
        <h1 id="final-h">{profile.title}</h1>
        <p className="final-summary">{profile.summary}</p>
      </header>

      <section className="final-figs" aria-label="Season results">
        <Fig label={<Term concept="profit">Total net profit</Term>} value={signedMoney(s.totalNetProfit)} tone={s.totalNetProfit >= 0 ? 'pos' : 'neg'} />
        <Fig label={<Term concept="liquidity">Final cash</Term>} value={money(s.finalCash)} note={`${s.runwayDays.toFixed(1)} days of fixed costs`} />
        <Fig label="Net worth (equity)" value={money(s.netWorth)} note={`${signedMoney(s.netWorthChange)} since day 1`} />
        <Fig label={<Term concept="margin">Operating margin</Term>} value={pct(s.operatingMargin, 1)} />
        <Fig label="Green score" value={`${s.greenStart} → ${s.greenEnd}`} />
        <Fig label="Waste, first week → last week" value={`${pct(s.wasteRateFirstWeek)} → ${pct(s.wasteRateLastWeek)}`} />
        <Fig label="Customer satisfaction" value={`${s.avgSatisfaction.toFixed(0)}/100`} note={`reputation ${Math.round(s.reputation)}/100`} />
        <Fig
          label={<Term concept="roi">Investment efficiency</Term>}
          value={s.invested ? `${pct((s.investmentDailyBenefit * 365) / s.invested)} a year` : 'No equipment'}
          note={s.invested ? `${money(s.invested)} invested, ${money(s.investmentDailyBenefit)}/day benefit` : undefined}
        />
        <Fig label="Debt outstanding" value={money(s.debt)} tone={s.debt > 0 ? 'neg' : undefined} />
      </section>

      <div className="final-cols">
        <section className="panel">
          <h2>Your strategy, in traits</h2>
          {profile.traits.length ? (
            <ul className="trait-list">
              {profile.traits.map((t) => (
                <li key={t.name}>
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>You kept things steady: few big bets in either direction.</p>
          )}
        </section>
        <section className="panel">
          <h2>Looking back</h2>
          <ul className="reflections">
            {profile.reflections.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <h3 className="chart-title">Cash at closing, day 1 to 30</h3>
          <LineChart values={state.history.map((d) => d.cashAfter)} label="Cash over the season" format={(v) => money(v)} />
          {s.bestDay && (
            <p className="muted">
              Best day: day {s.bestDay.day}, {signedMoney(s.bestDay.profit)} net profit.
            </p>
          )}
        </section>
      </div>

      <section className="panel final-try">
        <h2>Try a different bakery</h2>
        <p>
          Every season gets new weather, prices and events. Next time, try the opposite strategy: if you priced high, try volume; if you avoided debt, borrow for
          equipment early and see whether the return beats the interest.
        </p>
        <button className="btn btn-bake" onClick={() => dispatch({ type: 'newGame' })}>
          <RotateCcw size={18} aria-hidden="true" /> Play a new season
        </button>
      </section>
    </main>
  );
}

function Fig({ label, value, note, tone }: { label: React.ReactNode; value: string; note?: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="final-fig">
      <span className="final-fig-label">{label}</span>
      <span className={`final-fig-value ${tone ?? ''}`}>{value}</span>
      {note && <span className="final-fig-note">{note}</span>}
    </div>
  );
}
