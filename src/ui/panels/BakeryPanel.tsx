import { BAGUETTE, INGREDIENTS, PRODUCTS } from '../../data/catalog';
import { REGULARS } from '../../data/people';
import { canBakeTray, effectActive, makeable, onMenu, ovenCapacity } from '../../engine/economy';
import { activeQuests, WEEKLY_GOALS } from '../../engine/progression';
import type { GameState, ProductId } from '../../engine/types';
import { useGame } from '../GameContext';
import { Btn, Card, Meter } from '../kit';
import { Person, Sprite } from '../pixel/Sprite';

export type Tab = 'bakery' | 'kitchen' | 'market' | 'build' | 'money' | 'eco';

function readiness(s: GameState) {
  const menu = onMenu(s);
  const items = menu.map((p) => ({ p, n: PRODUCTS[p].kind === 'tray' ? s.display[p].qty : makeable(s, p) }));
  const warnings: { text: string; tab: Tab }[] = [];
  if (s.baguettes.qty < 6) warnings.push({ text: canBakeTray(s, BAGUETTE.recipe) ? 'Only a few baguettes left. Bake a tray, or bánh mì will sell out.' : 'Out of flour for baguettes. Stock up at the market.', tab: canBakeTray(s, BAGUETTE.recipe) ? 'kitchen' : 'market' });
  if (makeable(s, 'caPhe') < 6) warnings.push({ text: 'Coffee or condensed milk is low. Cà phê sữa đá sells fast in the morning.', tab: 'market' });
  if (s.pantry.chaLua.qty < 6 || s.pantry.veg.qty < 6) warnings.push({ text: `Low on ${s.pantry.chaLua.qty < 6 ? 'chả lụa' : 'pickles & herbs'} for bánh mì.`, tab: 'market' });
  const trays = menu.filter((p) => PRODUCTS[p].kind === 'tray' && s.display[p].qty === 0);
  if (trays.length && s.traysToday < ovenCapacity(s)) warnings.push({ text: `No ${trays.map((p) => PRODUCTS[p].name).join(', ')} in the case yet.`, tab: 'kitchen' });
  return { items, warnings };
}

export function BakeryPanel({ goTo, onOpen }: { goTo: (t: Tab) => void; onOpen: () => void }) {
  const { state: s } = useGame();
  const { items, warnings } = readiness(s);
  const quests = activeQuests(s);
  const goal = s.weeklyGoal ? WEEKLY_GOALS[s.weeklyGoal.id] : null;
  const catering = s.effects.find((e) => e.id === 'catering' && Number(e.data?.day) === s.day);
  const wholesale = s.effects.find((e) => e.id === 'wholesale' && e.until >= s.day);
  const morning = s.phase === 'morning';
  const firstDay = s.day === 1 && s.history.length === 0;

  return (
    <div className="panel-stack">
      {firstDay ? (
        <Card className="ba-note" title="A note from Bà" icon="note">
          <p className="handwrite">
            Con ơi, the bakery is yours now. I left you baguettes, a tray of flan and enough for coffee. Open the doors, and someone will be hungry soon. Thương con.
          </p>
          <p className="small muted">"My dear, the bakery is yours now…" — Bà (grandma)</p>
        </Card>
      ) : (
        <Card title="Getting ready" icon="bell">
          <ol className="ready-steps">
            <li>
              <button type="button" className="link-btn" onClick={() => goTo('market')}>
                Stock up at the market
              </button>
            </li>
            <li>
              <button type="button" className="link-btn" onClick={() => goTo('kitchen')}>
                Bake trays and check prices in the kitchen
              </button>
            </li>
            <li>Open the doors!</li>
          </ol>
          {warnings.length > 0 && (
            <ul className="warnings">
              {warnings.map((w) => (
                <li key={w.text}>
                  <Sprite name="bell" scale={2} />
                  <span>{w.text}</span>
                  <button type="button" className="link-btn" onClick={() => goTo(w.tab)}>
                    {w.tab === 'market' ? 'Market' : 'Kitchen'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card title="Ready to sell" icon="shop">
        <ul className="ready-items">
          {items.map(({ p, n }) => (
            <li key={p} className={n === 0 ? 'out' : ''}>
              <Sprite name={p} scale={3} />
              <span>
                <b>{PRODUCTS[p].name}</b>
                <span className="small muted">{PRODUCTS[p].kind === 'tray' ? `${n} in the case` : `${n} can be made`}</span>
              </span>
            </li>
          ))}
        </ul>
        {(catering || wholesale || s.locks.length > 0 || effectActive(s, 'greenWeek')) && (
          <div className="chips">
            {catering && <span className="chip">Catering at noon: {String(catering.data?.qty)} bánh mì</span>}
            {wholesale && <span className="chip">Café Mộc: 10 flan this morning</span>}
            {s.locks
              .filter((l) => l.until >= s.day)
              .map((l) => (
                <span key={l.ingredient} className="chip">
                  {INGREDIENTS[l.ingredient].name} locked to day {l.until}
                </span>
              ))}
            {effectActive(s, 'greenWeek') && <span className="chip green">Green Week</span>}
          </div>
        )}
        {morning && (
          <Btn kind="go" className="big open-btn" onClick={onOpen} disabled={s.events.length > 0} sfx="bell">
            <span lang="vi">Mở cửa!</span> Open the doors
          </Btn>
        )}
      </Card>

      <Neighbours />

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
    </div>
  );
}

export const hasStock = (s: GameState, p: ProductId) => (PRODUCTS[p].kind === 'tray' ? s.display[p].qty > 0 : makeable(s, p) > 0);

function Neighbours() {
  const { state: s } = useGame();
  const met = REGULARS.filter((r) => (s.visitsByRegular[r.id] ?? 0) > 0);
  if (!met.length) return null;
  return (
    <Card title="Neighbours" icon="heart" aside={<span className="small muted">{met.length} regulars</span>}>
      <ul className="neighbours">
        {met.map((r) => {
          const hearts = s.hearts[r.id] ?? 0;
          return (
            <li key={r.id}>
              <Person look={r.look} scale={2} />
              <div>
                <b>{r.name}</b>
                <span className="small muted">
                  {r.role} · loves {r.favorite.map((p) => PRODUCTS[p].name).join(', ')}
                </span>
                <span className="small">{r.behavior}</span>
              </div>
              <span className="hearts" role="img" aria-label={`${Math.floor(hearts)} of 5 hearts`}>
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
