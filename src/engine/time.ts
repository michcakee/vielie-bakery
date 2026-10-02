import { CONFIG } from '../data/catalog';

export function clockLabel(minutes: number): string {
  const total = CONFIG.openHour * 60 + Math.floor(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** 0 = morning, 1 = midday, 2 = late afternoon, 3 = evening, for lighting. */
export function lightPhase(minutes: number): number {
  if (minutes < 120) return 0;
  if (minutes < 420) return 1;
  if (minutes < 600) return 2;
  return 3;
}
