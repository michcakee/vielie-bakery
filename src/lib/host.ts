/**
 * True in the itch.io build (`npm run itch`). There the game runs inside itch's
 * player frame on its own domain, so a few web extras are left out: the offline
 * service worker, and the email restore link (it would open the game outside
 * itch, where this browser keeps a separate save).
 */
export const ON_ITCH = import.meta.env.MODE === 'itch';

/**
 * True when the game is shown inside another site's player frame (itch.io and
 * the like). Those frames usually can't scroll the page, so the game scrolls
 * inside its own box instead (`html.framed` in styles.css).
 */
export const FRAMED = (() => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

/** Back to the top of the game, whichever box is doing the scrolling. */
export function scrollPageTop() {
  window.scrollTo({ top: 0 });
  document.getElementById('root')?.scrollTo({ top: 0 });
}
