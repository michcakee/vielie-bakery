import { useState } from 'react';
import { CONFIG, INGREDIENTS, INGREDIENT_ORDER, LOYALTY, PRODUCTS, SUPPLIERS, SUPPLIER_ORDER } from '../../data/catalog';
import { effectActive, inStock, levelOf, loyaltyDiscount, onMenu, packPrice } from '../../engine/economy';
import { canShop } from '../../engine/state';
import type { IngredientId, SupplierId } from '../../engine/types';
import { money2 } from '../../lib/format';
import { play } from '../audio';
import { useGame } from '../GameContext';
import { Btn, Card, Tip } from '../kit';
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

export function MarketPanel() {
  const { state: s, dispatch } = useGame();
  const [sup, setSup] = useState<SupplierId>('cho');
  const [pops, setPops] = useState<{ id: number; ing: IngredientId; n: number }[]>([]);
  const shopping = canShop(s) && !s.events.length;
  const lockable = levelOf(s.xp) >= 2;
  const needed = new Set<IngredientId>(['flour']);
  for (const p of onMenu(s)) for (const id of Object.keys(PRODUCTS[p].recipe) as IngredientId[]) needed.add(id);
  const list = INGREDIENT_ORDER.filter((id) => needed.has(id) || s.pantry[id].qty > 0);

  const buy = (id: IngredientId) => {
    const before = s.pantry[id].qty;
    dispatch({ type: 'buy', ingredient: id, supplier: sup, packs: 1 });
    if (s.cash >= packPrice(s, id, sup)) {
      play('pop');
      const pop = { id: Date.now() + Math.random(), ing: id, n: INGREDIENTS[id].pack };
      setPops((p) => [...p.slice(-4), pop]);
      window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== pop.id)), 900);
    } else if (before === s.pantry[id].qty) play('oops');
  };

  return (
    <div className="panel-stack">
      <Card className="paper" title="Tin chợ: market news" icon="shop">
        <p className="headline">{s.market.headline}</p>
      </Card>

      <div className="suppliers" role="tablist" aria-label="Suppliers">
        {SUPPLIER_ORDER.map((id) => {
          const d = SUPPLIERS[id];
          const disc = loyaltyDiscount(s, id);
          const toNext = LOYALTY.packsPerPoint - (s.supplierLoyalty[id] % LOYALTY.packsPerPoint);
          return (
            <button key={id} type="button" role="tab" aria-selected={sup === id} className={`supplier ${sup === id ? 'on' : ''}`} onClick={() => (play('click'), setSup(id))}>
              <b>{d.name}</b>
              <span className="muted small" lang="vi">
                {d.vi}
              </span>
              <span className="sup-line">
                Price <b>{d.priceMult < 1 ? 'Cheap' : d.priceMult < 1.2 ? 'Fair' : 'Pricey'}</b>
              </span>
              <span className="sup-line">
                Quality <Rating value={d.quality} icon="star" label="Quality" />
              </span>
              <span className="sup-line">
                Eco <Rating value={d.eco} icon="leaf" label="Eco" />
              </span>
              <span className="small">{d.blurb}</span>
              <span className="small loyal">{disc > 0 ? `Loyal customer: ${Math.round(disc * 100)}% off` : `Loyalty discount in ${toNext} packs`}</span>
              {id === 'premium' && effectActive(s, 'premiumSale') && <span className="sale-tag">SALE −30%</span>}
            </button>
          );
        })}
      </div>

      <Card title={`Stock up at ${SUPPLIERS[sup].name}`} icon="bag">
        {!shopping && <p className="warn small">{s.events.length ? 'Answer today\'s news first.' : 'The market is closed while your shop is open.'}</p>}
        <ul className="market-list">
          {list.map((id) => {
            const d = INGREDIENTS[id];
            const price = packPrice(s, id, sup);
            const mult = s.market.prices[id];
            const out = !inStock(s, id, sup);
            const lock = s.locks.find((l) => l.ingredient === id && l.until >= s.day);
            const low = s.pantry[id].qty < d.pack / 2;
            return (
              <li key={id} className={`market-row ${low ? 'low' : ''}`}>
                <Sprite name={id} scale={3} />
                <div className="market-info">
                  <b>
                    <span lang="vi">{d.vi}</span> <span className="muted">· {d.name}</span>
                  </b>
                  <span className="small">
                    Pantry: <b>{s.pantry[id].qty}</b> {d.unit}s {low && <span className="warn">· running low</span>}
                  </span>
                  <span className="small">
                    {d.pack} {d.unit}s for <b>{money2(price)}</b>
                    {mult > 1.08 && <span className="up"> · prices up {Math.round((mult - 1) * 100)}% today</span>}
                    {mult < 0.94 && <span className="down"> · {Math.round((1 - mult) * 100)}% cheaper today</span>}
                    {d.spoil > 0 && <span className="muted"> · spoils</span>}
                  </span>
                  {lock && <span className="small locked">Price locked until day {lock.until}</span>}
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
                    <Btn kind="primary" disabled={!shopping || s.cash < price} onClick={() => buy(id)} sfx={null}>
                      Stock up
                    </Btn>
                  )}
                  {lockable && !lock && (
                    <button type="button" className="link-btn" disabled={!shopping || s.cash < CONFIG.priceLockFee} onClick={() => dispatch({ type: 'lockPrice', ingredient: id })} title="Freeze today's market price for 7 days">
                      Lock price ${CONFIG.priceLockFee}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {lockable && (
          <p className="muted small">
            Worried a price will jump? <Tip concept="hedging">Locking a price</Tip> costs ${CONFIG.priceLockFee} and keeps today's market price for 7 days.
          </p>
        )}
        {s.cash < 5 && <p className="warn">The bakery wallet is feeling a little empty…</p>}
      </Card>
    </div>
  );
}
