import { INGREDIENTS, INGREDIENT_ORDER, PRODUCTS, PRODUCT_ORDER, COMPETITOR } from '../config/balance';
import { competitorPrice } from '../game/economy';
import { getEvent } from '../game/events';
import { useGame, useReducedMotion } from './GameContext';

/** Scrolling market tape: ingredient prices vs yesterday, competitor prices, today's headline. */
export function Ticker() {
  const { state } = useGame();
  const reduced = useReducedMotion();
  const prev = state.marketHistory[state.marketHistory.length - 2];
  const event = getEvent(state.market.eventId);

  const items = INGREDIENT_ORDER.map((id) => {
    const now = state.market.ingredientPrices[id];
    const before = prev?.ingredientPrices[id] ?? INGREDIENTS[id].basePrice;
    const change = (now - before) / before;
    const dir = change > 0.004 ? 'up' : change < -0.004 ? 'down' : 'flat';
    const price = id === 'matcha' ? `$${(now * 100).toFixed(2)}/100g` : `$${now.toFixed(2)}/${INGREDIENTS[id].unit}`;
    return { key: id, label: INGREDIENTS[id].name, value: price, dir, change };
  });

  const content = (
    <>
      {items.map((it) => (
        <span key={it.key} className={`tick tick-${it.dir}`}>
          <b>{it.label}</b> {it.value}{' '}
          <i>
            {it.dir === 'up' ? '▲' : it.dir === 'down' ? '▼' : '■'} {(Math.abs(it.change) * 100).toFixed(1)}%
          </i>
        </span>
      ))}
      {state.market.competitorActive &&
        PRODUCT_ORDER.map((p) => (
          <span key={p} className="tick tick-comp">
            <b>
              {COMPETITOR.name} {PRODUCTS[p].shortName.toLowerCase()}
            </b>{' '}
            ${competitorPrice(p, state.market).toFixed(2)}
          </span>
        ))}
      {event && (
        <span className="tick tick-news">
          <b>News</b> {event.headline}
        </span>
      )}
    </>
  );

  return (
    <div className={`ticker ${reduced ? 'is-static' : ''}`} aria-label="Market prices today">
      <div className="ticker-track">
        <div className="ticker-run">{content}</div>
        {!reduced && (
          <div className="ticker-run" aria-hidden="true">
            {content}
          </div>
        )}
      </div>
    </div>
  );
}
