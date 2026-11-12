import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native iOS shell. The web app in `dist/` is bundled into the app and served
 * from capacitor://localhost, so it works fully offline with no server.
 * Run `npm run ios` to build the web app, sync it and open Xcode.
 */
const config: CapacitorConfig = {
  appId: 'com.shijaykj.forgetrack',
  appName: 'ForgeTrack',
  webDir: 'dist',
  backgroundColor: '#08090b',
  ios: {
    contentInset: 'never',
    backgroundColor: '#08090b',
    scheme: 'ForgeTrack',
    // Keep the WebView from rubber-banding the whole page; scroll areas still scroll.
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      launchFadeOutDuration: 200,
      backgroundColor: '#08090b',
      showSpinner: false,
    },
    LocalNotifications: {
      // In the foreground the app plays its own chime + haptic, so iOS stays quiet.
      presentationOptions: [],
    },
  },
};

export default config;
