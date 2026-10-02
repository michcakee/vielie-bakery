import { PRODUCTS, PRODUCT_ORDER, WEEKDAYS } from '../config/balance';
import { Modal } from '../components/Modal';
import { ProductArt } from '../components/ProductArt';
import { useGame } from '../components/GameContext';
import { Term } from '../components/Term';
import { weekdayIndex } from '../game/economy';
import { getEvent } from '../game/events';
import { margin } from '../game/finance';
import type { DayResult } from '../game/types';
import { money2, pct, signedMoney } from '../lib/format';

/** Milestones are derived from the history, so they appear exactly once. */
function milestone(history: DayResult[], r: DayResult): string | null {
  const prior = history.slice(0, -1);
  if (r.income.netProfit > 0 && prior.every((d) => d.income.netProfit <= 0)) return 'First profitable day';
  const total = history.reduce((s, d) => s + d.income.revenue, 0);
  const before = total - r.income.revenue;
  for (const m of [5000, 10000, 20000]) if (before < m && total >= m) return `${money2(m).replace('.00', '')} in total sales`;
  if (r.unitsWasted === 0 && r.unitsProduced > 50 && prior.every((d) => d.unitsWasted > 0)) return 'First zero-waste day';
  return null;
}

export function DayReport() {
  const { state, dispatch } = useGame();
  const r = state.lastResult;
  if (!r) return null;
  const inc = r.income;
  const event = getEvent(r.eventId);
  const cashChange = r.cashAfter - r.cashBefore;
  const ms = milestone(state.history, r);
  const isWeekEnd = r.day % 7 === 0;
  const isLast = r.day >= 30;
  const repDelta = r.reputationAfter - r.reputationBefore;

  return (
    <Modal label={`End of day ${r.day} report`} className="modal-receipt">
      <div className="receipt">
        <header className="receipt-head">
          <p className="receipt-shop">Vielie Bakery</p>
          <p>12 Vielie Lane</p>
          <p>
            Day {r.day}, {WEEKDAYS[weekdayIndex(r.day)]}
            {event ? ` — ${event.headline}` : ''}
          </p>
        </header>
        {ms && <p className="milestone">{ms}</p>}

        <table className="receipt-lines">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Sold / baked</th>
              <th scope="col">Sales</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCT_ORDER.map((p) => {
              const pr = r.products[p];
              return (
                <tr key={p}>
                  <th scope="row">
                    <ProductArt id={p} size={18} /> {PRODUCTS[p].shortName}
                    {pr.dayOldSold > 0 && <small> +{pr.dayOldSold} day-old</small>}
                  </th>
                  <td>
                    {pr.sold}/{pr.baked}
                    {pr.stockout > 0 && <small className="neg"> {pr.stockout} missed</small>}
                    {pr.wasted > 0 && <small className="neg"> {pr.wasted} binned</small>}
                    {pr.carriedOver > 0 && <small> {pr.carriedOver} kept</small>}
                  </td>
                  <td>{money2(pr.revenue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <dl className="receipt-sums">
          <div>
            <dt>
              <Term concept="revenue" />
            </dt>
            <dd>{money2(inc.revenue)}</dd>
          </div>
          <div>
            <dt>Ingredients and packaging</dt>
            <dd>−{money2(inc.cogs)}</dd>
          </div>
          <div>
            <dt>Wages, rent, admin</dt>
            <dd>−{money2(inc.wages + inc.rent + inc.admin)}</dd>
          </div>
          <div>
            <dt>Energy</dt>
            <dd>−{money2(inc.energy)}</dd>
          </div>
          <div>
            <dt>Waste and spoilage</dt>
            <dd>−{money2(inc.waste)}</dd>
          </div>
          {inc.depreciation > 0 && (
            <div>
              <dt>
                <Term concept="depreciation" />
              </dt>
              <dd>−{money2(inc.depreciation)}</dd>
            </div>
          )}
          {inc.interest > 0 && (
            <div>
              <dt>
                <Term concept="interest" />
              </dt>
              <dd>−{money2(inc.interest)}</dd>
            </div>
          )}
          <div className="receipt-total">
            <dt>
              <Term concept="profit">Net profit</Term>
            </dt>
            <dd className={inc.netProfit >= 0 ? 'pos' : 'neg'}>{signedMoney(inc.netProfit, 2)}</dd>
          </div>
          <div>
            <dt>
              <Term concept="margin">Operating margin</Term>
            </dt>
            <dd>{pct(margin(inc.operatingProfit, inc.revenue), 1)}</dd>
          </div>
        </dl>

        <div className="receipt-foot">
          <p>
            Cash {money2(r.cashBefore)} → {money2(r.cashAfter)} ({signedMoney(cashChange, 2)})
            {r.morningCashFlow !== 0 && <small> including {signedMoney(r.morningCashFlow, 2)} spent or borrowed this morning</small>}
          </p>
          <p>
            {r.customers} customers, satisfaction {r.satisfaction}/100. Reputation {repDelta >= 0 ? 'up' : 'down'} {Math.abs(repDelta).toFixed(1)}.
          </p>
          {r.notes.map((n) => (
            <p key={n} className="receipt-note">
              {n}
            </p>
          ))}
          {inc.netProfit > 0 && r.cashAfter < r.cashBefore && (
            <p className="receipt-note">
              Profitable, yet cash fell: money went into stock or equipment this morning. Profit and cash are not the same thing.
            </p>
          )}
        </div>
        <p className="receipt-thanks">Thank you for baking with Vielie</p>
      </div>
      <button className="btn btn-bake receipt-continue" onClick={() => dispatch({ type: 'continue' })} autoFocus>
        {isLast ? 'See your 30-day report' : isWeekEnd ? 'Read the weekly report' : `Start day ${r.day + 1}`}
      </button>
    </Modal>
  );
}
