/**
 * A tiny back-button stack shared by the web (Escape key / browser back) and Android (hardware back).
 * Handlers return true when they consumed the press; the newest handler runs first.
 */
type Handler = () => boolean;
const stack: Handler[] = [];

export function onBack(h: Handler): () => void {
  stack.push(h);
  return () => {
    const i = stack.lastIndexOf(h);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Run handlers newest-first. Returns true if something handled it. */
export function handleBack(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i]()) return true;
  return false;
}
