/**
 * Lightweight in-memory store for passing a route object between screens.
 * Using URL params for large route JSON (hundreds of decoded_coords) causes
 * silent truncation/corruption in Expo Router. Instead, call setPendingRoute()
 * before pushing to /navigation, then consumePendingRoute() inside that screen.
 */

let _pendingRoute = null;

export function setPendingRoute(route) {
  _pendingRoute = route;
}

/** Returns the stored route and clears the store. */
export function consumePendingRoute() {
  const r = _pendingRoute;
  _pendingRoute = null;
  return r;
}
