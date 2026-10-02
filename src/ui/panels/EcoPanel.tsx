import { PACKAGING, UPGRADES } from '../../data/catalog';
import { ecoBreakdown, ecoScore, effectActive, has, levelOf } from '../../engine/economy';
import { canShop } from '../../engine/state';
import type { PackagingId, UpgradeId } from '../../engine/types';
import { money, money2 } from '../../lib/format';
import { useGame } from '../GameContext';
import { Btn, Card, Meter, Tip } from '../kit';
import { Sprite } from '../pixel/Sprite';

const ECO_UPS: UpgradeId[] = ['compost', 'solar', 'garden'];

export function EcoPanel() {
  const { state: s, dispatch } = useGame();
  const eco = ecoScore(s);
  const b = ecoBreakdown(s);
  const level = levelOf(s.xp);
  const green = effectActive(s, 'greenWeek');
  return (
    <div className="panel-stack">
      <Card className="eco-hero" title="Eco score" icon="leaf" aside={green ? <span className="chip green">Green Week!</span> : undefined}>
        <div className="eco-big">
          <b>{eco}</b>
          <span>/ 100</span>
        </div>
        <Meter value={eco / 100} tone="eco" label="Eco score" />
        <p className="small">
          Eco-minded customers like Mai pay more at a green bakery. {green ? 'During Green Week there are many more of them.' : ''}
        </p>
      </Card>

      <Card title="Where it comes from" icon="chart">
        <ul className="eco-break">
          <li>
            <span>Ingredient sourcing (40%)</span>
            <Meter value={b.sourcing / 100} tone="eco" label="Sourcing" />
            <span className="small muted">Farm co-op ingredients score highest; the wet market lowest.</span>
          </li>
          <li>
            <span>
              <Tip concept="waste">Food waste</Tip> (30%)
            </span>
            <Meter value={1 - Math.min(1, b.wasteRate * 4)} tone="eco" label="Waste" />
            <span className="small muted">{Math.round(b.wasteRate * 100)}% of what you made was binned this week. Donating doesn't count as waste.</span>
          </li>
          <li>
            <span>Packaging (30%)</span>
            <Meter value={b.packaging / 100} tone="eco" label="Packaging" />
          </li>
          {b.extras > 0 && (
            <li>
              <span>Bonuses from upgrades and plants</span>
              <b>+{b.extras}</b>
            </li>
          )}
        </ul>
      </Card>

      <Card title="Packaging" icon="bag">
        <div className="pack-choices" role="radiogroup" aria-label="Packaging">
          {(Object.keys(PACKAGING) as PackagingId[]).map((id) => {
            const p = PACKAGING[id];
            return (
              <button key={id} type="button" role="radio" aria-checked={s.packaging === id} className={`pack ${s.packaging === id ? 'on' : ''}`} disabled={s.phase === 'service'} onClick={() => dispatch({ type: 'setPackaging', packaging: id })}>
                <b>{p.name}</b>
                <span className="small">{money2(p.cost)} per sale</span>
                <Meter value={p.eco / 100} tone="eco" label={`${p.name} eco`} />
                <span className="small muted">{p.blurb}</span>
              </button>
            );
          })}
        </div>
        <p className="muted small">
          Cheap plastic costs you less, but the street pays for it later: an <Tip concept="externality">externality</Tip>.
        </p>
      </Card>

      <Card title="Green upgrades" icon="sun">
        <ul className="shop-list">
          {ECO_UPS.map((id) => {
            const u = UPGRADES[id];
            const owned = has(s, id);
            return (
              <li key={id} className={`shop-item ${owned ? 'owned' : ''}`}>
                <span className="shop-icon">
                  <Sprite name={id === 'solar' ? 'sun' : id === 'compost' ? 'leaf' : 'veg'} scale={3} />
                </span>
                <div className="shop-info">
                  <b>{u.name}</b>
                  <span className="small">{u.blurb}</span>
                  <span className="small effect">
                    {u.effect} · eco +{u.eco}
                  </span>
                </div>
                <div className="shop-act">
                  {owned ? (
                    <span className="owned-tag">
                      <Sprite name="check" scale={2} /> Yours
                    </span>
                  ) : level < u.level ? (
                    <span className="lock-tag">
                      <Sprite name="lock" scale={2} /> Level {u.level}
                    </span>
                  ) : (
                    <Btn kind="primary" disabled={!canShop(s) || s.cash < u.cost} onClick={() => dispatch({ type: 'buyUpgrade', id })} sfx="sparkle">
                      {money(u.cost)}
                    </Btn>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Community" icon="heart">
        <Meter value={s.community / 100} tone="heart" label="Community" />
        <p className="small">
          You've donated <b>{s.lifetime.donated}</b> leftover items to the neighbourhood food shelf. Donations, good service and being a kind neighbour all raise your community score.
        </p>
      </Card>
    </div>
  );
}
