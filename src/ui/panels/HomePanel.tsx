import { BAGUETTE, INGREDIENTS, PRODUCTS, STAGES } from '../../data/catalog';
import { ECON } from '../../data/config';
import { REGULARS } from '../../data/people';
import { GOALS, LOCATIONS } from '../../data/world';
import { incomeStatement, inventoryValue } from '../../engine/accounting';
import { dateLabel, daysToMonthStart, festivalsOn, FESTIVALS } from '../../engine/calendar';
import { activeRivals, businessStage, canBakeTray, effectActive, makeable, onMenu, rent, trayCapacity, effectivePrice } from '../../engine/economy';
import { REGIMES } from '../../engine/macro';
import { activeQuests, WEEKLY_GOALS, nextUnlock } from '../../engine/progression';
import type { GameState } from '../../engine/types';
import { money, money2, signedMoney } from '../../lib/format';
import { Spark } from '../charts';
import { useGame } from '../GameContext';
import { Btn, Card, Meter, Tip } from '../kit';
import { Person, Sprite } from '../pixel/Sprite';
import { ChallengeChip } from '../Challenge';
import { ARC, ARC_TITLES } from '../../engine/arc';
import { IntroCard, useGuide } from '../Guide';
import { dailyGoal } from '../../engine/goals';
import { nextFeature, tabOn } from '../../engine/unlocks';
import { FEATURE, FEATURES, type FeatureId } from '../../data/unlocks';

export type Tab = 'today' | 'kitchen' | 'market' | 'staff' | 'customers' | 'growth' | 'money' | 'analytics' | 'eco';

export function readiness(s: GameState) {
  const menu = onMenu(s);
  const warnings: { text: string; tab: Tab; spot?: string }[] = [];
  if (s.equipment.every((e) => !e.kind.startsWith('oven'))) warnings.push({ text: 'You have no oven yet. Buy one in Growth before you can bake anything.', tab: 'growth' });
  if (s.baguettes.qty < 6 && menu.includes('banhMi'))
    warnings.push(canBakeTray(s, BAGUETTE.recipe) ? { text: 'Bake a tray of baguettes, or bánh mì will sell out.', tab: 'kitchen', spot: 'bake-baguette' } : { text: 'Out of flour for baguettes. Buy some at the market.', tab: 'market', spot: 'stock-up' });
  if (menu.includes('caPhe') && makeable(s, 'caPhe') < 6) warnings.push({ text: 'Coffee or condensed milk is low. Cà phê sữa đá sells fast in the morning.', tab: 'market' });
  if (menu.includes('banhMi') && (s.pantry.chaLua.qty < 6 || s.pantry.veg.qty < 6)) warnings.push({ text: `Low on ${s.pantry.chaLua.qty < 6 ? 'chả lụa' : 'pickles & herbs'} for bánh mì.`, tab: 'market' });
  // One clear ask: fill the oven, starting with the best sellers.
  const trays = menu.filter((p) => PRODUCTS[p].kind === 'tray' && s.display[p].qty === 0);
  const left = trayCapacity(s) - s.traysToday;
  if (trays.length && left > 0) {
    const sold = (p: string) => s.history.slice(-7).reduce((t, h) => t + (h.sold[p as keyof typeof h.sold] ?? 0), 0);
    const best = [...trays].sort((a, b) => sold(b) - sold(a)).slice(0, 2);
    warnings.push({ text: `Bake your ${left} tray${left === 1 ? '' : 's'}: start with ${best.map((p) => PRODUCTS[p].name).join(' and ')}.`, tab: 'kitchen', spot: `bake-${best[0]}` });
  }
  const toRent = daysToMonthStart(s.day);
  if (toRent > 0 && toRent <= 5) warnings.push({ text: `Rent day in ${toRent} day${toRent === 1 ? '' : 's'}: about ${money(rent(s) * 30)} for the month.${s.cash < rent(s) * 30 ? ' Save up!' : ' You have enough.'}`, tab: 'today' });
  else if (s.cash < rent(s) * 5 && s.cash >= 0) warnings.push({ text: `Cash is getting thin: ${money(s.cash)}. Next month's rent is about ${money(rent(s) * 30)}.`, tab: 'money' });
  if (s.creditLine.balance > 0) warnings.push({ text: `You're using ${money(s.creditLine.balance)} of the bank's credit line. It charges high interest every day.`, tab: 'money' });
  return warnings.filter((w) => tabOn(s, w.tab));
}

