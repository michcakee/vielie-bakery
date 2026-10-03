import { DECOR, PRODUCTS, PRODUCT_ORDER } from '../data/catalog';
import { REGULARS } from '../data/people';
import { ARC, ARC_TITLES } from '../engine/arc';
import { EVENTS } from '../engine/events';
import { ACHIEVEMENTS, masteryTier } from '../engine/progression';
import type { DecorId, GameState } from '../engine/types';
import { useGame } from './GameContext';
import { Meter } from './kit';
import { Person, Sprite } from './pixel/Sprite';

const MEDALS = ['', 'medalBronze', 'medalSilver', 'medalGold'];
const MEDAL_NAMES = ['', 'Bronze', 'Silver', 'Gold'];

/** Everyday events worth collecting: not the story chapters (they have their own shelf) or one-off system cards. */
const MOMENTS = Object.values(EVENTS).filter((e) => !e.id.startsWith('arc') && !e.id.startsWith('story') && !['bailout', 'buyout', 'rentRenewal'].includes(e.id));

/** What the player has found so far, and how much there is to find. */
export function collectionCount(s: GameState): { have: number; all: number } {
  const neighbours = REGULARS.filter((r) => (s.visitsByRegular[r.id] ?? 0) > 0).length;
  const recipes = PRODUCT_ORDER.filter((p) => s.unlocked.includes(p)).length;
  const medals = PRODUCT_ORDER.reduce((t, p) => t + masteryTier(s, p), 0);
  const chapters = Math.min(ARC.chapters, s.story?.chapter ?? 0);
  const moments = MOMENTS.filter((e) => (s.eventsSeen ?? []).includes(e.id)).length;
  const decor = s.decor.length;
  const trophies = s.achievements.length;
  return {
    have: neighbours + recipes + medals + chapters + moments + decor + trophies,
    all: REGULARS.length + PRODUCT_ORDER.length * 4 + ARC.chapters + MOMENTS.length + Object.keys(DECOR).length + ACHIEVEMENTS.length,
  };
}

/** The Collection book: neighbours, recipes and medals, the festival story, moments, decorations. */
export function Collection() {
  const { state: s } = useGame();
  const seen = new Set(s.eventsSeen ?? []);
  const total = collectionCount(s);
  const chapter = s.story?.chapter ?? 0;
  return (
    <div className="collection">
      <p className="small">
        Everything you find goes in this book. <b>{total.have}</b> of {total.all} collected.
      </p>
      <Meter value={total.have / total.all} tone="xp" label={`${total.have} of ${total.all} collected`} />

      <h3>Neighbours</h3>
      <ul className="coll-grid">
        {REGULARS.map((r) => {
          const met = (s.visitsByRegular[r.id] ?? 0) > 0;
          const badge = s.badges?.[r.id] ?? 0;
          return (
            <li key={r.id} className={met ? 'got' : 'missing'}>
              <span className={met ? '' : 'silhouette'}>
                <Person look={r.look} scale={2} />
              </span>
              <b>{met ? r.name : '???'}</b>
              <span className="small muted">{met ? (badge ? `${MEDAL_NAMES[badge]} regular` : `${s.visitsByRegular[r.id]} visits`) : 'Not met yet'}</span>
            </li>
          );
        })}
      </ul>

      <h3>Recipes and medals</h3>
      <ul className="coll-grid">
        {PRODUCT_ORDER.map((p) => {
          const got = s.unlocked.includes(p);
          const tier = masteryTier(s, p);
          return (
            <li key={p} className={got ? 'got' : 'missing'}>
              <span className={got ? '' : 'silhouette'}>
                <Sprite name={p} scale={3} />
              </span>
              <b>{got ? PRODUCTS[p].name : '???'}</b>
              <span className="small muted">
                {got ? `${s.lifetime.sold[p] ?? 0} sold` : `Level ${PRODUCTS[p].level}`}
                {tier > 0 && (
                  <>
                    {' '}
                    <Sprite name={MEDALS[tier]} scale={2} label={`${MEDAL_NAMES[tier]} medal`} />
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <h3>The Lantern Festival story</h3>
      {chapter === 0 ? (
        <p className="small muted">A story begins around day {ARC.startDay}. Someone in a shiny car is coming…</p>
      ) : (
        <>
          <p className="small">
            <Sprite name="heart" scale={2} /> {s.story?.hearts ?? 0} lane heart{s.story?.hearts === 1 ? '' : 's'}
            {s.story?.result ? (s.story.result === 'won' ? ' · You won the Golden Whisk!' : ' · The lane gave you its own ribbon.') : ` · ${ARC.win} wins the festival`}
          </p>
          <ol className="coll-list">
            {ARC_TITLES.map((title, i) => (
              <li key={title} className={i < chapter ? 'got' : 'missing'}>
                <Sprite name={i < chapter ? 'check' : 'lock'} scale={2} /> {i < chapter ? title : '???'}
              </li>
            ))}
          </ol>
        </>
      )}

      <h3>Moments</h3>
      <ul className="coll-list">
        {MOMENTS.map((e) => (
          <li key={e.id} className={seen.has(e.id) ? 'got' : 'missing'}>
            <Sprite name={seen.has(e.id) ? e.icon : 'lock'} scale={2} /> {seen.has(e.id) ? e.title : '???'}
          </li>
        ))}
      </ul>

      <h3>Decorations</h3>
      <ul className="coll-list">
        {(Object.keys(DECOR) as DecorId[]).map((d) => (
          <li key={d} className={s.decor.includes(d) ? 'got' : 'missing'}>
            <Sprite name={s.decor.includes(d) ? 'check' : 'lock'} scale={2} /> {s.decor.includes(d) || d !== 'trophy' ? DECOR[d].name : '???'}
          </li>
        ))}
      </ul>
    </div>
  );
}
