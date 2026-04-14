import Constants from 'expo-constants';

/**
 * Resolve the correct backend base URL for the current runtime environment.
 *
 * Problem: `localhost` on a physical device refers to the *phone* itself,
 * not your Mac.  Expo's dev server knows the Mac's LAN IP and exposes it in
 * Constants.expoConfig.hostUri (e.g. "192.168.1.42:8081").  We strip the
 * port and use that IP for the backend (port 8000) instead.
 *
 * Simulator: hostUri is "127.0.0.1:8081" → localhost still works.
 * Physical device (Expo Go): hostUri is "192.168.x.y:8081" → correct LAN IP.
 * Production build: falls back to an environment variable or placeholder.
 */
function resolveApiBaseUrl() {
  if (__DEV__) {
    // Expo SDK 49+: hostUri lives in expoConfig
    const hostUri =
      Constants.expoConfig?.hostUri ??
      // Older SDK fallback
      Constants.manifest?.debuggerHost ??
      '127.0.0.1:8081';

    const host = hostUri.split(':')[0];
    return `http://${host}:8000/api/v1`;
  }

  // For a production build, point at your real server:
  return 'https://api.404found.app/api/v1';
}

export const API_BASE_URL = resolveApiBaseUrl();
