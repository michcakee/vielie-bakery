import { Landmark, Lock } from 'lucide-react';
import { useState } from 'react';
import { FIXED_COST_TOTAL, INVESTMENTS, LOAN, UNLOCKS } from '../config/balance';
import { LineChart } from '../components/Charts';
import { useGame } from '../components/GameContext';
import { Term } from '../components/Term';
import { balanceSheet, breakEven, cashRunwayDays, dailyInterest, margin, sumIncome } from '../game/finance';
import { borrowCapacity, isUnlocked } from '../game/state';
import type { DayResult } from '../game/types';
import { money, money2, pct } from '../lib/format';

type Period = 'day' | 'week' | 'all';

export function FinancesView() {
  const { state } = useGame();
  const [period, setPeriod] = useState<Period>('day');
  const days: DayResult[] = period === 'day' ? state.history.slice(-1) : period === 'week' ? state.history.slice(-7) : state.history;
  const inc = sumIncome(days);
  const bs = balanceSheet(state);
  const be = breakEven(state, 0.65);
  const greenInvested = state.owned.reduce((s, id) => s + INVESTMENTS[id].cost, 0);
  const periodLabel = period === 'day' ? (state.history.length ? `day ${state.history[state.history.length - 1].day}` : 'no trading yet') : period === 'week' ? 'last 7 days' : 'all days';

  return (
    <div className="finances">
      <section className="panel" aria-labelledby="metrics-h">
        <div className="panel-head panel-head-row">
          <div>
            <h2 id="metrics-h">The books</h2>
            <p className="panel-sub">Click any underlined word for a plain-language explanation.</p>
          </div>
          <div className="seg" role="group" aria-label="Period">
            {(['day', 'week', 'all'] as Period[]).map((p) => (
              <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>
                {p === 'day' ? 'Last day' : p === 'week' ? '7 days' : 'Season'}
              </button>
            ))}
          </div>
        </div>
        <dl className="metric-grid">
          <Metric label={<Term concept="liquidity">Cash</Term>} value={money(state.cash)} />
          <Metric label={<Term concept="revenue" />} value={money(inc.revenue)} note={periodLabel} />
          <Metric label="Expenses" value={money(inc.cogs + inc.operatingExpenses + inc.interest)} note={periodLabel} />
          <Metric label={<Term concept="profit">Operating profit</Term>} value={money(inc.operatingProfit)} tone={inc.operatingProfit >= 0 ? 'pos' : 'neg'} note={periodLabel} />
          <Metric label={<Term concept="margin">Profit margin</Term>} value={pct(margin(inc.operatingProfit, inc.revenue), 1)} note="operating" />
          <Metric label={<Term concept="inventory">Inventory value</Term>} value={money(bs.inventory)} />
          <Metric label="Debt" value={money(bs.totalLiabilities)} tone={bs.totalLiabilities > 0 ? 'neg' : undefined} />
          <Metric label={<Term concept="interest">Interest expense</Term>} value={money2(inc.interest)} note={periodLabel} />
          <Metric label="Green investment" value={money(greenInvested)} note="equipment bought" />
          <Metric label="Waste cost" value={money(inc.waste)} tone={inc.waste > 0 ? 'neg' : undefined} note={periodLabel} />
        </dl>
      </section>

      <div className="two-col">
        <section className="panel statement" aria-labelledby="is-h">
          <h2 id="is-h">Income statement</h2>
          <p className="panel-sub">What the bakery earned and spent ({periodLabel}).</p>
          {days.length === 0 ? (
            <p className="empty">Bake and open the shop to see your first income statement.</p>
          ) : (
            <table className="ledger">
              <tbody>
                <Row label={<Term concept="revenue" />} v={inc.revenue} strong />
                <Row label="Ingredients and packaging sold" v={-inc.cogs} indent />
                <Row label="Gross profit" v={inc.grossProfit} strong rule />
                <Row label={<>Wages, rent and admin (<Term concept="fixedCost">fixed</Term>)</>} v={-(inc.wages + inc.rent + inc.admin)} indent />
                <Row label="Energy" v={-inc.energy} indent />
                <Row label="Waste and spoilage" v={-inc.waste} indent />
                <Row label={<Term concept="depreciation" />} v={-inc.depreciation} indent />
                <Row label="Operating profit" v={inc.operatingProfit} strong rule />
                <Row label={<Term concept="interest" />} v={-inc.interest} indent />
                <Row label="Net profit" v={inc.netProfit} strong rule total />
              </tbody>
            </table>
          )}
        </section>

        <section className="panel statement" aria-labelledby="bs-h">
          <h2 id="bs-h">Balance sheet</h2>
          <p className="panel-sub">What the bakery owns and owes, right now.</p>
          <table className="ledger">
            <tbody>
              <Row label="Cash" v={bs.cash} indent />
              <Row label={<Term concept="inventory">Inventory</Term>} v={bs.inventory} indent />
              <Row label={<>Equipment, after <Term concept="depreciation">depreciation</Term></>} v={bs.equipment} indent />
              <Row label="Total assets" v={bs.totalAssets} strong rule />
              <Row label="Bank loan" v={bs.loan} indent />
              <Row label="Overdraft" v={bs.overdraft} indent />
              <Row label="Total debts" v={bs.totalLiabilities} strong rule />
              <Row label="Owner's starting capital" v={bs.ownerCapital} indent />
              <Row label="Profit kept in the business" v={bs.retainedEarnings} indent />
              <Row label="Owner's equity" v={bs.equity} strong rule total />
            </tbody>
          </table>
          <p className="ledger-check">
            Assets {money(bs.totalAssets)} = debts {money(bs.totalLiabilities)} + equity {money(bs.equity)}
          </p>
        </section>
      </div>

      <div className="two-col">
        <section className="panel" aria-labelledby="be-h">
          <h2 id="be-h">
            <Term concept="breakEven">Break-even</Term>
          </h2>
          <p className="big-figure">{Number.isFinite(be.revenueNeeded) ? money(be.revenueNeeded) : 'Not reachable'}</p>
          <p>
            of sales a day covers fixed costs of {money(be.fixedPerDay)}. Each $1 of sales keeps about {money2(be.contributionRatio)} after variable costs
            {state.history.length ? ' (your last 7 days).' : ' (planning estimate).'}
          </p>
          <p className="muted">
            Cash covers {cashRunwayDays(state).toFixed(1)} days of fixed costs ({money(FIXED_COST_TOTAL)} a day) if nothing sold — your{' '}
            <Term concept="liquidity">liquidity</Term> cushion.
          </p>
        </section>
        <section className="panel" aria-labelledby="chart-h">
          <h2 id="chart-h">Cash and profit by day</h2>
          <h3 className="chart-title">Cash at closing</h3>
          <LineChart values={state.history.map((d) => d.cashAfter)} label="Cash at closing" format={(v) => money(v)} />
          <h3 className="chart-title">Net profit</h3>
          <LineChart values={state.history.map((d) => d.income.netProfit)} label="Net profit by day" zero format={(v) => money(v)} />
        </section>
      </div>

      <BankPanel />
    </div>
  );
}

