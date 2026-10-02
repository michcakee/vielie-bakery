import { PRODUCTS, PRODUCT_ORDER } from '../config/balance';
import type { ByProduct, InvestmentId, Weather } from '../game/types';
import { ProductArt } from './ProductArt';

export type SceneMode = 'morning' | 'baking' | 'evening';

interface Props {
  mode: SceneMode;
  weather: Weather;
  /** Units shown on the shelves for each product. */
  shelf: ByProduct<number>;
  /** 0–1 progress of the baking animation (trays fill as it rises). */
  progress?: number;
  customers: number;
  owned: InvestmentId[];
  greenScore: number;
  competitor: boolean;
  chalk: string;
}

const SKY: Record<SceneMode, Record<Weather, [string, string]>> = {
  morning: { sunny: ['#F6D9A0', '#FBEED2'], cloudy: ['#D8D6CC', '#ECE7DA'], rainy: ['#AEB6B0', '#D3D3CA'] },
  baking: { sunny: ['#F2C27E', '#F9E3B9'], cloudy: ['#CFC9B8', '#E6DFCC'], rainy: ['#9EA8A2', '#C8C8BE'] },
  evening: { sunny: ['#2E3B4E', '#C9845A'], cloudy: ['#38404A', '#8C8378'], rainy: ['#2B3236', '#5D6461'] },
};

/** Units represented by one illustrated item on the shelf. */
const PER_ICON = 6;
const MAX_ICONS = 9;

