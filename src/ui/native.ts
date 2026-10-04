import { Capacitor } from '@capacitor/core';
import { ON_ITCH } from '../lib/host';
import { handleBack } from './backButton';

/**
 * Platform glue. On the web: register the offline service worker.
 * Inside the Capacitor app: hardware back button, status bar and splash screen.
 * Everything is lazy-loaded so the web bundle doesn't pay for native plugins.
 */
export async function initPlatform() {
  if (!Capacitor.isNativePlatform()) {
    if ('serviceWorker' in navigator && import.meta.env.PROD && !ON_ITCH) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {
          /* offline support is a bonus; the game works without it */
        });
      });
    }
    return;
  }
  document.documentElement.classList.add('native');
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([import('@capacitor/app'), import('@capacitor/status-bar'), import('@capacitor/splash-screen')]);
  App.addListener('backButton', () => {
    if (!handleBack()) App.minimizeApp();
  });
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  if (Capacitor.getPlatform() === 'android') StatusBar.setBackgroundColor({ color: '#2f5d3a' }).catch(() => {});
  SplashScreen.hide().catch(() => {});
}
