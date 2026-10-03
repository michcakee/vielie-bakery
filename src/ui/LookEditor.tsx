import { cosmeticFor, owns, starsToSpend, type CosmeticKind } from '../data/cosmetics';
import type { GameState, Look } from '../engine/types';
import { useState } from 'react';
import { play } from './audio';
import { useGame } from './GameContext';
import { Btn } from './kit';
import { EYES } from './pixel/chibi';
import { APRONS, HAIR_COLORS, SHIRTS, SKINS } from './pixel/palette';
import { ACCESSORY_NAMES, HAIR_STYLES } from './pixel/render';
import { Person, Sprite } from './pixel/Sprite';

type Key = 'hair' | 'hairColor' | 'eyes' | 'skin' | 'shirt' | 'apron' | 'accessory';

const ROWS: { key: Key; label: string; count: number; names?: string[]; swatch?: (string | null)[]; shop?: CosmeticKind }[] = [
  { key: 'hair', label: 'Hairstyle', count: HAIR_STYLES.length, names: HAIR_STYLES, shop: 'hair' },
  { key: 'hairColor', label: 'Hair colour', count: HAIR_COLORS.length, swatch: HAIR_COLORS },
  { key: 'eyes', label: 'Eye colour', count: EYES.length + 1, swatch: [null, ...EYES] },
  { key: 'skin', label: 'Skin tone', count: SKINS.length, swatch: SKINS },
  { key: 'shirt', label: 'Shirt', count: SHIRTS.length, swatch: SHIRTS },
  { key: 'apron', label: 'Apron', count: APRONS.length, swatch: APRONS },
  { key: 'accessory', label: 'Accessory', count: ACCESSORY_NAMES.length, names: ACCESSORY_NAMES, shop: 'accessory' },
];

/**
 * Pick a look. Star-shop parts show with a padlock and their price; you can try them on, but
 * `locked` tells the caller the look can't be kept until they're bought.
 */
export function LookEditor({ look, onChange, big = 8, state }: { look: Look; onChange: (l: Look) => void; big?: number; state?: Pick<GameState, 'cosmetics' | 'questProgress'> }) {
  const value = (k: Key) => look[k] ?? 0;
  const cycle = (key: Key, count: number, d: number) => {
    play('click');
    onChange({ ...look, [key]: (((value(key) + d) % count) + count) % count });
  };
  const stars = state ? starsToSpend(state) : 0;
  return (
    <div className="look-editor">
      <div className="look-preview" aria-hidden="true">
        <Person look={look} scale={big} className="bob" />
        <span className="look-floor" />
      </div>
      <div className="look-rows">
        {ROWS.map((r) => {
          const v = value(r.key) % r.count;
          const shop = r.shop ? cosmeticFor(r.shop, v) : undefined;
          const locked = !!shop && !(state && owns(state, shop.id));
          const sw = r.swatch?.[v];
          return (
            <div className={`look-row ${locked ? 'locked' : ''}`} key={r.key} role="group" aria-label={r.label}>
              <span className="look-label">{r.label}</span>
              <button type="button" className="arrow-btn" aria-label={`Previous ${r.label.toLowerCase()}`} onClick={() => cycle(r.key, r.count, -1)}>
                <Sprite name="arrow" scale={2} className="flip-x" />
              </button>
              <span className="look-value" aria-live="polite">
                {r.swatch ? sw ? <span className="swatch" style={{ background: sw }} /> : <span className="swatch auto">A</span> : null}
                {r.names ? r.names[v] : r.key === 'eyes' && v === 0 ? 'Match hair' : `${v + 1} of ${r.count}`}
                {locked && (
                  <span className="look-lock" title={`Unlock in the star shop for ${shop!.cost} stars`}>
                    <Sprite name="lock" scale={1} /> {shop!.cost}★
                  </span>
                )}
              </span>
              <button type="button" className="arrow-btn" aria-label={`Next ${r.label.toLowerCase()}`} onClick={() => cycle(r.key, r.count, 1)}>
                <Sprite name="arrow" scale={2} />
              </button>
            </div>
          );
        })}
      </div>
      {lookLocked(look, state) && (
        <p className="look-note small">
          <Sprite name="lock" scale={2} /> That’s a star-shop item. Earn stars by hitting your daily goals{state ? ` (you have ${stars}★)` : ''}, then unlock it in the star shop.
        </p>
      )}
    </div>
  );
}

/** True when the look uses a star-shop part that hasn't been bought. */
export function lookLocked(look: Look, state?: Pick<GameState, 'cosmetics'>): boolean {
  const has = (kind: CosmeticKind, i: number) => {
    const c = cosmeticFor(kind, i);
    return !c || (!!state && owns(state, c.id));
  };
  return !has('hair', look.hair) || !has('accessory', look.accessory);
}

/** In-game: try looks on freely, then save. Star-shop parts must be bought first. */
export function LookChanger({ big = 6 }: { big?: number }) {
  const { state: s, dispatch } = useGame();
  const [draft, setDraft] = useState<Look>(s.look);
  const changed = JSON.stringify(draft) !== JSON.stringify(s.look);
  const locked = lookLocked(draft, s);
  return (
    <div className="look-changer">
      <LookEditor look={draft} onChange={setDraft} big={big} state={s} />
      <div className="look-actions">
        <Btn kind="go" disabled={!changed || locked} onClick={() => dispatch({ type: 'setLook', look: draft })} sfx="sparkle">
          Save my look
        </Btn>
        {changed && (
          <button type="button" className="link-btn" onClick={() => setDraft(s.look)}>
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
