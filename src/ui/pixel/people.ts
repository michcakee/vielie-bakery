/**
 * Character art: a 16×26 chibi. The head fills the whole width and is as tall as the body,
 * the eyes are three pixels tall with a shine, and outlines are tinted (hair, skin and clothes
 * each get a darker shade of themselves) instead of one dark line.
 *
 * Codes: s skin, S skin shade, O skin outline, E lash, W eye shine, i iris, I light iris,
 * c blush, m mouth, t shirt, T shirt shade, u clothes outline, a apron, A apron shade,
 * p trousers, f shoes, o soft dark outline, h hair, H hair shine, j hair shade, J hair outline,
 * plus accessory colours (w white, e grey, r red, G helmet, n straw, y gold, k pink, b blue).
 * A '.' is see-through, so layers stack: body, hair, accessory.
 */

const HEAD = [
  '',
  '',
  '',
  '.....OOOOOO.....',
  '...OOssssssOO...',
  '..OssssssssssO..',
  '.OssssssssssssO.',
  '.OssssssssssssO.',
  '.OssssssssssssO.',
  '.OssEEssssEEssO.',
  '.OssWissssWissO.',
  '.OssiIssssiIssO.',
  '.OsccssmmssccsO.',
  '..OssssssssssO..',
  '...OOssssssOO...',
  '......OSSO......',
];

const TORSO = [
  '....uuwttwuu....',
  '...uttaaaattu...',
  '...utTaaaaTtu...',
  '...usTaAAaTsu...',
  '...uuuaaaauuu...',
  '....uaaaaaau....',
  '....uAAAAAAu....',
];

const LEGS_STAND = ['....oppooppo....', '...offo..offo...', '...oooo..oooo...'];
const LEGS_STEP = ['....oppooppo....', '...offo..oooo...', '...oooo.........'];

/** On the step frame one hand swings forward a pixel. */
const TORSO_STEP = TORSO.map((row, i) => (i === 3 ? '...uuTaAAaTsu...' : i === 4 ? '...usuaaaauuu...' : row));

export const BODY_STAND = [...HEAD, ...TORSO, ...LEGS_STAND];
export const BODY_STEP = [...HEAD, ...TORSO_STEP, ...LEGS_STEP];

const CAP = ['', '....JJJJJJJJ....', '..JJhhHHhhhhJJ..', '.JhhHHhhhhhhhhJ.', 'JhhHhhhhhhhhhhhJ', 'JhhhhhhhhhhhhhhJ', 'JhhhhhhhhhhhhhhJ', 'JhhhhhhhhhhhhhhJ', 'Jhhh.hhh.hhh.hhJ'];
const SIDES = ['Jh............hJ', 'Jh............hJ', 'Jh............hJ', 'Jh............hJ'];

/** Hair drawn over the head (index matches HAIR_STYLES). */
export const HAIR_FRONT: string[][] = [
  // Bob: jagged fringe, sides curl in at the chin
  [...CAP, ...SIDES, 'Jhh..........hhJ', 'Jhhj........jhhJ', '.JJJ........JJJ.'],
  // Bun: centre parting and a round top knot
  [
    '.....JJJJJJ.....',
    '....JhhHHhhJ....',
    '..JJJhhhhhhJJJ..',
    '.JhhHHhhhhhhhhJ.',
    'JhhHhhhhhhhhhhhJ',
    'JhhhhhhhhhhhhhhJ',
    'JhhhhhhhhhhhhhhJ',
    'Jhhhhhh..hhhhhhJ',
    'Jhhhh......hhhhJ',
    'Jh............hJ',
    '.J............J.',
  ],
  // Short: side-swept fringe
  [
    '',
    '',
    '...JJJJJJJJJJ...',
    '.JJhhHHhhhhhhJJ.',
    'JhhHHhhhhhhhhhhJ',
    'JhhhhhhhhhhhhhhJ',
    'JhhhhhhhhhhhhhhJ',
    'JhhhhhhhhhhhhhhJ',
    'Jhh.hhhhhhh...hJ',
    'Jh............hJ',
    '.J............J.',
  ],
  // Long: the bob, falling past the shoulders
  [...CAP, ...SIDES, ...SIDES, ...SIDES, 'Jh............hJ', '.JJ..........JJ.'],
  // Pigtails: tied with pink bands, swinging by the shoulders
  [...CAP, ...SIDES, 'JkJ..........JkJ', 'Jhh..........hhJ', 'Jhh..........hhJ', 'Jhh..........hhJ', 'Jhj..........jhJ', '.Jh..........hJ.', '..J..........J..'],
];

/** Accessories (index matches ACCESSORY_NAMES). */
export const ACCESSORY_ART: string[][] = [
  [],
  // Glasses
  ['', '', '', '', '', '', '', '', '...oooo..oooo...', '...o..o..o..o...', '...o..oooo..o...', '...o..o..o..o...', '...oooo..oooo...'],
  // Bow
  ['', '.........kk..kk.', '.........kkkkkk.', '.........kkykkk.', '.........kk..kk.'],
  // Moto helmet
  ['', '....GGGGGGGG....', '..GGGGwwGGGGGG..', '.GGGwwGGGGGGGGG.', 'GGGGGGGGGGGGGGGG', 'GGGGGGGGGGGGGGGG', 'oooooooooooooooo'],
  // Baker's hat
  ['...oooooooooo...', '..owwwwwwwwwwo..', '..owwwwwwwwwwo..', '..owwwewwewwwo..', '...oeeeeeeeeo...'],
  // Headscarf
  ['', '', '...rrrrrrrrrr...', '.rrrrrwrrrrrrrr.', 'rrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrr', 'rrr..........rrr', 'rr............rr'],
  // Nón lá (conical straw hat)
  ['.......nn.......', '.....nnnnnn.....', '...nnnnyynnnn...', '..nnnnnnnnnnnn..', 'nnnnnnnnnnnnnnnn', 'oooooooooooooooo'],
  // Headphones
  ['', '...bbbbbbbbbb...', '..bb........bb..', '.bb..........bb.', '', '', '', '', 'bb............bb', 'bbb..........bbb', 'bbb..........bbb', 'bb............bb'],
  // Heart clips
  ['', '', '.kk.kk..........', '.kkkkk..........', '..kkk...........', '...k............'],
];
