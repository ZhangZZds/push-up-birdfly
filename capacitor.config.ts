import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.antigravity.pushupbird',
  appName: 'PushUp Bird',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;
