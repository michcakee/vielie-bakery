import { PRODUCTS, PRODUCT_ORDER } from '../data/catalog';
import { NOTEBOOK, NOTEBOOK_ORDER, type NotebookEntry } from '../data/notebook';
import type { ProductId } from '../engine/types';
import { money, money2 } from '../lib/format';
import { BarList } from './charts';
import { useGame } from './GameContext';
import { Empty } from './kit';
import { Modal } from './overlays';

/** A small chart from the player's own days for a notebook page. */
function NotebookGraph({ kind }: { kind: NonNullable<NotebookEntry['graph']> }) {
  const { state: s } = useGame();
  const hist = s.history;
  if (kind === 'demand') {
    // The product with the most distinct prices: average units sold at each price.
    let best: { p: ProductId; rows: { label: string; value: number }[] } | null = null;
    for (const p of PRODUCT_ORDER) {
      const byPrice = new Map<number, number[]>();
      for (const h of hist) if ((h.sold[p] ?? 0) > 0 || (h.prices?.[p] ?? 0) > 0) byPrice.set(h.prices[p], [...(byPrice.get(h.prices[p]) ?? []), h.sold[p] ?? 0]);
      if (byPrice.size >= 2 && (!best || byPrice.size > best.rows.length)) {
        best = { p, rows: [...byPrice.entries()].sort((a, b) => a[0] - b[0]).map(([price, units]) => ({ label: money2(price), value: units.reduce((t, u) => t + u, 0) / units.length })) };
      }
    }
    if (!best) return <p className="small muted">Change a price a few times and your own demand curve appears here: price along the side, how many sold as the bar.</p>;
    return (
      <div className="notebook-graph">
        <span className="small">{PRODUCTS[best.p].name}: sold a day, at each price you tried</span>
        <BarList title={`Units sold per price for ${PRODUCTS[best.p].name}`} rows={best.rows} />
        {best.rows.length < 3 && <span className="small muted">Three or more prices and the curve gets clearer.</span>}
      </div>
    );
  }
  const last = hist.slice(-7);
  if (!last.length) return null;
  if (kind === 'profit') return <BarList title="Last days: sales, costs, profit" money rows={last.map((h) => ({ label: `Day ${h.day}`, value: h.profit, note: `sales ${money(h.revenue)} · costs ${money(h.expenses)}` }))} />;
  if (kind === 'surplus') return <BarList title="Last days: the good-deal feeling, in dollars" money rows={last.map((h) => ({ label: `Day ${h.day}`, value: h.surplus ?? 0 }))} />;
  if (kind === 'waste') return <BarList title="Last days: share of food binned" rows={last.map((h) => ({ label: `Day ${h.day}`, value: Math.round(h.wasteRate * 100), note: '% binned' }))} />;
  if (kind === 'capacity') return <BarList title="Last days: customers who left because you'd sold out" rows={last.map((h) => ({ label: `Day ${h.day}`, value: h.lostSoldOut }))} />;
  return null;
}

/** Every economic idea the player has run into, with the numbers from their own bakery. */
export function Concepts({ onClose }: { onClose: () => void }) {
  const { state: s } = useGame();
  const learned = NOTEBOOK_ORDER.filter((k) => s.learned.includes(k));
  const guesses = s.questProgress.predictions ?? 0;
  const right = s.questProgress.predictionsRight ?? 0;
  return (
    <Modal label="Economic concepts reviewed so far" onClose={onClose} className="drawer concepts">
      <h2>Economic concepts reviewed so far</h2>
      <ul className="concept-stats">
        <li>
          <b>
            {learned.length} of {NOTEBOOK_ORDER.length}
          </b>
          <span>concepts</span>
        </li>
        <li>
          <b>{guesses ? `${right} of ${guesses}` : '–'}</b>
          <span>guesses right</span>
        </li>
        <li>
          <b>{s.day}</b>
          <span>days run</span>
        </li>
      </ul>
      {learned.length === 0 ? (
        <Empty icon="chart">Nothing here yet. Each idea is added the first time your bakery runs into it.</Empty>
      ) : (
        <ul className="notebook">
          {learned.map((k) => {
            const n = NOTEBOOK[k];
            return (
              <li key={k}>
                <details className="notebook-page">
                  <summary>
                    <b>{n.term}</b> <span className="muted">· {n.friendly}</span>
                  </summary>
                  <p className="small">{n.text}</p>
                  {n.graph && <NotebookGraph kind={n.graph} />}
                  {n.professor && (
                    <div className="professor">
                      <b>In more depth</b>
                      <p className="small">{n.professor}</p>
                    </div>
                  )}
                  {n.realWorld && (
                    <p className="small real-world">
                      <b>Real world:</b> {n.realWorld}
                    </p>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
