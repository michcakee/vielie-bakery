/**
 * True in the itch.io build (`npm run itch`). There the game runs inside itch's
 * player frame on its own domain, so a few web extras are left out: the offline
 * service worker, and the email restore link (it would open the game outside
 * itch, where this browser keeps a separate save).
 */
export const ON_ITCH = import.meta.env.MODE === 'itch';
