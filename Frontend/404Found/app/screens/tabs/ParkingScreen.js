import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import axios from 'axios';
import { API_BASE_URL } from '../../constants/api';
import { getRoutes, geocodePlace } from '../../services/routeService';
import { setPendingRoute } from '../../services/routeStore';
import * as Location from 'expo-location';

const PARKING_MODES = [
  { id: 'car',        label: 'Drive', icon: 'car' },
  { id: 'pedestrian', label: 'Walk',  icon: 'walk' },
];

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — matches backend TTL

function getAvailabilityColor(available, total) {
  if (!total || total === 0) return Colors.textLight;
  const pct = (available / total) * 100;
  if (pct > 50) return Colors.success;
  if (pct > 20) return Colors.warning;
  return Colors.danger;
}

function getAvailabilityLabel(available, total) {
  if (!total || total === 0) return 'Unknown';
  const pct = (available / total) * 100;
  if (pct > 50) return 'Available';
  if (pct > 20) return 'Filling Up';
  return 'Nearly Full';
}

function AvailabilityBar({ available, total, color }) {
  const pct = total > 0 ? Math.min(1, available / total) : 0;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function ParkingCard({ location, onGetDirections }) {
  const color = getAvailabilityColor(location.available, location.total);
  const label = getAvailabilityLabel(location.available, location.total);
  return (
    <View style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <View style={[styles.parkingIcon, { backgroundColor: color + '22' }]}>
          <MaterialCommunityIcons name="parking" size={30} color={color} />
        </View>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName} numberOfLines={2}>{location.name}</Text>
          <View style={styles.addressRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.address} numberOfLines={1}>{location.address}</Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: color + '22' }]}>
          <Text style={[styles.statusPillText, { color }]}>{label}</Text>
        </View>
      </View>

      <AvailabilityBar available={location.available} total={location.total} color={color} />

      <View style={styles.spacesRow}>
        <Text style={[styles.spacesCount, { color }]}>{location.available}</Text>
        <Text style={styles.spacesLabel}> of {location.total} spaces open</Text>
        <Text style={[styles.pctBadge, { color }]}>
          {location.percentOpen != null ? `${Math.round(location.percentOpen)}%` : ''}
        </Text>
      </View>

      <TouchableOpacity style={styles.directionsButton} onPress={() => onGetDirections(location)}>
        <MaterialCommunityIcons name="directions" size={16} color={Colors.white} />
        <Text style={styles.directionsButtonText}>Get Directions</Text>
      </TouchableOpacity>
    </View>
  );
}

function LoadingScreen() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <View style={styles.loadingScreen}>
      <Animated.View style={[styles.loadingIconWrap, { opacity: pulse }]}>
        <MaterialCommunityIcons name="parking" size={64} color={Colors.primary} />
      </Animated.View>
      <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.lg }} />
      <Text style={styles.loadingTitle}>Finding Parking</Text>
      <Text style={styles.loadingSubtitle}>
        Fetching live availability from GSU parking — this takes a few seconds.
      </Text>
    </View>
  );
}

