import { LEVELS, WEATHER, WEEKDAYS } from '../data/catalog';
import { ecoScore, isTet, levelProgress, weekdayIndex } from '../engine/economy';
import { clockLabel } from '../engine/time';
import { money, money2 } from '../lib/format';
import { useGame } from './GameContext';
import { Meter, useTween } from './kit';
import { Sprite } from './pixel/Sprite';

const WEATHER_ICON = { sunny: 'sun', cloudy: 'cloud', rainy: 'rain', hot: 'hot', cool: 'cool' } as const;

export function Hud({ onQuests, onSettings, questCount }: { onQuests: () => void; onSettings: () => void; questCount: number }) {
  const { state: s, reduced } = useGame();
  const cash = useTween(s.cash, 500, reduced);
  const lp = levelProgress(s.xp);
  const wd = WEEKDAYS[weekdayIndex(s.day)];
  const eco = ecoScore(s);
  return (
    <header className="hud">
      <div className="hud-name">
        <h1>{s.bakeryName}</h1>
        <span className="hud-day">
          Day {s.day} · <span lang="vi">{wd.vi}</span> <span className="muted">({wd.en})</span>
          {isTet(s.day) && <span className="tet-chip">Tết</span>}
        </span>
      </div>
      <div className="hud-stats">
        <span className="hud-stat" title={`${WEATHER[s.market.weather].name}: ${WEATHER[s.market.weather].tip}`}>
          <Sprite name={WEATHER_ICON[s.market.weather]} scale={3} />
          <span className="sr-only">Weather: {WEATHER[s.market.weather].name}</span>
        </span>
        {s.phase === 'service' && s.service && (
          <span className="hud-stat clock" aria-label={`Time ${clockLabel(s.service.clock)}`}>
            <Sprite name="clock" scale={3} />
            <b>{clockLabel(s.service.clock)}</b>
          </span>
        )}
        <span className="hud-stat cash" aria-label={`Cash ${money2(s.cash)}`}>
          <Sprite name="coin" scale={3} />
          <b className={s.cash < 0 ? 'neg' : ''}>{money(cash, 2)}</b>
        </span>
        <span className="hud-stat" title="Reputation: how the neighbourhood rates you">
          <Sprite name="star" scale={3} />
          <b>{Math.round(s.reputation)}</b>
          <span className="sr-only">reputation</span>
        </span>
        <span className="hud-stat" title="Eco score: sourcing, waste and packaging">
          <Sprite name="leaf" scale={3} />
          <b>{eco}</b>
          <span className="sr-only">eco score</span>
        </span>
        <span className="hud-stat" title="Community: donations, good service and being a good neighbour">
          <Sprite name="heart" scale={3} />
          <b>{Math.round(s.community)}</b>
          <span className="sr-only">community</span>
        </span>
      </div>
      <div className="hud-level" title={`${lp.into} / ${lp.span} XP to the next level`}>
        <span className="lvl-badge">Lv {lp.level}</span>
        <span className="lvl-name">{LEVELS[lp.level - 1].name}</span>
        <Meter value={lp.into / lp.span} tone="xp" label="Progress to next level" />
      </div>
      <div className="hud-buttons">
        <button type="button" className="icon-btn" onClick={onQuests} aria-label={`Quests and achievements, ${questCount} active`}>
          <Sprite name="book" scale={3} />
          <span className="badge">{questCount}</span>
        </button>
        <button type="button" className="icon-btn" onClick={onSettings} aria-label="Settings and saving">
          <Sprite name="gear" scale={3} />
        </button>
      </div>
    </header>
  );
}
