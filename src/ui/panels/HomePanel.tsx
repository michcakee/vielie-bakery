import { biggestProblem } from '../../engine/advice';
import { BAGUETTE, LEVELS, PRODUCTS, PRODUCT_ORDER, UPGRADES, WEATHER } from '../../data/catalog';
import { ECON } from '../../data/config';
import { REGULARS } from '../../data/people';
import { incomeStatement, inventoryValue } from '../../engine/accounting';
import { dateLabel, daysToMonthStart, festivalsOn, FESTIVALS } from '../../engine/calendar';
import { activeRivals, canBakeTray, effectActive, has, levelOf, levelProgress, makeable, onMenu, rent, trayCapacity, effectivePrice } from '../../engine/economy';
import { REGIMES } from '../../engine/macro';
import { activeQuests, levelGift, nextUnlock } from '../../engine/progression';
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
import { tutorialOn, tutorialStep } from '../Tutorial';
import { FEATURE, FEATURES, type FeatureId } from '../../data/unlocks';
import { COSMETICS, owns, starsToSpend } from '../../data/cosmetics';
import { RENOVATIONS } from '../../data/shopfit';

const WEATHER_ICON = { sunny: 'sun', cloudy: 'cloud', rainy: 'rain', hot: 'hot', cool: 'cool' } as const;

export type Tab = 'today' | 'kitchen' | 'market' | 'staff' | 'customers' | 'growth' | 'money' | 'analytics' | 'eco';

export function readiness(s: GameState) {
  const menu = onMenu(s);
  const warnings: { text: string; tab: Tab; spot?: string; big?: boolean }[] = [];
  // The one thing holding the bakery back most, from the last few days, goes first.
  const problem = biggestProblem(s);
  if (problem) warnings.push({ text: problem.text, tab: problem.tab, spot: problem.spot, big: true });
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
    // On a taste-test day the new cake goes first, whatever sold before.
    const first = (p: string) => (s.challenge?.id === 'tasteTest' && !s.challenge.done && p === s.challenge.product ? 1e6 : 0);
    const best = [...trays].sort((a, b) => first(b) + sold(b) - (first(a) + sold(a))).slice(0, 2);
    const names = best.map((p) => PRODUCTS[p].name).join(' and ');
    // With nothing in the case, say so: baking baguettes alone doesn't fill it.
    const caseEmpty = menu.every((p) => PRODUCTS[p].kind !== 'tray' || s.display[p].qty === 0);
    warnings.push({ text: caseEmpty ? `The glass case is empty. Bake pastries to fill it: ${names}.` : `Bake your ${left} tray${left === 1 ? '' : 's'}: start with ${names}.`, tab: 'kitchen', spot: `bake-${best[0]}` });
  }
  if (s.cash < 40 && s.phase === 'morning' && s.history.length > 1)
    warnings.push({ text: `Only ${money(Math.max(0, s.cash))} in the drawer. You can’t buy ingredients, and ${s.staff.length ? 'wages still go out' : 'bills still come'}. Sell what you have, use the credit line, or let someone go.`, tab: 'money', big: true });
  const toRent = daysToMonthStart(s.day);
  if (toRent > 0 && toRent <= 10) warnings.push({ text: `Rent day in ${toRent} day${toRent === 1 ? '' : 's'}: about ${money(rent(s) * 30)} for the month.${s.cash < rent(s) * 30 ? ' Save up!' : ' You have enough.'}`, tab: 'today' });
  else if (s.cash < rent(s) * 5 && s.cash >= 0) warnings.push({ text: `Cash is getting thin: ${money(s.cash)}. Next month's rent is about ${money(rent(s) * 30)}.`, tab: 'money' });
  if (s.creditLine.balance > 0) warnings.push({ text: `You're using ${money(s.creditLine.balance)} of the bank's credit line. It charges high interest every day.`, tab: 'money' });
  return warnings.filter((w) => tabOn(s, w.tab));
}

/**
 * What to aim for: the next level and what it brings, the next thing worth saving for, stars to
 * spend, and the quests. So there's always a clear next goal.
 */
