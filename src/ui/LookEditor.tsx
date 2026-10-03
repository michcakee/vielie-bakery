import type { Look } from '../engine/types';
import { play } from './audio';
import { APRONS, HAIR_COLORS, SHIRTS, SKINS } from './pixel/palette';
import { ACCESSORY_NAMES, HAIR_STYLES } from './pixel/render';
import { Person, Sprite } from './pixel/Sprite';

const ROWS: { key: keyof Look; label: string; count: number; names?: string[]; swatch?: string[] }[] = [
  { key: 'hair', label: 'Hairstyle', count: HAIR_STYLES.length, names: HAIR_STYLES },
  { key: 'hairColor', label: 'Hair colour', count: HAIR_COLORS.length, swatch: HAIR_COLORS },
  { key: 'skin', label: 'Skin tone', count: SKINS.length, swatch: SKINS },
  { key: 'shirt', label: 'Shirt', count: SHIRTS.length, swatch: SHIRTS },
  { key: 'apron', label: 'Apron', count: APRONS.length, swatch: APRONS },
  { key: 'accessory', label: 'Accessory', count: ACCESSORY_NAMES.length, names: ACCESSORY_NAMES },
];

export function LookEditor({ look, onChange, big = 8 }: { look: Look; onChange: (l: Look) => void; big?: number }) {
  const cycle = (key: keyof Look, count: number, d: number) => {
    play('click');
    onChange({ ...look, [key]: (((look[key] + d) % count) + count) % count });
  };
  return (
    <div className="look-editor">
      <div className="look-preview" aria-hidden="true">
        <Person look={look} scale={big} className="bob" />
        <span className="look-floor" />
      </div>
      <div className="look-rows">
        {ROWS.map((r) => (
          <div className="look-row" key={r.key} role="group" aria-label={r.label}>
            <span className="look-label">{r.label}</span>
            <button type="button" className="arrow-btn" aria-label={`Previous ${r.label.toLowerCase()}`} onClick={() => cycle(r.key, r.count, -1)}>
              <Sprite name="arrow" scale={2} className="flip-x" />
            </button>
            <span className="look-value" aria-live="polite">
              {r.swatch ? <span className="swatch" style={{ background: r.swatch[look[r.key] % r.count] }} /> : null}
              {r.names ? r.names[look[r.key] % r.count] : `${(look[r.key] % r.count) + 1} of ${r.count}`}
            </span>
            <button type="button" className="arrow-btn" aria-label={`Next ${r.label.toLowerCase()}`} onClick={() => cycle(r.key, r.count, 1)}>
              <Sprite name="arrow" scale={2} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
