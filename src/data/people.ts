import type { Look, ProductId } from '../engine/types';

export interface RegularDef {
  id: string;
  name: string;
  role: string;
  favorite: ProductId[];
  personality: string;
  behavior: string;
  budget: number;
  patience: number;
  frequency: number;
  eco: boolean;
  /** Preferred part of the day: 0 morning rush, 1 lunch, 2 afternoon, 3 evening. */
  time: 0 | 1 | 2 | 3;
  look: Look;
  level: number;
  hello: string;
  helloEn: string;
}

export const REGULARS: RegularDef[] = [
  {
    id: 'linh',
    name: 'Linh',
    role: 'Office worker',
    favorite: ['banhMi', 'caPhe'],
    personality: 'Busy',
    behavior: 'Always in a hurry. Serve her fast.',
    budget: 1.15,
    patience: 0.6,
    frequency: 0.75,
    eco: false,
    time: 0,
    look: { skin: 1, hair: 0, hairColor: 0, shirt: 4, apron: -1, accessory: 1 },
    level: 1,
    hello: 'Nhanh nhé, mình trễ rồi!',
    helloEn: "Quick please, I'm late!",
  },
  {
    id: 'minh',
    name: 'Minh',
    role: 'Coffee enthusiast',
    favorite: ['caPhe'],
    personality: 'Chatty',
    behavior: 'Comes back every morning if the coffee is good.',
    budget: 1.2,
    patience: 1.1,
    frequency: 0.85,
    eco: false,
    time: 0,
    look: { skin: 2, hair: 2, hairColor: 1, shirt: 2, apron: -1, accessory: 0 },
    level: 1,
    hello: 'Như mọi khi nhé!',
    helloEn: 'The usual!',
  },
  {
    id: 'baTu',
    name: 'Bà Tư',
    role: 'Grandmother next door',
    favorite: ['flan', 'banhBo'],
    personality: 'Patient',
    behavior: 'Notices quality. Tells the whole street.',
    budget: 1.05,
    patience: 1.8,
    frequency: 0.55,
    eco: false,
    time: 0,
    look: { skin: 1, hair: 1, hairColor: 6, shirt: 6, apron: -1, accessory: 0 },
    level: 1,
    hello: 'Chào con!',
    helloEn: 'Hello, dear!',
  },
  {
    id: 'nam',
    name: 'Nam',
    role: 'University student',
    favorite: ['banhMi', 'traTac'],
    personality: 'Price sensitive',
    behavior: 'Watches every đồng. Loves a discount.',
    budget: 0.82,
    patience: 1,
    frequency: 0.6,
    eco: false,
    time: 1,
    look: { skin: 3, hair: 2, hairColor: 0, shirt: 1, apron: -1, accessory: 0 },
    level: 1,
    hello: 'Có giảm giá không anh chị?',
    helloEn: 'Any discounts today?',
  },
  {
    id: 'mai',
    name: 'Mai',
    role: 'Environmental volunteer',
    favorite: ['traTac', 'banhChuoi'],
    personality: 'Eco-conscious',
    behavior: 'Pays more when your bakery is green.',
    budget: 1.1,
    patience: 1.1,
    frequency: 0.55,
    eco: true,
    time: 2,
    look: { skin: 0, hair: 3, hairColor: 2, shirt: 3, apron: -1, accessory: 2 },
    level: 2,
    hello: 'Mình mang ly riêng nè!',
    helloEn: 'I brought my own cup!',
  },
  {
    id: 'hung',
    name: 'Chú Hùng',
    role: 'Xe ôm driver',
    favorite: ['caPhe', 'pateChaud'],
    personality: 'Easygoing',
    behavior: 'Parks his motorbike outside and stays a while.',
    budget: 1,
    patience: 1.3,
    frequency: 0.6,
    eco: false,
    time: 0,
    look: { skin: 3, hair: 2, hairColor: 0, shirt: 5, apron: -1, accessory: 3 },
    level: 2,
    hello: 'Một ly đen đá... à không, sữa đá!',
    helloEn: 'One black iced… no wait, with milk!',
  },
  {
    id: 'hanh',
    name: 'Chị Hạnh & bé Na',
    role: 'Mum and daughter',
    favorite: ['banhChuoi', 'flan'],
    personality: 'Sweet tooth',
    behavior: 'Stop by after school. Bé Na picks.',
    budget: 1.1,
    patience: 0.9,
    frequency: 0.5,
    eco: false,
    time: 2,
    look: { skin: 1, hair: 3, hairColor: 1, shirt: 7, apron: -1, accessory: 0 },
    level: 3,
    hello: 'Bé Na muốn ăn bánh!',
    helloEn: 'Little Na wants cake!',
  },
  {
    id: 'an',
    name: 'An',
    role: 'Party planner',
    favorite: ['banhKem'],
    personality: 'Celebration shopper',
    behavior: 'Spends big for birthdays and holidays.',
    budget: 1.6,
    patience: 1.2,
    frequency: 0.35,
    eco: false,
    time: 3,
    look: { skin: 2, hair: 0, hairColor: 4, shirt: 0, apron: -1, accessory: 2 },
    level: 4,
    hello: 'Hôm nay sinh nhật bạn mình!',
    helloEn: "It's my friend's birthday today!",
  },
];

