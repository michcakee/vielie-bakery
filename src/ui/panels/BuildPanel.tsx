import { useState } from 'react';
import { DECOR, DECOR_ORDER, LEVELS, STAGES, UPGRADES, UPGRADE_ORDER } from '../../data/catalog';
import { GOALS, LOCATIONS, LOCATION_ORDER, SEGMENTS } from '../../data/world';
import { activeRivals, businessStage, countOf, depreciationPerDay, levelOf, marketTraffic } from '../../engine/economy';
import { valuation } from '../../engine/finance';
import { goalProgress } from '../../engine/progression';
import { canShop } from '../../engine/state';
import type { DecorId, LocationId, SegmentId, UpgradeId } from '../../engine/types';
import { money, money2, pct } from '../../lib/format';
import { useGame } from '../GameContext';
import { Btn, Card, Tip } from '../kit';
import { LookEditor } from '../LookEditor';
import { Sprite } from '../pixel/Sprite';

const UP_ICON: Record<UpgradeId, string> = {
  ovenBasic: 'hot',
  oven2: 'hot',
  oven3: 'hot',
  mixer: 'gear',
  steamer: 'banhBao',
  fridge: 'fridge',
  walkIn: 'fridge',
  storage: 'box',
  display: 'shop',
  coffeeBar: 'caPhe',
  pos: 'coin',
  fan: 'cool',
  solar: 'sun',
  compost: 'leaf',
  bike: 'moto',
  van: 'box',
  website: 'phone',
  corner: 'cafe',
  garden: 'veg',
  renovation: 'house',
  loft: 'house',
};
const DECOR_ICON: Record<DecorId, string> = {
  plant: 'plant',
  stools: 'cafe',
  stringLights: 'spark',
  sign: 'bell',
  lanterns: 'lantern',
  birdcage: 'birdcage',
  radio: 'note',
  art: 'star',
  rug: 'box',
  flowers: 'fruit',
  bike: 'moto',
  hoaMai: 'hoaMai',
};

