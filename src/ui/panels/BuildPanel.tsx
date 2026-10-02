import { useState } from 'react';
import { DECOR, DECOR_ORDER, LEVELS, UPGRADES, UPGRADE_ORDER } from '../../data/catalog';
import { has, levelOf } from '../../engine/economy';
import { canShop } from '../../engine/state';
import type { DecorId, UpgradeId } from '../../engine/types';
import { money } from '../../lib/format';
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
  const { state: s, dispatch } = useGame();
  const level = levelOf(s.xp);
  const shopping = canShop(s);
  const [name, setName] = useState(s.bakeryName);

  const item = (opts: { key: string; icon: string; name: string; vi: string; cost: number; owned: boolean; lockLevel: number; needs?: string; effect: string; blurb?: string; onBuy: () => void; group?: string }) => {
    const locked = level < opts.lockLevel;
    return (
      <li key={opts.key} className={`shop-item ${opts.owned ? 'owned' : ''} ${locked ? 'locked' : ''}`}>
        <span className="shop-icon">
          <Sprite name={opts.icon} scale={3} />
        </span>
        <div className="shop-info">
          <b>{opts.name}</b>
          <span className="muted small" lang="vi">
            {opts.vi}
          </span>
          <span className="small">{opts.blurb ?? opts.effect}</span>
          {opts.blurb && <span className="small effect">{opts.effect}</span>}
        </div>
        <div className="shop-act">
          {opts.owned ? (
            <span className="owned-tag">
              <Sprite name="check" scale={2} /> Yours
            </span>
          ) : locked ? (
            <span className="lock-tag">
              <Sprite name="lock" scale={2} /> Level {opts.lockLevel}
            </span>
          ) : opts.needs ? (
            <span className="lock-tag">Needs {opts.needs}</span>
          ) : (
            <Btn kind="primary" disabled={!shopping || s.cash < opts.cost} onClick={opts.onBuy} sfx="sparkle">
              {money(opts.cost)}
            </Btn>
          )}
        </div>
      </li>
    );
  };

  const upgrade = (id: UpgradeId) => {
    const u = UPGRADES[id];
    return item({
      key: id,
      icon: UP_ICON[id],
      name: u.name,
      vi: u.vi,
      cost: u.cost,
      owned: has(s, id),
      lockLevel: u.level,
      needs: u.requires && !has(s, u.requires) ? UPGRADES[u.requires].name.toLowerCase() : undefined,
      effect: u.effect,
      blurb: u.blurb,
      onBuy: () => dispatch({ type: 'buyUpgrade', id }),
    });
  };

  return (
    <div className="panel-stack">
      <Card className="oc-note" title="One wallet, many wishes" icon="coin">
        <p className="small">
          You have <b>{money(s.cash, 2)}</b>. Every choice here means giving up another for now: that's <Tip concept="opportunityCost">opportunity cost</Tip>. Equipment is an{' '}
          <Tip concept="investment">investment</Tip>: it isn't counted as today's cost, it keeps helping you earn.
        </p>
      </Card>
      <Card title="Equipment" icon="hot">
        <ul className="shop-list">{UPGRADE_ORDER.filter((id) => UPGRADES[id].group !== 'room' && UPGRADES[id].group !== 'eco').map(upgrade)}</ul>
      </Card>
      <Card title="Grow the bakery" icon="house">
        <p className="muted small">New rooms bring more customers, but rent goes up every day: a <Tip concept="fixedCost">fixed cost</Tip>.</p>
        <ul className="shop-list">{UPGRADE_ORDER.filter((id) => UPGRADES[id].group === 'room').map(upgrade)}</ul>
      </Card>
      <Card title="Decorate" icon="plant">
        <ul className="shop-list decor">
          {DECOR_ORDER.map((id) => {
            const d = DECOR[id];
            return item({ key: id, icon: DECOR_ICON[id], name: d.name, vi: d.vi, cost: d.cost, owned: s.decor.includes(id), lockLevel: d.level, effect: d.bonus, onBuy: () => dispatch({ type: 'buyDecor', id }) });
          })}
        </ul>
      </Card>
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
          Level {level}: {LEVELS[level - 1].name}. {LEVELS[level] ? `Next: ${LEVELS[level].name} at ${LEVELS[level].xp} XP.` : 'You made it. Vielie Bakery is a local legend.'}
        </p>
      </Card>
    </div>
  );
}
