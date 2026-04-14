import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { getRoutes } from '../services/routeService';
import { consumePendingRoute } from '../services/routeStore';

// ── Helpers ────────────────────────────────────────────────────────────────────

function distanceBetween(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatEta(minutes) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes} min`;
}

/**
 * Find the closest index in decoded_coords, searching FORWARD from `fromIdx`
 * by at most `maxLookahead` steps.  Starting the search at the current
 * position prevents the very-first GPS update from snapping to the end of a
 * short route, and keeps subsequent updates from jumping backwards.
 *
 * maxLookahead is intentionally small (25) to prevent cascading on short
 * routes where the destination is geographically close to the start — with
 * a large window, several quick GPS callbacks can chain-jump the index to
 * near the route end before the user has moved at all.
 */
function closestCoordIndexForward(coords, lat, lng, fromIdx, maxLookahead = 25) {
  const end = Math.min(coords.length, fromIdx + maxLookahead);
  let minDist = Infinity;
  let idx = fromIdx;
  for (let i = fromIdx; i < end; i++) {
    const d = distanceBetween(lat, lng, coords[i][0], coords[i][1]);
    if (d < minDist) {
      minDist = d;
      idx = i;
    }
  }
  return idx;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function NavigationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const {
    destLat: destLatStr,
    destLng: destLngStr,
    destName = 'Destination',
  } = useLocalSearchParams();

  const destLat = parseFloat(destLatStr);
  const destLng = parseFloat(destLngStr);

  const [userLocation, setUserLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [coordIdx, setCoordIdx] = useState(0);
  const [instrIdx, setInstrIdx] = useState(0); // tracked separately so it only moves forward
  const [remainingMetres, setRemainingMetres] = useState(null);
  const [arrived, setArrived] = useState(false);
  const [instrPanelOpen, setInstrPanelOpen] = useState(false);

  // Apple Maps requires overlays (Polyline/Marker) to be added AFTER the map
  // is fully initialised — otherwise the native overlay layer ignores them.
  const [mapReady, setMapReady] = useState(false);

  const locationSub = useRef(null);
  // Tracks the latest coordIdx inside the watchPosition closure so it always
  // sees the current value rather than the stale captured state.
  const coordIdxRef = useRef(0);
  // Stores the remaining-distance reading from the very first GPS fix so that
  // instruction advancement is always measured relative to where the user
  // *started* navigation (not from the route's absolute coord[0], which may be
  // road-snapped slightly behind the user).
  const initialRemRef = useRef(null);

  // ── Load route ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required for navigation.');
        setLoading(false);
        return;
      }

      let pos;
      try {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        setUserLocation(pos.coords);
      } catch {
        setError('Could not get your current location.');
        setLoading(false);
        return;
      }

      // Accept prebuilt route only when both the ETA and polyline are valid.
      const prebuiltRoute = consumePendingRoute();
      if (
        prebuiltRoute &&
        prebuiltRoute.eta_minutes <= 1440 &&
        (prebuiltRoute.decoded_coords?.length ?? 0) >= 2
      ) {
        console.log('[Nav] Using prebuilt route, decoded_coords:', prebuiltRoute.decoded_coords?.length, 'sample:', JSON.stringify(prebuiltRoute.decoded_coords?.slice(0, 2)));
        setRoute(prebuiltRoute);
        setLoading(false);
        return;
      }

      // Fallback: fetch a fresh car route from current location.
      try {
        const routes = await getRoutes(
          [pos.coords.latitude, pos.coords.longitude],
          [destLat, destLng],
          'car',
        );
        if (routes.length === 0) throw new Error('No routes found.');
        console.log('[Nav] Fetched fresh route, decoded_coords:', routes[0].decoded_coords?.length, 'sample:', JSON.stringify(routes[0].decoded_coords?.slice(0, 2)));
        setRoute(routes[0]);
      } catch (e) {
        setError(`Could not fetch route: ${e.message}`);
      } finally {
        setLoading(false);
      }
    })();

    return () => { locationSub.current?.remove(); };
  }, []);

  // ── Centre map on user once map + route are ready ─────────────────────────
  // fitToCoordinates is used instead of animateCamera because it guarantees a
  // native region change that flushes Apple Maps' overlay layer, making the
  // Polylines appear.  animateCamera with only `zoom` (no `altitude`) is a
  // no-op on Apple Maps (the iOS fallback in Expo Go) so overlays stayed hidden.
  useEffect(() => {
    if (!mapReady || !route) return;
    if (polylineCoords.length === 0) return;
    console.log('[Nav] mapReady+route — fitting map to route start, polyCoords:', polylineCoords.length);
    const timer = setTimeout(() => {
      // Fit to the first ~30 coords so the view opens near the user rather than
      // zooming out to show the entire route.
      mapRef.current?.fitToCoordinates(
        polylineCoords.slice(0, Math.min(30, polylineCoords.length)),
        { edgePadding: { top: 180, right: 60, bottom: 280, left: 60 }, animated: true },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [mapReady, route]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live GPS tracking once route is ready ──────────────────────────────────
  useEffect(() => {
    if (!route) return;
    // Reset all position tracking whenever a new route is loaded so a second
    // navigation session never inherits stale state from the previous one.
    coordIdxRef.current = 0;
    initialRemRef.current = null;

    (async () => {
      locationSub.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10,
          timeInterval: 3000,
        },
        pos => {
          const { latitude, longitude, heading: gpsHeading } = pos.coords;
          setUserLocation({ latitude, longitude });
          if (gpsHeading !== null && gpsHeading >= 0) setHeading(gpsHeading);

          const coords = route.decoded_coords ?? [];
          if (coords.length === 0) return;

          // Search forward from our current position so the very first GPS
          // update never snaps to the end of a short route, and subsequent
          // updates never jump backwards.
          const idx = closestCoordIndexForward(
            coords, latitude, longitude, coordIdxRef.current,
          );
          coordIdxRef.current = idx;
          setCoordIdx(idx);

          // Remaining distance (meters from coordIdx to destination)
          let rem = 0;
          for (let i = idx; i < coords.length - 1; i++) {
            rem += distanceBetween(
              coords[i][0], coords[i][1],
              coords[i + 1][0], coords[i + 1][1],
            );
          }
          setRemainingMetres(rem);
          if (rem < 50) setArrived(true);

          // ── Instruction advancement ───────────────────────────────────────
          // Use distance traveled from the user's *starting* position (not the
          // route's absolute coord[0]).  The route may be road-snapped to a
          // point slightly behind the user, so coord[0] can be "pre-traveled"
          // on the very first GPS update — using the absolute route start would
          // make the first instruction appear to already be past instruction 0
          // on long routes with dense polylines.
          const instrCount = route.instructions?.length ?? 0;
          if (instrCount > 0) {
            // Capture the remaining distance at the first GPS fix as the
            // baseline.  All subsequent instruction jumps are relative to this.
            if (initialRemRef.current === null) {
              initialRemRef.current = rem;
            }
            const distFromStart = initialRemRef.current - rem;    // ≥ 0
            const totalFromStart = initialRemRef.current;          // > 0
            if (distFromStart >= 0 && totalFromStart > 0) {
              const pct = distFromStart / totalFromStart;
              const newInstrIdx = Math.min(Math.floor(pct * instrCount), instrCount - 1);
              setInstrIdx(prev => Math.max(prev, newInstrIdx));
            }
          }

          // Follow user with the map camera.
          // altitude: 500 is required for Apple Maps (zoom is a Google Maps
          // param and is silently ignored on iOS without altitude).
          mapRef.current?.animateCamera(
            { center: { latitude, longitude }, altitude: 500, zoom: 17, heading: gpsHeading ?? 0, pitch: 0 },
            { duration: 600 },
          );
        },
      );
    })();

    return () => { locationSub.current?.remove(); };
  }, [route]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived display values ─────────────────────────────────────────────────
  const coords = route?.decoded_coords ?? [];
  const polylineCoords = coords.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

  const destCoord = {
    latitude: isNaN(destLat) ? 0 : destLat,
    longitude: isNaN(destLng) ? 0 : destLng,
  };
  const hasValidDest = destCoord.latitude !== 0 && destCoord.longitude !== 0;

  const currentInstr = route?.instructions?.[instrIdx] ?? 'Head toward your destination';

  // Compute total route distance from decoded_coords using the same Haversine
  // method as remainingMetres — avoids the route.distance=0 edge case that
  // would make the proportional ETA calculation blow up.
  const totalRouteMetres = useMemo(() => {
    if (!coords.length) return null;
    let total = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      total += distanceBetween(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
    }
    return total > 0 ? total : null;
  }, [route]);

  const displayMetres = remainingMetres ?? totalRouteMetres;

  const rawEtaMin = route && totalRouteMetres
    ? remainingMetres !== null
      ? Math.max(1, Math.round(route.eta_minutes * (remainingMetres / totalRouteMetres)))
      : route.eta_minutes
    : route?.eta_minutes ?? null;

  const etaMin = rawEtaMin !== null && rawEtaMin <= 1440 ? rawEtaMin : null;

  // Initial map region centred on the user (not the route midpoint)
  const mapRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
    : coords.length
    ? {
        latitude: coords[0][0],
        longitude: coords[0][1],
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
    : undefined;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Planning your route…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={44} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
          <Text style={styles.goBackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── Map fills the entire screen ──────────────────────────────────── */}
      {mapRegion && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={mapRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsTraffic
          showsPointsOfInterest={false}
          loadingEnabled
          onMapReady={() => { console.log('[Nav] onMapReady fired'); setMapReady(true); }}
        >
          {/* Polylines are gated on both mapReady and having real coordinates.
              The `key` prop is critical for the new React Native architecture
              (Fabric): if a Polyline is ever mounted with coordinates=[] it
              enters an invalid native state and never renders even after the
              prop updates.  Keying on polylineCoords.length means the
              component mounts for the first time with valid data, and
              subsequent coordIdx updates flow through as normal prop changes. */}
          {mapReady && polylineCoords.length > 1 && (
            <Polyline
              key={polylineCoords.length}
              coordinates={polylineCoords}
              strokeColor="#90A4AE"
              strokeWidth={7}
            />
          )}
          {mapReady && polylineCoords.length > 1 && (
            <Polyline
              key={`blue-${polylineCoords.length}`}
              coordinates={polylineCoords.slice(Math.max(0, coordIdx))}
              strokeColor="#1A73E8"
              strokeWidth={10}
            />
          )}
          {mapReady && hasValidDest && (
            <Marker coordinate={destCoord} anchor={{ x: 0.5, y: 1.0 }}>
              <View style={styles.destMarkerWrap}>
                <View style={styles.destMarkerBubble}>
                  <MaterialCommunityIcons name="flag-checkered" size={16} color="#fff" />
                  <Text style={styles.destMarkerText} numberOfLines={1}>{destName}</Text>
                </View>
                <View style={styles.destMarkerTail} />
              </View>
            </Marker>
          )}
          {mapReady && userLocation && (
            <Marker
              coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat
              rotation={heading}
              zIndex={10}
            >
              <View style={styles.navMarker}>
                <MaterialCommunityIcons name="navigation" size={20} color="#fff" />
              </View>
            </Marker>
          )}
        </MapView>
      )}

      {/* ── DEV: debug state overlay (only in development builds) ────────── */}
      {__DEV__ && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugText}>
            {'mapReady: ' + String(mapReady) + '  coords: ' + polylineCoords.length + '\n'}
            {'route: ' + (route ? route.eta_minutes + 'min' : 'none') + '  idx: ' + coordIdx + '\n'}
            {'userLoc: ' + (userLocation ? userLocation.latitude.toFixed(4) + ',' + userLocation.longitude.toFixed(4) : 'none') + '\n'}
            {'poly[0]: ' + (polylineCoords[0] ? polylineCoords[0].latitude.toFixed(4) + ',' + polylineCoords[0].longitude.toFixed(4) : 'none')}
          </Text>
        </View>
      )}

      {/* ── TOP: Current instruction ─────────────────────────────────────── */}
      <View style={[styles.topPanel, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity
          style={styles.instrMainRow}
          onPress={() => setInstrPanelOpen(o => !o)}
          activeOpacity={0.85}
        >
          <View style={styles.instrIconWrap}>
            <MaterialCommunityIcons name="arrow-right-circle" size={34} color={Colors.primary} />
          </View>
          <Text style={styles.instrText} numberOfLines={instrPanelOpen ? 0 : 2}>
            {currentInstr}
          </Text>
          <MaterialCommunityIcons
            name={instrPanelOpen ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {instrPanelOpen && (route?.instructions?.length ?? 0) > 0 && (
          <ScrollView style={styles.instrList} nestedScrollEnabled>
            {route.instructions.map((step, i) => (
              <View
                key={i}
                style={[styles.instrItem, i === instrIdx && styles.instrItemActive]}
              >
                <Text style={[styles.instrItemText, i === instrIdx && styles.instrItemTextActive]}>
                  {i + 1}. {step}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Arrived banner ───────────────────────────────────────────────── */}
      {arrived && (
        <View style={styles.arrivedBanner}>
          <MaterialCommunityIcons name="check-circle" size={24} color="#fff" />
          <Text style={styles.arrivedText}>You have arrived!</Text>
        </View>
      )}

      {/* ── BOTTOM: Stats + End button ───────────────────────────────────── */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12 }]}>
        {/* Stats row */}
        <View style={styles.etaRow}>
          <View style={styles.etaStat}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.primary} />
            <Text style={styles.etaValue}>{etaMin !== null ? formatEta(etaMin) : '—'}</Text>
            <Text style={styles.etaLabel}>ETA</Text>
          </View>

          {displayMetres !== null && displayMetres < 500_000 && (
            <View style={styles.etaStat}>
              <MaterialCommunityIcons name="map-marker-distance" size={18} color={Colors.primary} />
              <Text style={styles.etaValue}>
                {displayMetres >= 1609
                  ? `${(displayMetres / 1609.34).toFixed(1)} mi`
                  : `${Math.round(displayMetres * 3.281)} ft`}
              </Text>
              <Text style={styles.etaLabel}>remaining</Text>
            </View>
          )}

          {route && (
            <View style={styles.etaStat}>
              <MaterialCommunityIcons
                name="traffic-light"
                size={18}
                color={
                  route.traffic_level === 'high' ? '#E53935'
                  : route.traffic_level === 'medium' ? '#FFC107'
                  : '#43A047'
                }
              />
              <Text style={styles.etaValue}>
                {route.traffic_level === 'high' ? 'Heavy'
                  : route.traffic_level === 'medium' ? 'Moderate'
                  : 'Light'}
              </Text>
              <Text style={styles.etaLabel}>traffic</Text>
            </View>
          )}
        </View>

        {/* End Navigation button */}
        <TouchableOpacity style={styles.endBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="close-circle-outline" size={22} color="#fff" />
          <Text style={styles.endBtnText}>End Navigation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  loadingText: { fontSize: 16, color: Colors.textSecondary, marginTop: Spacing.sm },
  errorText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  goBackBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  goBackBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },

  // ── Top instruction panel ─────────────────────────────────────────────────
  topPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: '50%',
  },
  instrMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  instrIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight ?? '#E8F5E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instrText: {
    flex: 1,
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  instrList: {
    maxHeight: 240,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 2,
  },
  instrItem: {
    paddingVertical: 9,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  instrItemActive: { backgroundColor: Colors.primaryLight ?? '#E8F5E2' },
  instrItemText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  instrItemTextActive: { color: Colors.primaryDark ?? Colors.primary, fontWeight: '700' },

  // ── Arrived banner ────────────────────────────────────────────────────────
  arrivedBanner: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    top: '42%',
    backgroundColor: '#43A047',
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  arrivedText: { color: '#fff', fontWeight: '700', fontSize: 18 },

  // ── Bottom panel ──────────────────────────────────────────────────────────
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  etaStat: { alignItems: 'center', gap: 3 },
  etaValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  etaLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },

  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53935',
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    gap: 8,
  },
  endBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },

  // ── Destination marker ────────────────────────────────────────────────────
  destMarkerWrap: { alignItems: 'center' },
  destMarkerBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53935',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    gap: 5,
    maxWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  destMarkerText: { color: '#fff', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  destMarkerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E53935',
  },

  // ── Dev debug overlay ─────────────────────────────────────────────────────
  debugOverlay: {
    position: 'absolute',
    top: 160,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 6,
    borderRadius: 4,
    zIndex: 999,
  },
  debugText: { color: '#0FF', fontSize: 10 },

  // ── User location arrow ───────────────────────────────────────────────────
  navMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
});
