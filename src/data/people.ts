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
  /** What they say after a great / okay / bad order. */
  reactions?: { great: string[]; ok: string[]; bad: string[] };
  /** Grades harder, pays more, and tells the neighbourhood. */
  critic?: boolean;
}

export const REGULARS: RegularDef[] = [
  {
    id: 'linh',
    name: 'Office Worker',
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
    hello: "Quick please, I'm late!",
    reactions: { great: ['So fast! Thanks!', 'Just what I needed!'], ok: ['Ok, I’m off.'], bad: ['I’m late for my meeting…'] },
  },
  {
    id: 'minh',
    name: 'Coffee Fan',
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
    hello: 'The usual!',
  },
  {
    id: 'baTu',
    name: 'Grandma Next Door',
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
    hello: 'Hello, dear!',
  },
  {
    id: 'nam',
    name: 'Student',
    role: 'University student',
    favorite: ['banhMi', 'traTac'],
    personality: 'Price sensitive',
    behavior: 'Watches every coin. Loves a discount.',
    budget: 0.82,
    patience: 1,
    frequency: 0.6,
    eco: false,
    time: 1,
    look: { skin: 3, hair: 2, hairColor: 0, shirt: 1, apron: -1, accessory: 0 },
    level: 1,
    hello: 'Any discounts today?',
  },
  {
    id: 'mai',
    name: 'Eco Volunteer',
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
    hello: 'I brought my own cup!',
  },
  {
    id: 'hung',
    name: 'Motorbike Driver',
    role: 'Motorbike taxi driver',
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
    hello: 'One black iced… no wait, with milk!',
  },
  {
    id: 'hanh',
    name: 'Mum & Daughter',
    role: 'Mum and daughter',
    favorite: ['banhChuoi', 'flan'],
    personality: 'Sweet tooth',
    behavior: 'Stop by after school. The little one picks.',
    budget: 1.1,
    patience: 0.9,
    frequency: 0.5,
    eco: false,
    time: 2,
    look: { skin: 1, hair: 3, hairColor: 1, shirt: 7, apron: -1, accessory: 0 },
    level: 3,
    hello: 'Little Na wants cake!',
  },
  {
    id: 'an',
    name: 'Party Planner',
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
    hello: "It's my friend's birthday today!",
    reactions: { great: ['My friend is going to love this!', 'Pretty as the picture!'], ok: ['It’ll do, let me see.'], bad: ['The party is tonight…'] },
  },
  {
    id: 'ngoc',
    name: 'Food Critic',
    role: 'Food critic',
    favorite: ['banhBo', 'banhKem', 'flan', 'caPhe'],
    personality: 'Exacting',
    behavior: 'Comes late, orders the hardest thing on the menu, and writes it up. Grades harder; pays more.',
    budget: 1.5,
    patience: 0.75,
    frequency: 0.3,
    eco: false,
    time: 2,
    look: { skin: 1, hair: 1, hairColor: 6, shirt: 5, apron: -1, accessory: 1 },
    level: 2,
    hello: 'Give me the hardest thing you make.',
    critic: true,
    reactions: { great: ['I will write about this place.', 'I rarely say this: perfect.'], ok: ['Fine. Not worth writing up.'], bad: ['I won’t mention this. This time.', 'Too slow for this price.'] },
  },
];

/** Your very first customer. He likes the place so much he later asks for a job. */
export const KEVIN = {
  id: 'kevin',
  name: 'Kevin Nguyen',
  look: { skin: 1, hair: 2, hairColor: 0, shirt: 3, apron: 2, accessory: 0 } as Look,
  hello: 'Is it true? The bakery is open again?',
  thanks: 'Best thing I’ve eaten all week! If you ever need a hand in here, call me.',
};

/** Walk-in customers are known by what they do, not by a name. */
export const WALKIN_NAMES = [
  'Jogger', 'Teacher', 'Nurse', 'Painter', 'Bus Driver', 'Gardener', 'Florist', 'Tailor', 'Mechanic', 'Librarian', 'Musician', 'Tourist', 'Mail Carrier', 'Dog Walker', 'Cyclist', 'Shopkeeper',
  'Farmer', 'Artist', 'Dancer', 'Singer', 'Chef', 'Doctor', 'Builder', 'Barber', 'Photographer', 'Vet', 'Pilot', 'Firefighter', 'Neighbour', 'Fisher',
];

export const LINES = {
  order: (dish: string) => [`One ${dish}, please!`, `Could I get a ${dish}?`, `${dish}, thanks!`],
  love: ['So delicious!', 'Wonderful!', 'I’ll take another one!'],
  happy: ['Thank you!', 'Tasty!', 'Have a nice day!'],
  ok: ['It’s okay.', 'Hm, fine.'],
  pricey: ['Too expensive…', 'A bit pricey…'],
  specialOrder: ['A big order, please!', 'For my whole office!'],
  soldOut: ['Sold out already…', 'What a shame…'],
  slow: ['Taking too long…', 'Never mind, I’m off.'],
  substitute: (dish: string) => `Then I’ll have ${dish}.`,
  tet: ['Happy New Year!', 'Peace and prosperity!'],
};
