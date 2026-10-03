import { useEffect, useRef, useState } from 'react';
import { BAGUETTE, CONFIG, INGREDIENTS, PRODUCTS, PRODUCT_ORDER, UPGRADES, WEATHER } from '../../data/catalog';
import { ECON } from '../../data/config';
import { suggestedTrays } from '../../engine/forecast';
import { masteryTier } from '../../engine/progression';
import {
  acceptance,
  canBakeTray,
  activeRivals,
  demandLabel,
  expectedWalkIns,
  itemCost,
  makeable,
  missingFor,
  onMenu,
  trayCapacity,
  ovenCapacity,
  laborTrays,
  expectedUnits,
  elasticityAt,
  playerShare,
  priceBounds,
  recipeCost,
  isDayOld,
} from '../../engine/economy';
import type { IngredientId, ProductId } from '../../engine/types';
import { money2, pct } from '../../lib/format';
import { play } from '../audio';
import { useGame } from '../GameContext';
import { Btn, Card, Meter, Stepper, Tip } from '../kit';
import { Sprite } from '../pixel/Sprite';
import { SPRITES } from '../pixel/sprites';

type Bakeable = ProductId | 'baguette';
const BAKE_MS = 3200;
const CENTER = 0.7;

function info(item: Bakeable) {
  if (item === 'baguette') return { name: 'Baguettes', vi: 'Bánh mì không', recipe: BAGUETTE.recipe, yield: BAGUETTE.yield, window: BAGUETTE.ovenWindow };
  const d = PRODUCTS[item];
  return { name: d.name, vi: d.en, recipe: d.recipe, yield: d.yield, window: d.ovenWindow ?? 18 };
}

export function processScore(x: number, window: number): number {
  const half = window / 200;
  if (x >= 0.97) return 25;
  if (Math.abs(x - CENTER) <= half) return Math.round(100 - (Math.abs(x - CENTER) / half) * 15);
  if (x < CENTER) return Math.round(45 + (x / (CENTER - half)) * 35);
  return Math.round(80 - ((x - CENTER - half) / (0.97 - CENTER - half)) * 40);
}

function OvenGame({ item, onDone, onCancel }: { item: Bakeable; onDone: (q: number) => void; onCancel: () => void }) {
  const [x, setX] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const raf = useRef(0);
  const xRef = useRef(0);
  const win = info(item).window;
  const half = win / 200;

  const stop = (val = xRef.current) => {
    if (result !== null) return;
    cancelAnimationFrame(raf.current);
    const q = processScore(val, win);
    setResult(q);
    play(q >= 85 ? 'ding' : q >= 60 ? 'pop' : 'oops');
    window.setTimeout(() => onDone(q), 700);
  };

  useEffect(() => {
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / BAKE_MS);
      xRef.current = k;
      setX(k);
      if (k < 1) raf.current = requestAnimationFrame(step);
      else stop(1);
    };
    raf.current = requestAnimationFrame(step);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        stop();
      }
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('keydown', onKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const zone = x >= 0.97 ? 'burnt' : Math.abs(x - CENTER) <= half ? 'golden' : x > CENTER ? 'dark' : 'raw';
  const label = { raw: 'Still pale…', golden: 'Golden! Take it out!', dark: 'Getting dark!', burnt: 'Burnt…' }[zone];
  return (
    <div className="oven-game" role="group" aria-label={`Baking ${info(item).name}`}>
      <div className={`oven-window zone-${zone}`}>
        <Sprite name={item} scale={4} className="baking-item" style={{ filter: `brightness(${1.25 - x * 0.55}) saturate(${0.6 + x * 0.8})` }} />
      </div>
      <div className="heat-bar" aria-hidden="true">
        <span className="heat-golden" style={{ left: `${(CENTER - half) * 100}%`, width: `${half * 200}%` }} />
        <span className="heat-burnt" />
        <span className="heat-needle" style={{ left: `${x * 100}%` }} />
      </div>
      <p className={`oven-say zone-${zone}`} aria-live="polite">
        {result === null ? label : result >= 85 ? `Perfect bake! Quality ${result}` : result >= 60 ? `Not bad! Quality ${result}` : `Oops… quality ${result}`}
      </p>
      <Btn kind="go" onClick={() => stop()} disabled={result !== null} sfx={null} className="big">
        Lấy ra! Take it out
      </Btn>
      <span className="muted small">Space or Enter works too.</span>
    </div>
  );
}