function BankPanel() {
  const { state, dispatch } = useGame();
  const unlocked = isUnlocked(state, 'finance');
  const cap = borrowCapacity(state);
  const debt = state.loan + state.overdraft;
  return (
    <section className="panel bank" aria-labelledby="bank-h">
      <div className="panel-head">
        <h2 id="bank-h">
          <Landmark size={18} aria-hidden="true" /> Vielie Lane Credit Union
        </h2>
        <p className="panel-sub">
          Borrowing gives you cash today in exchange for <Term concept="interest">interest</Term> every day until you repay. It is worth it when what you buy earns more
          than the loan costs.
        </p>
      </div>
      {!unlocked ? (
        <p className="locked-panel">
          <Lock size={14} aria-hidden="true" /> Business loans open on day {UNLOCKS.finance}.
        </p>
      ) : (
        <div className="bank-grid">
          <dl>
            <div>
              <dt>Loan</dt>
              <dd>
                {money(state.loan)} at {pct(LOAN.apr)} a year
              </dd>
            </div>
            <div>
              <dt>Overdraft</dt>
              <dd className={state.overdraft > 0 ? 'neg' : ''}>
                {money(state.overdraft)} at {pct(LOAN.overdraftApr)} a year
              </dd>
            </div>
            <div>
              <dt>Interest per day</dt>
              <dd>{money2(dailyInterest(state.loan, state.overdraft))}</dd>
            </div>
            <div>
              <dt>Still available</dt>
              <dd>{money(cap)}</dd>
            </div>
          </dl>
          <div className="bank-actions">
            <button className="btn" disabled={cap <= 0 || state.phase !== 'morning'} onClick={() => dispatch({ type: 'borrow', amount: LOAN.step })}>
              Borrow {money(LOAN.step)}
            </button>
            <button className="btn" disabled={cap < LOAN.step * 4 || state.phase !== 'morning'} onClick={() => dispatch({ type: 'borrow', amount: LOAN.step * 4 })}>
              Borrow {money(LOAN.step * 4)}
            </button>
            <button className="btn btn-ghost" disabled={debt <= 0 || state.cash <= 0 || state.phase !== 'morning'} onClick={() => dispatch({ type: 'repay', amount: LOAN.step })}>
              Repay {money(Math.min(LOAN.step, debt))}
            </button>
            <button className="btn btn-ghost" disabled={debt <= 0 || state.cash < debt || state.phase !== 'morning'} onClick={() => dispatch({ type: 'repay', amount: debt })}>
              Repay all
            </button>
          </div>
          <p className="muted bank-note">
            A {money(2000)} loan costs about {money2((2000 * LOAN.apr) / 365)} a day. If cash runs out at closing, the bank lends automatically as an overdraft at{' '}
            {pct(LOAN.overdraftApr)} — repaid first whenever you repay.
          </p>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, note, tone }: { label: React.ReactNode; value: string; note?: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="metric">
      <dt>{label}</dt>
      <dd className={tone}>{value}</dd>
      {note && <span className="metric-note">{note}</span>}
    </div>
  );
}

function Row({ label, v, strong, indent, rule, total }: { label: React.ReactNode; v: number; strong?: boolean; indent?: boolean; rule?: boolean; total?: boolean }) {
  return (
    <tr className={`${strong ? 'is-strong' : ''} ${indent ? 'is-indent' : ''} ${rule ? 'is-rule' : ''} ${total ? 'is-total' : ''}`}>
      <th scope="row">{label}</th>
      <td className={v < 0 ? 'neg' : ''}>{money2(v)}</td>
    </tr>
  );
}