export default function ParkingScreen() {
  const router = useRouter();
  const [parkingLocations, setParkingLocations] = useState([]);
  const [loading, setLoading] = useState(true);   // true only on first load with no data
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // ── Directions modal state ─────────────────────────────────────────────────
  const [showDirections, setShowDirections] = useState(false);
  const [dirLot, setDirLot] = useState(null);       // the parking lot object
  const [dirMode, setDirMode] = useState('car');
  const [dirRoutes, setDirRoutes] = useState([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [dirSelected, setDirSelected] = useState(null);
  const dirDestRef = useRef(null); // cached { lat, lng } for the current lot

  // Get user location once on mount for route origins
  React.useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation(loc.coords);
      } catch { /* silent */ }
    })();
  }, []);

  async function openDirections(lot) {
    setDirLot(lot);
    setDirMode('car');
    setDirRoutes([]);
    setDirSelected(null);
    dirDestRef.current = null;
    setShowDirections(true);
    setDirLoading(true);
    try {
      // Geocode the parking lot address to get coordinates
      const geo = await geocodePlace(`${lot.address}, Atlanta, GA`);
      if (!geo?.lat || !geo?.lng) throw new Error('Could not locate parking lot');
      dirDestRef.current = { lat: geo.lat, lng: geo.lng };
      await fetchDirRoutes('car', dirDestRef.current);
    } catch {
      setDirLoading(false);
    }
  }

  async function fetchDirRoutes(mode, dest) {
    if (!dest) return;
    setDirLoading(true);
    setDirRoutes([]);
    setDirSelected(null);
    try {
      const origin = userLocation
        ? [userLocation.latitude, userLocation.longitude]
        : [33.7534, -84.3863]; // GSU campus fallback
      const routes = await getRoutes(origin, [dest.lat, dest.lng], mode);
      setDirRoutes(routes);
      if (routes.length > 0) setDirSelected(routes[0]);
    } catch { /* silent */ }
    finally { setDirLoading(false); }
  }

  async function onDirModeChange(mode) {
    setDirMode(mode);
    if (dirDestRef.current) await fetchDirRoutes(mode, dirDestRef.current);
  }

  function fmtEta(min) {
    if (!min && min !== 0) return '--';
    if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`;
    return `${min} min`;
  }

  const fetchParkingData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/parking`);
      const lots = response.data.lots.map((lot) => ({
        id: lot.lot_name,
        name: lot.lot_name,
        address: lot.lot_street_address,
        available: lot.available_spaces,
        total: Math.round((lot.available_spaces / (lot.percent_open / 100)) || 0),
        percentOpen: lot.percent_open,
      }));
      setParkingLocations(lots);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching parking data:', err);
      // Only show error state if we have no data to show
      if (parkingLocations.length === 0) {
        setError('Could not load parking data. Make sure the backend is running.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parkingLocations.length]);

  useFocusEffect(
    useCallback(() => {
      fetchParkingData();
      const interval = setInterval(() => fetchParkingData(true), REFRESH_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [fetchParkingData])
  );

  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Directions Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={showDirections}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDirections(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDirections(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="parking" size={20} color={Colors.primary} />
              <Text style={styles.modalTitle} numberOfLines={1}>{dirLot?.name ?? 'Parking Lot'}</Text>
              <TouchableOpacity onPress={() => setShowDirections(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {dirLot?.address ? (
              <Text style={styles.modalAddress} numberOfLines={1}>{dirLot.address}</Text>
            ) : null}

            {/* Mode tabs */}
            <View style={styles.modalModeRow}>
              {PARKING_MODES.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modalModeChip, dirMode === m.id && styles.modalModeChipActive]}
                  onPress={() => onDirModeChange(m.id)}
                >
                  <MaterialCommunityIcons
                    name={m.icon}
                    size={16}
                    color={dirMode === m.id ? Colors.primaryDark : Colors.textSecondary}
                  />
                  <Text style={[styles.modalModeLabel, dirMode === m.id && styles.modalModeLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Route results */}
            <ScrollView style={styles.modalRouteScroll} nestedScrollEnabled>
              {dirLoading ? (
                <View style={styles.modalCentered}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.modalStatusText}>Finding routes…</Text>
                </View>
              ) : dirRoutes.length === 0 ? (
                <View style={styles.modalCentered}>
                  <MaterialCommunityIcons name="routes" size={40} color={Colors.textLight} />
                  <Text style={styles.modalStatusText}>No routes found</Text>
                </View>
              ) : (
                dirRoutes.map((route, i) => {
                  const sel = dirSelected === route;
                  const tl = route.traffic_level;
                  const tlColor = tl === 'high' ? '#E53935' : tl === 'medium' ? '#FFC107' : '#43A047';
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.routeCard, sel && styles.routeCardSelected]}
                      onPress={() => setDirSelected(route)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.routeCardRow}>
                        <View style={[styles.routeModeIcon, sel && { backgroundColor: Colors.primary }]}>
                          <MaterialCommunityIcons
                            name={PARKING_MODES.find(m => m.id === dirMode)?.icon ?? 'car'}
                            size={20}
                            color={sel ? Colors.white : Colors.primary}
                          />
                        </View>
                        <View style={styles.routeCardInfo}>
                          <Text style={styles.routeEta}>{fmtEta(route.eta_minutes)}</Text>
                          <Text style={styles.routeDist}>{route.distance} mi · {route.label}</Text>
                        </View>
                        <View style={[styles.trafficPill, { backgroundColor: tlColor + '22' }]}>
                          <View style={[styles.trafficDot, { backgroundColor: tlColor }]} />
                          <Text style={[styles.trafficLabel, { color: tlColor }]}>
                            {tl === 'high' ? 'Heavy' : tl === 'medium' ? 'Moderate' : 'Light'}
                          </Text>
                        </View>
                        {sel && <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Action button */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.startNavBtn, !dirSelected && styles.startNavBtnDisabled]}
                disabled={!dirSelected}
                onPress={() => {
                  if (!dirSelected || !dirDestRef.current) return;
                  setShowDirections(false);
                  setPendingRoute(dirSelected);
                  router.push({
                    pathname: '/navigation',
                    params: {
                      destLat: String(dirDestRef.current.lat),
                      destLng: String(dirDestRef.current.lng),
                      destName: dirLot?.name ?? 'Parking Lot',
                    },
                  });
                }}
              >
                <MaterialCommunityIcons name="navigation" size={18} color={Colors.white} />
                <Text style={styles.startNavText}>Start Navigation</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.header}>
        <View style={styles.logoButton}>
          <MaterialCommunityIcons name="map-marker" size={28} color={Colors.primaryDark} />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons name="menu" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('../screens/SettingsScreen')}>
            <MaterialCommunityIcons name="cog" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('../screens/MyAccountScreen')}>
            <MaterialCommunityIcons name="account" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchParkingData(true);
              }}
              tintColor={Colors.primary}
            />
          }
        >
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Parking</Text>
              {updatedStr && (
                <View style={styles.updatedPill}>
                  <View style={styles.updatedDot} />
                  <Text style={styles.updatedText}>Updated {updatedStr}</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>
              GSU campus parking · Auto-refreshes every 5 min · Pull to refresh
            </Text>
          </View>

          {error ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="alert-circle-outline" size={44} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchParkingData()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : parkingLocations.length === 0 ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="parking" size={44} color={Colors.textLight} />
              <Text style={styles.emptyText}>No parking data available</Text>
            </View>
          ) : (
            <View style={styles.locationsContainer}>
              {parkingLocations.map(location => (
                <ParkingCard
                  key={location.id}
                  location={location}
                  onGetDirections={openDirections}
                />
              ))}
            </View>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logoButton: {
    width: 50,
    height: 50,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcons: { flexDirection: 'row', gap: Spacing.md },
  iconButton: { padding: Spacing.xs },
  content: { flex: 1 },

  // Loading screen
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  loadingIconWrap: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Title section
  titleSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
    flexWrap: 'wrap',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.textPrimary },
  updatedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundGray,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.round,
    gap: 4,
  },
  updatedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  updatedText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  subtitle: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  // States
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: { color: Colors.white, fontWeight: '600', fontSize: 15 },

  // Cards
  locationsContainer: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  locationCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  locationHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  parkingIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: { flex: 1, gap: 3 },
  locationName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  address: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.round,
    alignSelf: 'flex-start',
  },
  statusPillText: { fontSize: 11, fontWeight: '600' },

  // Availability bar
  barTrack: {
    height: 6,
    backgroundColor: Colors.backgroundGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },

  // Spaces row
  spacesRow: { flexDirection: 'row', alignItems: 'baseline' },
  spacesCount: { fontSize: 20, fontWeight: '700' },
  spacesLabel: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  pctBadge: { fontSize: 13, fontWeight: '600' },

  // Directions
  directionsButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  directionsButtonText: { color: Colors.white, fontSize: 15, fontWeight: '600' },

  bottomPad: { height: Spacing.xxl },

  // ── Directions Modal ──────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  modalAddress: {
    fontSize: 12, color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalModeRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  modalModeChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.backgroundGray,
    borderWidth: 1, borderColor: Colors.border,
    gap: 6,
  },
  modalModeChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  modalModeLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  modalModeLabelActive: { color: Colors.primaryDark, fontWeight: '700' },
  modalRouteScroll: { maxHeight: 220, paddingHorizontal: Spacing.md },
  modalCentered: {
    alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm,
  },
  modalStatusText: { fontSize: 14, color: Colors.textSecondary },
  routeCard: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  routeCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  routeCardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  routeModeIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  routeCardInfo: { flex: 1, gap: 2 },
  routeEta: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  routeDist: { fontSize: 12, color: Colors.textSecondary },
  trafficPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.round, gap: 4,
  },
  trafficDot: { width: 6, height: 6, borderRadius: 3 },
  trafficLabel: { fontSize: 11, fontWeight: '600' },
  modalActions: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  startNavBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  startNavBtnDisabled: { opacity: 0.5 },
  startNavText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
