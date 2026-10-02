import { ECON } from '../data/config';

const { daysPerMonth, monthsPerYear, startYearDay } = ECON.calendar;
export const YEAR_DAYS = daysPerMonth * monthsPerYear;

export const MONTH_NAMES = ['Tháng Giêng', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu', 'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Chạp'];

export type Season = 'cool' | 'warm' | 'hot' | 'rainy';

export interface GameDate {
  day: number;
  year: number;
  month: number;
  dom: number;
  yearDay: number;
  weekday: number;
  season: Season;
  monthName: string;
}

export function dateOf(day: number): GameDate {
  const offset = startYearDay - 1 + day - 1;
  const yearDay = (offset % YEAR_DAYS) + 1;
  const year = Math.floor(offset / YEAR_DAYS) + 1;
  const month = Math.ceil(yearDay / daysPerMonth);
  const dom = yearDay - (month - 1) * daysPerMonth;
  return { day, year, month, dom, yearDay, weekday: (day - 1) % 7, season: seasonOf(month), monthName: MONTH_NAMES[month - 1] };
}

export function seasonOf(month: number): Season {
  if (month <= 2 || month >= 11) return 'cool';
  if (month <= 4) return 'warm';
  if (month <= 7) return 'hot';
  return 'rainy';
}

/** First day of a game month (the day rent and loan payments are due). */
export const isMonthStart = (day: number) => dateOf(day).dom === 1;
export const isMonthEnd = (day: number) => dateOf(day).dom === daysPerMonth;
export const isYearStart = (day: number) => dateOf(day).yearDay === 1;

export type Festival = 'tet' | 'preTet' | 'ramGieng' | 'vuLan' | 'trungThu' | 'nightMarket';

export const FESTIVALS: Record<Festival, { name: string; vi: string; blurb: string }> = {
  preTet: { name: 'Tết shopping', vi: 'Sắm Tết', blurb: 'Families buy gift boxes and stock up before the New Year.' },
  tet: { name: 'Tết', vi: 'Tết Nguyên Đán', blurb: 'Lunar New Year: big spending, gifts, family visits.' },
  ramGieng: { name: 'Full moon of the first month', vi: 'Rằm tháng Giêng', blurb: 'Temple visits and sweet offerings.' },
  vuLan: { name: 'Vu Lan', vi: 'Lễ Vu Lan', blurb: 'A festival for parents: families eat together, many go vegetarian.' },
  trungThu: { name: 'Mid-Autumn Festival', vi: 'Tết Trung Thu', blurb: 'Mooncakes, lanterns and children\'s parades.' },
  nightMarket: { name: 'Summer night market', vi: 'Chợ đêm', blurb: 'The street fills with stalls and late-night crowds.' },
};

export function festivalsOn(day: number): Festival[] {
  const d = dateOf(day);
  const out: Festival[] = [];
  if (d.month === 12 && d.dom >= 18) out.push('preTet');
  if (d.month === 1 && d.dom <= 5) out.push('tet');
  if (d.month === 1 && d.dom === 15) out.push('ramGieng');
  if (d.month === 7 && d.dom >= 13 && d.dom <= 15) out.push('vuLan');
  if (d.month === 8 && d.dom <= 15) out.push('trungThu');
  if ((d.month === 5 || d.month === 6) && d.weekday >= 4) out.push('nightMarket');
  return out;
}

export const isTetDay = (day: number) => festivalsOn(day).includes('tet');
export const giftSeason = (day: number) => festivalsOn(day).some((f) => f === 'tet' || f === 'preTet');
export const mooncakeSeason = (day: number) => festivalsOn(day).includes('trungThu');

export function dateLabel(day: number): string {
  const d = dateOf(day);
  return `Year ${d.year} · ${d.monthName} ${d.dom}`;
}

/** Days until the next occurrence of a festival, within a year. */
export function daysUntil(day: number, f: Festival): number | null {
  for (let i = 0; i <= YEAR_DAYS; i++) if (festivalsOn(day + i).includes(f)) return i;
  return null;
}