/**
 * Bà's first lesson: the only required tutorial, and only the core loop.
 * Bake, serve, close up. Done by doing; the "why" comes in the report.
 */
function Coach() {
  const { state: s, dispatch } = useGame();
  const { showMe } = useGuide();
  if (s.hints.includes('coachDone') || s.intro?.active || s.allUnlocked !== false) return null;
  // Wait for Bà's welcome lines to finish first.
  if (s.scenario === 'family' && s.history.length === 0 && !s.hints.includes('intro')) return null;
  const steps = [
    { done: s.traysToday > 0 || s.history.length > 0, text: 'The pastry case is empty! Bake a tray of bánh flan in the Kitchen. Tap “Take it out” when it’s golden.', tab: 'kitchen' as Tab, spot: 'bake-flan' },
    { done: s.lifetime.served > 0, text: 'Open the doors and serve your first customer.', tab: 'today' as Tab, spot: 'open' },
    { done: s.history.length > 0, text: 'When the day ends, choose what to do with leftovers (donating is kind!), then see your stars.' },
  ];
  if (steps.every((x) => x.done)) return null;
  const at = steps.findIndex((x) => !x.done);
  return (
    <Card className="coach-card intro-card" title="Bà’s first lesson" icon="bell" spot="coach" aside={<button type="button" className="link-btn" onClick={() => dispatch({ type: 'hint', id: 'coachDone' })}>Skip</button>}>
      <p className="handwrite" lang="vi">Làm từng bước thôi con.</p>
      <ol className="coach-steps">
        {steps.map((st, i) => (
          <li key={i} className={st.done ? 'done' : i === at ? 'now' : ''}>
            {st.done ? <Sprite name="check" scale={2} /> : <span className="num">{i + 1}</span>}
            <span>
              {st.text}{' '}
              {i === at && st.spot && (
                <button type="button" className="link-btn" onClick={() => showMe(st.tab, st.spot)}>
                  Show me
                </button>
              )}
            </span>
          </li>
        ))}
      </ol>
      <p className="small muted">“One step at a time, my dear.”</p>
    </Card>
  );
}

/** The day's three sales targets, shown before opening so there's something to aim for. */
function TodayGoal() {
  const { state: s } = useGame();
  const goal = s.today.goal ?? dailyGoal(s);
  return (
    <div className="today-goal">
      <b>Today’s goal</b>
      <ol>
        {goal.map((g, i) => (
          <li key={i}>
            {Array.from({ length: i + 1 }).map((_, k) => (
              <Sprite key={k} name="star" scale={2} />
            ))}
            <span>sell {money(g)}</span>
          </li>
        ))}
      </ol>
      <span className="small muted">More stars, more XP. Bake enough, price it right and keep the line moving!</span>
    </div>
  );
}

