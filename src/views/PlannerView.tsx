import { ChefHat, ChevronDown, Lock, ShoppingBasket } from 'lucide-react';
import { useState } from 'react';
import {
  INGREDIENTS,
  INGREDIENT_ORDER,
  PACKAGING,
  PRICE_STEP,
  PRODUCTS,
  PRODUCT_ORDER,
  UNLOCKS,
  BULK_DISCOUNT,
} from '../config/balance';
import { Meter } from '../components/Charts';
import { useGame } from '../components/GameContext';
import { ProductArt } from '../components/ProductArt';
import { Stepper } from '../components/Stepper';
import { Term } from '../components/Term';
import { demandBreakdown, ingredientBuyPrice, ingredientNeeds, unitEconomics } from '../game/economy';
import { getEvent } from '../game/events';
import { projectDay } from '../game/forecast';
import { checkPlan } from '../game/simulation';
import { canAfford, isUnlocked, purchaseCost, shortfallCost } from '../game/state';
import type { PackagingId, ProductId } from '../game/types';
import { money, money2, pct, qty } from '../lib/format';

export function PlannerView({ onBake, baking }: { onBake: () => void; baking: boolean }) {
  const { state } = useGame();
  const check = checkPlan(state);
  const projection = projectDay(state);
  const event = getEvent(state.market.eventId);

  return (
    <div className="planner">
      <MorningNote />
      <section className="panel" data-tour="production" aria-labelledby="plan-h">
        <div className="panel-head">
          <h2 id="plan-h">Production plan</h2>
          <p className="panel-sub">
            Bake close to the forecast. Too few and customers leave; too many and the rest is waste.
          </p>
        </div>
        <div className="product-table" role="table" aria-label="Products">
          <div className="product-row product-row-head" role="row">
            <span role="columnheader">Product</span>
            <span role="columnheader">Price</span>
            <span role="columnheader">Forecast</span>
            <span role="columnheader">Bake</span>
            <span role="columnheader">
              <Term concept="marginalCost">Cost</Term> / profit per item
            </span>
          </div>
          {PRODUCT_ORDER.map((p) => (
            <ProductRow key={p} id={p} />
          ))}
        </div>
        <OvenMeter minutes={check.minutes} capacity={check.capacity} />
      </section>

      <IngredientPanel />
      <PackagingPanel />

      <section className="panel projection" aria-labelledby="proj-h">
        <div className="panel-head">
          <h2 id="proj-h">If the forecast is right</h2>
          <p className="panel-sub">Actual customers vary by up to 12% either way.{event ? ` Today's news is already included.` : ''}</p>
        </div>
        <dl className="proj-grid">
          <div>
            <dt>
              <Term concept="revenue" />
            </dt>
            <dd>{money(projection.revenue)}</dd>
          </div>
          <div>
            <dt>
              <Term concept="variableCost">Variable costs</Term>
            </dt>
            <dd>−{money(projection.variableCosts)}</dd>
          </div>
          <div>
            <dt>
              <Term concept="fixedCost">Fixed costs</Term>
            </dt>
            <dd>−{money(projection.fixedCosts)}</dd>
          </div>
          <div className={projection.operatingProfit >= 0 ? 'pos' : 'neg'}>
            <dt>
              <Term concept="profit">Operating profit</Term>
            </dt>
            <dd>{money(projection.operatingProfit)}</dd>
          </div>
        </dl>
        {projection.operatingProfit < 0 && (
          <p className="hint">
            This plan does not reach <Term concept="breakEven">break-even</Term>: fixed costs are paid whether you sell or not, so selling more of your
            best-margin items matters.
          </p>
        )}
      </section>

      <div className="bake-bar" data-tour="bake">
        {!check.ok && state.phase === 'morning' && (
          <ul className="bake-reasons" aria-live="polite">
            {blockers(check).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        <button className="btn btn-bake" disabled={!check.ok || baking} onClick={onBake}>
          <ChefHat size={20} aria-hidden="true" />
          {baking ? 'Baking…' : 'Bake and open the shop'}
        </button>
      </div>
    </div>
  );
}

function MorningNote() {
  const { state } = useGame();
  const event = getEvent(state.market.eventId);
  const weatherWord = { sunny: 'Sunny', cloudy: 'Cloudy', rainy: 'Rain' }[state.market.weather];
  return (
    <section className="morning-note" data-tour="paper" aria-label="This morning">
      <p className="morning-weather">{weatherWord} this morning</p>
      {event ? (
        <>
          <h2 className="morning-headline">{event.headline}</h2>
          <p>{event.body}</p>
          <p className="morning-lesson">{event.lesson}</p>
        </>
      ) : (
        <>
          <h2 className="morning-headline">A regular day on Vielie Lane</h2>
          <p>No news today. Weather, the day of the week and your reputation shape demand.</p>
        </>
      )}
    </section>
  );
}

function ProductRow({ id }: { id: ProductId }) {
  const { state, dispatch } = useGame();
  const [open, setOpen] = useState(false);
  const cfg = PRODUCTS[id];
  const price = state.prices[id];
  const bd = demandBreakdown(state, state.market, id, price);
  const ue = unitEconomics(state, state.market, id);
  const pricing = isUnlocked(state, 'pricing');
  const plan = state.plan[id];
  const over = plan > bd.expected * 1.15;
  const dayOld = id === 'sourdough' && state.dayOld.qty > 0 ? state.dayOld.qty : 0;

  return (
    <div className={`product-row-wrap ${open ? 'is-open' : ''}`} role="rowgroup">
      <div className="product-row" role="row">
        <div className="pr-name" role="cell">
          <ProductArt id={id} size={44} />
          <div>
            <strong>{cfg.name}</strong>
            <span className={`risk risk-${cfg.wasteRisk}`}>{cfg.wasteRisk} waste risk</span>
          </div>
        </div>
        <div role="cell" className="pr-price">
          <Stepper
            label={`${cfg.name} price`}
            value={price}
            step={PRICE_STEP}
            min={cfg.minPrice}
            max={cfg.maxPrice}
            format={money2}
            disabled={!pricing || state.phase !== 'morning'}
            onChange={(v) => dispatch({ type: 'setPrice', product: id, price: v })}
          />
          {!pricing && (
            <span className="locked">
              <Lock size={11} aria-hidden="true" /> Day {UNLOCKS.pricing}
            </span>
          )}
        </div>
        <div role="cell" className="pr-forecast">
          <span className="fc-main">≈ {Math.round(bd.expected)}</span>
          <span className="fc-range">
            {Math.round(bd.expected * 0.88)}–{Math.round(bd.expected * 1.12)} customers
          </span>
          {dayOld > 0 && <span className="fc-range">+{dayOld} day-old loaves on hand</span>}
        </div>
        <div role="cell" className="pr-plan">
          <Stepper label={`${cfg.name} to bake`} value={plan} step={1} max={400} onChange={(v) => dispatch({ type: 'setPlan', product: id, qty: v })} disabled={state.phase !== 'morning'} />
          {over && <span className="warn">Above forecast</span>}
        </div>
        <div role="cell" className="pr-econ">
          <span>
            {money2(ue.marginalCost)} → <b className={ue.contribution >= 0 ? 'pos' : 'neg'}>{money2(ue.contribution)}</b>
          </span>
          <span className="pr-perminute">{money2(ue.contributionPerMinute)} per oven min</span>
        </div>
        <button className="pr-expand" aria-expanded={open} aria-label={`Why this forecast for ${cfg.name}`} onClick={() => setOpen((o) => !o)}>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="pr-detail">
          <div>
            <h3>Why {Math.round(bd.expected)} customers?</h3>
            <ol className="factor-list">
              <li>
                <span>Usual demand at {money2(cfg.refPrice)}</span>
                <b>{bd.base}</b>
              </li>
              <li>
                <span>
                  Your price ({pct(price / cfg.refPrice - 1)} vs usual), <Term concept="elasticity">elasticity</Term> {cfg.elasticity}
                </span>
                <b>×{bd.priceFactor.toFixed(2)}</b>
              </li>
              {bd.factors.map((f) => (
                <li key={f.label}>
                  <span>{f.label}</span>
                  <b>×{f.value.toFixed(2)}</b>
                </li>
              ))}
              {bd.competitorShare > 0 && (
                <li>
                  <span>Lost to Crumb & Co.</span>
                  <b>−{pct(bd.competitorShare)}</b>
                </li>
              )}
            </ol>
          </div>
          <div>
            <h3>Per item</h3>
            <ol className="factor-list">
              <li>
                <span>Ingredients</span>
                <b>{money2(ue.ingredients)}</b>
              </li>
              <li>
                <span>Packaging</span>
                <b>{money2(ue.packaging)}</b>
              </li>
              <li>
                <span>Oven energy ({cfg.ovenMinutes} min)</span>
                <b>{money2(ue.energy)}</b>
              </li>
              <li>
                <span>
                  <Term concept="margin">Margin</Term> per item
                </span>
                <b>{pct(ue.marginPct)}</b>
              </li>
            </ol>
            <p className="pr-note">{cfg.sustainability}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function OvenMeter({ minutes, capacity }: { minutes: number; capacity: number }) {
  const ratio = minutes / capacity;
  return (
    <div className="oven-meter">
      <div className="oven-meter-label">
        <span>
          Oven time <b>{Math.ceil(minutes)}</b> of {capacity} minutes
        </span>
        <span className="muted">
          {ratio > 1 ? 'Over capacity' : ratio > 0.95 ? (
            <>
              Full: every minute has an <Term concept="opportunityCost">opportunity cost</Term>
            </>
          ) : (
            `${Math.floor(capacity - minutes)} minutes spare`
          )}
        </span>
      </div>
      <Meter value={minutes} max={capacity} tone={ratio > 1 ? 'berry' : ratio > 0.95 ? 'crust' : 'forest'} label="Oven minutes used" />
    </div>
  );
}

function IngredientPanel() {
  const { state, dispatch } = useGame();
  const need = ingredientNeeds(state.plan);
  const missingCost = shortfallCost(state);
  const anyMissing = missingCost > 0;

  return (
    <section className="panel" data-tour="ingredients" aria-labelledby="ing-h">
      <div className="panel-head">
        <h2 id="ing-h">Ingredients</h2>
        <p className="panel-sub">
          Paid for when you buy them. Stock is <Term concept="inventory">inventory</Term>: berries lose 30% a night. Buy {pct(BULK_DISCOUNT)} cheaper in bulk.
        </p>
      </div>
      <div className="ing-table">
        {INGREDIENT_ORDER.map((id) => {
          const cfg = INGREDIENTS[id];
          const stock = state.ingredients[id].qty;
          const short = need[id] > stock + 1e-9;
          const unitPrice = ingredientBuyPrice(state, state.market, id);
          const stepCost = purchaseCost(state, id, cfg.step);
          const bulkCost = purchaseCost(state, id, cfg.bulkQty);
          const shownPrice = id === 'matcha' ? `${money2(unitPrice * 100)} / 100 g` : `${money2(unitPrice)} / ${cfg.unit}`;
          return (
            <div className={`ing-row ${short ? 'is-short' : ''}`} key={id}>
              <div className="ing-name">
                <strong>{cfg.name}</strong>
                <span className="muted">{shownPrice}</span>
              </div>
              <div className="ing-stock">
                <span>
                  Have <b>{qty(round(stock), cfg.unit)}</b>
                </span>
                <span className={short ? 'neg' : 'muted'}>Need {qty(round(need[id]), cfg.unit)}</span>
              </div>
              <div className="ing-buy">
                <button className="btn btn-small" disabled={state.phase !== 'morning' || !canAfford(state, stepCost)} onClick={() => dispatch({ type: 'buyIngredient', ingredient: id, qty: cfg.step })}>
                  +{qty(cfg.step, cfg.unit)} <span className="muted">{money2(stepCost)}</span>
                </button>
                <button className="btn btn-small btn-ghost" disabled={state.phase !== 'morning' || !canAfford(state, bulkCost)} onClick={() => dispatch({ type: 'buyIngredient', ingredient: id, qty: cfg.bulkQty })}>
                  Bulk {qty(cfg.bulkQty, cfg.unit)} <span className="muted">{money(bulkCost)}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="ing-foot">
        <button className="btn btn-primary" disabled={!anyMissing || !canAfford(state, missingCost) || state.phase !== 'morning'} onClick={() => dispatch({ type: 'buyShortfall' })}>
          <ShoppingBasket size={16} aria-hidden="true" />
          {anyMissing ? `Buy what's missing for ${money2(missingCost)}` : 'You have everything for this plan'}
        </button>
        {anyMissing && !canAfford(state, missingCost) && <span className="neg">Not enough cash. Bake less, or borrow once loans unlock on day {UNLOCKS.finance}.</span>}
      </div>
    </section>
  );
}

function PackagingPanel() {
  const { state, dispatch } = useGame();
  return (
    <section className="panel" aria-labelledby="pack-h">
      <div className="panel-head">
        <h2 id="pack-h">Packaging</h2>
        <p className="panel-sub">
          Cheaper packaging can push costs onto others — an <Term concept="externality">externality</Term>.
        </p>
      </div>
      <div className="choice-row" role="radiogroup" aria-labelledby="pack-h">
        {(Object.keys(PACKAGING) as PackagingId[]).map((id) => {
          const cfg = PACKAGING[id];
          const on = state.packaging === id;
          return (
            <button key={id} role="radio" aria-checked={on} className={`choice ${on ? 'is-on' : ''}`} disabled={state.phase !== 'morning'} onClick={() => dispatch({ type: 'setPackaging', packaging: id })}>
              <span className="choice-title">{cfg.name}</span>
              <span className="choice-meta">
                {money2(cfg.costPerUnit)} per item, green {cfg.greenPoints > 0 ? '+' : ''}
                {cfg.greenPoints}
              </span>
              <span className="choice-desc">{cfg.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const round = (v: number) => Math.round(v * 100) / 100;

/** One short line per problem, so the sticky bake bar stays compact. */
function blockers(check: ReturnType<typeof checkPlan>): string[] {
  const out: string[] = [];
  if (check.minutes > check.capacity) out.push(`Plan needs ${Math.ceil(check.minutes)} oven minutes; you have ${check.capacity}. Bake less.`);
  const short = INGREDIENT_ORDER.filter((id) => check.shortfall[id] > 1e-9).map((id) => INGREDIENTS[id].name.toLowerCase());
  if (short.length) out.push(`Not enough ${short.join(', ')}. Buy ingredients above.`);
  return out.length ? out : check.reasons;
}
