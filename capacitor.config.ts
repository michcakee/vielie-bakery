import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.michcakee.vieliebakery',
  appName: 'Vielie Bakery',
  webDir: 'dist',
  backgroundColor: '#f7e6c6',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#f7e6c6',
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
