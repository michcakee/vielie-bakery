import { BAGUETTE, INGREDIENTS, PRODUCTS, STAGES } from '../../data/catalog';
import { ECON } from '../../data/config';
import { REGULARS } from '../../data/people';
import { GOALS, LOCATIONS } from '../../data/world';
import { incomeStatement, inventoryValue } from '../../engine/accounting';
import { dateLabel, festivalsOn, FESTIVALS } from '../../engine/calendar';
import { activeRivals, businessStage, canBakeTray, effectActive, makeable, onMenu, rent, trayCapacity, effectivePrice } from '../../engine/economy';
import { REGIMES } from '../../engine/macro';
import { activeQuests, WEEKLY_GOALS, nextUnlock } from '../../engine/progression';
import type { GameState } from '../../engine/types';
import { money, money2, signedMoney } from '../../lib/format';
import { Spark } from '../charts';
import { useGame } from '../GameContext';
import { Btn, Card, Meter, Tip } from '../kit';
import { Person, Sprite } from '../pixel/Sprite';

export type Tab = 'today' | 'kitchen' | 'market' | 'staff' | 'customers' | 'growth' | 'money' | 'analytics' | 'eco';

function readiness(s: GameState) {
  const menu = onMenu(s);
  const warnings: { text: string; tab: Tab }[] = [];
  if (s.equipment.every((e) => !e.kind.startsWith('oven'))) warnings.push({ text: 'You have no oven yet. Buy one in Growth before you can bake anything.', tab: 'growth' });
  if (s.baguettes.qty < 6 && menu.includes('banhMi'))
    warnings.push({ text: canBakeTray(s, BAGUETTE.recipe) ? 'Only a few baguettes left. Bake a tray, or bánh mì will sell out.' : 'Out of flour for baguettes. Stock up at the market.', tab: canBakeTray(s, BAGUETTE.recipe) ? 'kitchen' : 'market' });
  if (menu.includes('caPhe') && makeable(s, 'caPhe') < 6) warnings.push({ text: 'Coffee or condensed milk is low. Cà phê sữa đá sells fast in the morning.', tab: 'market' });
  if (menu.includes('banhMi') && (s.pantry.chaLua.qty < 6 || s.pantry.veg.qty < 6)) warnings.push({ text: `Low on ${s.pantry.chaLua.qty < 6 ? 'chả lụa' : 'pickles & herbs'} for bánh mì.`, tab: 'market' });
  const trays = menu.filter((p) => PRODUCTS[p].kind === 'tray' && s.display[p].qty === 0);
  if (trays.length && s.traysToday < trayCapacity(s)) warnings.push({ text: `No ${trays.map((p) => PRODUCTS[p].name).join(', ')} in the case yet.`, tab: 'kitchen' });
  if (s.cash < rent(s) * 5 && s.cash >= 0) warnings.push({ text: `Cash is getting thin: ${money(s.cash)}. Next month's rent is about ${money(rent(s) * 30)}.`, tab: 'money' });
  if (s.creditLine.balance > 0) warnings.push({ text: `You're using ${money(s.creditLine.balance)} of the bank's credit line. It charges high interest every day.`, tab: 'money' });
  return warnings;
}

