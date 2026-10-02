import { useState } from 'react';
import { PRODUCTS, PRODUCT_ORDER } from '../../data/catalog';
import { ECON } from '../../data/config';
import { NOTEBOOK, NOTEBOOK_ORDER } from '../../data/notebook';
import { balanceSheet, cashFlow, incomeStatement, productTotals, ratios, RATIO_TIPS, sumBooks, type Ratios } from '../../engine/accounting';
import { breakEven } from '../../engine/analytics';
import { creditLineRate, levelOf } from '../../engine/economy';
import { bondCapacity, borrowingLimit, creditLimit, creditRisk, investorTerms, quoteLoan, valuation } from '../../engine/finance';
import { COOPS } from '../../engine/market';
import type { CoopId, DaySummary } from '../../engine/types';
import { money, money2, pct, signedMoney } from '../../lib/format';
import { useGame } from '../GameContext';
import { Btn, Card, Empty, Stepper, Tip } from '../kit';

type Range = 'today' | 'week' | 'month' | 'year' | 'all';
const RANGES: { id: Range; label: string; days: number }[] = [
  { id: 'today', label: 'Yesterday', days: 1 },
  { id: 'week', label: '7 days', days: 7 },
  { id: 'month', label: '30 days', days: 30 },
  { id: 'year', label: '360 days', days: 360 },
  { id: 'all', label: 'All time', days: 100000 },
];

function Line({ label, value, sub, strong, onClick, open, tip }: { label: string; value: number; sub?: boolean; strong?: boolean; onClick?: () => void; open?: boolean; tip?: string }) {
  return (
    <div className={`stmt-line ${sub ? 'sub' : ''} ${strong ? 'strong' : ''}`}>
      <dt>
        {onClick ? (
          <button type="button" className="drill" aria-expanded={open} onClick={onClick}>
            {open ? '▾' : '▸'} {label}
          </button>
        ) : tip ? (
          <Tip concept={tip}>{label}</Tip>
        ) : (
          label
        )}
      </dt>
      <dd className={value < 0 ? 'neg' : ''}>{value < 0 ? `(${money(-value, 2)})` : money(value, 2)}</dd>
    </div>
  );
}