function OvenCard() {
  const { state: s, dispatch } = useGame();
  const [baking, setBaking] = useState<Bakeable | null>(null);
  const cap = trayCapacity(s);
  const left = cap - s.traysToday;
  const items: Bakeable[] = ['baguette', ...onMenu(s).filter((p) => PRODUCTS[p].kind === 'tray')];
  const morning = s.phase === 'morning' && !s.events.length;

  // The moment a tray comes out: a bell for a good bake, a puff of smoke for a burnt one.
  const [result, setResult] = useState<{ item: Bakeable; q: number; id: number } | null>(null);
  const bake = (item: Bakeable, q: number) => {
    dispatch({ type: 'bake', item, process: q });
    play(q < 45 ? 'pfft' : q >= 95 ? 'sparkle' : 'ding');
    setResult({ item, q, id: Date.now() });
    setBaking(null);
  };
  useEffect(() => {
    if (!result) return;
    const h = window.setTimeout(() => setResult(null), 1500);
    return () => window.clearTimeout(h);
  }, [result]);

  return (
    <Card
      className="oven-card"
      title="Oven"
      icon="hot"
      aside={
        <span className="trays" aria-label={`${left} of ${cap} trays left this morning`}>
          {Array.from({ length: cap }).map((_, i) => (
            <i key={i} className={i < s.traysToday ? 'used' : ''} />
          ))}
          <span>{left} trays left</span>
        </span>
      }
    >
      {result && (
        <div key={result.id} className={`oven-result ${result.q < 45 ? 'burnt' : result.q >= 95 ? 'perfect' : 'good'}`} role="status">
          {result.q < 45 ? (
            <>
              <span className="puffs" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <Sprite name={result.item === 'baguette' ? 'baguette:burnt' : `${result.item}:burnt`} scale={3} />
              <Sprite name="faceWorried" scale={3} />
              <b>Burnt… it’ll go cheap.</b>
            </>
          ) : (
            <>
              <span className="bell-bounce" aria-hidden="true">
                <Sprite name="bell" scale={3} />
              </span>
              <Sprite name={result.item === 'baguette' ? (result.q >= 95 ? 'baguette:perfect' : 'baguette') : result.q >= 95 ? `${result.item}:perfect` : result.item} scale={3} />
              <b>{result.q >= 95 ? 'Perfect bake!' : 'Ding! Out of the oven.'}</b>
            </>
          )}
        </div>
      )}
      {baking ? (
        <OvenGame item={baking} onDone={(q) => bake(baking, q)} onCancel={() => setBaking(null)} />
      ) : (
        <>
          <p className="muted">
            Each tray takes one oven slot. Bake in the morning; what's in the case is all you can sell today. Bánh mì and drinks are made to order from the pantry.
          </p>
          <ul className="bake-list">
            {items.map((item) => {
              const inf = info(item);
              const ok = canBakeTray(s, inf.recipe);
              const missing = missingFor(s, inf.recipe);
              const unit = recipeCost(s, inf.recipe) / inf.yield;
              const have = item === 'baguette' ? s.baguettes.qty : s.display[item].qty;
              return (
                <li key={item} className="bake-row">
                  <Sprite name={item} scale={3} />
                  <div className="bake-info">
                    <b>{inf.name}</b>
                    <span className="muted small">
                      Makes {inf.yield} · {money2(unit)} each · you have {have}
                    </span>
                    <span className="recipe">
                      {(Object.entries(inf.recipe) as [IngredientId, number][]).map(([id, n]) => (
                        <span key={id} className={s.pantry[id].qty < n ? 'short' : ''} title={INGREDIENTS[id].name}>
                          <Sprite name={id} scale={1} /> {n}
                        </span>
                      ))}
                    </span>
                    {missing.length > 0 && <span className="warn small">Need more {missing.map((m) => INGREDIENTS[m].name.toLowerCase()).join(', ')}. Stock up in the Market.</span>}
                  </div>
                  <div className="bake-actions">
                    <Btn kind="primary" disabled={!morning || !ok || left <= 0} onClick={() => setBaking(item)} sfx="pop" data-spot={`bake-${item}`}>
                      Bake
                    </Btn>
                    <button type="button" className="link-btn" disabled={!morning || !ok || left <= 0} onClick={() => bake(item, 72)} title="Skip the mini-game: fair quality">
                      Quick bake
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {!morning && <p className="muted small">The oven is for mornings. Come back tomorrow!</p>}
        </>
      )}
    </Card>
  );
}

function PriceRow({ p, business }: { p: ProductId; business: boolean }) {
  const { state: s, dispatch, feature } = useGame();
  const d = PRODUCTS[p];
  const price = s.prices[p];
  const [lo, hi] = priceBounds(s, p);
  const a = acceptance(s, p);
  const lab = demandLabel(a);
  const cost = itemCost(s, p);
  const keep = price - cost;
  const rival = activeRivals(s).find((c) => c.prices[p] !== undefined);
  const theirs = rival?.prices[p];
  const stock = d.kind === 'tray' ? s.display[p].qty : makeable(s, p);
  return (
    <li className="price-row">
      <Sprite name={p} scale={3} />
      <div className="price-main">
        <div className="price-top">
          <b>{d.name}</b>
          <span className="muted small">{d.en}</span>
        </div>
        <div className="price-controls">
          {!feature('kitchen.prices') ? <b className="price-plain">{money2(price)}</b> : <Stepper value={price} step={CONFIG.priceStep} min={lo} max={hi} format={money2} label={`${d.name} price`} disabled={s.phase !== 'morning'} onChange={(v) => dispatch({ type: 'setPrice', product: p, price: v })} />}
          <div className="demand">
            <Meter value={a} tone={lab.tone} label={`Demand for ${d.name}`} />
            <span className={`demand-say tone-${lab.tone}`}>{lab.text}</span>
          </div>
        </div>
        <div className="price-facts small">
          <span>
            Costs {money2(cost)} to make · <Tip concept="margin">you keep</Tip> <b className={keep < 0 ? 'neg' : 'pos'}>{money2(keep)}</b> ({pct(price > 0 ? keep / price : 0)})
          </span>
          <span>
            {d.kind === 'tray' ? `${stock} in the case` : `${stock} can be made`}
            {isDayOld(s, p) && <span className="day-old"> day-old, −{Math.round(ECON.service.dayOld.discount * 100)}%</span>}
          </span>
          {theirs !== undefined && <span className="rival">{rival!.name}: {money2(theirs)}</span>}
          {business && (
            <span>
              ~{expectedUnits(s, p).toFixed(0)} a day expected · elasticity {Math.abs(elasticityAt(s, p)).toFixed(1)} · your share {pct(playerShare(s, p))}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/** Picture recipes: ingredients → oven or hands → result. Locked recipes are silhouettes with a padlock. */
function RecipeBook() {
  const { state: s } = useGame();
  const [tab, setTab] = useState<'all' | 'tray' | 'drink' | 'sandwich'>('all');
  const tabs = [
    ['all', 'All', 'book'],
    ['sandwich', 'Bánh mì', 'banhMi'],
    ['tray', 'Pastries', 'flan'],
    ['drink', 'Drinks', 'caPhe'],
  ] as const;
  const shown = PRODUCT_ORDER.filter((p) => tab === 'all' || PRODUCTS[p].kind === tab);
  return (
    <Card title="Recipe book" icon="book" aside={<span className="small muted">{s.unlocked.length} of {PRODUCT_ORDER.length}</span>}>
      <div className="seg book-tabs" role="tablist" aria-label="Recipe categories">
        {tabs.map(([id, label, icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <Sprite name={icon} scale={2} /> {label}
          </button>
        ))}
      </div>
      <ul className="recipe-book">
        {shown.map((p) => {
          const d = PRODUCTS[p];
          const locked = !s.unlocked.includes(p);
          return (
            <li key={p} className={`recipe ${locked ? 'locked' : ''}`}>
              <span className="recipe-result">
                <Sprite name={p} scale={3} label={locked ? `${d.name} (locked)` : d.name} />
                {locked && (
                  <span className="recipe-lock">
                    <Sprite name="lock" scale={2} />
                  </span>
                )}
              </span>
              <span className="recipe-text">
                <b>
                  {locked ? (d.season ? 'Seasonal recipe' : `Level ${d.level} recipe`) : d.name}
                  {!locked && masteryTier(s, p) > 0 && (
                    <span className="badge-medal" title={`${['', 'Bronze', 'Silver', 'Gold'][masteryTier(s, p)]} mastery: ${s.lifetime.sold[p] ?? 0} sold`}>
                      <Sprite name={['', 'medalBronze', 'medalSilver', 'medalGold'][masteryTier(s, p)]} scale={2} />
                    </span>
                  )}
                </b>
                <span className="recipe-steps" aria-hidden="true">
                  {(Object.keys(d.recipe) as IngredientId[]).slice(0, 4).map((id) => (
                    <Sprite key={id} name={id in SPRITE_NAMES ? id : 'box'} scale={2} />
                  ))}
                  <Sprite name="arrow" scale={2} />
                  <Sprite name={d.kind === 'tray' ? 'hot' : 'spoon'} scale={2} />
                  <Sprite name="arrow" scale={2} />
                  <Sprite name={p} scale={2} />
                </span>
                {!locked && (
                  <span className="small muted">
                    {d.kind === 'tray' ? `Tray of ${d.yield}` : 'Made to order'} · {s.lifetime.sold[p] ?? 0} sold
                    {masteryTier(s, p) < 3 && ` · ${ECON.progression.masteryTiers[masteryTier(s, p)] - (s.lifetime.sold[p] ?? 0)} to the next medal`}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const SPRITE_NAMES: Record<string, true> = Object.fromEntries(Object.keys(SPRITES).map((k) => [k, true]));

/** Predict: after a price change, one guess before the day plays out. */
function PredictCard() {
  const { state: s, dispatch } = useGame();
  const p = s.pendingPrediction;
  if (!p || s.phase !== 'morning') return null;
  const d = PRODUCTS[p.product];
  const up = p.to > p.from;
  if (p.guess) {
    return (
      <Card className="predict-card" title="Your guess is in" icon="note">
        <p className="small">
          {d.name} {up ? 'up' : 'down'} from {money2(p.from)} to {money2(p.to)}. You guessed <b>{p.guess === 'more' ? 'more sold' : p.guess === 'fewer' ? 'fewer sold' : 'about the same'}</b>. Open the doors and see; the report will show what happened.
        </p>
      </Card>
    );
  }
  return (
    <Card className="predict-card" title="What do you think will happen?" icon="note" spot="predict">
      <p className="small">
        You moved <b>{d.name}</b> {up ? 'up' : 'down'} from {money2(p.from)} to {money2(p.to)}. Lately it sold about <b>{p.unitsBefore.toFixed(0)}</b> a day. Tomorrow’s report will show the answer next to your guess (any guess earns XP; a right one earns more).
      </p>
      <div className="predict-choices" role="group" aria-label="Your prediction">
        <Btn onClick={() => dispatch({ type: 'predict', guess: 'more' })}>
          <Sprite name="faceHappy" scale={2} /> More sold
        </Btn>
        <Btn onClick={() => dispatch({ type: 'predict', guess: 'same' })}>
          <Sprite name="faceOk" scale={2} /> About the same
        </Btn>
        <Btn onClick={() => dispatch({ type: 'predict', guess: 'fewer' })}>
          <Sprite name="faceWorried" scale={2} /> Fewer sold
        </Btn>
      </div>
    </Card>
  );
}

function PlanCard() {
  const { state: s, dispatch, fresh } = useGame();
  const suggested = suggestedTrays(s);
  const items: Bakeable[] = ['baguette', ...onMenu(s).filter((p) => PRODUCTS[p].kind === 'tray')];
  const ovens = ovenCapacity(s);
  const people = laborTrays(s);
  return (
    <Card title="Production plan" icon="note" spot="plan" fresh={fresh('kitchen.plan')} aside={<span className="small muted">Used on team / autopilot days</span>}>
      <p className="small">
        Capacity: ovens {ovens} trays, team {people} trays, so <b>{Math.min(ovens, people)}</b> a morning. {ovens < people ? 'Ovens are the bottleneck.' : ovens > people ? 'People are the bottleneck.' : ''}
      </p>
      <ul className="plan-list">
        {items.map((item) => {
          const planned = s.plan.trays[item];
          const sugg = suggested[item] ?? 0;
          return (
            <li key={item}>
              <Sprite name={item} scale={2} />
              <span>{item === 'baguette' ? 'Baguettes' : PRODUCTS[item].name}</span>
              <Stepper value={planned ?? sugg} step={1} min={0} max={20} format={(v) => `${v} tray${v === 1 ? '' : 's'}`} label={`Planned trays of ${item}`} onChange={(v) => dispatch({ type: 'setPlan', item, trays: v })} />
              {planned === undefined ? (
                <span className="tiny muted">following the forecast</span>
              ) : (
                <button type="button" className="link-btn" onClick={() => dispatch({ type: 'setPlan', item, trays: null })}>
                  use forecast ({sugg})
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <label className="toggle">
        <input type="checkbox" checked={s.plan.autoStock !== false} onChange={(e) => dispatch({ type: 'setAutoStock', on: e.target.checked })} />
        <span className="toggle-ui" aria-hidden="true" />
        <span>
          <b>Restock automatically</b>
          <span className="small muted">Before a team day, buy what the forecast needs at the wet market</span>
        </span>
      </label>
      {s.phase === 'morning' && (
        <Btn onClick={() => dispatch({ type: 'autoBake' })} disabled={!!s.events.length}>
          Bake the plan now
        </Btn>
      )}
    </Card>
  );
}

function MenuCard() {
  const { state: s, dispatch, feature, fresh } = useGame();
  const options = PRODUCT_ORDER.filter((p) => s.unlocked.includes(p) && !PRODUCTS[p].season);
  return (
    <Card title="What's on the menu" icon="book" spot="menu" fresh={fresh('kitchen.menu')}>
      <p className="small muted">A wider menu catches more kinds of customers, but every item needs ingredients, oven space and hands. Seasonal specials appear on their own.</p>
      <ul className="menu-toggles">
        {options.map((p) => {
          const needs = PRODUCTS[p].equipment && !s.upgrades.includes(PRODUCTS[p].equipment!);
          return (
            <li key={p}>
              <label className="toggle">
                <input type="checkbox" checked={s.menu.includes(p)} disabled={s.phase === 'service'} onChange={(e) => dispatch({ type: 'setMenu', product: p, on: e.target.checked })} />
                <span className="toggle-ui" aria-hidden="true" />
                <span>
                  <Sprite name={p} scale={2} /> <b>{PRODUCTS[p].name}</b>
                  {needs && <span className="small warn"> needs a {UPGRADES[PRODUCTS[p].equipment!].name.toLowerCase()}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {feature('kitchen.deals') && <div className="deals" data-spot="deals">
        <label className="toggle">
          <input type="checkbox" checked={!!s.combo} disabled={s.phase === 'service'} onChange={(e) => dispatch({ type: 'setCombo', on: e.target.checked })} />
          <span className="toggle-ui" aria-hidden="true" />
          <span>
            <b>Combo deal: cà phê + bánh mì</b>
            <span className="small muted">{Math.round(ECON.service.combo.discount * 100)}% off the second item. Some people who came for one take both.</span>
          </span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={!!s.sizes} disabled={s.phase === 'service'} onChange={(e) => dispatch({ type: 'setSizes', on: e.target.checked })} />
          <span className="toggle-ui" aria-hidden="true" />
          <span>
            <b>Drink sizes: small, medium, large</b>
            <span className="small muted">Large sells for ×{ECON.service.sizes.large.price}, small for ×{ECON.service.sizes.small.price}; most people pick medium.</span>
          </span>
        </label>
      </div>}
    </Card>
  );
}

export function KitchenPanel() {
  const { state: s, business, feature } = useGame();
  const walkIns = Math.round(expectedWalkIns(s));
  return (
    <div className="panel-stack">
      <Card className="forecast" title="Today's forecast" icon={s.market.weather === 'rainy' ? 'rain' : 'sun'}>
        <p>
          About <b>{walkIns}</b> walk-ins expected, plus regulars. <span className="muted">{WEATHER[s.market.weather].tip}</span>
        </p>
      </Card>
      <OvenCard />
      <Card title={feature('kitchen.prices') ? 'Menu & prices' : 'Today’s prices'} icon="coin" spot="price">
        {feature('kitchen.prices') && <p className="muted small">
          The meter shows how many shoppers think the price is fair. Higher prices mean more per sale but fewer sales: <Tip concept="elasticity">find the sweet spot</Tip>.
        </p>}
        <ul className="price-list">
          {onMenu(s).map((p) => (
            <PriceRow key={p} p={p} business={business} />
          ))}
        </ul>
        {s.phase !== 'morning' && <p className="muted small">Prices are set for today once the doors open.</p>}
      </Card>
      {feature('kitchen.menu') && <MenuCard />}
      {feature('kitchen.prices') && <PredictCard />}
      {feature('kitchen.plan') && <PlanCard />}
      {feature('kitchen.menu') && <RecipeBook />}
    </div>
  );
}
