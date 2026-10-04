import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE, type Transaction } from '@capgo/native-purchases';
import { DIAMOND_PACKS, packFor } from '../data/dream';
import { loadWallet, saveWallet } from '../engine/save';

/**
 * Diamond packs are consumable in-app purchases, sold only in the iOS app (the website never sells
 * anything). Every App Store transaction is credited once: its id goes into the device wallet before
 * the transaction is finished, so a crash, a retry or a second notice can't count it twice.
 */
export const canBuy = () => Capacitor.getPlatform() === 'ios';

/** Local prices from the App Store, by product id. Empty if the store can't be reached. */
export async function storePrices(): Promise<Record<string, string>> {
  if (!canBuy()) return {};
  try {
    const { products } = await NativePurchases.getProducts({ productIdentifiers: DIAMOND_PACKS.map((p) => p.product), productType: PURCHASE_TYPE.INAPP });
    return Object.fromEntries(products.filter((p) => p?.identifier && p.priceString).map((p) => [p.identifier, p.priceString]));
  } catch (e) {
    console.warn('[vietbakeshop] store prices unavailable', e);
    return {};
  }
}

/** Turns one App Store transaction into diamonds (once), then tells the store it's delivered. Returns the diamonds added. */
async function credit(t: Transaction, give: (n: number) => void): Promise<number> {
  const pack = packFor(t.productIdentifier);
  const id = t.transactionId;
  if (!pack || !id) return 0;
  const w = loadWallet() ?? { diamonds: 0, dreamTeam: [], credited: [] };
  let n = 0;
  if (!w.credited.includes(id)) {
    n = pack.diamonds * Math.max(1, t.quantity ?? 1);
    saveWallet({ ...w, diamonds: w.diamonds + n, credited: [...w.credited, id] });
    give(n);
  }
  try {
    await NativePurchases.acknowledgePurchase({ purchaseToken: id });
  } catch (e) {
    // Already finished, or the store is busy: StoreKit offers it again later and the id check above keeps it from counting twice.
    console.warn('[vietbakeshop] finishing a purchase failed', e);
  }
  return n;
}

export type BuyResult = { ok: true; diamonds: number } | { ok: false; cancelled: boolean; message: string };

export async function buyPack(product: string, give: (n: number) => void): Promise<BuyResult> {
  if (!canBuy() || !packFor(product)) return { ok: false, cancelled: false, message: 'Diamonds can only be bought in the iPhone and iPad app.' };
  try {
    const t = await NativePurchases.purchaseProduct({ productIdentifier: product, productType: PURCHASE_TYPE.INAPP, quantity: 1, autoAcknowledgePurchases: false });
    const n = await credit(t, give);
    return { ok: true, diamonds: n };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const cancelled = /cancel/i.test(message);
    return { ok: false, cancelled, message: cancelled ? 'Purchase cancelled. Nothing was charged.' : /pending|deferred|ask to buy/i.test(message) ? 'Waiting for approval. The diamonds arrive as soon as it’s approved.' : 'The App Store couldn’t finish the purchase. Nothing was charged; please try again.' };
  }
}

/**
 * Purchases that finished while the game wasn't looking (approved by a parent later, interrupted by a
 * crash) arrive here, on launch or any time after. Returns a function that stops listening.
 */
export function listenForPurchases(give: (n: number) => void): () => void {
  if (!canBuy()) return () => undefined;
  let stop = () => undefined as void;
  let stopped = false;
  NativePurchases.addListener('transactionUpdated', (t) => void credit(t, give))
    .then((h) => {
      stop = () => void h.remove();
      if (stopped) stop();
    })
    .catch((e) => console.warn('[vietbakeshop] purchase listener failed', e));
  return () => {
    stopped = true;
    stop();
  };
}
