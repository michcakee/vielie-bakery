import { useState } from 'react';
import { INGREDIENTS, PRODUCTS, PRODUCT_ORDER, WEATHER } from '../../data/catalog';
import { explainChange, explainProfit, productTable, rollUp, type Period } from '../../engine/analytics';
import { FESTIVALS, type Festival } from '../../engine/calendar';
import { demandCurve, elasticityAt, levelOf, onMenu } from '../../engine/economy';
import { incomeStatement } from '../../engine/accounting';
import { gameReducer } from '../../engine/state';
import { forecast, ingredientsNeeded } from '../../engine/forecast';
import { REGIMES } from '../../engine/macro';
import type { GameState, ProductId, SupplierId } from '../../engine/types';
import { money, money2, pct, signedMoney } from '../../lib/format';
import { CHART_COLORS, LineChart } from '../charts';
import { useGame } from '../GameContext';
import { Btn, Card, Empty, Tip } from '../kit';
import { Sprite } from '../pixel/Sprite';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
  { id: 'year', label: 'Yearly' },
];

function Trends() {
  const { state: s } = useGame();
  const [period, setPeriod] = useState<Period>('day');
  const rows = rollUp(period === 'day' ? s.history.slice(-45) : s.history, period);
  const labels = rows.map((r) => r.label);
  return (
    <Card title="Trends" icon="chart">
      <div className="seg" role="radiogroup" aria-label="Chart period">
        {PERIODS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={period === p.id} className={period === p.id ? 'on' : ''} onClick={() => setPeriod(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <LineChart
        title="Revenue, profit and cash"
        labels={labels}
        series={[
          { name: 'Revenue', values: rows.map((r) => r.revenue), color: CHART_COLORS.revenue, marker: 'circle' },
          { name: 'Profit', values: rows.map((r) => r.profit), color: CHART_COLORS.profit, marker: 'square', dash: '5 3' },
        ]}
      />
      <LineChart title="Cash balance" labels={labels} series={[{ name: 'Cash (end of period)', values: rows.map((r) => r.cash), color: CHART_COLORS.cash, marker: 'diamond' }]} />
      <LineChart
        title="Customers"
        money={false}
        labels={labels}
        series={[
          { name: 'Served', values: rows.map((r) => r.served), color: CHART_COLORS.profit, marker: 'circle' },
          { name: 'Lost', values: rows.map((r) => r.lost), color: CHART_COLORS.lost, marker: 'square', dash: '4 3' },
        ]}
      />
    </Card>
  );
}

function Products() {
  const { state: s } = useGame();
  const t = productTable(s.history.slice(-30));
  if (!t.length) return null;
  const best = [...t].sort((a, b) => (b.perTray ?? 0) - (a.perTray ?? 0)).find((r) => r.perTray !== null);
  const top = [...t].sort((a, b) => b.units - a.units)[0];
  return (
    <Card title="Which products earn the most?" icon="coin">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Sold</th>
              <th scope="col">Revenue</th>
              <th scope="col">
                <Tip concept="margin">Contribution</Tip>
              </th>
              <th scope="col">Margin</th>
              <th scope="col">Per oven tray</th>
              <th scope="col">Per minute of work</th>
            </tr>
          </thead>
          <tbody>
            {t.map((r) => (
              <tr key={r.p}>
                <th scope="row">{PRODUCTS[r.p].name}</th>
                <td>{r.units}</td>
                <td>{money(r.revenue)}</td>
                <td className={r.contribution < 0 ? 'neg' : ''}>{money(r.contribution)}</td>
                <td>{pct(r.margin)}</td>
                <td>{r.perTray === null ? '—' : money2(r.perTray)}</td>
                <td>{money2(r.perLaborMinute)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small">
        {top && best && top.p !== best.p
          ? `${PRODUCTS[top.p].name} sells the most, but ${PRODUCTS[best.p].name} earns the most from each oven tray. When the oven is your bottleneck, that's what matters.`
          : 'Compare contribution per oven tray: when your ovens are full, the best use of a tray is the one that earns the most from it.'}
      </p>
    </Card>
  );
}

function DemandCurve() {
  const { state: s } = useGame();
  const menu = onMenu(s);
  const [p, setP] = useState<ProductId>(menu[0] ?? 'banhMi');
  const curve = demandCurve(s, p);
  const best = curve.reduce((a, b) => (b.contribution > a.contribution ? b : a), curve[0]);
  const e = elasticityAt(s, p);
  return (
    <Card title="Price experiments" icon="star">
      <label className="small">
        Product{' '}
        <select value={p} onChange={(ev) => setP(ev.target.value as ProductId)}>
          {menu.map((x) => (
            <option key={x} value={x}>
              {PRODUCTS[x].name}
            </option>
          ))}
        </select>
      </label>
      <LineChart
        title={`Expected daily results for ${PRODUCTS[p].name} at different prices`}
        labels={curve.map((c) => `$${c.price.toFixed(2)}`)}
        series={[
          { name: 'Revenue', values: curve.map((c) => c.revenue), color: CHART_COLORS.revenue, marker: 'circle' },
          { name: 'Contribution', values: curve.map((c) => c.contribution), color: CHART_COLORS.profit, marker: 'square', dash: '5 3' },
        ]}
      />
      <p className="small">
        At your price of {money2(s.prices[p])}, a 1% price rise loses about <b>{Math.abs(e).toFixed(1)}%</b> of sales (<Tip concept="elasticity">price elasticity</Tip> {Math.abs(e) > 1 ? 'above 1: price-sensitive' : 'below 1: customers barely react'}). The model's best price for contribution today is around <b>{money2(best.price)}</b>. Models can be wrong; test it.
      </p>
    </Card>
  );
}

function Forecast() {
  const { state: s, dispatch } = useGame();
  const f = forecast(s, 7);
  const need = ingredientsNeeded(s, f.slice(0, 2));
  const short = Object.entries(need).filter(([, n]) => n!.short > 0) as [keyof typeof INGREDIENTS, { short: number }][];
  const [sup, setSup] = useState<SupplierId>('cho');
  return (
    <Card title="Forecast: next 7 days" icon="sun">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Weather</th>
              {onMenu(s).map((p) => (
                <th key={p} scope="col">
                  {PRODUCTS[p].name}
                </th>
              ))}
              <th scope="col">Revenue</th>
              <th scope="col">Profit</th>
            </tr>
          </thead>
          <tbody>
            {f.map((d) => (
              <tr key={d.day}>
                <th scope="row">
                  Day {d.day}
                  {d.festivals.map((x) => (
                    <span key={x} className="tiny chip">
                      {FESTIVALS[x as Festival].vi}
                    </span>
                  ))}
                </th>
                <td>{WEATHER[d.weather].name}</td>
                {onMenu(s).map((p) => {
                  const u = d.units[p];
                  return <td key={p}>{u ? `${Math.round(u.low)}–${Math.round(u.high)}` : '—'}</td>;
                })}
                <td>{money(d.revenue)}</td>
                <td className={d.profit < 0 ? 'neg' : ''}>{money(d.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">Ranges, not promises: forecasts blend your recent demand (including people you turned away) with the weather, the weekday and known festivals. They can be wrong.</p>
      {short.length > 0 ? (
        <>
          <p className="small">
            For the next two days you're short on: {short.map(([id, n]) => `${INGREDIENTS[id].name.toLowerCase()} (${n.short})`).join(', ')}.
          </p>
          <div className="btn-row">
            <select aria-label="Supplier" value={sup} onChange={(e) => setSup(e.target.value as SupplierId)}>
              <option value="cho">Wet market (today)</option>
              <option value="farm">Farm co-op (tomorrow)</option>
              <option value="premium">Saigon Fine Foods (tomorrow)</option>
              <option value="distributor">Distributor (2 days, 5+ packs)</option>
            </select>
            <Btn kind="primary" disabled={s.phase === 'service'} onClick={() => dispatch({ type: 'buyForecast', supplier: sup })}>
              Buy what the forecast needs
            </Btn>
          </div>
        </>
      ) : (
        <p className="small effect">Your pantry covers the next two days' forecast.</p>
      )}
    </Card>
  );
}

function Why() {
  const { state: s } = useGame();
  const [span, setSpan] = useState<7 | 30>(7);
  const now = s.history.slice(-span);
  const before = s.history.slice(-2 * span, -span);
  if (before.length < span / 2) return null;
  const sales = explainChange(now, before);
  const profit = explainProfit(now, before);
  return (
    <Card title="Why did this happen?" icon="note">
      <div className="seg" role="radiogroup" aria-label="Compare">
        <button type="button" role="radio" aria-checked={span === 7} className={span === 7 ? 'on' : ''} onClick={() => setSpan(7)}>
          This week vs last
        </button>
        <button type="button" role="radio" aria-checked={span === 30} className={span === 30 ? 'on' : ''} onClick={() => setSpan(30)}>
          This month vs last
        </button>
      </div>
      <ul className="why-list">
        {sales.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {profit.length > 0 && (
        <>
          <h4>And profit</h4>
          <ul className="why-list">
            {profit.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function Journal() {
  const { state: s } = useGame();
  const list = [...s.decisions].reverse().slice(0, 15);
  return (
    <Card title="Decision journal" icon="book">
      {list.length === 0 ? (
        <Empty icon="book">Big decisions (prices, hires, loans, equipment) are logged here, with what happened a week later.</Empty>
      ) : (
        <ul className="journal">
          {list.map((d) => (
            <li key={d.id}>
              <span className="tiny muted">Day {d.day}</span>
              <b>{d.text}</b>
              <span className="small">{d.verdict ?? (s.day - d.day < 7 ? 'Results in a few days…' : 'Not enough data yet.')}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Economy() {
  const { state: s } = useGame();
  const h = s.macro.history;
  if (h.length < 2)
    return (
      <Card title="The economy" icon="chart">
        <p className="small">
          <b>{REGIMES[s.macro.regime].name}.</b> {REGIMES[s.macro.regime].blurb} Indicators update every month.
        </p>
      </Card>
    );
  return (
    <Card title="The economy" icon="chart">
      <p className="small">
        <b>{REGIMES[s.macro.regime].name}.</b> {REGIMES[s.macro.regime].forYou}
      </p>
      <LineChart
        title="Inflation, interest rates and unemployment"
        money={false}
        labels={h.map((x) => `D${x.day}`)}
        series={[
          { name: 'Inflation %', values: h.map((x) => x.inflation * 100), color: CHART_COLORS.cost, marker: 'circle' },
          { name: 'Interest %', values: h.map((x) => x.rate * 100), color: CHART_COLORS.cash, marker: 'square', dash: '5 3' },
          { name: 'Unemployment %', values: h.map((x) => x.unemployment * 100), color: CHART_COLORS.other, marker: 'diamond', dash: '2 2' },
        ]}
      />
      <LineChart title="Price level (1.00 = when you started)" money={false} labels={s.history.slice(-60).map((x) => `D${x.day}`)} series={[{ name: 'Price index', values: s.history.slice(-60).map((x) => x.priceIndex), color: CHART_COLORS.revenue, marker: 'circle' }]} />
    </Card>
  );
}

/**
 * Test Kitchen: replay today with one thing changed and compare, side by side. The simulation is
 * seeded by day, so the only difference between the two runs is the change you made.
 */
function TestKitchen() {
  const { state: s } = useGame();
  const [product, setProduct] = useState<ProductId>(onMenu(s)[0] ?? 'banhMi');
  const [delta, setDelta] = useState(1);
  const [result, setResult] = useState<{ a: GameState; b: GameState } | null>(null);
  const ready = s.phase === 'morning' && s.events.length === 0;
  const unlocked = s.learned.includes('elasticityCompare') || levelOf(s.xp) >= 3;
  if (!unlocked) return null;
  const run = () => {
    const a = gameReducer(s, { type: 'runDay' });
    const changed = gameReducer(s, { type: 'setPrice', product, price: s.prices[product] + delta });
    const b = gameReducer(changed, { type: 'runDay' });
    setResult({ a, b });
  };
  const row = (label: string, f: (x: GameState) => number, isMoney = true) => {
    if (!result) return null;
    const va = f(result.a);
    const vb = f(result.b);
    return (
      <tr>
        <th>{label}</th>
        <td>{isMoney ? money(va) : va}</td>
        <td>{isMoney ? money(vb) : vb}</td>
        <td className={vb - va > 0 ? 'pos' : vb - va < 0 ? 'neg' : ''}>{isMoney ? signedMoney(vb - va) : vb - va > 0 ? `+${vb - va}` : vb - va}</td>
      </tr>
    );
  };
  return (
    <Card title="Test Kitchen" icon="gear" aside={<span className="small muted">one change, same day</span>}>
      <p className="small">
        Replay today twice with the team running the shop: once as it is, once with one price changed. Same customers, same weather, same luck, so any difference is the price. Nothing here touches your real day.
      </p>
      <div className="test-kitchen-controls">
        <label>
          <span className="small">Item</span>
          <select value={product} onChange={(e) => setProduct(e.target.value as ProductId)}>
            {onMenu(s).map((p) => (
              <option key={p} value={p}>
                {PRODUCTS[p].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="small">Change the price by</span>
          <select value={delta} onChange={(e) => setDelta(Number(e.target.value))}>
            {[-2, -1, -0.5, 0.5, 1, 2].map((d) => (
              <option key={d} value={d}>
                {signedMoney(d)}
              </option>
            ))}
          </select>
        </label>
        <Btn kind="primary" disabled={!ready} onClick={run} title={ready ? undefined : 'Available in the morning, before the doors open'}>
          Run the experiment
        </Btn>
      </div>
      {result && (
        <table className="data-table test-kitchen">
          <thead>
            <tr>
              <th />
              <th>As it is ({money2(s.prices[product])})</th>
              <th>Changed ({money2(s.prices[product] + delta)})</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {row(`${PRODUCTS[product].name} sold`, (x) => x.today.sold[product] ?? 0, false)}
            {row('Customers served', (x) => x.today.served, false)}
            {row('Sales', (x) => x.today.revenue)}
            {row('Profit', (x) => incomeStatement(x.today.books).netProfit)}
            {row('Left over (binned or kept)', (x) => x.today.wasteUnits ?? 0, false)}
          </tbody>
        </table>
      )}
      {result && <p className="small muted">Controlled experiment: change one thing, keep everything else the same, compare. That is how you find out what caused what.</p>}
    </Card>
  );
}

export function AnalyticsPanel() {
  const { state: s, dispatch, feature } = useGame();
  if (s.history.length === 0)
    return (
      <div className="panel-stack">
        <Card title="Analytics" icon="chart">
          <Empty icon="chart">Close your first day and the charts, forecasts and explanations start filling in.</Empty>
        </Card>
        {feature('analytics.full') && <Forecast />}
      </div>
    );
  return (
    <div className="panel-stack">
      {feature('analytics.why') && <div data-spot="why" onClick={() => s.intro?.active === 'analytics.why' && dispatch({ type: 'hint', id: 'visit:analytics.why' })}><Why /></div>}
      {feature('analytics.testKitchen') && <div data-spot="test-kitchen" onClick={() => s.intro?.active === 'analytics.testKitchen' && dispatch({ type: 'hint', id: 'visit:analytics.testKitchen' })}><TestKitchen /></div>}
      {feature('analytics.full') && <Trends />}
      {feature('analytics.full') && <div data-spot="products"><Products /></div>}
      {feature('analytics.full') && <DemandCurve />}
      {feature('analytics.full') && <Forecast />}
      {feature('analytics.full') && <Journal />}
      {feature('analytics.economy') && <div data-spot="economy"><Economy /></div>}
      <p className="small muted">
        <Sprite name="spark" scale={1} /> Every number here comes from the same simulation your customers live in. Nothing is decorative.
      </p>
      {void PRODUCT_ORDER}
    </div>
  );
}