function Statements({ days }: { days: DaySummary[] }) {
  const { state: s, business } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const b = sumBooks(days);
  const is = incomeStatement(b);
  const cf = cashFlow(b);
  const bs = balanceSheet(s);
  const products = productTotals(days);
  const toggle = (k: string) => setOpen(open === k ? null : k);

  if (!business) {
    const verdict = is.netProfit > 0 ? 'You\'re making money.' : is.netProfit > -50 ? 'You\'re roughly breaking even.' : 'You\'re losing money.';
    return (
      <Card title="In plain words" icon="note">
        <p className="big-verdict">{verdict}</p>
        <dl className="plain">
          <div>
            <dt>Sales</dt>
            <dd className="pos">{money2(is.revenue)}</dd>
          </div>
          <div>
            <dt>Ingredients & packaging</dt>
            <dd>−{money2(is.cogs)}</dd>
          </div>
          <div>
            <dt>Running the shop (wages, rent, power…)</dt>
            <dd>−{money2(is.opex + is.interest - is.otherIncome)}</dd>
          </div>
          <div className="total">
            <dt>What the bakery made</dt>
            <dd className={is.netProfit >= 0 ? 'pos' : 'neg'}>{signedMoney(is.netProfit, 2)}</dd>
          </div>
          <div>
            <dt>Change in cash</dt>
            <dd>{signedMoney(cf.net, 2)}</dd>
          </div>
        </dl>
        <p className="small muted">Profit and cash aren't the same: buying an oven or stocking up uses cash without being a cost of the day, and rent is paid a month ahead. Switch to Business view in Settings for the full statements.</p>
      </Card>
    );
  }

  return (
    <>
      <Card title="Income statement" icon="chart" aside={<span className="small muted">Did we make money?</span>}>
        <dl className="stmt">
          <Line label="Revenue" value={is.revenue} strong onClick={() => toggle('rev')} open={open === 'rev'} />
          {open === 'rev' && (
            <>
              {PRODUCT_ORDER.filter((p) => products[p].revenue > 0).map((p) => (
                <Line key={p} sub label={`${PRODUCTS[p].name} (${products[p].units} sold)`} value={products[p].revenue} />
              ))}
              {b.otherRevenue > 0 && <Line sub label="Catering, wholesale & delivery fees" value={b.otherRevenue} />}
              {b.tips > 0 && <Line sub label="Tips" value={b.tips} />}
            </>
          )}
          <Line label="Cost of goods sold" value={-is.cogs} onClick={() => toggle('cogs')} open={open === 'cogs'} />
          {open === 'cogs' && (
            <>
              {PRODUCT_ORDER.filter((p) => products[p].cogs > 0).map((p) => (
                <Line key={p} sub label={`${PRODUCTS[p].name}: ${money2(products[p].cogs / Math.max(1, products[p].units))} each`} value={-products[p].cogs} />
              ))}
            </>
          )}
          <Line label="Gross profit" value={is.grossProfit} strong tip="margin" />
          <Line label="Operating expenses" value={-is.opex} onClick={() => toggle('opex')} open={open === 'opex'} />
          {open === 'opex' && is.opexLines.filter((l) => Math.abs(l.value) > 0.005).map((l) => <Line key={l.key} sub label={l.label} value={-l.value} />)}
          <Line label="Operating profit" value={is.operatingProfit} strong />
          <Line label="Interest" value={-is.interest} tip="interest" />
          {is.otherIncome !== 0 && <Line label="Other income (bonuses, dividends)" value={is.otherIncome} />}
          <Line label="Net profit" value={is.netProfit} strong tip="profit" />
        </dl>
      </Card>

      <Card title="Cash flow" icon="coin" aside={<span className="small muted">Where did the cash go?</span>}>
        <dl className="stmt">
          {(['operating', 'investing', 'financing'] as const).map((g) => (
            <div key={g}>
              <Line label={g === 'operating' ? 'From running the bakery' : g === 'investing' ? 'Investing (equipment, shares)' : 'Financing (loans, investors)'} value={cf[g]} strong onClick={() => toggle(g)} open={open === g} />
              {open === g && cf.lines.filter((l) => l.group === g && Math.abs(l.value) > 0.005).map((l) => <Line key={l.label} sub label={l.label} value={l.value} />)}
            </div>
          ))}
          <Line label="Net change in cash" value={cf.net} strong />
        </dl>
        {cf.net < 0 && is.netProfit > 0 && <p className="small note">Profitable, but cash went down. That's normal when you invest or pay rent ahead, and it's how a profitable business can still run out of cash.</p>}
      </Card>

      <Card title="Balance sheet (today)" icon="house" aside={<span className="small muted">What we own and owe</span>}>
        <div className="bs-grid">
          <dl className="stmt">
            <Line label="Cash" value={bs.cash} />
            <Line label="Safety fund" value={bs.safetyFund} />
            <Line label="Inventory" value={bs.inventory} tip="inventory" />
            <Line label="Rent paid in advance" value={bs.prepaidRent} />
            <Line label="Equipment & fit-outs" value={bs.equipment} tip="depreciation" />
            {bs.investments > 0 && <Line label="Co-op shares (at cost)" value={bs.investments} />}
            {bs.deposits > 0 && <Line label="Lease deposits" value={bs.deposits} />}
            <Line label="Total assets" value={bs.totalAssets} strong />
          </dl>
          <dl className="stmt">
            <Line label="Bank loans" value={bs.loans} />
            <Line label="Credit line" value={bs.creditLine} />
            <Line label="Interest owed" value={bs.accruedInterest} />
            {bs.bonds > 0 && <Line label="Community bonds" value={bs.bonds} />}
            <Line label="Total liabilities" value={bs.totalLiabilities} strong />
            <Line label="Owner's equity" value={bs.equity} strong tip="equity" />
            {bs.investorStake > 0 && <Line sub label={`Your ${pct(1 - bs.investorStake, 1)} share`} value={bs.ownerEquity} />}
          </dl>
        </div>
        <p className="small muted">Assets always equal liabilities plus equity: everything the bakery owns was paid for either by borrowing or by the owners (including profits kept in the business).</p>
      </Card>
    </>
  );
}

function RatioGrid({ r }: { r: Ratios }) {
  const fmt = (k: keyof Ratios, v: number | null) => (v === null ? '—' : k === 'currentRatio' || k === 'debtToEquity' || k === 'inventoryTurnover' ? `${v.toFixed(1)}×` : k === 'revenuePerEmployee' ? money(v) : pct(v, 1));
  const good = (k: keyof Ratios, v: number | null) => {
    if (v === null) return null;
    if (k === 'debtToEquity') return v < 1;
    if (k === 'currentRatio') return v > 1.5;
    if (k === 'inventoryTurnover') return v > 30;
    if (k === 'revenuePerEmployee') return v > 60000;
    if (k === 'grossMargin') return v > 0.6;
    return v > 0.08;
  };
  return (
    <ul className="ratio-grid">
      {(Object.keys(RATIO_TIPS) as (keyof Ratios)[]).map((k) => {
        const g = good(k, r[k]);
        return (
          <li key={k} className={g === null ? '' : g ? 'ok' : 'watch'}>
            <span className="ratio-name">
              <span aria-hidden="true">{g === null ? '•' : g ? '✓' : '!'}</span> {RATIO_TIPS[k].name}
            </span>
            <b>{fmt(k, r[k])}</b>
            <span className="tiny muted">{RATIO_TIPS[k].tip}</span>
            <span className="tiny">{RATIO_TIPS[k].good}</span>
          </li>
        );
      })}
    </ul>
  );
}

