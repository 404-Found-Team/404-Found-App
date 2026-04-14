// Dynamic Expo config — extends app.json with values from the shared Backend/.env
// so all API keys live in one place, matching the backend's config.py pattern.
//
// For local builds:  keys are read from Backend/.env automatically.
// For EAS cloud builds: set GOOGLE_MAPS_API_KEY as an EAS secret instead
//   (the backend .env file won't be present on EAS servers).

const path = require('path');
const fs = require('fs');
const appJson = require('./app.json');

/**
 * Minimal .env parser — reads key=value lines from a file and sets any
 * missing keys on process.env (does not override values already set, so
 * EAS secrets always take precedence over the local file).
 */
function loadBackendEnv() {
  const envPath = path.resolve(__dirname, '../../Backend/.env');
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {
    // Backend/.env not present (EAS cloud build) — env vars come from EAS secrets.
  }
}

loadBackendEnv();

module.exports = ({ config }) => ({
  ...appJson.expo,
  ios: {
    ...appJson.expo.ios,
    config: {
      // Embeds the key in Info.plist at build time (required by Maps SDK for iOS)
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    ...appJson.expo.android,
    config: {
      googleMaps: {
        // Embeds the key in AndroidManifest.xml at build time (required by Maps SDK for Android)
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
});
