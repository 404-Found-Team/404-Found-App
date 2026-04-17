import axios from 'axios';
import { API_BASE_URL } from '../constants/api';

// ── Geocoding & Autosuggest ────────────────────────────────────────────────────

/**
 * Convert a place name / address to { lat, lng, label }.
 * Cached server-side for 1 hour – safe to call on every search.
 */
export async function geocodePlace(query) {
  const resp = await axios.get(`${API_BASE_URL}/traffic/geocode`, {
    params: { q: query },
  });
  return resp.data; // { lat, lng, label }
}

/**
 * Return up to 6 place suggestions for a partial query string.
 * @param {string}      query  Partial address or place name
 * @param {number|null} lat    User latitude  (biases results toward user area)
 * @param {number|null} lng    User longitude
 */
export async function suggestPlaces(query, lat = null, lng = null) {
  const params = { q: query, limit: 6 };
  if (lat !== null && lng !== null) {
    params.lat = lat;
    params.lng = lng;
  }
  const resp = await axios.get(`${API_BASE_URL}/traffic/autosuggest`, { params });
  return resp.data.suggestions || []; // [{ title, address, lat, lng }]
}

// ── Route Fetching ─────────────────────────────────────────────────────────────

/**
 * Fetch real-time routes for a given transport mode.
 * @param {[number, number]} origin      [lat, lng]
 * @param {[number, number]} destination [lat, lng]
 * @param {'car'|'pedestrian'|'bicycle'|'transit'} mode
 */
export async function getRoutes(origin, destination, mode = 'car') {
  if (mode === 'transit') {
    const resp = await axios.post(`${API_BASE_URL}/routes/transit`, {
      origin,
      destination,
    });
    return resp.data.routes || [];
  }

  const modeMap = { car: 'car', pedestrian: 'walk', bicycle: 'bike' };
  const endpoint = modeMap[mode] || 'car';
  const resp = await axios.post(`${API_BASE_URL}/routes/${endpoint}`, {
    origin,
    destination,
  });
  return resp.data.routes || [];
}

/**
 * Fetch routes targeting a specific arrival time (Arrive By).
 * @param {[number, number]} origin
 * @param {[number, number]} destination
 * @param {string}           arrivalTimeISO  ISO-8601 string e.g. "2026-04-12T09:00:00Z"
 * @param {'car'|'pedestrian'|'bicycle'|'transit'} mode
 */
export async function planRoutes(origin, destination, arrivalTimeISO, mode = 'car') {
  if (mode === 'transit') {
    const resp = await axios.post(`${API_BASE_URL}/routes/plan/transit`, {
      origin,
      destination,
      arrival_time: arrivalTimeISO,
    });
    return resp.data.routes || [];
  }

  const modeMap = { car: 'car', pedestrian: 'walk', bicycle: 'bike' };
  const endpoint = modeMap[mode] || 'car';
  const resp = await axios.post(`${API_BASE_URL}/routes/plan/${endpoint}`, {
    origin,
    destination,
    arrival_time: arrivalTimeISO,
  });
  return resp.data.routes || [];
}

/**
 * Fetch routes starting at a specific departure time (Leave At).
 * @param {[number, number]} origin
 * @param {[number, number]} destination
 * @param {string}           departureTimeISO  ISO-8601 string e.g. "2026-04-12T17:00:00Z"
 * @param {'car'|'pedestrian'|'bicycle'|'transit'} mode
 */
export async function planDepartureRoutes(origin, destination, departureTimeISO, mode = 'car') {
  const modeMap = { car: 'car', pedestrian: 'walk', bicycle: 'bike', transit: 'transit' };
  const endpoint = modeMap[mode] || 'car';
  const resp = await axios.post(`${API_BASE_URL}/routes/depart/${endpoint}`, {
    origin,
    destination,
    departure_time: departureTimeISO,
  });
  return resp.data.routes || [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build an ISO-8601 UTC string from a { h, m, isPM } time object and today's date.
 */
export function timeObjectToISO({ h, m, isPM }) {
  const hour24 = isPM ? (h === 12 ? 12 : h + 12) : h === 12 ? 0 : h;
  const now = new Date();
  const dt = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), hour24, m, 0),
  );
  return dt.toISOString();
}

// ── MARTA Station Data ─────────────────────────────────────────────────────────
// Coordinates for all MARTA Rail stations.
// Used by TransitScreen to find the station nearest to the user.