function BreakEvenCalc() {
  const { state: s } = useGame();
  const [price, setPrice] = useState(0);
  const [wage, setWage] = useState(0);
  const [rentPct, setRent] = useState(0);
  const [ing, setIng] = useState(0);
  const be = breakEven(s, { pricePct: price / 100, wagePct: wage / 100, rentPct: rentPct / 100, ingredientPct: ing / 100 });
  const slider = (label: string, v: number, set: (n: number) => void) => (
    <label className="be-slider">
      <span>
        {label}: <b>{v > 0 ? '+' : ''}{v}%</b>
      </span>
      <input type="range" min={-30} max={30} step={5} value={v} onChange={(e) => set(Number(e.target.value))} />
    </label>
  );
  return (
    <Card title="Break-even" icon="chart">
      <div className="be-out">
        <div>
          <span className="small">Fixed costs a day</span>
          <b>{money2(be.fixed)}</b>
        </div>
        <div>
          <span className="small">Average price</span>
          <b>{money2(be.avgPrice)}</b>
        </div>
        <div>
          <span className="small">Cost per item</span>
          <b>{money2(be.avgVariable)}</b>
        </div>
        <div>
          <span className="small">
            <Tip concept="margin">Contribution</Tip> per item
          </span>
          <b>{money2(be.contribution)}</b>
        </div>
        <div className="be-big">
          <span className="small">Break-even</span>
          <b>{be.units === null ? 'Never at these prices' : `${Math.ceil(be.units)} items a day`}</b>
          {be.revenue !== null && <span className="small">({money(be.revenue)} of sales)</span>}
        </div>
        <div>
          <span className="small">You sell about</span>
          <b>{be.currentUnits.toFixed(0)} a day</b>
        </div>
      </div>
      <p className="small muted">Break-even = fixed costs ÷ (price − cost per item). Try "what if":</p>
      {slider('Prices', price, setPrice)}
      {slider('Wages', wage, setWage)}
      {slider('Rent', rentPct, setRent)}
      {slider('Ingredient costs', ing, setIng)}
    </Card>
  );
}

