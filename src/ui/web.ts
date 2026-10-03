import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useState } from 'react';

/**
 * Things only the website version has: a fullscreen button, an "install" prompt, and a
 * keyboard. The phone and tablet apps are always fullscreen and installed, so these stay hidden there.
 */
export const isNativeApp = () => Capacitor.isNativePlatform();

export const APP_VERSION = __APP_VERSION__;

/** True on a device with a keyboard and mouse, where keyboard hints are worth showing. */
export function hasKeyboard(): boolean {
  return typeof window !== 'undefined' && !isNativeApp() && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function useFullscreen(): { supported: boolean; on: boolean; toggle: () => void } {
  const supported = typeof document !== 'undefined' && !isNativeApp() && !!document.fullscreenEnabled;
  const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => {
    const change = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  const toggle = useCallback(() => {
    if (!supported) return;
    // Browsers only allow this from a click or key press; if it is refused, nothing changes.
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  }, [supported]);
  return { supported, on, toggle };
}

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let pendingInstall: InstallEvent | null = null;
const installListeners = new Set<() => void>();

/** Call once at start-up: remembers the browser's install offer until the player asks for it. */
export function watchInstallPrompt(): void {
  if (typeof window === 'undefined' || isNativeApp()) return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pendingInstall = e as InstallEvent;
    installListeners.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    pendingInstall = null;
    installListeners.forEach((f) => f());
  });
}

/** "Install game" for browsers that offer it (Chrome, Edge); null everywhere else. */
export function useInstall(): (() => void) | null {
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump((n) => n + 1);
    installListeners.add(f);
    return () => void installListeners.delete(f);
  }, []);
  if (!pendingInstall) return null;
  return () => {
    const e = pendingInstall;
    if (!e) return;
    void e.prompt().then(() => {
      pendingInstall = null;
      installListeners.forEach((f) => f());
    });
  };
}

/** True when the key press is headed for a text box, so shortcuts must leave it alone. */
export function typing(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}