export const WALKIN_NAMES = [
  'Tuấn', 'Hương', 'Phúc', 'Vy', 'Bảo', 'Trang', 'Duy', 'Ngọc', 'Quân', 'Hà', 'Long', 'Thu', 'Khoa', 'Lan', 'Đạt', 'Yến',
  'Hiếu', 'My', 'Sơn', 'Thảo', 'Tâm', 'Nhi', 'Kiên', 'Oanh', 'Vinh', 'Châu', 'Phương', 'Tín', 'Hoa', 'Việt',
];

export const LINES = {
  order: (dish: string) => [`Cho mình một ${dish}!`, `Một ${dish} nhé!`, `${dish}, cảm ơn!`],
  love: ['Ngon quá!', 'Tuyệt vời!', 'Cho mình thêm một cái!'],
  happy: ['Cảm ơn!', 'Ngon!', 'Chúc một ngày tốt lành!'],
  ok: ['Cũng được.', 'Ừm, ổn.'],
  pricey: ['Đắt quá…', 'Hơi mắc…'],
  soldOut: ['Hết rồi à…', 'Tiếc quá…'],
  slow: ['Lâu quá…', 'Thôi, mình đi đây.'],
  substitute: (dish: string) => `Vậy cho mình ${dish} nhé.`,
  tet: ['Chúc mừng năm mới!', 'An khang thịnh vượng!'],
};

export const TRANSLATIONS: Record<string, string> = {
  'Ngon quá!': 'So delicious!',
  'Tuyệt vời!': 'Wonderful!',
  'Cho mình thêm một cái!': "I'll take another one!",
  'Cảm ơn!': 'Thank you!',
  'Ngon!': 'Tasty!',
  'Chúc một ngày tốt lành!': 'Have a nice day!',
  'Cũng được.': "It's okay.",
  'Ừm, ổn.': 'Hm, fine.',
  'Đắt quá…': 'Too expensive…',
  'Hơi mắc…': 'A bit pricey…',
  'Hết rồi à…': 'Sold out already…',
  'Tiếc quá…': "What a shame…",
  'Lâu quá…': 'Taking too long…',
  'Thôi, mình đi đây.': "Never mind, I'm off.",
  'Chúc mừng năm mới!': 'Happy New Year!',
  'An khang thịnh vượng!': 'Peace and prosperity!',
};

export function translate(line: string | undefined): string | undefined {
  if (!line) return undefined;
  if (TRANSLATIONS[line]) return TRANSLATIONS[line];
  if (line.startsWith('Cho mình một ')) return `One ${line.slice(13, -1)}, please!`;
  if (line.startsWith('Một ')) return `One ${line.slice(4, -5)}, please!`;
  if (line.endsWith(', cảm ơn!')) return `${line.slice(0, -9)}, thanks!`;
  if (line.startsWith('Vậy cho mình ')) return `Then I'll have ${line.slice(13, -5)}.`;
  for (const r of REGULARS) if (r.hello === line) return r.helloEn;
  return undefined;
}