function Financing() {
  const { state: s, dispatch } = useGame();
  const [amount, setAmount] = useState(5000);
  const [term, setTerm] = useState(12);
  const [equity, setEquity] = useState(10000);
  const [bond, setBond] = useState(2000);
  const busy = s.phase === 'service';
  const limit = borrowingLimit(s);
  const q = quoteLoan(s, Math.min(amount, Math.max(500, limit)), term);
  const terms = investorTerms(s, equity);
  const bondCap = bondCapacity(s);
  const v = valuation(s);
  return (
    <>
      <Card title="Bank loans" icon="house" aside={<span className="small muted">Risk: {creditRisk(s)}</span>}>
        {s.loans.length === 0 ? (
          <p className="small muted">No loans. Borrowing lets you invest before you've saved up, but every month a payment comes due, busy or not.</p>
        ) : (
          <ul className="choice-list">
            {s.loans.map((l) => (
              <li key={l.id}>
                <div>
                  <b>{l.lender}</b>
                  <span className="small">
                    {money2(l.balance)} left at {(l.rate * 100).toFixed(1)}% · {money2(l.payment)}/month · {l.monthsLeft} months to go · interest paid so far {money2(l.interestPaid)}
                  </span>
                  {l.missed > 0 && <span className="small warn">{l.missed} missed payment{l.missed > 1 ? 's' : ''}</span>}
                </div>
                <Btn disabled={busy || s.cash < l.balance + l.accrued} onClick={() => dispatch({ type: 'repayLoan', id: l.id })}>
                  Pay off ({money(l.balance + l.accrued)})
                </Btn>
              </li>
            ))}
          </ul>
        )}
        <div className="loan-builder">
          <span className="small">Borrow</span>
          <Stepper value={amount} step={500} min={500} max={Math.max(500, limit)} format={(x) => money(x)} label="Loan amount" onChange={setAmount} />
          <span className="small">over</span>
          <div className="seg" role="radiogroup" aria-label="Loan term">
            {ECON.finance.loanTerms.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={term === t} className={term === t ? 'on' : ''} onClick={() => setTerm(t)}>
                {t} months
              </button>
            ))}
          </div>
        </div>
        <p className="small">
          At <b>{(q.rate * 100).toFixed(1)}%</b> a year (the central bank's {(s.macro.rate * 100).toFixed(1)}% plus a risk margin): <b>{money2(q.payment)}</b> a month, <b>{money2(q.totalInterest)}</b> interest in total, {money(q.principal + q.totalInterest)} paid back.
        </p>
        <Btn kind="primary" disabled={busy || limit < 500} onClick={() => dispatch({ type: 'takeLoan', principal: q.principal, term })}>
          Take this loan
        </Btn>
        <p className="small muted">The bank will lend up to {money(limit)} more based on your sales and debts.</p>
      </Card>

      <Card title="Credit line" icon="lock">
        <p className="small">
          If cash runs out, the bank covers the gap automatically up to <b>{money(creditLimit(s))}</b>, at {(creditLineRate(s) * 100).toFixed(0)}% a year. You're using <b>{money2(s.creditLine.balance)}</b>. It's repaid automatically when cash builds up.
        </p>
        <Btn disabled={busy || s.creditLine.balance <= 0 || s.cash <= 0} onClick={() => dispatch({ type: 'repayCredit', amount: Math.min(s.creditLine.balance, s.cash) })}>
          Repay now
        </Btn>
      </Card>

      <Card title="Investors" icon="people" aside={levelOf(s.xp) < 3 ? <span className="lock-tag">After 30 days</span> : undefined}>
        {s.investors.map((i) => (
          <p key={i.id} className="small">
            <b>{i.name}</b> owns {pct(i.stake, 1)} (invested {money(i.invested)}, paid out {money(i.paidOut)} so far).{' '}
            <Btn kind="ghost" disabled={busy || s.cash < Math.max(i.invested, v.equityValue * i.stake)} onClick={() => dispatch({ type: 'buyBack', id: i.id })}>
              Buy back ({money(Math.max(i.invested, v.equityValue * i.stake))})
            </Btn>
          </p>
        ))}
        <div className="loan-builder">
          <span className="small">Raise</span>
          <Stepper value={equity} step={2500} min={2500} max={100000} format={(x) => money(x)} label="Investment amount" onChange={setEquity} />
        </div>
        {terms ? (
          <p className="small">
            Your business is valued at about {money(terms.preMoney)}, so {money(equity)} buys an investor <b>{pct(terms.stake, 1)}</b>. They'll take {pct(terms.stake, 1)} of every profitable month from then on, and of any sale. No repayments, but you own less.
          </p>
        ) : (
          <p className="small muted">Investors want to see at least a month of trading, and won't take more than half the business in total.</p>
        )}
        <Btn kind="primary" disabled={busy || !terms} onClick={() => dispatch({ type: 'raiseEquity', amount: equity })}>
          Accept the investment
        </Btn>
      </Card>

      <Card title="Community bonds" icon="heart" aside={s.community < 50 ? <span className="lock-tag">Community 50</span> : undefined}>
        <p className="small">
          Neighbours lend to the bakery they love at {(ECON.finance.bondRate * 100).toFixed(0)}% for a year, repaid in one go. Cheaper than the bank, and it deepens their loyalty. You can raise up to <b>{money(bondCap)}</b>.
        </p>
        <div className="loan-builder">
          <Stepper value={bond} step={500} min={500} max={Math.max(500, bondCap)} format={(x) => money(x)} label="Bond amount" onChange={setBond} />
          <Btn kind="primary" disabled={busy || bondCap < 500 || bond > bondCap} onClick={() => dispatch({ type: 'issueBond', amount: bond })}>
            Raise it
          </Btn>
        </div>
      </Card>
    </>
  );
}

