/**
 * Character art: a 16×32 chibi with a big readable face.
 * Codes: o outline, s skin, S skin shade, b brow, e eye, W eye shine, c blush, m mouth,
 * t shirt, T shirt shade, a apron, A apron shade, p trousers, f shoes,
 * h hair, H hair shine, j hair shade, plus accessory colours (w white, E grey, r red, G helmet, n straw, y gold, k pink).
 * A '.' is see-through, so layers stack: back hair, body, front hair, accessory.
 */

const HEAD = [
  '................',
  '................',
  '.....oooooo.....',
  '...oossssssoo...',
  '..osssssssssso..',
  '.osssssssssssSo.',
  '.osssssssssssSo.',
  '.ossbbssssbbsSo.',
  '.ossWessssWesSo.',
  '.osseesssseesSo.',
  '.osccssssssccSo.',
  '..ossssmmsssSo..',
  '...oossssssoo...',
  '......oSSo......',
];

const TORSO = [
  '....ootwwtoo....',
  '..ootttwwtttoo..',
  '.otttattttattto.',
  '.otTtaaaaaatTto.',
  '.otTtaaaaaatTto.',
  '.otTtaAAAAatTto.',
  '.otTtaAaaAatTto.',
  '.osTtaAAAAatTso.',
  '.osoaaaaaaaaoso.',
  '..ooaaaaaaaaoo..',
  '....oAAAAAAo....',
  '....oppppppo....',
];

const LEGS_STAND = [
  '....oppooppo....',
  '....oppooppo....',
  '....offooffo....',
  '...offo..offo...',
  '...oooo..oooo...',
];

const LEGS_STEP = [
  '....oppooppo....',
  '....oppooffo....',
  '....offooooo....',
  '...offo.........',
  '...oooo.........',
];

/** Arms swing a little on the step frame: one hand forward (lower), one back (higher). */
const TORSO_STEP = TORSO.map((row, i) => {
  if (i === 7) return '.otTtaAAAAatTso.';
  if (i === 8) return '.osoaaaaaaaaoSo.';
  if (i === 9) return '.osoaaaaaaaaoo..';
  if (i === 10) return '..oooAAAAAAo....';
  return row;
});

export const BODY_STAND = [...HEAD, ...TORSO, ...LEGS_STAND];
export const BODY_STEP = [...HEAD, ...TORSO_STEP, ...LEGS_STEP];

/** Hair drawn over the face (index matches HAIR_STYLES). */
export const HAIR_FRONT: string[][] = [
  // Bob: soft fringe, sides to the chin
  [
    '................',
    '....oooooooo....',
    '...ohhHHhhhho...',
    '..ohHHhhhhhhho..',
    '.ohHhhhhhhhhhjo.',
    '.ohhhhhhhhhhhjo.',
    '.ohh.hh..hh.hjo.',
    '.oh..........jo.',
    '.oh..........jo.',
    '.oh..........jo.',
    '.ohh........jjo.',
    '.ohhj......jjjo.',
    '..ooo......ooo..',
  ],
  // Bun: hair pulled back into a top knot
  [
    '......oooo......',
    '.....ohHhjo.....',
    '...oooohjoooo...',
    '..ohHHhhhhhhho..',
    '.ohHhhhhhhhhhjo.',
    '.ohhhhh..hhhhjo.',
    '.oh..........jo.',
  ],
  // Short: side-swept fringe and sideburns
  [
    '................',
    '.....oooooo.....',
    '...oohHHhhhoo...',
    '..ohHhhhhhhhho..',
    '.ohhhhhhhhhhhjo.',
    '.ohhhhhhhhhhhjo.',
    '.ohhh.hhh.h..jo.',
    '.oh..........jo.',
  ],
  // Long: like the bob, but it falls over the shoulders
  [
    '................',
    '....oooooooo....',
    '...ohhHHhhhho...',
    '..ohHHhhhhhhho..',
    '.ohHhhhhhhhhhjo.',
    '.ohhhhhhhhhhhjo.',
    '.ohh.hh..hh.hjo.',
    '.oh..........jo.',
    '.oh..........jo.',
    '.oh..........jo.',
    '.ohh........jjo.',
    '.ohh........jjo.',
    '.ohho......ojjo.',
    '.ohho......ojjo.',
    '.ohho......ojjo.',
    '.ohho......ojjo.',
    '.ohho......ojjo.',
    '.ohho......ojjo.',
    '..oo........oo..',
  ],
];

/** Hair that sits behind the body: a little volume either side of the neck for long hair. */
export const HAIR_BACK: (string[] | null)[] = [
  null,
  null,
  null,
  ['', '', '', '', '', '', '', '', '', '', '', '', '', '.ojjo......ojjo.', '.ojjjo....ojjjo.', '.ojjjo....ojjjo.'],
];

/** Accessories (index matches ACCESSORY_NAMES). */
export const ACCESSORY_ART: string[][] = [
  [],
  // Glasses
  ['', '', '', '', '', '', '', '...oooo..oooo...', '...o..oooo..o...', '...o..o..o..o...', '...oooo..oooo...'],
  // Flower clip
  ['', '', '...........kk...', '..........kyk...', '...........kk...'],
  // Moto helmet
  [
    '....oooooooo....',
    '...oGGGGGGGGo...',
    '..oGGwGGGGGGGo..',
    '.oGGwGGGGGGGGGo.',
    '.oGGGGGGGGGGGGo.',
    'oooooooooooooooo',
    '.o............o.',
    '.o............o.',
  ],
  // Baker's hat
  ['....oooooooo....', '...owwwwwwwwo...', '..owwwwwwwwwwo..', '..owwwEwwwwwwo..', '...oEEEEEEEEo...'],
  // Headscarf
  [
    '................',
    '.....oooooo.....',
    '...oorrrrrroo...',
    '..orrrrwrrrrro..',
    '.orrrrrrrrrrrro.',
    '.orrrrrrrrrrrro.',
    '.or..........ro.',
    '.or..........ro.',
    '.or..........ro.',
    '.or..........ro.',
    '.oro........oro.',
  ],
  // Nón lá (conical straw hat)
  [
    '.......oo.......',
    '......onno......',
    '.....onnnno.....',
    '....onnyynno....',
    '...onnnnnnnno...',
    '..onnnnnnnnnno..',
    'oooooooooooooooo',
  ],
];
