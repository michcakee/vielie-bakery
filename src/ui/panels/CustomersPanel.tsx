import { PRODUCTS, PRODUCT_ORDER } from '../../data/catalog';
import { SEGMENTS, SEGMENT_ORDER } from '../../data/world';
import { activeRivals, expectedQuality, levelOf, playerShare, segmentMix } from '../../engine/economy';
import { CAMPAIGNS } from '../../engine/state';
import type { CampaignKind, ProductId } from '../../engine/types';
import { money, money2, pct } from '../../lib/format';
import { BarList } from '../charts';
import { useGame } from '../GameContext';
import { Btn, Card, Empty, Tip } from '../kit';
import { Sprite } from '../pixel/Sprite';
import { Neighbours } from './HomePanel';

export function CustomersPanel() {
  const { state: s, dispatch, business, feature, fresh } = useGame();
  const recent = s.history.slice(-14);
  const mix = segmentMix(s);
  const served: Record<string, number> = {};
  for (const h of recent) for (const [k, v] of Object.entries(h.segments ?? {})) served[k] = (served[k] ?? 0) + (v ?? 0);
  const totalServed = Object.values(served).reduce((a, b) => a + b, 0);
  const loyalTotal = Object.values(s.loyal).reduce((a, b) => a + (b ?? 0), 0);
  const rivals = activeRivals(s);
  const avgSat = recent.length ? recent.reduce((t, h) => t + h.satisfaction, 0) / recent.length : 0;
  const share = recent.length ? recent.reduce((t, h) => t + h.share, 0) / recent.length : 1;


  return (
    <div className="panel-stack">
      <div className="dash-tiles">
        <div className="tile">
          <Sprite name="people" scale={3} />
          <span>Served (14 days)</span>
          <b>{totalServed}</b>
        </div>
        <div className="tile">
          <Sprite name="heart" scale={3} />
          <span>
            <Tip concept="loyalty">Loyal customers</Tip>
          </span>
          <b>{loyalTotal}</b>
        </div>
        <div className="tile">
          <Sprite name="star" scale={3} />
          <span>Satisfaction</span>
          <b>{Math.round(avgSat * 100)}%</b>
        </div>
        <div className="tile">
          <Sprite name="shop" scale={3} />
          <span>
            <Tip concept="competition">Your share</Tip>
          </span>
          <b>{pct(share)}</b>
        </div>
      </div>

      {feature('customers.regulars') && <Neighbours />}
      {feature('customers.regulars') && <Card title="Who comes in" icon="people" fresh={fresh('customers.regulars')}>
        <p className="small muted">Different customers want different things and react differently to price. Your neighbourhood decides the mix.</p>
        <ul className="segment-list">
          {SEGMENT_ORDER.filter((seg) => mix[seg] > 0.005 || served[seg]).map((seg) => {
            const d = SEGMENTS[seg];
            const favs = (Object.entries(d.prefs) as [ProductId, number][])
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([p]) => PRODUCTS[p].name);
            return (
              <li key={seg}>
                <div className="seg-head">
                  <b>{d.name}</b> <span className="muted small" lang="vi">{d.vi}</span>
                  <span className="seg-share">{pct(mix[seg])} of passers-by</span>
                </div>
                <span className="small">{d.blurb}</span>
                <span className="small muted">
                  Loves {favs.join(', ')} · price sensitivity {d.sensitivity >= 1.3 ? 'high' : d.sensitivity <= 0.7 ? 'low' : 'medium'} · {s.loyal[seg] ?? 0} loyal · {served[seg] ?? 0} served lately
                </span>
              </li>
            );
          })}
        </ul>
      </Card>}

      {feature('customers.rivals') && <Card title="Rival bakeries nearby" icon="shop" spot="rivals" fresh={fresh('customers.rivals')}>
        {rivals.length === 0 ? (
          <Empty icon="shop">No rivals on your street right now. Enjoy it; good profits tend to attract them.</Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Bakery</th>
                    <th scope="col">Style</th>
                    <th scope="col">Quality</th>
                    {PRODUCT_ORDER.filter((p) => rivals.some((c) => c.prices[p] !== undefined) && s.menu.includes(p)).map((p) => (
                      <th key={p} scope="col">
                        {PRODUCTS[p].name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="you">
                    <th scope="row">{s.bakeryName} (you)</th>
                    <td>Your call</td>
                    <td>{Math.round(expectedQuality(s, 'banhMi'))}</td>
                    {PRODUCT_ORDER.filter((p) => rivals.some((c) => c.prices[p] !== undefined) && s.menu.includes(p)).map((p) => (
                      <td key={p}>
                        {money2(s.prices[p])}
                        <span className="tiny muted"> {pct(playerShare(s, p))} share</span>
                      </td>
                    ))}
                  </tr>
                  {rivals.map((c) => (
                    <tr key={c.id}>
                      <th scope="row">{c.name}</th>
                      <td className="small">{c.strategy}</td>
                      <td>{Math.round(c.quality)}</td>
                      {PRODUCT_ORDER.filter((p) => rivals.some((r) => r.prices[p] !== undefined) && s.menu.includes(p)).map((p) => (
                        <td key={p}>{c.prices[p] !== undefined ? money2(c.prices[p]!) : '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="rival-list">
              {rivals.map((c) => (
                <li key={c.id}>
                  <b>{c.name}</b> <span className="small muted">{c.lastMove}</span>
                </li>
              ))}
            </ul>
            <p className="small muted">
              Shoppers weigh price, quality, reputation and habit. You don't have to be cheapest; loyal customers rarely switch. Undercut a discounter and they'll answer; copycats copy whatever sells.
            </p>
          </>
        )}
      </Card>}

      {feature('customers.marketing') && <Card title="Marketing" icon="phone" spot="marketing" fresh={fresh('customers.marketing')} aside={levelOf(s.xp) < 2 ? <span className="lock-tag">Level 2</span> : undefined}>
        <ul className="choice-list">
          {(Object.keys(CAMPAIGNS) as CampaignKind[]).map((k) => {
            const c = CAMPAIGNS[k];
            const cost = Math.round(c.cost * s.macro.priceIndex);
            const running = s.campaigns.find((x) => x.kind === k && x.endDay >= s.day);
            const expected = c.reach * c.conversion;
            const best = Object.entries(SEGMENTS)
              .filter(([, d]) => (d.marketing[k] ?? 0) >= 1.4)
              .map(([, d]) => d.name);
            return (
              <li key={k}>
                <div>
                  <b>{c.name}</b>
                  <span className="small">{c.blurb}</span>
                  {expected > 0 && (
                    <span className="small muted">
                      Reach ~{c.reach.toLocaleString('en-US')} · conversion ~{(c.conversion * 100).toFixed(1)}% · ~{Math.round(expected)} new customers · <Tip concept="cac">~{money2(cost / expected)} per customer</Tip>
                      {best.length ? ` · works best on ${best.join(', ').toLowerCase()}` : ''}
                    </span>
                  )}
                  {c.needs && !s.upgrades.includes(c.needs) && <span className="small warn">Needs a POS system.</span>}
                  {running && <span className="small effect">Running until day {running.endDay}</span>}
                </div>
                <Btn disabled={levelOf(s.xp) < 2 || s.phase !== 'morning' || s.cash < cost || !!running || (!!c.needs && !s.upgrades.includes(c.needs))} onClick={() => dispatch({ type: 'campaign', kind: k })}>
                  {money(cost)}
                </Btn>
              </li>
            );
          })}
        </ul>
        {s.campaigns.length > 0 && (
          <>
            <h4>Campaign results</h4>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Campaign</th>
                    <th scope="col">Cost</th>
                    <th scope="col">Customers it brought</th>
                    <th scope="col">Their spending</th>
                    {business && <th scope="col">Return</th>}
                  </tr>
                </thead>
                <tbody>
                  {[...s.campaigns].reverse().slice(0, 8).map((c) => {
                    const visits = c.newCustomers;
                    const revenue = c.revenue;
                    const tracked = c.kind === 'loyalty' ? 'Repeat visits' : `${visits}`;
                    const romi = c.cost ? (revenue * 0.6 - c.cost) / c.cost : 0;
                    return (
                      <tr key={c.id}>
                        <th scope="row">{CAMPAIGNS[c.kind].name}</th>
                        <td>{money(c.cost)}</td>
                        <td>{tracked}</td>
                        <td>{money(revenue)}</td>
                        {business && <td className={romi >= 0 ? 'pos' : 'neg'}>{romi >= 0 ? '▲' : '▼'} {pct(romi)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="small muted">
              Return on marketing = (the contribution those customers brought − the cost) ÷ the cost. A campaign only pays if it brings people who spend more than it costs.
            </p>
          </>
        )}
      </Card>}

      {recent.length > 0 && feature('customers.regulars') && (
        <Card title="What people ask for" icon="chart">
          <BarList
            title="Units sold in the last 14 days"
            rows={PRODUCT_ORDER.map((p) => ({ label: PRODUCTS[p].name, value: recent.reduce((t, h) => t + (h.sold[p] ?? 0), 0), note: recent.reduce((t, h) => t + (h.wished?.[p] ?? 0), 0) ? `+${recent.reduce((t, h) => t + (h.wished?.[p] ?? 0), 0)} missed` : undefined })).filter((r) => r.value > 0 || r.note)}
          />
          <p className="small muted">"Missed" counts people who asked for something you'd run out of. Sales alone undercount demand.</p>
        </Card>
      )}
    </div>
  );
}
