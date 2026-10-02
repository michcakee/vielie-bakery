import { CONFIG, INGREDIENT_ORDER } from '../../data/catalog';
import { NOTEBOOK, NOTEBOOK_ORDER } from '../../data/notebook';
import { effectActive, fixedCosts, levelOf } from '../../engine/economy';
import { COOPS } from '../../engine/market';
import { LOAN_SIZES, MARKETING } from '../../engine/state';
import type { CoopId } from '../../engine/types';
import { money, money2, signedMoney } from '../../lib/format';
import { useGame } from '../GameContext';
import { Btn, Card, Empty, Tip } from '../kit';
import { Sprite } from '../pixel/Sprite';

function ProfitChart() {
  const { state: s } = useGame();
  const days = s.history.slice(-7);
  if (!days.length) return <Empty icon="chart">No days closed yet. The chart fills in after your first evening.</Empty>;
  const max = Math.max(10, ...days.map((d) => Math.max(d.revenue, Math.abs(d.profit))));
  return (
    <div className="chart" role="img" aria-label={`Last ${days.length} days: ${days.map((d) => `day ${d.day} made ${money(d.profit)}`).join(', ')}`}>
      {days.map((d, i) => (
        <div key={d.day} className="chart-col" style={{ ['--d' as string]: `${i * 60}ms` }}>
          <span className="chart-val">{signedMoney(d.profit)}</span>
          <div className="chart-bars">
            <span className="bar sales" style={{ height: `${(d.revenue / max) * 100}%` }} title={`Sales ${money2(d.revenue)}`} />
            <span className={`bar made ${d.profit < 0 ? 'neg' : ''}`} style={{ height: `${(Math.abs(d.profit) / max) * 100}%` }} title={`Made ${money2(d.profit)}`} />
          </div>
          <span className="chart-day">D{d.day}</span>
        </div>
      ))}
      <div className="chart-key small">
        <span>
          <i className="sales" /> Sales
        </span>
        <span>
          <i className="made" /> What the bakery made
        </span>
      </div>
    </div>
  );
}