export function HomePanel({ goTo, onOpen, onRunDay }: { goTo: (t: Tab) => void; onOpen: () => void; onRunDay: () => void }) {
  const { state: s, business, feature, fresh } = useGame();
  const { showMe } = useGuide();
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
  const delegate = feature('today.teamDay');
  const stage = businessStage(s);
  const catering = s.effects.find((e) => e.id === 'catering' && Number(e.data?.day) === s.day);
  // While Bà's first lesson runs, it is the only voice on this page.
  const lesson = s.allUnlocked === false && s.history.length === 0 && !s.hints.includes('coachDone');

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
        {business && (
        <div className="tile">
          <Sprite name="star" scale={3} />
          <span>Today's profit</span>
          <b className={is.netProfit < 0 ? 'neg' : 'pos'}>{signedMoney(is.netProfit)}</b>
          <span className="tiny muted">{s.phase === 'morning' ? 'Before rent, wages & power' : ''}</span>
        </div>
        )}
        {business && (
        <div className="tile">
          <Sprite name="box" scale={3} />
          <span>
            <Tip concept="inventory">Inventory</Tip>
          </span>
          <b>{money(inventoryValue(s))}</b>
        </div>
        )}
        <div className="tile">
          <Sprite name="people" scale={3} />
          <span>Customers today</span>
          <b>
            {t.served}/{t.customers}
          </b>
        </div>
        {business && (
        <div className="tile">
          <Sprite name="heart" scale={3} />
          <span>Reputation</span>
          <b>{Math.round(s.reputation)}</b>
        </div>
        )}
      </div>

      <Coach />
      <IntroCard />
      <Card className={`economy-card regime-${s.macro.regime}`} title={feature('analytics.economy') ? regime.name : `Day ${s.day}`} icon="chart" aside={<span className="small muted">{dateLabel(s.day)}</span>}>
        {feature('analytics.economy') && <p className="small">{regime.forYou}</p>}
        {business && feature('analytics.economy') && (
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

      {s.special && (
        <Card className="special-card" title="Today’s special" icon="star" spot="special" fresh={fresh('today.special')} aside={<span className="small muted">pays ×{ECON.service.dailySpecial.mult}</span>}>
          <div className="special-row">
            <Sprite name={s.special} scale={3} />
            <div>
              <b>{PRODUCTS[s.special].name}</b>
              <span className="small">Sells for {money2(effectivePrice(s, s.special))} today instead of {money2(s.prices[s.special])}, and customers are happy to pay it. {PRODUCTS[s.special].kind === 'tray' ? 'Bake extra!' : 'Make sure you have the ingredients!'}</span>
            </div>
          </div>
        </Card>
      )}
      {!s.intro?.active && !lesson && (s.allUnlocked === false ? <LessonPath /> : <NextUp />)}

      {lesson ? null : firstDay ? (
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
                  <button type="button" className="link-btn" onClick={() => (w.spot ? showMe(w.tab, w.spot) : goTo(w.tab))}>
                    {w.spot ? 'Show me' : 'Go'}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )
      )}

      {morning && (
        <Card title="Open for business" icon="shop">
          <TodayGoal />
          <ChallengeChip />
          {catering && <p className="chip">Catering at noon: {String(catering.data?.qty)} bánh mì</p>}
          {effectActive(s, 'closedDay') && <p className="warn">The shop has to stay closed today.</p>}
          <div className="open-choices">
            <Btn kind="go" className="big" onClick={onOpen} disabled={s.events.length > 0} sfx="bell" data-spot="open">
              <span lang="vi">Mở cửa!</span> Run the counter yourself
            </Btn>
            {delegate && (
            <Btn kind="primary" onClick={onRunDay} disabled={s.events.length > 0} sfx="bell" data-spot="team-day">
              {teamCanRun ? 'Let the team run today' : 'Let Bà run today'}
            </Btn>
            )}
          </div>
          {delegate && <p className="small muted">
            {teamCanRun
              ? 'Your team (and Bà) bake from the plan in the Kitchen, restock and serve everyone they can. The day finishes straight away. You serve better than they do, so jump in on busy days.'
              : 'The autopilot bakes, restocks and serves for you at a fair, slightly slower pace. Handy for long games; you\'ll learn more running the counter yourself at first.'}
          </p>}
        </Card>
      )}

      {s.story && !lesson && <StoryCard />}

      {rivals.length > 0 && feature('customers.rivals') && (
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

      {!lesson && !s.intro?.active && (
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
      )}

      {!lesson && s.intro?.active && s.allUnlocked === false && <LessonPath folded />}

      <p className="small muted">
        Pantry check: {Object.entries(s.pantry).filter(([, p]) => p.qty > 0).length} ingredients in stock
        {s.deliveries.length ? ` · ${s.deliveries.length} deliveries on the way (${s.deliveries.map((d) => INGREDIENTS[d.ingredient].name.toLowerCase()).join(', ')})` : ''}. Rent: about {money(rent(s) * 30)} a month, paid on the 1st.
      </p>
    </div>
  );
}

/** The Lantern Festival story: lane hearts so far and when the next chapter comes. */
function StoryCard() {
  const { state: s } = useGame();
  const st = s.story!;
  const days = st.nextDay - s.day;
  return (
    <Card className="story-card" title="The Lantern Festival" icon="party" aside={<span className="small muted">{st.result ? 'The end' : `Chapter ${Math.min(st.chapter, ARC.chapters)} of ${ARC.chapters}`}</span>}>
      <p className="small">
        <Sprite name="heart" scale={2} /> <b>{st.hearts} lane heart{st.hearts === 1 ? '' : 's'}.</b>{' '}
        {st.result
          ? st.result === 'won'
            ? 'You won the Golden Whisk! It hangs above the door.'
            : 'The lane gave you its own ribbon. It hangs above the door.'
          : `${ARC.win} wins the festival. Every 2-star day wins a heart.`}
      </p>
      {!st.result && (
        <>
          <Meter value={Math.min(1, st.hearts / ARC.win)} tone="xp" label={`${st.hearts} of ${ARC.win} lane hearts`} />
          <p className="small muted">
            Last time: {ARC_TITLES[Math.max(0, st.chapter - 1)]}. {st.chapter >= ARC.chapters ? '' : days <= 0 ? 'More news today.' : days === 1 ? 'More news tomorrow.' : `More news in ${days} days.`}
          </p>
        </>
      )}
    </Card>
  );
}

const PARTS = ['', 'The basics', 'Regulars and your first helper', 'Reading the money', 'Supply and money', 'The wider world', 'Growing up'];

/**
 * Guided games: the tutorial as a path. One part at a time, each lesson ticked off,
 * postponed ones a tap away, locked ones with the day they arrive.
 */
function LessonPath({ folded = false }: { folded?: boolean }) {
  const { state: s, dispatch } = useGame();
  const next = nextFeature(s);
  if (!next) return folded ? null : <NextUp />;
  const part = FEATURE[next.id].chapter;
  const have = new Set(s.features ?? []);
  const done = new Set(s.intro?.done ?? []);
  const lessons = FEATURES.filter((f) => f.chapter === part);
  const rows = [
    ...(part === 1 ? [{ id: 'first', name: 'Your first day: bake, serve, close up', state: s.history.length > 0 ? 'done' : 'now', when: '' }] : []),
    ...lessons.map((f) => {
      const state = done.has(f.id) ? 'done' : s.intro?.active === f.id ? 'now' : have.has(f.id) ? 'try' : 'locked';
      const day = f.id === next.id ? next.day : Math.max(f.fallbackDay, s.day + 1);
      return { id: f.id, name: f.name, state, when: day <= s.day + 1 ? 'tomorrow' : `day ${day}` };
    }),
  ];
  const finished = rows.filter((r) => r.state === 'done').length;
  const n = nextUnlock(s);
  const list = (
    <ol className="coach-steps">
      {rows.map((r, i) => (
        <li key={r.id} className={r.state}>
          {r.state === 'done' ? <Sprite name="check" scale={2} /> : r.state === 'locked' ? <Sprite name="lock" scale={2} /> : <span className="num">{i + 1}</span>}
          <span>
            {r.name}
            {r.state === 'locked' && <span className="small muted"> · {r.when}</span>}
            {r.state === 'now' && <span className="small muted"> · now</span>}
            {r.state === 'try' && (
              <>
                {' '}
                <button type="button" className="link-btn" onClick={() => dispatch({ type: 'introStart', id: r.id as FeatureId })}>
                  Start
                </button>
              </>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
  if (folded)
    return (
      <details className="card lesson-path folded">
        <summary>
          <Sprite name="book" scale={2} /> Bà’s lessons: {finished} of {rows.length} done in part {part}
        </summary>
        {list}
      </details>
    );
  return (
    <Card className="lesson-path" title="Bà’s lessons" icon="book" spot="lessons" aside={<span className="small muted">Part {part} of 6</span>}>
      <p className="lesson-part">{PARTS[part]}</p>
      {list}
      <Meter value={finished / rows.length} tone="xp" label={`${finished} of ${rows.length} lessons in this part done`} />
      <p className="small muted">
        Next up: {n.text} ({n.when})
      </p>
    </Card>
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

export function Neighbours() {
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
