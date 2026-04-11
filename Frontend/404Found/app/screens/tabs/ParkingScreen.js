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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';
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

function ParkingCard({ location }) {
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

      <TouchableOpacity style={styles.directionsButton}>
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
                <ParkingCard key={location.id} location={location} />
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
});
