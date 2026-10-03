import { useEffect, useRef, useState } from 'react';
import { LEVELS, WEATHER, WEEKDAYS } from '../data/catalog';
import { ecoScore, isTet, levelProgress, weekdayIndex } from '../engine/economy';
import { clockLabel } from '../engine/time';
import { money, money2 } from '../lib/format';
import { useGame } from './GameContext';
import { featureOn } from '../engine/unlocks';
import { starsToSpend } from '../data/cosmetics';
import { Meter, useTween } from './kit';
import { Sprite } from './pixel/Sprite';

const WEATHER_ICON = { sunny: 'sun', cloudy: 'cloud', rainy: 'rain', hot: 'hot', cool: 'cool' } as const;

export function Hud({ onQuests, onSettings, onHelp, questCount, onConcepts }: { onQuests: () => void; onSettings: () => void; onHelp: () => void; questCount: number; onConcepts: () => void }) {
  const { state: s, reduced } = useGame();
  const cash = useTween(s.cash, 500, reduced);
  // Money earned while the shop is open floats up from the cash figure.
  const [floats, setFloats] = useState<{ id: number; amount: number }[]>([]);
  const prevCash = useRef(s.cash);
  useEffect(() => {
    const delta = s.cash - prevCash.current;
    prevCash.current = s.cash;
    if (s.phase !== 'service' || delta <= 0) return;
    const id = performance.now() + Math.random();
    setFloats((f) => [...f.slice(-2), { id, amount: delta }]);
    window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1100);
  }, [s.cash, s.phase]);
  const lp = levelProgress(s.xp);
  const wd = WEEKDAYS[weekdayIndex(s.day)];
  const eco = ecoScore(s);
  return (
    <header className="hud">
      <div className="hud-name">
        <h1>{s.bakeryName}</h1>
        <span className="hud-day">
          Day {s.day} · {wd.en}
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
          {floats.map((f) => (
            <span key={f.id} className="hud-float" aria-hidden="true">
              +{money2(f.amount)}
            </span>
          ))}
        </span>
        <span className="hud-stat" title="Reputation: how the neighbourhood rates you">
          <Sprite name="star" scale={3} />
          <b>{Math.round(s.reputation)}</b>
          <span className="sr-only">reputation</span>
        </span>
        {featureOn(s, 'eco.all') && (
        <span className="hud-stat" title="Eco score: sourcing, waste and packaging">
          <Sprite name="leaf" scale={3} />
          <b>{eco}</b>
          <span className="sr-only">eco score</span>
        </span>
        )}
        {featureOn(s, 'customers.regulars') && (
        <span className="hud-stat" title="Community: donations, good service and being a good neighbour">
          <Sprite name="heart" scale={3} />
          <b>{Math.round(s.community)}</b>
          <span className="sr-only">community</span>
        </span>
        )}
      </div>
      <div className="hud-level" title={`${lp.into} / ${lp.span} XP to the next level`}>
        <span className="lvl-badge">Lv {lp.level}</span>
        <span className="lvl-name">{LEVELS[lp.level - 1].name}</span>
        <Meter value={lp.into / lp.span} tone="xp" label="Progress to next level" />
      </div>
      <div className="hud-buttons">
        <button type="button" className="icon-btn help-btn" onClick={onHelp} aria-label="What should I do now?">
          ?
        </button>
        <button type="button" className="icon-btn quest-btn" onClick={onQuests} aria-label={`Quests, star shop and collection: ${questCount} quests to do, ${starsToSpend(s)} stars to spend`} data-spot="quests">
          <Sprite name="book" scale={3} />
          <span className="quest-btn-label">Quests</span>
          {questCount > 0 && <span className="quest-badge">{questCount}</span>}
        </button>
        <button type="button" className="icon-btn quest-btn concepts-btn" onClick={onConcepts} aria-label="Economic concepts reviewed so far" title="Economic concepts reviewed so far">
          <Sprite name="chart" scale={3} />
          <span className="quest-btn-label">Concepts</span>
        </button>
        <button type="button" className="icon-btn" onClick={onSettings} aria-label="Settings and saving">
          <Sprite name="gear" scale={3} />
        </button>
      </div>
    </header>
  );
}
