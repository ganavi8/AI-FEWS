import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ganavi.aifews',
  appName: 'AI·FEWS',
  webDir: 'dist/client',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#071321',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#0b1928',
      style: 'DARK',
    },
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;