function Coach({ goTo }: { goTo: (t: Tab) => void }) {
  const { state: s, dispatch } = useGame();
  if (s.hints.includes('coachDone') || s.day > 4) return null;
  const steps = [
    { done: s.history.length > 0, text: `Your bakery has ${money(s.history[0]?.cash ?? s.cash)} in cash. Rent here is ${money(rent(s) * 30)} a month, paid in advance: that's a fixed cost you pay whether you sell 1 item or 100.` },
    { done: (s.questProgress.packs ?? 0) > 0, text: 'You need ingredients. How much should you buy? Too little and you sell out; too much and fresh things spoil.', tab: 'market' as Tab },
    { done: !!s.questProgress.priceTouched, text: 'How should you price your bánh mì? Try a price and watch the demand meter: it shows how many shoppers think it\'s fair.', tab: 'kitchen' as Tab },
    { done: s.history.length >= 2, text: 'After closing, the report shows what you sold, what you spent and what the bakery made. Different numbers: profit isn\'t cash!' },
  ];
  return (
    <Card className="coach-card" title="Getting started" icon="bell" aside={<button type="button" className="link-btn" onClick={() => dispatch({ type: 'hint', id: 'coachDone' })}>Skip tutorial</button>}>
      <ol className="coach-steps">
        {steps.map((st, i) => (
          <li key={i} className={st.done ? 'done' : ''}>
            {st.done ? <Sprite name="check" scale={2} /> : <span className="num">{i + 1}</span>}
            <span>
              {st.text}{' '}
              {!st.done && st.tab && (
                <button type="button" className="link-btn" onClick={() => goTo(st.tab!)}>
                  Show me
                </button>
              )}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function HomePanel({ goTo, onOpen, onRunDay }: { goTo: (t: Tab) => void; onOpen: () => void; onRunDay: () => void }) {
  const { state: s, business } = useGame();
  const t = s.today;
  const is = incomeStatement(t.books);
  const warnings = readiness(s);
  const quests = activeQuests(s);
  const goal = s.weeklyGoal ? WEEKLY_GOALS[s.weeklyGoal.id] : null;
  const regime = REGIMES[s.macro.regime];
  const fest = festivalsOn(s.day);
  const rivals = activeRivals(s);
  const morning = s.phase === 'morning';
  const recent = s.history.slice(-14);
  const firstDay = s.day === 1 && s.history.length === 0 && (s.scenario === 'family' || s.scenario === 'community' || s.scenario === 'recession');
  const teamCanRun = s.staff.some((e) => e.branch === null);
  const stage = businessStage(s);
  const catering = s.effects.find((e) => e.id === 'catering' && Number(e.data?.day) === s.day);

  return (
    <div className="panel-stack">
      <div className="dash-tiles">
        <div className="tile">
          <Sprite name="coin" scale={3} />
          <span>Cash</span>
          <b className={s.cash < 0 ? 'neg' : ''}>{money(s.cash)}</b>
          <Spark values={recent.map((h) => h.cash)} label="Cash trend" />
        </div>
        <div className="tile">
          <Sprite name="chart" scale={3} />
          <span>Today's sales</span>
          <b>{money(is.revenue)}</b>
          <Spark values={recent.map((h) => h.revenue)} label="Sales trend" />
        </div>
        <div className="tile">
          <Sprite name="star" scale={3} />
          <span>Today's profit</span>
          <b className={is.netProfit < 0 ? 'neg' : 'pos'}>{signedMoney(is.netProfit)}</b>
          <span className="tiny muted">{s.phase === 'morning' ? 'Before rent, wages & power' : ''}</span>
        </div>
        <div className="tile">
          <Sprite name="box" scale={3} />
          <span>
            <Tip concept="inventory">Inventory</Tip>
          </span>
          <b>{money(inventoryValue(s))}</b>
        </div>
        <div className="tile">
          <Sprite name="people" scale={3} />
          <span>Customers today</span>
          <b>
            {t.served}/{t.customers}
          </b>
        </div>
        <div className="tile">
          <Sprite name="heart" scale={3} />
          <span>Reputation</span>
          <b>{Math.round(s.reputation)}</b>
        </div>
      </div>

      <Card className={`economy-card regime-${s.macro.regime}`} title={regime.name} icon="chart" aside={<span className="small muted">{dateLabel(s.day)}</span>}>
        <p className="small">{regime.forYou}</p>
        {business && (
          <p className="small muted">
            Inflation {(s.macro.inflation * 100).toFixed(1)}% · interest rate {(s.macro.rate * 100).toFixed(1)}% · unemployment {(s.macro.unemployment * 100).toFixed(1)}% · consumer confidence {Math.round(s.macro.confidence)}
          </p>
        )}
        {fest.length > 0 && (
          <p className="festival-chip">
            {fest.map((f) => (
              <span key={f} className="chip">
                <span lang="vi">{FESTIVALS[f].vi}</span>: {FESTIVALS[f].blurb}
              </span>
            ))}
          </p>
        )}
        <p className="small muted">
          {LOCATIONS[s.location].name} · {STAGES[stage - 1].name} · Goal: {GOALS[s.goal]?.name}
        </p>
      </Card>

      <Coach goTo={goTo} />
      {s.special && (
        <Card className="special-card" title="Today’s special" icon="star" aside={<span className="small muted">pays ×{ECON.service.dailySpecial.mult}</span>}>
          <div className="special-row">
            <Sprite name={s.special} scale={3} />
            <div>
              <b>{PRODUCTS[s.special].name}</b>
              <span className="small">Sells for {money2(effectivePrice(s, s.special))} today instead of {money2(s.prices[s.special])}, and customers are happy to pay it. Bake extra.</span>
            </div>
          </div>
        </Card>
      )}
      <NextUp />

      {firstDay ? (
        <Card className="ba-note" title="A note from Bà" icon="note">
          <p className="handwrite">Con ơi, the bakery is yours now. I left you baguettes, a tray of flan and enough for coffee. Open the doors, and someone will be hungry soon. Thương con.</p>
          <p className="small muted">"My dear, the bakery is yours now…" — Bà (grandma)</p>
        </Card>
      ) : (
        warnings.length > 0 && (
          <Card title="Before you open" icon="bell">
            <ul className="warnings">
              {warnings.map((w) => (
                <li key={w.text}>
                  <Sprite name="bell" scale={2} />
                  <span>{w.text}</span>
                  <button type="button" className="link-btn" onClick={() => goTo(w.tab)}>
                    Go
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )
      )}

      {morning && (
        <Card title="Open for business" icon="shop">
          {catering && <p className="chip">Catering at noon: {String(catering.data?.qty)} bánh mì</p>}
          {effectActive(s, 'closedDay') && <p className="warn">The shop has to stay closed today.</p>}
          <div className="open-choices">
            <Btn kind="go" className="big" onClick={onOpen} disabled={s.events.length > 0} sfx="bell">
              <span lang="vi">Mở cửa!</span> Run the counter yourself
            </Btn>
            <Btn kind="primary" onClick={onRunDay} disabled={s.events.length > 0} sfx="bell">
              {teamCanRun ? 'Let the team run today' : 'Skip ahead: autopilot day'}
            </Btn>
          </div>
          <p className="small muted">
            {teamCanRun
              ? 'Your team bakes from the plan in the Kitchen, restocks from the forecast and serves everyone they can, instantly. You serve better than the autopilot, but your time is limited too.'
              : 'The autopilot bakes, restocks and serves for you at a fair, slightly slower pace. Handy for long games; you\'ll learn more running the counter yourself at first.'}
          </p>
        </Card>
      )}

      {rivals.length > 0 && (
        <Card title="On your street" icon="shop">
          <ul className="rival-list">
            {rivals.map((c) => (
              <li key={c.id}>
                <b>{c.name}</b>
                <span className="small muted">{c.lastMove}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="link-btn" onClick={() => goTo('customers')}>
            Compare prices and market share
          </button>
        </Card>
      )}

      <Card title="Quests" icon="book">
        <ul className="quests">
          {quests.map((q) => {
            const v = Math.min(q.target, q.progress(s));
            return (
              <li key={q.id}>
                <div>
                  <b>{q.title}</b>
                  <span className="small">{q.text}</span>
                </div>
                <Meter value={v / q.target} tone="xp" label={`${q.title} progress`} />
                <span className="small muted">
                  {v}/{q.target} · Reward: {q.rewardText}
                </span>
              </li>
            );
          })}
        </ul>
        {goal && s.weeklyGoal && (
          <div className="weekly-goal">
            <b>This week: {goal.title}</b>
            <span className="small">
              {goal.text(s.weeklyGoal.target)} Now: {Math.round(goal.measure(s, s.weeklyGoal.startDay))}
            </span>
          </div>
        )}
      </Card>

      <Neighbours />
      <p className="small muted">
        Pantry check: {Object.entries(s.pantry).filter(([, p]) => p.qty > 0).length} ingredients in stock
        {s.deliveries.length ? ` · ${s.deliveries.length} deliveries on the way (${s.deliveries.map((d) => INGREDIENTS[d.ingredient].name.toLowerCase()).join(', ')})` : ''}. Fixed costs today: about {money2(rent(s))} rent.
      </p>
    </div>
  );
}

/** Always on screen: the next thing you'll unlock and how close it is. */
function NextUp() {
  const { state: s } = useGame();
  const n = nextUnlock(s);
  return (
    <Card className="next-up" title="Next up" icon="spark" aside={<span className="small muted">{n.when}</span>}>
      <b className="next-up-text">{n.text}</b>
      <Meter value={n.pct} tone="xp" label={`Progress to the next unlock: ${Math.round(n.pct * 100)}%`} />
    </Card>
  );
}

function Neighbours() {
  const { state: s } = useGame();
  const met = REGULARS.filter((r) => (s.visitsByRegular[r.id] ?? 0) > 0);
  const unmet = REGULARS.filter((r) => (s.visitsByRegular[r.id] ?? 0) === 0);
  if (!met.length) return null;
  return (
    <Card title="Neighbours" icon="heart" aside={<span className="small muted">{met.length} of {REGULARS.length} met</span>}>
      <ul className="neighbours">
        {unmet.length > 0 && (
          <li className="unmet" aria-label={`${unmet.length} neighbours you haven't met yet`}>
            {unmet.map((r) => (
              <span key={r.id} className="silhouette" title="Someone you haven't met yet">
                <Person look={r.look} scale={2} />
              </span>
            ))}
            <span className="small muted">{unmet.length} more to meet</span>
          </li>
        )}
        {met.map((r) => {
          const hearts = s.hearts[r.id] ?? 0;
          const badge = s.badges?.[r.id] ?? 0;
          return (
            <li key={r.id}>
              <Person look={r.look} scale={2} />
              <div>
                <b>
                  {r.name}
                  {badge > 0 && (
                    <span className={`badge-medal b${badge}`} title={`${['Bronze', 'Silver', 'Gold'][badge - 1]} regular`}>
                      <Sprite name={['medalBronze', 'medalSilver', 'medalGold'][badge - 1]} scale={2} />
                    </span>
                  )}
                  {r.critic && <span className="critic-tag">critic</span>}
                </b>
                <span className="small muted">
                  {r.role} · loves {r.favorite.map((p) => PRODUCTS[p].name).join(', ')}
                </span>
                <span className="small">{r.behavior}</span>
              </div>
              <span className="hearts" role="img" aria-label={`${Math.floor(hearts)} of 5 hearts${badge ? `, ${['bronze', 'silver', 'gold'][badge - 1]} badge` : ''}`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < Math.floor(hearts) ? 'on' : 'off'}>
                    <Sprite name="heart" scale={1} />
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