function AimFor({ onQuests }: { onQuests: () => void }) {
  const { state: s, feature } = useGame();
  const lp = levelProgress(s.xp);
  const level = levelOf(s.xp);
  const next = LEVELS[lp.level];
  const newRecipes = next ? PRODUCT_ORDER.filter((p) => PRODUCTS[p].level === next.level && !PRODUCTS[p].season && !s.unlocked.includes(p)).map((p) => PRODUCTS[p].name) : [];
  const pi = s.macro.priceIndex;
  const save = feature('growth.equipment')
    ? Object.values(UPGRADES)
        .filter((u) => u.level <= level && !has(s, u.id) && (!u.requires || has(s, u.requires)) && (u.group === 'kitchen' || u.group === 'shop'))
        .sort((a, b) => a.cost - b.cost)[0]
    : undefined;
  const reno = RENOVATIONS[(s.shopTier ?? 0) + 1];
  const renoReady = reno && level >= reno.level;
  const stars = starsToSpend(s);
  const nextLook = COSMETICS.filter((c) => !owns(s, c.id)).sort((a, b) => a.cost - b.cost)[0];
  const quests = activeQuests(s);
  return (
    <Card className="aim-card" title="What to aim for" icon="star" spot="aim">
      <ul className="aim-list">
        {next && (
          <li>
            <Sprite name="crown" scale={2} />
            <div>
              <b>
                Level {next.level}: {next.name}
              </b>
              <span className="small">
                {Math.max(0, Math.ceil(next.xp - s.xp)).toLocaleString('en-US')} XP to go. Bà sends ${levelGift(next.level)}
                {newRecipes.length ? `, plus new recipes: ${newRecipes.slice(0, 2).join(', ')}` : ''}.
              </span>
              <Meter value={lp.into / lp.span} tone="xp" label="Progress to the next level" />
            </div>
          </li>
        )}
        {renoReady && (
          <li>
            <Sprite name="spark" scale={2} />
            <div>
              <b>Renovate: {reno.name}</b>
              <span className="small">
                {reno.perk}, and the shop gets a new look. Costs {money(reno.cost)}; you have {money(s.cash)}. Tap Paint under the shop picture.
              </span>
              <Meter value={s.cash / reno.cost} tone="xp" label={`Saving for ${reno.name}`} />
            </div>
          </li>
        )}
        {save && (
          <li>
            <Sprite name="coin" scale={2} />
            <div>
              <b>Save up for: {save.name}</b>
              <span className="small">
                {save.effect}. Costs {money(save.cost * pi)}; you have {money(s.cash)}.
              </span>
              <Meter value={s.cash / (save.cost * pi)} tone="xp" label={`Saving for ${save.name}`} />
            </div>
          </li>
        )}
        <li>
          <Sprite name="star" scale={2} />
          <div>
            <b>
              {stars}★ to spend
            </b>
            <span className="small">{nextLook ? `Earn stars from your daily goal. Next look: ${nextLook.name} for ${nextLook.cost}★.` : 'You’ve unlocked every look!'}</span>
          </div>
        </li>
        <li>
          <Sprite name="book" scale={2} />
          <div>
            <b>
              {quests.length} {quests.length === 1 ? 'quest' : 'quests'} to do
            </b>
            <span className="small">{quests[0] ? `Next: ${quests[0].title}. ${quests[0].text}` : 'All done!'}</span>
          </div>
        </li>
      </ul>
      <Btn kind="primary" onClick={onQuests} data-spot="open-quests">
        Quests & star shop
      </Btn>
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

export function HomePanel({ goTo, onOpen, onRunDay, onQuests }: { goTo: (t: Tab) => void; onOpen: () => void; onRunDay: () => void; onQuests: () => void }) {
  const { state: s, business, feature } = useGame();
  const { showMe } = useGuide();
  const t = s.today;
  const is = incomeStatement(t.books);
  const warnings = readiness(s);
  const regime = REGIMES[s.macro.regime];
  const fest = festivalsOn(s.day);
  const rivals = activeRivals(s);
  const morning = s.phase === 'morning';
  const recent = s.history.slice(-14);
  const teamCanRun = s.staff.some((e) => e.branch === null);
  const delegate = feature('today.teamDay');
  const catering = s.effects.find((e) => e.id === 'catering' && Number(e.data?.day) === s.day);
  // While the first-day walkthrough runs, it is the only voice: this page shows just the Open card.
  const lesson = tutorialOn(s);

  if (lesson)
    return (
      <div className="panel-stack">
        {morning && tutorialStep(s) >= 2 && (
          <Card title="Open for business" icon="shop">
            <TodayGoal />
            <Btn kind="go" className="big" onClick={onOpen} disabled={s.events.length > 0} sfx="bell" data-spot="open">
              Open the shop
            </Btn>
          </Card>
        )}
      </div>
    );

  return (
    <div className="panel-stack">
      <IntroCard />

      {/* The important things for today, in one place, ending with the Open button. */}
      {morning && (
        <Card className="today-card" title={`Today: ${WEATHER[s.market.weather].name}`} icon={WEATHER_ICON[s.market.weather]} aside={<span className="small muted">Day {s.day} · {dateLabel(s.day)}</span>}>
          <p className="small today-weather">{WEATHER[s.market.weather].tip}</p>
          {fest.length > 0 && (
            <p className="festival-chip">
              {fest.map((f) => (
                <span key={f} className="chip">
                  <b>{FESTIVALS[f].name}</b>: {FESTIVALS[f].blurb}
                </span>
              ))}
            </p>
          )}
          <TodayGoal />
          {s.special && (
            <div className="special-row today-special" data-spot="special">
              <Sprite name={s.special} scale={3} />
              <div>
                <b>
                  Today’s special: {PRODUCTS[s.special].name} <span className="special-tag">×{ECON.service.dailySpecial.mult} price</span>
                </b>
                <span className="small">
                  Sells for {money2(effectivePrice(s, s.special))} today instead of {money2(s.prices[s.special])}. {PRODUCTS[s.special].kind === 'tray' ? 'Bake extra!' : 'Have the ingredients ready!'}
                </span>
              </div>
            </div>
          )}
          <ChallengeChip />
          {catering && <p className="chip">Catering at noon: {String(catering.data?.qty)} bánh mì</p>}
          {warnings.length > 0 && (
            <>
              <b className="todo-head">Before you open</b>
              <ul className="warnings">
                {warnings.slice(0, 2).map((w) => (
                  <li key={w.text} className={w.big ? 'big-problem' : ''}>
                    <Sprite name="bell" scale={2} />
                    <span>{w.text}</span>
                    <button type="button" className="link-btn" onClick={() => (w.spot ? showMe(w.tab, w.spot) : goTo(w.tab))}>
                      {w.spot ? 'Show me' : 'Go'}
                    </button>
                  </li>
                ))}
              </ul>
              {warnings.length > 2 && (
                <details className="more-todos">
                  <summary>{warnings.length - 2} more</summary>
                  <ul className="warnings">
                    {warnings.slice(2).map((w) => (
                      <li key={w.text}>
                        <Sprite name="bell" scale={2} />
                        <span>{w.text}</span>
                        <button type="button" className="link-btn" onClick={() => (w.spot ? showMe(w.tab, w.spot) : goTo(w.tab))}>
                          {w.spot ? 'Show me' : 'Go'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
          {effectActive(s, 'closedDay') && <p className="warn">The shop has to stay closed today.</p>}
          <div className="open-choices">
            <Btn kind="go" className="big" onClick={onOpen} disabled={s.events.length > 0} sfx="bell" data-spot="open">
              Open the shop
            </Btn>
            {delegate && (
              <Btn kind="primary" onClick={onRunDay} disabled={s.events.length > 0} sfx="bell" data-spot="team-day">
                {teamCanRun ? 'Let the team run today' : 'Let Bà run today'}
                <span className="btn-sub">{teamCanRun ? 'instant · you can’t help' : 'instant · no tips or XP'}</span>
              </Btn>
            )}
          </div>
        </Card>
      )}

      <AimFor onQuests={onQuests} />

      {s.story && <StoryCard />}
      {!s.intro?.active && (s.allUnlocked === false ? <LessonPath /> : <NextUp />)}
      {s.intro?.active && s.allUnlocked === false && <LessonPath folded />}

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

      <div className="dash-tiles">
        <div className="tile">
          <Sprite name="chart" scale={3} />
          <span>Today's sales</span>
          <b>{money(is.revenue)}</b>
          <Spark values={recent.map((h) => h.revenue)} label="Sales trend" />
        </div>
        <div className="tile">
          <Sprite name="people" scale={3} />
          <span>Customers today</span>
          <b>
            {t.served}/{t.customers}
          </b>
        </div>
        {business && (
          <div className="tile">
            <Sprite name="star" scale={3} />
            <span>Today's profit</span>
            <b className={is.netProfit < 0 ? 'neg' : 'pos'}>{signedMoney(is.netProfit)}</b>
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
      </div>

      {feature('analytics.economy') && (
        <Card className={`economy-card regime-${s.macro.regime}`} title={regime.name} icon="chart">
          <p className="small">{regime.forYou}</p>
          {business && (
            <p className="small muted">
              Inflation {(s.macro.inflation * 100).toFixed(1)}% · interest rate {(s.macro.rate * 100).toFixed(1)}% · unemployment {(s.macro.unemployment * 100).toFixed(1)}% · consumer confidence {Math.round(s.macro.confidence)}
            </p>
          )}
        </Card>
      )}
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
