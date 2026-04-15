import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  Alert as RNAlert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { getRoutes } from '../services/routeService';
import { consumePendingRoute } from '../services/routeStore';
import {
  fetchAlerts,
  submitAlert,
  ICON_ALERT_TYPES,
  URGENCY_LEVELS,
  subtypeIcon,
  subtypeColor,
  urgencyColor,
} from '../services/alertService';

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

// ── Nav Report Sheet ───────────────────────────────────────────────────────────
// Compact bottom-sheet for reporting alerts directly from navigation without
// leaving the navigation screen.  Opens as a slide-up modal overlay.

function NavReportSheet({ visible, onClose, onSubmit, userLocation }) {
  const [alertKind, setAlertKind] = useState('icon');
  const [selectedSubtype, setSelectedSubtype] = useState(null);
  const [selectedUrgency, setSelectedUrgency] = useState(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setAlertKind('icon');
    setSelectedSubtype(null);
    setSelectedUrgency(null);
    setDescription('');
  }

  async function handleSubmit() {
    if (alertKind === 'icon' && !selectedSubtype) {
      RNAlert.alert('Select a type', 'Please pick an alert type.');
      return;
    }
    if (alertKind === 'comment' && !description.trim()) {
      RNAlert.alert('Description required', 'Please describe the situation.');
      return;
    }

    setSubmitting(true);
    try {
      // For icon alerts auto-fill description from the subtype label so users
      // can just tap an icon and submit without typing while driving.
      const subtypeLabel =
        ICON_ALERT_TYPES.find(t => t.subtype === selectedSubtype)?.label ?? 'Alert';
      const payload = {
        type: 'Traffic',
        subtype: alertKind === 'icon' ? selectedSubtype : null,
        description: description.trim() || subtypeLabel,
        location: null,
        lat: userLocation?.latitude ?? null,
        lng: userLocation?.longitude ?? null,
        is_comment: alertKind === 'comment',
        urgency: alertKind === 'comment' ? selectedUrgency : null,
      };
      await onSubmit(payload);
      reset();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Failed to submit. Please try again.';
      RNAlert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheetStyles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={sheetStyles.kavWrapper}
        >
          <Pressable style={sheetStyles.sheet} onPress={e => e.stopPropagation()}>
            <View style={sheetStyles.handle} />
            <View style={sheetStyles.headerRow}>
              <Text style={sheetStyles.title}>Report Alert</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Kind toggle */}
            <View style={sheetStyles.kindToggle}>
              <TouchableOpacity
                style={[sheetStyles.kindBtn, alertKind === 'icon' && sheetStyles.kindBtnActive]}
                onPress={() => setAlertKind('icon')}
              >
                <MaterialCommunityIcons
                  name="map-marker-alert"
                  size={16}
                  color={alertKind === 'icon' ? Colors.white : Colors.textSecondary}
                />
                <Text style={[sheetStyles.kindBtnText, alertKind === 'icon' && sheetStyles.kindBtnTextActive]}>
                  Icon Alert
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sheetStyles.kindBtn, alertKind === 'comment' && sheetStyles.kindBtnActive]}
                onPress={() => setAlertKind('comment')}
              >
                <MaterialCommunityIcons
                  name="comment-text"
                  size={16}
                  color={alertKind === 'comment' ? Colors.white : Colors.textSecondary}
                />
                <Text style={[sheetStyles.kindBtnText, alertKind === 'comment' && sheetStyles.kindBtnTextActive]}>
                  Comment
                </Text>
              </TouchableOpacity>
            </View>

            {alertKind === 'icon' ? (
              <View style={sheetStyles.iconGrid}>
                {ICON_ALERT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.subtype}
                    style={[
                      sheetStyles.iconCell,
                      selectedSubtype === t.subtype && {
                        borderColor: t.color,
                        backgroundColor: t.color + '18',
                      },
                    ]}
                    onPress={() => setSelectedSubtype(t.subtype)}
                  >
                    <MaterialCommunityIcons name={t.icon} size={20} color={t.color} />
                    <Text style={sheetStyles.iconCellLabel} numberOfLines={2}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={sheetStyles.urgencyRow}>
                {URGENCY_LEVELS.map(u => (
                  <TouchableOpacity
                    key={String(u.value)}
                    style={[
                      sheetStyles.urgencyChip,
                      { borderColor: u.color },
                      selectedUrgency === u.value && { backgroundColor: u.color },
                    ]}
                    onPress={() => setSelectedUrgency(u.value)}
                  >
                    <Text
                      style={[
                        sheetStyles.urgencyChipText,
                        { color: selectedUrgency === u.value ? Colors.white : u.color },
                      ]}
                    >
                      {u.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Optional description — for icon alerts users can submit with just a tap */}
            <TextInput
              style={sheetStyles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder={
                alertKind === 'icon'
                  ? 'Add details (optional)…'
                  : 'What do drivers need to know?'
              }
              placeholderTextColor={Colors.textLight}
              multiline={false}
              maxLength={140}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            <TouchableOpacity
              style={[sheetStyles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={sheetStyles.submitBtnText}>Submit Alert</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
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

  // When the user pans the map we stop auto-following so they can explore.
  // The recenter button re-enables following and snaps back to the user.
  const [mapFollowing, setMapFollowing] = useState(true);

  // Alerts fetched from the backend displayed as compact map markers.
  const [navAlerts, setNavAlerts] = useState([]);

  // Whether the quick report-alert bottom sheet is open.
  const [showReportSheet, setShowReportSheet] = useState(false);

  // Briefly shown after successfully submitting an alert.
  const [reportSuccess, setReportSuccess] = useState(false);

  const locationSub = useRef(null);
  // Tracks the latest coordIdx inside the watchPosition closure so it always
  // sees the current value rather than the stale captured state.
  const coordIdxRef = useRef(0);
  // Stores the remaining-distance reading from the very first GPS fix so that
  // instruction advancement is always measured relative to where the user
  // *started* navigation (not from the route's absolute coord[0], which may be
  // road-snapped slightly behind the user).
  const initialRemRef = useRef(null);
  // Mirrors mapFollowing state for use inside the watchPosition closure so the
  // closure doesn't capture a stale value.
  const mapFollowingRef = useRef(true);
  // Mirrors userLocation for use in the alert-polling interval (avoids stale closure).
  const userLocationRef = useRef(null);

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
        userLocationRef.current = pos.coords;
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
          userLocationRef.current = { latitude, longitude };
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

          // Follow user with the map camera only when the user has not
          // manually panned away.
          // altitude: 500 is required for Apple Maps (zoom is a Google Maps
          // param and is silently ignored on iOS without altitude).
          if (mapFollowingRef.current) {
            mapRef.current?.animateCamera(
              { center: { latitude, longitude }, altitude: 500, zoom: 17, heading: gpsHeading ?? 0, pitch: 0 },
              { duration: 600 },
            );
          }
        },
      );
    })();

    return () => { locationSub.current?.remove(); };
  }, [route]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll nearby alerts for map markers ─────────────────────────────────────
  // Starts a few seconds after mount so the initial location fetch has time to
  // complete.  Polls every 30 s so other users' freshly submitted alerts appear
  // in near-real-time without hammering the backend.
  useEffect(() => {
    const doFetch = () => {
      const loc = userLocationRef.current;
      if (!loc) return;
      fetchAlerts(loc.latitude, loc.longitude)
        .then(data => setNavAlerts(data))
        .catch(() => {});
    };

    const firstLoad = setTimeout(doFetch, 2_000);
    const interval  = setInterval(doFetch, 30_000);
    return () => {
      clearTimeout(firstLoad);
      clearInterval(interval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recenter helper ─────────────────────────────────────────────────────────
  function recenterOnUser() {
    mapFollowingRef.current = true;
    setMapFollowing(true);
    if (!userLocation || !mapRef.current) return;
    mapRef.current.animateCamera(
      {
        center: { latitude: userLocation.latitude, longitude: userLocation.longitude },
        altitude: 500,
        zoom: 17,
        heading,
        pitch: 0,
      },
      { duration: 600 },
    );
  }

  // ── Alert submit handler ────────────────────────────────────────────────────
  async function handleAlertSubmit(payload) {
    const newAlert = await submitAlert(payload);
    // Prepend so the new alert marker appears on the map immediately.
    setNavAlerts(prev => [newAlert, ...prev]);
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 2500);
  }

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
  }, [route]); // eslint-disable-line react-hooks/exhaustive-deps

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
          onPanDrag={() => {
            // Stop auto-following when the user manually pans so they can
            // inspect the map without being snapped back every GPS update.
            if (mapFollowingRef.current) {
              mapFollowingRef.current = false;
              setMapFollowing(false);
            }
          }}
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
              strokeWidth={100}
            />
          )}
          {mapReady && polylineCoords.length > 1 && (
            <Polyline
              key={`blue-${polylineCoords.length}`}
              coordinates={polylineCoords.slice(Math.max(0, coordIdx))}
              strokeColor="#1A73E8"
              strokeWidth={110}
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

          {/* ── Alert markers ─ compact so they don't obscure the road view ── */}
          {mapReady && navAlerts.map(alert => {
            if (!alert.lat || !alert.lng) return null;
            const isComment = alert.is_comment;
            const icon  = isComment
              ? 'comment-text'
              : (alert.subtype ? subtypeIcon(alert.subtype) : 'alert-circle');
            const color = isComment
              ? urgencyColor(alert.urgency)
              : (alert.subtype ? subtypeColor(alert.subtype) : '#F5A623');
            return (
              <Marker
                key={alert.alert_id}
                coordinate={{ latitude: alert.lat, longitude: alert.lng }}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={5}
              >
                <View style={[styles.alertMapMarker, { borderColor: color + 'AA' }]}>
                  <MaterialCommunityIcons name={icon} size={18} color={color} />
                </View>
              </Marker>
            );
          })}
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

      {/* ── Alert reported success toast ─────────────────────────────────── */}
      {reportSuccess && (
        <View style={styles.successToast}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />
          <Text style={styles.successToastText}>Alert reported!</Text>
        </View>
      )}

      {/* ── Right-side floating action buttons ───────────────────────────── */}

      {/* Recenter — only visible after the user has manually panned away */}
      {!mapFollowing && (
        <TouchableOpacity style={styles.recenterBtn} onPress={recenterOnUser}>
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color={Colors.primary} />
        </TouchableOpacity>
      )}

      {/* Report alert FAB — always visible for quick hazard reporting */}
      <TouchableOpacity style={styles.reportAlertBtn} onPress={() => setShowReportSheet(true)}>
        <MaterialCommunityIcons name="map-marker-plus" size={22} color="#fff" />
      </TouchableOpacity>

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

      {/* ── Report alert bottom sheet ─────────────────────────────────────── */}
      <NavReportSheet
        visible={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        onSubmit={handleAlertSubmit}
        userLocation={userLocation}
      />
    </View>
  );
}

// ── Report sheet styles ────────────────────────────────────────────────────────

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  kavWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 36,
    paddingTop: Spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  kindToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    padding: 3,
    gap: 3,
    marginBottom: Spacing.md,
  },
  kindBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  kindBtnActive: { backgroundColor: Colors.primary },
  kindBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  kindBtnTextActive: { color: Colors.white },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  iconCell: {
    width: '18%',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 3,
  },
  iconCellLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 12,
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  urgencyChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  urgencyChipText: { fontSize: 12, fontWeight: '700' },
  textInput: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});

// ── Navigation screen styles ───────────────────────────────────────────────────

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

  // ── Alert reported success toast ──────────────────────────────────────────
  successToast: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#43A047',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.round,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 50,
  },
  successToastText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Floating action buttons (right side, above bottom panel) ─────────────
  reportAlertBtn: {
    position: 'absolute',
    right: 16,
    bottom: 210,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    bottom: 270,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },

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

  // ── Alert map markers ─────────────────────────────────────────────────────
  // Intentionally small (26 px) so they don't obscure the road view while driving.
  alertMapMarker: {
    width: 38,   //38
    height: 38,  //38
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },

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

  // ── Dev debug overlay ─────────────────────────────────────────────────────
  // debugOverlay: {
  //   position: 'absolute',
  //   top: 160,
  //   left: 10,
  //   backgroundColor: 'rgba(0,0,0,0.75)',
  //   padding: 6,
  //   borderRadius: 4,
  //   zIndex: 999,
  // },
  // debugText: { color: '#0FF', fontSize: 10 },
});