export function BakeryScene({ mode, weather, shelf, progress = 1, customers, owned, greenScore, competitor, chalk }: Props) {
  const [skyTop, skyBottom] = SKY[mode][weather];
  const lit = mode !== 'morning';
  const crowd = Math.min(mode === 'baking' ? 4 : 9, Math.round(customers / 22));
  const plants = greenScore >= 70 ? 3 : greenScore >= 50 ? 2 : greenScore >= 30 ? 1 : 0;
  // Sun arcs east → west through the trading day; baking progress drives it.
  const t = mode === 'morning' ? 0.12 : mode === 'baking' ? 0.12 + 0.76 * progress : 0.9;
  const sunX = 30 + 340 * t;
  const sunY = 34 - 20 * Math.sin(Math.PI * t);
  const cloudCount = weather === 'sunny' ? 2 : weather === 'cloudy' ? 4 : 5;
  const walkers = mode === 'baking' ? Math.min(6, Math.max(2, Math.round(customers / 30))) : 0;
  const label = `Vielie Bakery storefront, ${mode === 'evening' ? 'after closing' : mode === 'baking' ? 'ovens on' : 'morning'}, ${weather}. Shelves: ${PRODUCT_ORDER.map((p) => `${shelf[p]} ${PRODUCTS[p].shortName}`).join(', ')}.`;

  return (
    <svg className={`scene scene-${mode}`} viewBox="0 0 400 320" preserveAspectRatio="xMidYMax slice" role="img" aria-label={label}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBottom} />
        </linearGradient>
        <radialGradient id="glow" cx=".5" cy=".6" r=".7">
          <stop offset="0" stopColor="#FFE3A3" stopOpacity={lit ? 0.95 : 0.35} />
          <stop offset="1" stopColor="#F3D9A4" stopOpacity={lit ? 0.55 : 0.15} />
        </radialGradient>
        <pattern id="brick" width="22" height="12" patternUnits="userSpaceOnUse">
          <rect width="22" height="12" fill="#E9DFC8" />
          <path d="M0 11.5h22M11 0v6M0 6h22M0 0v0" stroke="#D7C9AA" strokeWidth="1" />
          <path d="M5 6v6M16 6v6" stroke="#D7C9AA" strokeWidth="1" />
        </pattern>
        <clipPath id="window">
          <rect x="62" y="150" width="190" height="108" rx="3" />
        </clipPath>
      </defs>

      <rect width="400" height="320" fill="url(#sky)" />
      {mode === 'evening' && (
        <g className="stars" fill="#F4EBD0">
          {[
            [40, 22],
            [96, 14],
            [150, 30],
            [214, 12],
            [262, 34],
            [318, 18],
            [380, 28],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.4 : 1} style={{ animationDelay: `${i * 0.37}s` }} />
          ))}
        </g>
      )}
      {mode !== 'evening' && weather !== 'rainy' && (
        <g className="sun" transform={`translate(${sunX} ${sunY})`}>
          <g className="sun-rays" stroke="#F7C65B" strokeWidth="2.4" strokeLinecap="round" opacity={weather === 'sunny' ? 0.8 : 0.4}>
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={i} x1="0" y1="-23" x2="0" y2="-29" transform={`rotate(${i * 45})`} />
            ))}
          </g>
          <circle r="17" fill="#F7C65B" opacity={weather === 'sunny' ? 0.95 : 0.6} />
        </g>
      )}
      {mode === 'evening' && <circle cx="350" cy="44" r="12" fill="#F4EBD0" opacity=".85" />}
      <g fill="#FBF7EC" opacity={weather === 'sunny' ? 0.6 : 0.8}>
        {Array.from({ length: cloudCount }).map((_, i) => (
          <g key={i} className="cloud" style={{ animationDuration: `${46 + i * 13}s`, animationDelay: `${-i * 17}s` }}>
            <g transform={`translate(0 ${18 + ((i * 23) % 44)}) scale(${0.7 + (i % 3) * 0.2})`}>
              <ellipse cx="0" cy="8" rx="38" ry="11" />
              <ellipse cx="22" cy="0" rx="22" ry="11" />
              <ellipse cx="-14" cy="2" rx="16" ry="9" />
            </g>
          </g>
        ))}
      </g>
      {mode !== 'evening' && weather === 'sunny' && (
        <g className="birds" fill="none" stroke="#2A2622" strokeWidth="1.3" strokeLinecap="round">
          <path className="bird" d="M0 0q4 -4 8 0q4 -4 8 0" />
          <path className="bird" d="M20 -10q3 -3 6 0q3 -3 6 0" style={{ animationDelay: '-0.4s' }} />
        </g>
      )}

      {/* Neighbouring competitor, appears in week 4 */}
      {competitor && (
        <g className="competitor">
          <rect x="336" y="120" width="70" height="170" fill="#C9BFAE" />
          <rect x="336" y="132" width="70" height="20" fill="#7A2A3A" />
          <text x="370" y="146" textAnchor="middle" className="scene-small">Crumb &amp; Co.</text>
          <rect x="346" y="168" width="44" height="60" fill="#E8E1D1" stroke="#8E8370" />
        </g>
      )}

      {/* Chimney: smoke rises while the ovens run */}
      <rect x="276" y="22" width="20" height="34" fill="#8C5A26" stroke="#2A2622" strokeWidth="2" />
      <rect x="272" y="18" width="28" height="7" fill="#5C3A17" stroke="#2A2622" strokeWidth="2" />
      {mode === 'baking' && (
        <g className="smoke" fill="#EDE6D6">
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx="286" cy="14" r="7" style={{ animationDelay: `${i * 0.6}s` }} />
          ))}
        </g>
      )}

      {/* Building */}
      <rect x="28" y="70" width="300" height="220" fill="url(#brick)" stroke="#2A2622" strokeWidth="2" />
      <path d="M20 70h316l-10-22H30z" fill="#1F3D2C" stroke="#2A2622" strokeWidth="2" />
      {owned.includes('solar') && (
        <g className="solar">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={70 + i * 52} y="50" width="46" height="14" fill="#2F4D6E" stroke="#C9D6E2" strokeWidth="1" transform="skewX(-14)" />
          ))}
        </g>
      )}

      {/* Sign */}
      <rect x="96" y="82" width="164" height="34" rx="3" fill="#FBF7EC" stroke="#2A2622" strokeWidth="2" />
      <text x="178" y="107" textAnchor="middle" className="scene-sign">Vielie Bakery</text>

      {/* Awning */}
      <g>
        <path d="M44 124h268l12 22H32z" fill="#FBF7EC" stroke="#2A2622" strokeWidth="2" />
        {Array.from({ length: 9 }).map((_, i) => (
          <path key={i} d={`M${46 + i * 30} 124h15l2 22h-19z`} fill="#1F3D2C" />
        ))}
        <path d={Array.from({ length: 12 }).map((_, i) => `M${32 + i * 24.3} 146q12 12 24.3 0`).join(' ')} fill="#FBF7EC" stroke="#2A2622" strokeWidth="1.6" />
      </g>

      {/* Window with shelves */}
      <rect x="58" y="146" width="198" height="116" fill="#2A2622" rx="4" />
      <rect x="62" y="150" width="190" height="108" fill="url(#glow)" rx="3" />
      <g clipPath="url(#window)">
        {lit && <ellipse cx="226" cy="246" rx="22" ry="10" fill="#F28C38" opacity=".35" className="oven-glow" />}
        {PRODUCT_ORDER.map((p, row) => {
          const y = 158 + row * 25;
          const shown = Math.min(MAX_ICONS, Math.ceil(shelf[p] / PER_ICON));
          const visible = Math.round(shown * progress);
          return (
            <g key={p}>
              <rect x="64" y={y + 18} width="186" height="3" fill="#8C5A26" />
              {Array.from({ length: visible }).map((_, i) => (
                <g key={i} transform={`translate(${68 + i * 20}, ${y})`} className="tray-item" style={{ animationDelay: `${i * 40}ms` }}>
                  <ProductArt id={p} size={20} />
                </g>
              ))}
            </g>
          );
        })}
      </g>
      <path d="M155 146v116" stroke="#2A2622" strokeWidth="3" />

      {/* Door */}
      <rect x="266" y="160" width="48" height="128" fill="#1F3D2C" stroke="#2A2622" strokeWidth="2" />
      <rect x="274" y="170" width="32" height="44" fill={lit ? '#FFE3A3' : '#E8DCC0'} opacity=".85" />
      <circle cx="306" cy="232" r="2.5" fill="#E9C58A" />
      <text x="290" y="196" textAnchor="middle" className="scene-tiny" fill="#2A2622">
        {mode === 'evening' ? 'Closed' : 'Open'}
      </text>

      {/* Chalkboard */}
      <g transform="translate(330 232)">
        <path d="M0 58l10-58h30l10 58" fill="none" stroke="#5C3A17" strokeWidth="3" />
        <rect x="4" y="2" width="42" height="34" fill="#2B3A33" stroke="#5C3A17" strokeWidth="2" />
        <text x="25" y="17" textAnchor="middle" className="scene-chalk">
          {chalk.slice(0, 9)}
        </text>
        <text x="25" y="29" textAnchor="middle" className="scene-chalk">
          {chalk.slice(9, 18)}
        </text>
      </g>

      {/* Ground and street */}
      <rect x="0" y="288" width="400" height="32" fill="#B9AE98" />
      <path d="M0 288h400" stroke="#2A2622" strokeWidth="2" />
      <path d="M0 304h400" stroke="#A39880" strokeDasharray="14 10" strokeWidth="2" />

      {/* Plant pots grow with the green score */}
      {Array.from({ length: plants }).map((_, i) => (
        <g key={i} transform={`translate(${40 + i * 20} 266)`}>
          <path d="M0 10h14l-2 12H2z" fill="#B87430" stroke="#2A2622" strokeWidth="1.2" />
          <path d="M7 10c-6-6-4-12 0-14 4 2 6 8 0 14zM7 10c4-6 9-6 11-4-2 4-6 5-11 4z" fill="#5F8F3A" />
        </g>
      ))}

      {owned.includes('compost') && (
        <g transform="translate(232 262)">
          <rect width="24" height="26" rx="2" fill="#5F8F3A" stroke="#2A2622" strokeWidth="1.5" />
          <path d="M6 9l6-4 6 4M12 5v14" stroke="#FBF7EC" strokeWidth="1.6" fill="none" />
        </g>
      )}
      {owned.includes('reusable') && (
        <g transform="translate(196 270)">
          <rect width="30" height="18" fill="#1F3D2C" stroke="#2A2622" strokeWidth="1.5" />
          <rect x="4" y="-10" width="22" height="12" fill="#5F8F3A" stroke="#2A2622" strokeWidth="1.5" />
        </g>
      )}

      {/* Customers queue */}
      <g className="crowd">
        {Array.from({ length: crowd }).map((_, i) => {
          const x = 20 + i * 34;
          const tone = ['#2A2622', '#5B544B', '#1F3D2C', '#B87430', '#7A2A3A'][i % 5];
          return (
            <g key={i} transform={`translate(${x} ${292 - (i % 2) * 2})`} className="person" style={{ animationDelay: `${i * 120}ms` }}>
              <circle cx="0" cy="-30" r="5.5" fill={tone} />
              <path d="M-7 0v-14c0-6 3-10 7-10s7 4 7 10V0z" fill={tone} />
              {weather === 'rainy' && <path d="M-11 -34q11 -12 22 0z" fill="#1F3D2C" />}
            </g>
          );
        })}
      </g>

      {/* Customers walking in while the shop is open */}
      <g className="walkers">
        {Array.from({ length: walkers }).map((_, i) => {
          const tone = ['#7A2A3A', '#1F3D2C', '#B87430', '#5B544B', '#2A2622', '#4F7D2D'][i % 6];
          return (
            <g key={i} className="walker" style={{ animationDelay: `${-(i * 2.6) / walkers}s` }}>
              <g transform="translate(0 290)" className="walker-body">
                <circle cx="0" cy="-30" r="5" fill={tone} />
                <path d="M-6 0v-13c0-6 3-9 6-9s6 3 6 9V0z" fill={tone} />
                <rect x="5" y="-14" width="6" height="7" rx="1" fill="#E9DFC8" stroke="#2A2622" strokeWidth=".8" />
                {weather === 'rainy' && <path d="M-10 -33q10 -11 20 0z" fill="#1F3D2C" />}
              </g>
            </g>
          );
        })}
      </g>

      {weather === 'rainy' && (
        <g className="rain" stroke="#5E6E70" strokeWidth="1.3" opacity=".55">
          {Array.from({ length: 34 }).map((_, i) => (
            <line key={i} x1={(i * 37) % 400} y1={(i * 53) % 280} x2={(i * 37) % 400 - 4} y2={((i * 53) % 280) + 12} />
          ))}
        </g>
      )}
    </svg>
  );
}