export function BuildPanel() {
  const { state: s, dispatch, business, feature, fresh } = useGame();
  const level = levelOf(s.xp);
  const shopping = canShop(s);
  const [name, setName] = useState(s.bakeryName);
  const [branchName, setBranchName] = useState('');
  const v = valuation(s);
  const stage = businessStage(s);
  const gp = goalProgress(s);
  const pi = s.macro.priceIndex;

  const upgrade = (id: UpgradeId) => {
    const u = UPGRADES[id];
    const owned = countOf(s, id);
    const cost = Math.round(u.cost * pi);
    const locked = level < u.level;
    const needs = u.requires && !s.upgrades.includes(u.requires) ? UPGRADES[u.requires].name.toLowerCase() : undefined;
    const items = s.equipment.filter((e) => e.kind === id);
    return (
      <li key={id} className={`shop-item ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}`}>
        <span className="shop-icon">
          <Sprite name={UP_ICON[id]} scale={3} />
        </span>
        <div className="shop-info">
          <b>
            {u.name} {owned > 0 && <span className="muted">×{owned}</span>}
          </b>
          <span className="muted small" lang="vi">
            {u.vi}
          </span>
          <span className="small">{u.blurb}</span>
          <span className="small effect">{u.effect}</span>
          {business && (
            <span className="tiny muted">
              Capital expense: lasts ~{u.life} years, so about {money2(depreciationPerDay(cost, u.life))} a day of <Tip concept="depreciation">depreciation</Tip>
              {u.maintenance ? ` + ${money2(u.maintenance * pi)} upkeep` : ''}
              {u.utilities ? ` + ${money2(u.utilities * pi)} power` : ''}
              {u.rent ? ` + ${money2(u.rent * s.macro.rentIndex)} rent` : ''} a day.
            </span>
          )}
          {items.map((e) => (
            <span key={e.uid} className="tiny">
              {business ? <>Bought day {e.boughtDay}: book value {money(e.cost - e.depreciated)}</> : 'Yours'}
              {e.broken && <b className="warn"> · broken</b>}
              {u.group !== 'room' && (
                <button type="button" className="link-btn" disabled={!shopping} onClick={() => dispatch({ type: 'sellEquipment', uid: e.uid })}>
                  sell for {money((e.cost - e.depreciated) * 0.6)}
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="shop-act">
          {owned >= u.max ? (
            <span className="owned-tag">
              <Sprite name="check" scale={2} /> Yours
            </span>
          ) : locked ? (
            <span className="lock-tag">
              <Sprite name="lock" scale={2} /> Level {u.level}
            </span>
          ) : needs ? (
            <span className="lock-tag">Needs {needs}</span>
          ) : (
            <Btn kind="primary" disabled={!shopping || s.cash < cost} onClick={() => dispatch({ type: 'buyUpgrade', id })} sfx="sparkle">
              {money(cost)}
            </Btn>
          )}
        </div>
      </li>
    );
  };

  const openBranches = s.branches.filter((b) => !b.closed);

  return (
    <div className="panel-stack">
      {feature('growth.equipment') && (
      <Card className="oc-note" title={`Stage ${stage}: ${STAGES[stage - 1].name}`} icon="house">
        <p className="small">
          You have <b>{money(s.cash, 2)}</b>. Every purchase here means giving up something else for now: <Tip concept="opportunityCost">opportunity cost</Tip>. Equipment is an{' '}
          <Tip concept="investment">investment</Tip>, not today's cost: it's spread over its life as depreciation.
        </p>
        <div className="goal-box">
          <b>Goal: {GOALS[s.goal]?.name}</b>
          <span className="small">{GOALS[s.goal]?.blurb}</span>
          <span className="meter meter-xp">
            <span className="meter-fill" style={{ width: `${gp.pct * 100}%` }} />
          </span>
          <span className="small muted">{gp.text}</span>
          {s.goalReached !== undefined && <span className="small">Reached on day {s.goalReached}. The bakery is yours to keep growing.</span>}
        </div>
        {s.day >= 60 && s.phase === 'morning' && (
          <details className="retire">
            <summary className="small">Sell up and retire…</summary>
            <p className="small">
              A buyer would pay about <b>{money(v.ownerValue)}</b> for your share today (the business’s value minus debt, times what you own). This ends the game.
            </p>
            <Btn kind="ghost" onClick={() => window.confirm(`Sell ${s.bakeryName} for about ${money(v.ownerValue)} and end this game?`) && dispatch({ type: 'retire' })}>
              Sell and retire
            </Btn>
          </details>
        )}
      </Card>
      )}

      {feature('growth.equipment') && (
      <Card spot="equipment" fresh={fresh('growth.equipment')} title="Kitchen & equipment" icon="hot">
        <ul className="shop-list">{UPGRADE_ORDER.filter((id) => UPGRADES[id].group === 'kitchen' || UPGRADES[id].group === 'shop' || UPGRADES[id].group === 'delivery').map(upgrade)}</ul>
      </Card>
      )}

      {feature('growth.equipment') && (
      <Card title="Grow the building" icon="house">
        <p className="muted small">
          More space brings more customers, but rent goes up every month: a <Tip concept="fixedCost">fixed cost</Tip>.
        </p>
        <ul className="shop-list">{UPGRADE_ORDER.filter((id) => UPGRADES[id].group === 'room').map(upgrade)}</ul>
      </Card>
      )}

      {feature('growth.branches') && (
      <Card spot="branches" fresh={fresh('growth.branches')} title="More shops" icon="shop" aside={level < 4 ? <span className="lock-tag">Level 4</span> : undefined}>
        {openBranches.map((b) => (
          <div key={b.id} className="branch-card">
            <b>
              {b.name} <span className="muted">· {LOCATIONS[b.location].name}</span>
            </b>
            <span className="small">
              Yesterday: {money(b.lastRevenue)} sales, <span className={b.lastProfit >= 0 ? 'pos' : 'neg'}>{money(b.lastProfit)} profit</span> · {b.lastServed} served, {b.lastLost} turned away · reputation {Math.round(b.reputation)} · staff {s.staff.filter((e) => e.branch === b.id).length}
            </span>
            {!s.staff.some((e) => e.branch === b.id && e.role === 'manager') && <span className="small warn">No manager: this shop runs at 80%. Hire one in Staff.</span>}
            <Btn kind="danger" disabled={!shopping} onClick={() => dispatch({ type: 'closeBranch', id: b.id })}>
              Close this shop
            </Btn>
          </div>
        ))}
        <p className="small muted">A new shop needs a fit-out (capital), a lease deposit (returned when you leave), rent every month and a team. It runs on its own each day with your prices and menu; the results flow into your books.</p>
        <label className="small" htmlFor="branch-name">
          Name for the new shop
        </label>
        <input id="branch-name" value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder={`${s.bakeryName} 2`} maxLength={28} />
        <ul className="shop-list">
          {LOCATION_ORDER.filter((l) => l !== s.location && !openBranches.some((b) => b.location === l)).map((id: LocationId) => {
            const l = LOCATIONS[id];
            const cost = Math.round((l.fitOut + l.deposit) * pi);
            const top = (Object.entries(l.segments) as [SegmentId, number][]).sort((a, b) => b[1] - a[1]).slice(0, 2);
            return (
              <li key={id} className="shop-item">
                <span className="shop-icon">
                  <Sprite name="shop" scale={3} />
                </span>
                <div className="shop-info">
                  <b>{l.name}</b>
                  <span className="small muted" lang="vi">
                    {l.vi}
                  </span>
                  <span className="small">{l.blurb}</span>
                  <span className="small effect">
                    Rent {money(l.rent * 30 * s.macro.rentIndex)}/month · ~{Math.round(marketTraffic(s, id))} passers-by a day · mostly {top.map(([sg]) => SEGMENTS[sg].name.toLowerCase()).join(' & ')} · {activeRivals(s, id).length} rival{activeRivals(s, id).length === 1 ? '' : 's'}
                  </span>
                  <span className="tiny muted">
                    Fit-out {money(l.fitOut * pi)} + deposit {money(l.deposit * pi)}
                  </span>
                </div>
                <div className="shop-act">
                  <Btn kind="primary" disabled={!shopping || level < 4 || s.cash < cost} onClick={() => dispatch({ type: 'openBranch', location: id, name: branchName })}>
                    Open ({money(cost)})
                  </Btn>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      )}

      {feature('growth.branches') && (
      <Card title="What is the bakery worth?" icon="chart">
        <p className="small">
          A buyer would look at your yearly cash earnings ({money(v.ebitdaAnnual)}) × a multiple ({v.multiple.toFixed(1)}, higher for growing, well-loved bakeries) = <b>{money(v.enterprise)}</b>, then add cash and subtract debt: equity worth <b>{money(v.equityValue)}</b>
          {s.investors.length ? `, of which your share is ${money(v.ownerValue)}` : ''}. Sales growth over the last quarter: {pct(v.growth)}.
        </p>
        {s.offer && <p className="note">{s.offer.buyer} plans to make you an offer soon.</p>}
      </Card>
      )}

      {feature('growth.decor') && (
      <Card spot="decor" fresh={fresh('growth.decor')} title="Decorate" icon="plant">
        <ul className="shop-list decor">
          {DECOR_ORDER.map((id) => {
            const d = DECOR[id];
            const owned = s.decor.includes(id);
            const locked = level < d.level;
            return (
              <li key={id} className={`shop-item ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}`}>
                <span className="shop-icon">
                  <Sprite name={DECOR_ICON[id]} scale={3} />
                </span>
                <div className="shop-info">
                  <b>{d.name}</b>
                  <span className="muted small" lang="vi">
                    {d.vi}
                  </span>
                  <span className="small">{d.bonus}</span>
                </div>
                <div className="shop-act">
                  {owned ? (
                    <span className="owned-tag">
                      <Sprite name="check" scale={2} /> Yours
                    </span>
                  ) : locked ? (
                    <span className="lock-tag">
                      <Sprite name="lock" scale={2} /> Level {d.level}
                    </span>
                  ) : (
                    <Btn kind="primary" disabled={!shopping || s.cash < d.cost} onClick={() => dispatch({ type: 'buyDecor', id })} sfx="sparkle">
                      {money(d.cost)}
                    </Btn>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      )}

      <Card title="You & your bakery" icon="people">
        <form
          className="rename"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({ type: 'rename', name });
          }}
        >
          <label htmlFor="bakery-name">Bakery name</label>
          <input id="bakery-name" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} />
          <Btn type="submit" disabled={!name.trim() || name === s.bakeryName}>
            Rename
          </Btn>
        </form>
        <LookEditor look={s.look} onChange={(look) => dispatch({ type: 'setLook', look })} big={6} />
        <p className="muted small">
          Level {level}: {LEVELS[level - 1].name}. {LEVELS[level] ? `Next: ${LEVELS[level].name} at ${LEVELS[level].xp.toLocaleString('en-US')} XP.` : 'You made it. Viet Bake Shop is a local legend.'}
        </p>
      </Card>
    </div>
  );
}
