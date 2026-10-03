import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.michcakee.vietbakeshop',
  appName: 'Viet Bake Shop',
  webDir: 'dist',
  backgroundColor: '#d7ecca',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#d7ecca',
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#2f5d3a',
      overlaysWebView: false,
    },
  },
};

export default config;
