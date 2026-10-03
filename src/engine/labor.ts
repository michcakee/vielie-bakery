import { DIFFICULTY, ECON } from '../data/config';
import { FRIENDS, ROLES, ROLE_ORDER, STAFF_NAMES, TRAIT_ORDER } from '../data/world';
import { CONFIG } from '../data/catalog';
import { has, productivity } from './economy';
import { rngFor } from './rng';
import { randomLook } from './look';
import { clamp, round2 } from './util';
import type { Applicant, Employee, GameState, RoleId } from './types';

/** The going hourly wage for a role and skill level in today's economy. */
export function marketWage(s: GameState, role: RoleId, skill = 3): number {
  const tight = s.macro.unemployment < 0.04 ? 1.08 : s.macro.unemployment > 0.07 ? 0.93 : 1;
  return round2(ROLES[role].wage * s.macro.wageIndex * tight * (0.85 + 0.05 * skill) * (DIFFICULTY[s.difficulty].wageMult ?? 1));
}

/** A fresh pool of job seekers each week; more of them when unemployment is high. */
export function weeklyApplicants(s: GameState): Applicant[] {
  const rand = rngFor(s.seed, s.day, 501);
  const n = Math.round(2 + s.macro.unemployment * 40 + rand() * 2);
  const out: Applicant[] = [];
  // Friends first: anyone not already on the team applies again, same look, same role.
  const onStaff = new Set(s.staff.map((e) => e.name));
  for (const f of FRIENDS) {
    if (onStaff.has(f.name)) continue;
    out.push({ id: s.nextId + out.length, name: f.name, role: f.role, wage: round2(marketWage(s, f.role, 3) * (0.97 + rand() * 0.08)), skill: 3, look: { ...f.look } });
  }
  if (!s.staff.some((e) => e.role === 'helper')) {
    const skill = 2 + Math.floor(rand() * 2);
    out.push({ id: s.nextId + out.length, name: 'Tí', role: 'helper', wage: round2(marketWage(s, 'helper', skill)), skill, look: { ...randomLook(rand), apron: 2 } });
  }
  for (let i = 0; i < n; i++) {
    const role = ROLE_ORDER[Math.floor(rand() * ROLE_ORDER.length)];
    const skill = 1 + Math.floor(rand() * rand() * 5);
    const ask = marketWage(s, role, skill) * (0.95 + rand() * 0.15);
    out.push({ id: s.nextId + out.length, name: STAFF_NAMES[Math.floor(rand() * STAFF_NAMES.length)], role, wage: round2(ask), skill, look: { ...randomLook(rand), apron: Math.floor(rand() * 5) } });
  }
  // Personalities come from their own random stream, so they never change who applies.
  const traitRand = rngFor(s.seed, s.day, 504);
  return out.map((a) => ({ ...a, trait: TRAIT_ORDER[Math.floor(traitRand() * TRAIT_ORDER.length)] }));
}

export function moraleTarget(s: GameState, e: Employee): number {
  let t = 60 + 120 * (e.wage / marketWage(s, e.role, e.skill) - 1);
  if (s.staff.some((x) => x.role === 'manager' && x.branch === e.branch && x.id !== e.id)) t += 10;
  if (s.daysInDistress > 0) t -= 20;
  return clamp(t, 5, 98);
}

/** Overnight: morale drifts toward its target, overwork wears people down. */
export function updateMorale(s: GameState, utilisation: number): Employee[] {
  return s.staff.map((e) => {
    let m = e.morale + 0.25 * (moraleTarget(s, e) - e.morale);
    if (utilisation > 0.85) m -= 2;
    return { ...e, morale: round2(clamp(m, 0, 100)) };
  });
}

export function quitters(s: GameState): Employee[] {
  const rand = rngFor(s.seed, s.day, 503);
  return s.staff.filter((e) => e.morale < ECON.labor.quitMorale && rand() < ECON.labor.quitChance);
}

/** What one more person in a role would add per day, for marginal decisions. */
export function hireValue(s: GameState, role: RoleId, skill = 3): { cost: number; adds: string; addsValue: number } {
  const cost = marketWage(s, role, skill) * ECON.labor.hoursPerShift * (1 + ECON.labor.payrollOverhead);
  const prod = productivity({ skill, morale: 70, trainingUntil: 0 }, s.day);
  const recent = s.history.slice(-7);
  const avgTicket = recent.length ? recent.reduce((t, h) => t + h.revenue, 0) / Math.max(1, recent.reduce((t, h) => t + h.served, 0)) : 5;
  const margin = 0.65;
  switch (role) {
    case 'baker': {
      const trays = (ECON.production.bakerTraysBase + ECON.production.bakerTraysPerSkill * skill) * prod * (has(s, 'mixer') ? ECON.production.mixerBoost : 1);
      return { cost, adds: `about ${trays.toFixed(1)} more trays a day (if your ovens have room)`, addsValue: trays * 8 * avgTicket * 0.6 * margin };
    }
    case 'helper': {
      // Serves anything, a bit slower: limited by everyone who gave up waiting.
      const lostAll = recent.length ? recent.reduce((t, h) => t + h.lostSlow, 0) / recent.length : 0;
      const saved = Math.min(lostAll, (CONFIG.dayMinutes / (ECON.service.staffMinutes.drink * 1.5)) * prod * 0.4);
      return { cost, adds: saved < 0.5 ? 'helps at the counter, but nobody gave up waiting lately' : `helps with any order: about ${saved.toFixed(0)} more happy customers a day`, addsValue: saved * avgTicket * margin };
    }
    case 'cashier':
    case 'barista':
    case 'cook': {
      const kind = role === 'cashier' ? 'tray' : role === 'barista' ? 'drink' : 'sandwich';
      const lostKind = recent.length ? recent.reduce((t, h) => t + (h.lostSlowKind?.[kind] ?? (h.lostSlow / 3)), 0) / recent.length : 0;
      // A helper can serve far more than this in a day; they're limited by how many people actually gave up.
      const saved = Math.min(lostKind, (CONFIG.dayMinutes / ECON.service.staffMinutes[kind]) * prod * 0.5);
      const what = kind === 'tray' ? 'pastries' : kind === 'drink' ? 'drinks' : 'bánh mì';
      return { cost, adds: saved < 0.5 ? `serves ${what}, but nobody waiting for ${what} gave up lately` : `serves ${what}: about ${saved.toFixed(0)} more happy customers a day`, addsValue: saved * avgTicket * margin };
    }
    case 'pastryChef':
      return { cost, adds: 'better trays (+quality, so higher prices hold) and a couple more trays a day', addsValue: 2 * 8 * avgTicket * 0.5 * margin + 20 };
    case 'delivery':
      return { cost, adds: has(s, 'bike') ? 'up to ~20 delivery orders a day' : 'nothing until you buy a delivery bike', addsValue: has(s, 'bike') ? 14 * avgTicket * margin : 0 };
    case 'manager':
      return { cost, adds: 'happier staff (+10 morale) and a shop that runs without you', addsValue: s.staff.length * 6 };
    case 'marketer':
      return { cost, adds: 'campaigns reach 30% more people and reputation rises a little each day', addsValue: 25 };
  }
}

export function makeEmployee(a: Applicant, day: number, branch: number | null = null): Employee {
  return { id: a.id, name: a.name, role: a.role, wage: a.wage, skill: a.skill, morale: 72, hiredDay: day, trainingUntil: 0, look: a.look, served: 0, branch, trait: a.trait };
}
