import { BAGUETTE, INGREDIENTS, PRODUCTS } from '../data/catalog';
import { ECON } from '../data/config';
import { LOCATIONS } from '../data/world';
import { addBooks, emptyBooks } from './accounting';
import { acceptance, marketTraffic, onMenu, productAppeal, productivity, segmentMix, wages } from './economy';
import { gaussian, rngFor } from './rng';
import { clamp } from './util';
import type { Books, Branch, GameState, LocationId, ProductId } from './types';

/** Run a branch for a day with the same demand equations as the flagship, at product level. */
export function simulateBranch(s: GameState, b: Branch): { branch: Branch; books: Books; served: number; lost: number } {
  const rand = rngFor(s.seed, s.day, 900 + b.id);
  const view: GameState = { ...s, location: b.location, reputation: b.reputation };
  const menu = onMenu(s);
  const mix = segmentMix(view, b.location);
  const team = s.staff.filter((e) => e.branch === b.id);
  const prod = (role: string) => team.filter((e) => e.role === role).reduce((t, e) => t + productivity(e, s.day), 0);
  const manager = team.some((e) => e.role === 'manager');
  const traffic = marketTraffic(view, b.location) * (0.72 + 0.56 * (b.reputation / 100)) * (manager ? 1 : 0.8);
  const appealTotal = menu.reduce((t, p) => t + productAppeal(view, p, mix), 0) || 1;
  const capacity = {
    tray: 260 * prod('cashier') + 40,
    drink: 200 * prod('barista') + 20,
    sandwich: 170 * prod('cook') + 20,
  };
  const trays = Math.floor((ECON.production.bakerTraysBase + 3 * prod('baker')) * 2) + b.trays;
  let traysLeft = trays;
  let books = emptyBooks();
  let served = 0;
  let lost = 0;
  for (const p of menu) {
    const def = PRODUCTS[p];
    const want = traffic * (productAppeal(view, p, mix) / appealTotal);
    const demand = Math.max(0, want * acceptance(view, p, s.prices[p], b.quality) * (1 + 0.15 * gaussian(rand)));
    let supply = demand;
    if (def.kind === 'tray') {
      const needTrays = Math.ceil((demand * 1.05) / def.yield);
      const used = Math.min(needTrays, traysLeft);
      traysLeft -= used;
      supply = used * def.yield;
    }
    const cap = capacity[def.kind];
    const sold = Math.max(0, Math.floor(Math.min(demand, supply, cap)));
    capacity[def.kind] -= sold;
    lost += Math.max(0, Math.round(demand - sold));
    served += sold;
    const unitIng = (Object.entries(def.recipe) as [keyof typeof INGREDIENTS, number][]).reduce((t, [id, n]) => t + n * (INGREDIENTS[id].price / INGREDIENTS[id].pack) * s.market.prices[id], 0) / def.yield + (p === 'banhMi' ? (3 * INGREDIENTS.flour.price * s.market.prices.flour) / INGREDIENTS.flour.pack / BAGUETTE.yield : 0);
    const made = def.kind === 'tray' ? supply : sold;
    const revenue = sold * s.prices[p];
    const pack = sold * 0.15 * s.macro.priceIndex;
    books = addBooks(books, {
      sales: revenue,
      cogs: sold * unitIng,
      packaging: pack,
      waste: Math.max(0, made - sold) * unitIng,
      cashSales: revenue,
      cashInventory: -made * unitIng,
      cashOperatingOther: -pack,
    });
  }
  const rent = LOCATIONS[b.location].rent * s.macro.rentIndex;
  const pay = wages(s, b.id);
  const utilities = (ECON.costs.utilitiesBase + ECON.costs.utilitiesPerTray * (trays - traysLeft)) * s.macro.priceIndex;
  const dep = b.fitOut / (ECON.finance.depreciationYears.building * 360);
  books = addBooks(books, { rent, wages: pay, utilities, depreciation: dep, cashRent: -rent, cashWages: -pay, cashOperatingOther: -utilities });
  const revenue = books.sales;
  const profit = revenue - books.cogs - books.packaging - books.waste - rent - pay - utilities - dep;
  const repDrift = served > 0 ? (lost / Math.max(1, served + lost) < 0.15 ? 0.15 : -0.2) : -0.3;
  return {
    branch: { ...b, reputation: clamp(b.reputation + repDrift, 10, 95), lastRevenue: revenue, lastProfit: profit, lastServed: served, lastLost: lost, fitOut: Math.max(0, b.fitOut - dep) },
    books,
    served,
    lost,
  };
}

export function branchFitOut(location: LocationId): { fitOut: number; deposit: number } {
  return { fitOut: LOCATIONS[location].fitOut, deposit: LOCATIONS[location].deposit };
}

export function branchesFor(s: GameState): Branch[] {
  return s.branches.filter((b) => !b.closed);
}

export const ALL_MENU: ProductId[] = ['banhMi', 'caPhe', 'flan'];