export const MARTA_STATIONS = [
  // ── RED / GOLD LINE (North–South trunk) ────────────────────────────────────
  { name: 'Airport',                line: 'RED/GOLD', lat: 33.6402, lng: -84.4476 },
  { name: 'College Park',           line: 'RED/GOLD', lat: 33.6498, lng: -84.4453 },
  { name: 'East Point',             line: 'RED/GOLD', lat: 33.6697, lng: -84.4394 },
  { name: 'Lakewood/Fort McPherson',line: 'RED/GOLD', lat: 33.6964, lng: -84.4239 },
  { name: 'West End',               line: 'RED/GOLD', lat: 33.7327, lng: -84.4137 },
  { name: 'Oakland City',           line: 'RED/GOLD', lat: 33.7228, lng: -84.4141 },
  { name: 'Garnett',                line: 'RED/GOLD', lat: 33.7458, lng: -84.3941 },
  { name: 'Five Points',            line: 'RED/GOLD/BLUE/GREEN', lat: 33.7539, lng: -84.3914 },
  { name: 'Peachtree Center',       line: 'RED/GOLD', lat: 33.7598, lng: -84.3872 },
  { name: 'Civic Center',           line: 'RED/GOLD', lat: 33.7641, lng: -84.3891 },
  { name: 'North Avenue',           line: 'RED/GOLD', lat: 33.7714, lng: -84.3855 },
  { name: 'Midtown',                line: 'RED/GOLD', lat: 33.7817, lng: -84.3835 },
  { name: 'Arts Center',            line: 'RED/GOLD', lat: 33.7897, lng: -84.3855 },
  { name: 'Lindbergh Center',       line: 'RED/GOLD', lat: 33.8234, lng: -84.3686 },
  { name: 'Buckhead',               line: 'RED/GOLD', lat: 33.8445, lng: -84.3631 },
  { name: 'Medical Center',         line: 'RED/GOLD', lat: 33.8692, lng: -84.3620 },
  { name: 'Dunwoody',               line: 'RED',      lat: 33.9210, lng: -84.3445 },
  { name: 'Sandy Springs',          line: 'RED',      lat: 33.9307, lng: -84.3530 },
  { name: 'North Springs',          line: 'RED',      lat: 33.9458, lng: -84.3560 },
  { name: 'Doraville',              line: 'GOLD',     lat: 33.9023, lng: -84.2826 },
  { name: 'Chamblee',               line: 'GOLD',     lat: 33.8880, lng: -84.2978 },
  { name: 'Brookhaven/Oglethorpe',  line: 'GOLD',     lat: 33.8601, lng: -84.3222 },
  { name: 'Lenox',                  line: 'GOLD',     lat: 33.8461, lng: -84.3590 },
  // ── BLUE LINE (East–West) ──────────────────────────────────────────────────
  { name: 'Hamilton E. Holmes',     line: 'BLUE',     lat: 33.7546, lng: -84.4707 },
  { name: 'West Lake',              line: 'BLUE',     lat: 33.7549, lng: -84.4461 },
  { name: 'Ashby',                  line: 'BLUE/GREEN', lat: 33.7532, lng: -84.4130 },
  { name: 'Vine City',              line: 'BLUE/GREEN', lat: 33.7530, lng: -84.4027 },
  { name: 'Dome/GWCC/CNN Center',   line: 'BLUE/GREEN', lat: 33.7518, lng: -84.3960 },
  { name: 'Georgia State',          line: 'BLUE',     lat: 33.7487, lng: -84.3837 },
  { name: 'King Memorial',          line: 'BLUE',     lat: 33.7474, lng: -84.3716 },
  { name: 'Inman Park/Reynoldstown',line: 'BLUE',     lat: 33.7568, lng: -84.3533 },
  { name: 'Edgewood/Candler Park',  line: 'BLUE',     lat: 33.7596, lng: -84.3389 },
  { name: 'East Lake',              line: 'BLUE',     lat: 33.7597, lng: -84.3150 },
  { name: 'Decatur',                line: 'BLUE',     lat: 33.7744, lng: -84.2966 },
  { name: 'Avondale',               line: 'BLUE',     lat: 33.7766, lng: -84.2712 },
  { name: 'Kensington',             line: 'BLUE',     lat: 33.7617, lng: -84.2497 },
  { name: 'Indian Creek',           line: 'BLUE',     lat: 33.7659, lng: -84.2214 },
  // ── GREEN LINE ────────────────────────────────────────────────────────────
  { name: 'Bankhead',               line: 'GREEN',    lat: 33.7712, lng: -84.4529 },
];

/**
 * Find the MARTA station nearest to a given coordinate pair.
 * Returns the station object with an added `distanceMiles` field.
 */
export function findNearestStation(lat, lng) {
  if (!lat || !lng || MARTA_STATIONS.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const station of MARTA_STATIONS) {
    // Approximate distance using Euclidean on lat/lng degrees.
    // 1° lat ≈ 69 mi; 1° lng ≈ 69 * cos(lat) mi at Atlanta's latitude.
    const dlat = (station.lat - lat) * 69;
    const dlng = (station.lng - lng) * 69 * Math.cos((lat * Math.PI) / 180);
    const dist = Math.sqrt(dlat * dlat + dlng * dlng);
    if (dist < minDist) {
      minDist = dist;
      nearest = { ...station, distanceMiles: Math.round(dist * 10) / 10 };
    }
  }

  return nearest;
}