export function FinancesPanel() {
  const { state: s, dispatch, business, setPrefs } = useGame();
  const [range, setRange] = useState<Range>('month');
  const days = s.history.slice(-RANGES.find((r) => r.id === range)!.days);
  const r = ratios(s, days);
  const busy = s.phase === 'service';
  return (
    <div className="panel-stack">
      <div className="toolbar">
        <div className="seg" role="radiogroup" aria-label="Period">
          {RANGES.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={range === x.id} className={range === x.id ? 'on' : ''} onClick={() => setRange(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="seg" role="radiogroup" aria-label="View">
          <button type="button" role="radio" aria-checked={!business} className={!business ? 'on' : ''} onClick={() => setPrefs({ view: 'casual' })}>
            Casual
          </button>
          <button type="button" role="radio" aria-checked={business} className={business ? 'on' : ''} onClick={() => setPrefs({ view: 'business' })}>
            Business
          </button>
        </div>
      </div>
      {days.length === 0 ? <Empty icon="chart">No days closed yet. Your first statements appear after tonight.</Empty> : <Statements days={days} />}
      {business && days.length > 0 && (
        <Card title="Health check" icon="star">
          <RatioGrid r={r} />
        </Card>
      )}
      {days.length > 0 && <BreakEvenCalc />}

      <Card title="Bakery safety fund" icon="lock">
        <p className="small">Money set aside for surprises. It pays your bills automatically if cash runs out, before the bank's expensive credit line does.</p>
        <div className="fund-meter">
          <span style={{ width: `${Math.min(100, (s.safetyFund / 3000) * 100)}%` }} />
          <b>
            {money(s.safetyFund)} / $3,000
          </b>
        </div>
        <div className="btn-row">
          {[100, 500].map((n) => (
            <Btn key={n} disabled={busy || s.cash < n} onClick={() => dispatch({ type: 'fund', amount: n })} sfx="coin">
              Save {money(n)}
            </Btn>
          ))}
          <Btn kind="ghost" disabled={busy || s.safetyFund < 50} onClick={() => dispatch({ type: 'fund', amount: -Math.min(s.safetyFund, 500) })}>
            Take out {money(Math.min(500, s.safetyFund))}
          </Btn>
        </div>
        <div className="seg" role="radiogroup" aria-label="Save part of each profitable day automatically">
          <span className="small">Auto-save from good days:</span>
          {[0, 0.1, 0.25].map((x) => (
            <button key={x} type="button" role="radio" aria-checked={s.savingsRate === x} className={s.savingsRate === x ? 'on' : ''} onClick={() => dispatch({ type: 'savingsRate', rate: x })}>
              {x === 0 ? 'Off' : `${x * 100}%`}
            </button>
          ))}
        </div>
      </Card>

      <Financing />

      <Card title="Co-op shares" icon="chart" aside={levelOf(s.xp) < 3 ? <span className="lock-tag">Level 3</span> : undefined}>
        <p className="small">
          Own a slice of the farms you buy from. Prices move every day; each week you get a 1.5% <Tip concept="dividends">dividend</Tip>. A dairy share rises when eggs get pricey for you: a natural <Tip concept="hedging">hedge</Tip>.
        </p>
        <ul className="choice-list">
          {(Object.keys(COOPS) as CoopId[]).map((c) => {
            const price = s.market.coop[c];
            const own = s.shares[c];
            const gain = own ? (price - s.shareCost[c]) * own : 0;
            return (
              <li key={c}>
                <div>
                  <b>{COOPS[c].name}</b>
                  <span className="small">
                    {money2(price)} a share · {COOPS[c].blurb}
                  </span>
                  {own > 0 && (
                    <span className="small">
                      You own {own} (worth {money2(own * price)}, <span className={gain >= 0 ? 'pos' : 'neg'}>{signedMoney(gain, 2)}</span>)
                    </span>
                  )}
                </div>
                <span className="btn-row tight">
                  <Btn disabled={levelOf(s.xp) < 3 || busy || s.cash < price * 10} onClick={() => dispatch({ type: 'trade', coop: c, delta: 10 })}>
                    Buy 10
                  </Btn>
                  <Btn kind="ghost" disabled={levelOf(s.xp) < 3 || busy || own < 1} onClick={() => dispatch({ type: 'trade', coop: c, delta: -Math.min(10, own) })}>
                    Sell
                  </Btn>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Bakery notebook" icon="book">
        {s.learned.length === 0 ? (
          <Empty icon="book">Your notebook is empty. Run the bakery and ideas will write themselves in.</Empty>
        ) : (
          <ul className="notebook">
            {NOTEBOOK_ORDER.filter((k) => s.learned.includes(k)).map((k) => (
              <li key={k}>
                <b>{NOTEBOOK[k].friendly}</b> <span className="muted">({NOTEBOOK[k].term})</span>
                <p className="small">{NOTEBOOK[k].text}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">
          {s.learned.filter((k) => NOTEBOOK[k]).length} of {NOTEBOOK_ORDER.length} ideas discovered.
        </p>
      </Card>
    </div>
  );
}
