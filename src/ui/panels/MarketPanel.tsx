import { useState } from 'react';
import { INGREDIENTS, INGREDIENT_ORDER, LOYALTY, PRODUCTS, SUPPLIERS, SUPPLIER_ORDER } from '../../data/catalog';
import { ECON } from '../../data/config';
import { bulkDiscount, coldCapacity, dryCapacity, effectActive, inStock, levelOf, loyaltyDiscount, onMenu, packPrice, storageUse } from '../../engine/economy';
import { canShop } from '../../engine/state';
import type { IngredientId, SupplierId } from '../../engine/types';
import { money, money2 } from '../../lib/format';
import { play } from '../audio';
import { useGame } from '../GameContext';
import { Btn, Card, Meter, Tip } from '../kit';
import { Sprite } from '../pixel/Sprite';

function Rating({ value, icon, label }: { value: number; icon: string; label: string }) {
  const n = Math.round(value / 20);
  return (
    <span className="rating" role="img" aria-label={`${label} ${n} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < n ? 'on' : 'off'}>
          <Sprite name={icon} scale={1} />
        </span>
      ))}
    </span>
  );
}

const SIZES = [1, 5, 10, 20];

function ReorderEditor({ id }: { id: IngredientId }) {
  const { state: s, dispatch } = useGame();
  const rule = s.reorder[id];
  const [below, setBelow] = useState(rule?.below ?? INGREDIENTS[id].pack);
  const [packs, setPacks] = useState(rule?.packs ?? 2);
  const [sup, setSup] = useState<SupplierId>(rule?.supplier ?? 'distributor');
  return (
    <div className="reorder">
      <span className="small">
        When below <input type="number" min={0} max={500} value={below} onChange={(e) => setBelow(Number(e.target.value))} aria-label="Reorder threshold" className="num-in" /> {INGREDIENTS[id].unit}s, order{' '}
        <input type="number" min={1} max={50} value={packs} onChange={(e) => setPacks(Number(e.target.value))} aria-label="Packs to order" className="num-in" /> packs from{' '}
        <select value={sup} onChange={(e) => setSup(e.target.value as SupplierId)} aria-label="Supplier">
          {SUPPLIER_ORDER.map((x) => (
            <option key={x} value={x}>
              {SUPPLIERS[x].name}
            </option>
          ))}
        </select>
      </span>
      <Btn onClick={() => dispatch({ type: 'setReorder', ingredient: id, below, packs: Math.max(packs, SUPPLIERS[sup].minPacks), supplier: sup })}>Save rule</Btn>
      {rule && (
        <button type="button" className="link-btn" onClick={() => dispatch({ type: 'clearReorder', ingredient: id })}>
          Remove
        </button>
      )}
    </div>
  );
}

export function MarketPanel() {
  const { state: s, dispatch, business, feature, fresh } = useGame();
  const more = feature('market.suppliers');
  const deals = feature('market.contracts');
  const [sup, setSup] = useState<SupplierId>('cho');
  const [size, setSize] = useState(1);
  const [pops, setPops] = useState<{ id: number; ing: IngredientId; n: number }[]>([]);
  const [editing, setEditing] = useState<IngredientId | null>(null);
  const [contract, setContract] = useState<{ ing: IngredientId; packs: number; weeks: number }>({ ing: 'flour', packs: 2, weeks: 8 });
  const shopping = canShop(s) && !s.events.length;
  const lockable = levelOf(s.xp) >= 2;
  const needed = new Set<IngredientId>(['flour']);
  for (const p of onMenu(s)) for (const id of Object.keys(PRODUCTS[p].recipe) as IngredientId[]) needed.add(id);
  for (const p of s.unlocked) for (const id of Object.keys(PRODUCTS[p].recipe) as IngredientId[]) needed.add(id);
  const list = INGREDIENT_ORDER.filter((id) => needed.has(id) || s.pantry[id].qty > 0);
  const packs = Math.max(size, SUPPLIERS[sup].minPacks);
  const dryUse = storageUse(s, false);
  const coldUse = storageUse(s, true);
  const dryCap = dryCapacity(s);
  const coldCap = coldCapacity(s);

  const buy = (id: IngredientId) => {
    const before = s.pantry[id].qty + s.deliveries.length;
    dispatch({ type: 'buy', ingredient: id, supplier: sup, packs });
    if (s.cash >= packPrice(s, id, sup, packs) * packs) {
      play('pop');
      const pop = { id: Date.now() + Math.random(), ing: id, n: INGREDIENTS[id].pack * packs };
      setPops((p) => [...p.slice(-4), pop]);
      window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== pop.id)), 900);
    } else if (before === s.pantry[id].qty + s.deliveries.length) play('oops');
  };

  return (
    <div className="panel-stack">
      <Card className="paper" title="Tin chợ: market news" icon="shop">
        <p className="headline">{s.market.headline}</p>
        {business && <p className="small muted">Ingredient prices overall are {((s.macro.priceIndex - 1) * 100).toFixed(1)}% higher than when you opened, from inflation.</p>}
      </Card>

      <Card title="Storage" icon="box">
        <div className="storage">
          <div>
            <span className="small">Dry shelves</span>
            <Meter value={dryUse / dryCap} tone={dryUse > dryCap ? 'bad' : dryUse > dryCap * 0.8 ? 'meh' : 'good'} label="Dry storage used" />
            <span className="tiny">
              {dryUse} / {dryCap}
            </span>
          </div>
          <div>
            <span className="small">Cold storage</span>
            <Meter value={coldUse / coldCap} tone={coldUse > coldCap ? 'bad' : coldUse > coldCap * 0.8 ? 'meh' : 'good'} label="Cold storage used" />
            <span className="tiny">
              {coldUse} / {coldCap}
            </span>
          </div>
        </div>
        <p className="small muted">Over the cold limit, fresh ingredients spoil three times as fast.{more && " Bulk is cheaper per pack, but only if you use it before it goes off: that's the trade-off."}</p>
        {s.deliveries.length > 0 && (
          <p className="small">
            On the way: {s.deliveries.map((d) => `${d.packs} × ${INGREDIENTS[d.ingredient].name.toLowerCase()} (day ${d.arrives})`).join(', ')}
          </p>
        )}
      </Card>

      {more && <div className="suppliers four" role="tablist" aria-label="Suppliers">
        {SUPPLIER_ORDER.map((id) => {
          const d = SUPPLIERS[id];
          const disc = loyaltyDiscount(s, id);
          const toNext = LOYALTY.packsPerPoint - (s.supplierLoyalty[id] % LOYALTY.packsPerPoint);
          return (
            <button key={id} type="button" role="tab" aria-selected={sup === id} className={`supplier ${sup === id ? 'on' : ''}`} onClick={() => (play('click'), setSup(id))} data-spot={`supplier-${id}`}>
              <b>{d.name}</b>
              <span className="muted small" lang="vi">
                {d.vi}
              </span>
              <span className="sup-line">
                Price <b>{d.priceMult < 0.85 ? 'Cheapest' : d.priceMult < 1 ? 'Cheap' : d.priceMult < 1.2 ? 'Fair' : 'Pricey'}</b>
              </span>
              <span className="sup-line">
                Quality <Rating value={d.quality} icon="star" label="Quality" />
              </span>
              <span className="sup-line">
                Eco <Rating value={d.eco} icon="leaf" label="Eco" />
              </span>
              <span className="small">{d.leadDays === 0 ? 'Take it home today' : d.leadDays === 1 ? 'Delivered tomorrow' : `Arrives in ${d.leadDays} days`}{d.minPacks > 1 ? ` · min ${d.minPacks} packs` : ''}</span>
              <span className="small">{d.blurb}</span>
              <span className="small loyal">{disc > 0 ? `Loyal customer: ${Math.round(disc * 100)}% off` : `Loyalty discount in ${toNext} packs`}</span>
              {id === 'premium' && effectActive(s, 'premiumSale') && <span className="sale-tag">SALE −30%</span>}
            </button>
          );
        })}
      </div>}

      <Card title={`Stock up at ${SUPPLIERS[sup].name}`} icon="bag" spot="stock-up" fresh={fresh('market.wet') || fresh('market.suppliers')}>
        <div className="seg" role="radiogroup" aria-label="Order size">
          <span className="small">Order size:</span>
          {SIZES.filter((n) => more || n <= 5).map((n) => (
            <button key={n} type="button" role="radio" aria-checked={size === n} className={size === n ? 'on' : ''} onClick={() => setSize(n)} disabled={n < SUPPLIERS[sup].minPacks}>
              {n} pack{n > 1 ? 's' : ''}
              {bulkDiscount(n) > 0 && <em> −{Math.round(bulkDiscount(n) * 100)}%</em>}
            </button>
          ))}
        </div>
        {!shopping && <p className="warn small">{s.events.length ? 'Answer today\'s news first.' : 'The market is closed while your shop is open.'}</p>}
        <ul className="market-list">
          {list.map((id) => {
            const d = INGREDIENTS[id];
            const price = packPrice(s, id, sup, packs);
            const mult = s.market.prices[id] / s.macro.priceIndex;
            const out = !inStock(s, id, sup);
            const lock = s.locks.find((l) => l.ingredient === id && l.until >= s.day);
            const low = s.pantry[id].qty < d.pack / 2;
            const rule = s.reorder[id];
            return (
              <li key={id} className={`market-row ${low ? 'low' : ''}`}>
                <Sprite name={id} scale={3} />
                <div className="market-info">
                  <b>
                    <span lang="vi">{d.vi}</span> <span className="muted">· {d.name}</span>
                  </b>
                  <span className="small">
                    Pantry: <b>{s.pantry[id].qty}</b> {d.unit}s {low && <span className="warn">· running low</span>} {d.cold && <span className="muted">· cold</span>}
                    {d.spoil > 0 && <span className="muted"> · {business ? `loses ~${Math.round(d.spoil * 100)}% a night` : 'spoils'}</span>}
                  </span>
                  <span className="small">
                    {packs} × {d.pack} {d.unit}s: <b>{money2(price * packs)}</b>{business && <> ({money2(price)}/pack)</>}
                    {mult > 1.08 && <span className="up"> · ▲ {business ? `${Math.round((mult - 1) * 100)}% above normal` : 'pricey today'}</span>}
                    {mult < 0.94 && <span className="down"> · ▼ {business ? `${Math.round((1 - mult) * 100)}% below normal` : 'a bargain today'}</span>}
                  </span>
                  {lock && <span className="small locked">Price locked until day {lock.until}</span>}
                  {rule && (
                    <span className="small effect">
                      Auto-reorder: {rule.packs} packs from {SUPPLIERS[rule.supplier].name} below {rule.below}
                    </span>
                  )}
                  {editing === id && <ReorderEditor id={id} />}
                </div>
                <div className="market-act">
                  {pops
                    .filter((p) => p.ing === id)
                    .map((p) => (
                      <span key={p.id} className="buy-pop">
                        +{p.n}
                      </span>
                    ))}
                  {out ? (
                    <span className="sold-out">Sold out today</span>
                  ) : (
                    <Btn kind="primary" disabled={!shopping || s.cash < price * packs} onClick={() => buy(id)} sfx={null}>
                      {SUPPLIERS[sup].leadDays ? 'Order' : 'Stock up'}
                    </Btn>
                  )}
                  {deals && <button type="button" className="link-btn" onClick={() => setEditing(editing === id ? null : id)}>
                    {editing === id ? 'Close' : 'Auto-reorder'}
                  </button>}
                  {deals && lockable && !lock && (
                    <button type="button" className="link-btn" disabled={!shopping || s.cash < ECON.costs.priceLockFee} onClick={() => dispatch({ type: 'lockPrice', ingredient: id })} title="Freeze today's market price for 7 days">
                      Lock price ${ECON.costs.priceLockFee}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {lockable && (
          <p className="muted small">
            Worried a price will jump? <Tip concept="hedging">Locking a price</Tip> costs ${ECON.costs.priceLockFee} and keeps today's market price for 7 days.
          </p>
        )}
        {s.cash < 5 && <p className="warn">The bakery wallet is feeling a little empty…</p>}
      </Card>

      {deals && <Card title="Supply contracts" icon="lock" spot="contracts" fresh={fresh('market.contracts')}>
        <p className="small">
          Agree a fixed price for a weekly delivery. You're protected if prices rise, stuck paying if they fall, and cancelling costs two weeks of deliveries. That's a <Tip concept="contracts">supply contract</Tip>.
        </p>
        {s.contracts.map((c) => (
          <p key={c.id} className="small">
            <b>{INGREDIENTS[c.ingredient].name}</b>: {c.packsPerWeek} packs a week at {money2(c.price)} from {SUPPLIERS[c.supplier].name}, until day {c.endDay}.{' '}
            <button type="button" className="link-btn" onClick={() => dispatch({ type: 'cancelContract', id: c.id })}>
              Cancel ({money(c.price * c.packsPerWeek * 2)} fee)
            </button>
          </p>
        ))}
        <div className="contract-form">
          <select value={contract.ing} onChange={(e) => setContract({ ...contract, ing: e.target.value as IngredientId })} aria-label="Ingredient">
            {list.map((id) => (
              <option key={id} value={id}>
                {INGREDIENTS[id].name}
              </option>
            ))}
          </select>
          <label className="small">
            Packs a week <input type="number" className="num-in" min={1} max={20} value={contract.packs} onChange={(e) => setContract({ ...contract, packs: Number(e.target.value) })} />
          </label>
          <label className="small">
            Weeks <input type="number" className="num-in" min={2} max={26} value={contract.weeks} onChange={(e) => setContract({ ...contract, weeks: Number(e.target.value) })} />
          </label>
          <span className="small">
            at ~{money2(packPrice(s, contract.ing, 'distributor', contract.packs) * 1.03)}/pack
          </span>
          <Btn disabled={!shopping} onClick={() => dispatch({ type: 'signContract', ingredient: contract.ing, supplier: 'distributor', packsPerWeek: contract.packs, weeks: contract.weeks })}>
            Sign
          </Btn>
        </div>
      </Card>}
    </div>
  );
}
