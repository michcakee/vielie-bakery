import { COMPETITOR, INGREDIENTS, INGREDIENT_ORDER, PRODUCTS, PRODUCT_ORDER, UNLOCKS, WEATHER, WEEKDAYS, WEEKDAY_TRAFFIC } from '../config/balance';
import { Sparkline } from '../components/Charts';
import { useGame } from '../components/GameContext';
import { ProductArt } from '../components/ProductArt';
import { Term } from '../components/Term';
import { competitorPrice, competitorShare, demandBreakdown, ingredientBuyPrice, weekdayIndex } from '../game/economy';
import { getEvent } from '../game/events';
import { money2, pct } from '../lib/format';

export function MarketView() {
  const { state } = useGame();
  const m = state.market;
  const event = getEvent(m.eventId);
  const wd = weekdayIndex(state.day);

  return (
    <article className="paper" aria-labelledby="paper-title">
      <header className="paper-mast">
        <p className="paper-edition">Day {state.day}, {WEEKDAYS[wd]} edition</p>
        <h2 id="paper-title">The Vielie Morning Crumb</h2>
        <p className="paper-tag">Prices, people and pastry on Vielie Lane</p>
      </header>

      <div className="paper-cols">
        <section className="paper-lead">
          <h3>{event ? event.headline : 'Quiet day forecast for Vielie Lane'}</h3>
          <p>{event ? event.body : 'No unusual events today. Footfall depends on the weather and the day of the week.'}</p>
          {event && (
            <p className="paper-analysis">
              <b>What it means:</b> {event.lesson}
              {event.concept && (
                <>
                  {' '}
                  <Term concept={event.concept}>Read more</Term>
                </>
              )}
            </p>
          )}
          <h4>Who is shopping today</h4>
          <p>
            {WEEKDAYS[wd]} footfall is {pct(WEEKDAY_TRAFFIC[wd] - 1 >= 0 ? WEEKDAY_TRAFFIC[wd] - 1 : 1 - WEEKDAY_TRAFFIC[wd])} {WEEKDAY_TRAFFIC[wd] >= 1 ? 'above' : 'below'} an average day.
            Weather: {WEATHER[m.weather].label.toLowerCase()} ({WEATHER[m.weather].traffic >= 1 ? '+' : '−'}
            {pct(Math.abs(WEATHER[m.weather].traffic - 1))} footfall). Weekends are the busiest days.
          </p>
        </section>

        <section className="paper-side">
          <h4>
            <Term concept="supplyDemand">Demand</Term> forecast
          </h4>
          <table className="paper-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Your price</th>
                <th scope="col">Customers</th>
                <th scope="col">Taste trend</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCT_ORDER.map((p) => {
                const bd = demandBreakdown(state, m, p, state.prices[p]);
                return (
                  <tr key={p}>
                    <th scope="row">
                      <ProductArt id={p} size={22} /> {PRODUCTS[p].shortName}
                    </th>
                    <td>{money2(state.prices[p])}</td>
                    <td>≈ {Math.round(bd.expected)}</td>
                    <td>
                      <Sparkline values={state.marketHistory.map((d) => d.preference[p])} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>

      <section className="paper-band">
        <h4>Wholesale prices</h4>
        <p className="paper-note">Prices wander day to day but drift back toward their usual level. A cheap day is a chance to stock up — if the ingredient keeps.</p>
        <table className="paper-table">
          <thead>
            <tr>
              <th scope="col">Ingredient</th>
              <th scope="col">Today</th>
              <th scope="col">Usual</th>
              <th scope="col">Last {Math.min(14, state.marketHistory.length)} days</th>
              <th scope="col">Keeps?</th>
            </tr>
          </thead>
          <tbody>
            {INGREDIENT_ORDER.map((id) => {
              const cfg = INGREDIENTS[id];
              const k = id === 'matcha' ? 100 : 1;
              const unit = id === 'matcha' ? '100 g' : cfg.unit;
              const today = ingredientBuyPrice(state, m, id) * k;
              const usual = cfg.basePrice * k;
              const cls = today > usual * 1.05 ? 'neg' : today < usual * 0.95 ? 'pos' : '';
              return (
                <tr key={id}>
                  <th scope="row">{cfg.name}</th>
                  <td className={cls}>
                    {money2(today)} / {unit}
                  </td>
                  <td>{money2(usual)}</td>
                  <td>
                    <Sparkline values={state.marketHistory.slice(-14).map((d) => d.ingredientPrices[id])} width={80} />
                  </td>
                  <td>{cfg.spoilagePerNight === 0 ? 'Yes' : cfg.spoilagePerNight < 0.05 ? 'Mostly' : `Loses ${pct(cfg.spoilagePerNight)} a night`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="paper-band">
        <h4>Competition</h4>
        {m.competitorActive ? (
          <>
            <p className="paper-note">
              {COMPETITOR.name} undercuts the usual price slightly. The higher your price sits above theirs, the more customers walk down the street. A strong
              reputation keeps some of them loyal.
            </p>
            <table className="paper-table">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Theirs</th>
                  <th scope="col">Yours</th>
                  <th scope="col">Customers lost</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCT_ORDER.map((p) => (
                  <tr key={p}>
                    <th scope="row">{PRODUCTS[p].shortName}</th>
                    <td>{money2(competitorPrice(p, m))}</td>
                    <td>{money2(state.prices[p])}</td>
                    <td>{pct(competitorShare(p, state.prices[p], m, state.reputation))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="paper-note">Word on the lane: a chain bakery called {COMPETITOR.name} is fitting out the empty shop next door. Opening day {UNLOCKS.competition}.</p>
        )}
      </section>
    </article>
  );
}