export function MoneyPanel() {
  const { state: s, dispatch } = useGame();
  const level = levelOf(s.xp);
  const busy = s.phase === 'service';
  const r = s.lastReport;
  const pantryValue = INGREDIENT_ORDER.reduce((t, id) => t + s.pantry[id].qty * s.pantry[id].avgCost, 0);
  const marketing = s.effects.find((e) => e.id === 'marketing' && e.until >= s.day);

  return (
    <div className="panel-stack">
      <div className="money-tiles">
        <div className="tile">
          <Sprite name="coin" scale={3} />
          <span>Cash</span>
          <b className={s.cash < 0 ? 'neg' : ''}>{money2(s.cash)}</b>
        </div>
        <div className="tile">
          <Sprite name="lock" scale={3} />
          <span>
            <Tip concept="savings">Safety fund</Tip>
          </span>
          <b>{money2(s.safetyFund)}</b>
        </div>
        <div className="tile">
          <Sprite name="box" scale={3} />
          <span>
            <Tip concept="inventory">Pantry value</Tip>
          </span>
          <b>{money2(pantryValue)}</b>
        </div>
        <div className="tile">
          <Sprite name="house" scale={3} />
          <span>
            <Tip concept="fixedCost">Daily bills</Tip>
          </span>
          <b>{money2(fixedCosts(s))}</b>
        </div>
      </div>

      <Card title="This week" icon="chart">
        <ProfitChart />
      </Card>

      {r && (
        <Card title={`Day ${r.day} in plain words`} icon="note">
          <dl className="plain">
            <div>
              <dt>
                <Tip concept="revenue">Today's sales</Tip>
              </dt>
              <dd className="pos">{money2(r.stats.revenue + r.stats.tips)}</dd>
            </div>
            <div>
              <dt>What we spent</dt>
              <dd className="neg">−{money2(r.expenses)}</dd>
            </div>
            <div className="sub">
              <dt>
                <Tip concept="variableCost">Ingredients used</Tip>
              </dt>
              <dd>{money2(r.stats.cogs)}</dd>
            </div>
            <div className="sub">
              <dt>Cups, bags & boxes</dt>
              <dd>{money2(r.stats.packaging)}</dd>
            </div>
            <div className="sub">
              <dt>Rent, wages & power</dt>
              <dd>{money2(r.stats.rent + r.stats.wages + r.stats.energy + r.stats.interest)}</dd>
            </div>
            {r.stats.spoilage + r.stats.other > 0.005 && (
              <div className="sub">
                <dt>Spoiled food & extras</dt>
                <dd>{money2(r.stats.spoilage + r.stats.other)}</dd>
              </div>
            )}
            <div className="total">
              <dt>
                <Tip concept="profit">What the bakery made</Tip>
              </dt>
              <dd className={r.profit >= 0 ? 'pos' : 'neg'}>{signedMoney(r.profit, 2)}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card title="Bakery safety fund" icon="lock">
        <p className="small">
          Money set aside for surprises, like a broken fridge. It pays your bills automatically if cash runs out.
        </p>
        <div className="fund-meter">
          <span style={{ width: `${Math.min(100, (s.safetyFund / 300) * 100)}%` }} />
          <b>
            {money(s.safetyFund)} / $300
          </b>
        </div>
        <div className="btn-row">
          {[10, 50].map((n) => (
            <Btn key={n} disabled={busy || s.cash < n} onClick={() => dispatch({ type: 'fund', amount: n })} sfx="coin">
              Save {money(n)}
            </Btn>
          ))}
          <Btn kind="ghost" disabled={busy || s.safetyFund < 10} onClick={() => dispatch({ type: 'fund', amount: -Math.min(s.safetyFund, 50) })}>
            Take out {money(Math.min(50, s.safetyFund))}
          </Btn>
        </div>
        <div className="seg" role="radiogroup" aria-label="Save part of each profitable day automatically">
          <span className="small">Auto-save from good days:</span>
          {[0, 0.1, 0.25].map((r2) => (
            <button key={r2} type="button" role="radio" aria-checked={s.savingsRate === r2} className={s.savingsRate === r2 ? 'on' : ''} onClick={() => dispatch({ type: 'savingsRate', rate: r2 })}>
              {r2 === 0 ? 'Off' : `${r2 * 100}%`}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Spread the word" icon="phone" aside={level < 2 ? <span className="lock-tag">Level 2</span> : undefined}>
        {marketing ? (
          <p>
            <b>{String(marketing.data?.source ?? 'Your campaign')}</b> is running until day {marketing.until}: about {Math.round(Number(marketing.data?.total ?? 0))} extra customers in total.
          </p>
        ) : (
          <ul className="choice-list">
            {(Object.keys(MARKETING) as (keyof typeof MARKETING)[]).map((k) => (
              <li key={k}>
                <div>
                  <b>{MARKETING[k].name}</b>
                  <span className="small">{MARKETING[k].blurb}</span>
                </div>
                <Btn disabled={level < 2 || s.phase !== 'morning' || s.cash < MARKETING[k].cost || effectActive(s, 'marketing')} onClick={() => dispatch({ type: 'marketing', kind: k })}>
                  {money(MARKETING[k].cost)}
                </Btn>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">
          Results are uncertain: that's <Tip concept="risk">risk and return</Tip>.
        </p>
      </Card>

      <Card title="Bank loan" icon="house" aside={level < 3 ? <span className="lock-tag">Level 3</span> : undefined}>
        {s.loan ? (
          <>
            <p>
              You owe <b>{money2(s.loan.remaining)}</b>. Each evening <b>{money2(s.loan.daily)}</b> is paid back automatically.
            </p>
            <Btn disabled={busy || s.cash < s.loan.remaining} onClick={() => dispatch({ type: 'repayLoan' })}>
              Pay it all now ({money2(s.loan.remaining)})
            </Btn>
          </>
        ) : (
          <ul className="choice-list">
            {LOAN_SIZES.map((n) => {
              const total = n * (1 + CONFIG.loanFee);
              return (
                <li key={n}>
                  <div>
                    <b>Borrow {money(n)}</b>
                    <span className="small">
                      Pay back {money2(total)} in total: {money2(total / CONFIG.loanDays)} a day for {CONFIG.loanDays} days.
                    </span>
                  </div>
                  <Btn disabled={level < 3 || busy} onClick={() => dispatch({ type: 'borrow', amount: n })}>
                    Borrow
                  </Btn>
                </li>
              );
            })}
          </ul>
        )}
        <p className="muted small">
          A loan helps you buy something big now. The extra you pay back is <Tip concept="interest">interest</Tip>.
        </p>
      </Card>

      <Card title="Co-op shares" icon="chart" aside={level < 3 ? <span className="lock-tag">Level 3</span> : undefined}>
        <p className="small">
          Own a small piece of the farms you buy from. Prices move every day; each week you get a {CONFIG.coopDividend * 100}% <Tip concept="dividends">dividend</Tip>. Owning several is{' '}
          <Tip concept="diversification">diversification</Tip>.
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
                  <Btn disabled={level < 3 || busy || s.cash < price} onClick={() => dispatch({ type: 'trade', coop: c, delta: 1 })}>
                    Buy
                  </Btn>
                  <Btn kind="ghost" disabled={level < 3 || busy || own < 1} onClick={() => dispatch({ type: 'trade', coop: c, delta: -1 })}>
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
          {s.learned.length} of {NOTEBOOK_ORDER.length} ideas discovered.
        </p>
      </Card>
    </div>
  );
}
