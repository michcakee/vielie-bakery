# Credits

Everything in Viet Bake Shop, with where it came from and its licence. "UNKNOWN" means the licence could not be confirmed from a licence file.

## Game content

| What | Source | Licence / notes |
| --- | --- | --- |
| Design, writing, Vietnamese lines and translations | AI-generated (Claude) with michcakee | Owner's; **AI-generated** |
| Pixel art: sprites, characters, the bakery interior, the street, icons and splash screens | Drawn in code (`src/ui/pixel`, `scripts/make-icons.mjs`), AI-generated with michcakee | Owner's; **AI-generated**; no image files from elsewhere |
| Sound effects and the pentatonic music loop | Synthesised in code (`src/ui/audio.ts`), AI-generated | Owner's; **AI-generated**; no audio files |
| Staff applicant names Vy, Sang, Hieu, Yen Vy, Phuong Khanh, Vien | The owner's friends (first names) | Used with the owner's say-so |

## Fonts (self-hosted in `public/fonts`)

| Font | Author | Source | Licence |
| --- | --- | --- | --- |
| Be Vietnam Pro | Lam Bao, Tony Le and contributors | https://fonts.google.com/specimen/Be+Vietnam+Pro | SIL Open Font License 1.1 (`public/fonts/OFL.txt`) |
| VT323 | Peter Hull | https://fonts.google.com/specimen/VT323 | SIL Open Font License 1.1 (`public/fonts/OFL.txt`) |
| Cute Cubes | Archer Waynwood | https://www.fontget.com/font/cute-cubes/ | **UNKNOWN**: the page says "Free for Personal and Commercial Use", but the download contains no licence file |

## Code libraries

| Library | Use | Licence |
| --- | --- | --- |
| react, react-dom | UI | MIT |
| vite, @vitejs/plugin-react | build | MIT |
| typescript | language | Apache-2.0 |
| vitest | tests (not shipped) | MIT |
| @capacitor/core, @capacitor/app, @capacitor/status-bar, @capacitor/splash-screen | mobile shells | MIT |
| @capacitor/cli, @capacitor/android, @capacitor/ios | mobile build (not shipped in the web build) | MIT |
| AndroidX appcompat, coordinatorlayout, core-splashscreen (Android project) | Capacitor's template dependencies | Apache-2.0 |

No library requires attribution in the game beyond this file. No GPL/AGPL code.

## Things the game does not use

No analytics, ads, crash reporting, accounts, purchases, remote fonts or third-party image/audio files.
