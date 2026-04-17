import React, { useState, useCallback, useEffect } from 'react';
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
  Image,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import axios from 'axios';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { API_BASE_URL } from '../../constants/api';
import { findNearestStation, getRoutes } from '../../services/routeService';
import { setPendingRoute } from '../../services/routeStore';

const LINE_COLORS = {
  RED: '#E53935',
  BLUE: '#1E88E5',
  GOLD: '#F9A825',
  GREEN: '#43A047',
};

function getLineColor(line) {
  const upper = (line || '').toUpperCase();
  for (const key of Object.keys(LINE_COLORS)) {
    if (upper.includes(key)) return LINE_COLORS[key];
  }
  return Colors.primary;
}

function getLineLabel(line) {
  const upper = (line || '').toUpperCase();
  for (const key of Object.keys(LINE_COLORS)) {
    if (upper.includes(key)) return key.charAt(0) + key.slice(1).toLowerCase() + ' Line';
  }
  return line || 'Unknown';
}

const DIRECTION_LABELS = {
  N: 'Northbound',
  S: 'Southbound',
  E: 'Eastbound',
  W: 'Westbound',
};

function expandDirection(dir) {
  const key = (dir || '').trim().toUpperCase();
  return DIRECTION_LABELS[key] || dir || 'Unknown';
}

function formatWait(seconds) {
  const s = parseInt(seconds, 10);
  if (isNaN(s) || s < 0) return '--';
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)} min`;
}

// Transport modes for the directions modal (Transit excluded — user is going
// *to* the station, not using MARTA itself yet).
const DIRECTIONS_MODES = [
  { id: 'car',        label: 'Drive', icon: 'car' },
  { id: 'pedestrian', label: 'Walk',  icon: 'walk' },
  { id: 'bicycle',    label: 'Bike',  icon: 'bike' },
];

const GSU_REGION = { latitude: 33.7534, longitude: -84.3863 };

function ArrivalBadge({ seconds, nextArrival, lineColor }) {
  const s = parseInt(seconds, 10);
  const mins = isNaN(s) ? null : Math.round(s / 60);
  const urgent = mins !== null && mins <= 2;
  const badgeColor = urgent ? lineColor : Colors.backgroundGray;
  const textColor = urgent ? '#fff' : lineColor;
  return (
    <View style={styles.arrivalBadgeWrap}>
      <View style={[styles.arrivalBadge, { backgroundColor: badgeColor }]}>
        <Text style={[styles.arrivalBadgeLabel, { color: textColor }]}>arrives in</Text>
        <Text style={[styles.arrivalBadgeTime, { color: textColor }]}>
          {formatWait(seconds)}
        </Text>
      </View>
      {nextArrival ? (
        <Text style={styles.arrivalAtText}>at {nextArrival}</Text>
      ) : null}
    </View>
  );
}

export default function TransitScreen() {
  const router = useRouter();
  const [trainData, setTrainData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  // null means all lines expanded (default); switches to a Set once user collapses one
  const [expandedLines, setExpandedLines] = useState(null);
  const [lineFilter, setLineFilter] = useState('ALL');

  // ── User location (shared for nearest-station lookup + directions modal) ────
  const [userLocation, setUserLocation] = useState(null);

  // ── Nearest station ─────────────────────────────────────────────────────────
  const [nearestStation, setNearestStation] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(loc.coords);
        const station = findNearestStation(loc.coords.latitude, loc.coords.longitude);
        setNearestStation(station);
      } catch { /* silent */ }
    })();
  }, []);

  // ── Directions modal state ────────────────────────────────────────────────────
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [directionsMode, setDirectionsMode] = useState('car');
  const [directionsRoutes, setDirectionsRoutes] = useState([]);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [directionsSelected, setDirectionsSelected] = useState(null);

  const fetchDirectionsRoutes = useCallback(async () => {
    if (!nearestStation) return;
    setDirectionsLoading(true);
    setDirectionsRoutes([]);
    setDirectionsSelected(null);
    try {
      const origin = userLocation
        ? [userLocation.latitude, userLocation.longitude]
        : [GSU_REGION.latitude, GSU_REGION.longitude];
      const dest = [nearestStation.lat, nearestStation.lng];
      const routes = await getRoutes(origin, dest, directionsMode);
      setDirectionsRoutes(routes);
      if (routes.length > 0) setDirectionsSelected(routes[0]);
    } catch { /* silent – empty state shown */ }
    finally { setDirectionsLoading(false); }
  }, [nearestStation, directionsMode, userLocation]);

  useEffect(() => {
    if (showDirectionsModal && nearestStation) fetchDirectionsRoutes();
  }, [showDirectionsModal, directionsMode, nearestStation]); // eslint-disable-line react-hooks/exhaustive-deps

  function openDirectionsModal() {
    setDirectionsMode('car');
    setDirectionsRoutes([]);
    setDirectionsSelected(null);
    setShowDirectionsModal(true);
  }

  // ── ETA formatter ─────────────────────────────────────────────────────────────
  function fmtEta(min) {
    if (!min && min !== 0) return '--';
    if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`;
    return `${min} min`;
  }

  const fetchTrainData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/transit/`);
      setTrainData(response.data.trains || []);
      setLastUpdated(new Date());
    } catch (e) {
      setError('Could not load MARTA data. Make sure the backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrainData();
      const interval = setInterval(() => fetchTrainData(true), 30000);
      return () => clearInterval(interval);
    }, [fetchTrainData])
  );

  const lineOrder = ['RED', 'BLUE', 'GOLD', 'GREEN'];

  // Filter by selected line, then group: line → station → trains
  const filteredTrains = lineFilter === 'ALL'
    ? trainData
    : trainData.filter(t => (t.line || '').toUpperCase().includes(lineFilter));

  // Trains arriving in under 5 minutes — respects the active line filter
  const arrivingSoon = filteredTrains
    .filter(t => { const s = parseInt(t.waiting_seconds, 10); return !isNaN(s) && s >= 0 && s < 300; })
    .slice(0, 6);

  const groupedByLine = filteredTrains.reduce((acc, train) => {
    const lineKey = train.line || 'Unknown';
    const stationKey = train.station || 'Unknown';
    if (!acc[lineKey]) acc[lineKey] = {};
    if (!acc[lineKey][stationKey]) acc[lineKey][stationKey] = [];
    acc[lineKey][stationKey].push(train);
    return acc;
  }, {});

  const sortedLines = Object.keys(groupedByLine).sort((a, b) => {
    const ai = lineOrder.findIndex(k => a.toUpperCase().includes(k));
    const bi = lineOrder.findIndex(k => b.toUpperCase().includes(k));
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  function toggleLine(line) {
    setExpandedLines(prev => {
      if (prev === null) {
        // First collapse: track explicitly — all lines except this one
        return new Set(sortedLines.filter(l => l !== line));
      }
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  }

  const isExpanded = line => expandedLines === null || expandedLines.has(line);

  // Only show filter tabs for lines that have actual data
  const availableLineKeys = lineOrder.filter(key =>
    trainData.some(t => (t.line || '').toUpperCase().includes(key))
  );

  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Directions modal ───────────────────────────────────────────────── */}
      <Modal
        visible={showDirectionsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDirectionsModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDirectionsModal(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#E53935" />
              <Text style={styles.modalTitle} numberOfLines={1}>
                {nearestStation ? `${nearestStation.name} MARTA Station` : 'Nearest Station'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDirectionsModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Transport mode tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.modalModeScroll}
              contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
            >
              {DIRECTIONS_MODES.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modalModeChip, directionsMode === m.id && styles.modalModeChipActive]}
                  onPress={() => setDirectionsMode(m.id)}
                >
                  <MaterialCommunityIcons
                    name={m.icon}
                    size={16}
                    color={directionsMode === m.id ? Colors.primaryDark : Colors.textSecondary}
                  />
                  <Text style={[styles.modalModeLabel, directionsMode === m.id && styles.modalModeLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Route results */}
            <ScrollView style={styles.modalRouteScroll} nestedScrollEnabled>
              {directionsLoading ? (
                <View style={styles.modalCentered}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.modalStatusText}>Finding routes…</Text>
                </View>
              ) : directionsRoutes.length === 0 ? (
                <View style={styles.modalCentered}>
                  <MaterialCommunityIcons name="routes" size={40} color={Colors.textLight} />
                  <Text style={styles.modalStatusText}>No routes found</Text>
                </View>
              ) : (
                directionsRoutes.map((route, i) => {
                  const sel = directionsSelected === route;
                  const tl = route.traffic_level;
                  const tlColor = tl === 'high' ? '#E53935' : tl === 'medium' ? '#FFC107' : '#43A047';
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.goNowCard, sel && styles.goNowCardSelected]}
                      onPress={() => setDirectionsSelected(route)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.goNowCardRow}>
                        <View style={[styles.goNowModeIcon, sel && { backgroundColor: Colors.primary }]}>
                          <MaterialCommunityIcons
                            name={DIRECTIONS_MODES.find(m => m.id === route.commute_type)?.icon ?? 'car'}
                            size={20}
                            color={sel ? Colors.white : Colors.primary}
                          />
                        </View>
                        <View style={styles.goNowCardInfo}>
                          <Text style={styles.goNowEta}>{fmtEta(route.eta_minutes)}</Text>
                          <Text style={styles.goNowDist}>{route.distance} mi · {route.label}</Text>
                        </View>
                        <View style={[styles.goNowTrafficPill, { backgroundColor: tlColor + '22' }]}>
                          <View style={[styles.goNowTrafficDot, { backgroundColor: tlColor }]} />
                          <Text style={[styles.goNowTrafficLabel, { color: tlColor }]}>
                            {tl === 'high' ? 'Heavy' : tl === 'medium' ? 'Moderate' : 'Light'}
                          </Text>
                        </View>
                        {sel && <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} />}
                      </View>
                      {route.delay_minutes > 0 && (
                        <Text style={styles.goNowDelay}>+{route.delay_minutes} min delay</Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Start Navigation button */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.startNavBtn, !directionsSelected && styles.startNavBtnDisabled]}
                disabled={!directionsSelected}
                onPress={() => {
                  if (!directionsSelected || !nearestStation) return;
                  setShowDirectionsModal(false);
                  setPendingRoute(directionsSelected);
                  router.push({
                    pathname: '/navigation',
                    params: {
                      destLat: String(nearestStation.lat),
                      destLng: String(nearestStation.lng),
                      destName: `${nearestStation.name} MARTA Station`,
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
          <Image
            source={require('../../../assets/images1/colored-logo.png')}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('../screens/SettingsScreen')}
          >
            <MaterialCommunityIcons name="cog" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('../screens/MyAccountScreen')}
          >
            <MaterialCommunityIcons name="account" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchTrainData(true);
            }}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>MARTA Rail</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Real-time train arrivals · Pull to refresh
            {updatedStr ? `\nLast updated ${updatedStr}` : ''}
          </Text>
        </View>

        {/* ── Nearest station card ──────────────────────────────────────── */}
        {nearestStation && (
          <View style={styles.nearestCard}>
            <View style={styles.nearestHeader}>
              <MaterialCommunityIcons name="map-marker-radius" size={18} color={Colors.primary} />
              <Text style={styles.nearestLabel}>Nearest Station</Text>
              <Text style={styles.nearestDist}>{nearestStation.distanceMiles} mi away</Text>
            </View>
            <Text style={styles.nearestName}>{nearestStation.name}</Text>
            <Text style={styles.nearestLine}>{nearestStation.line} Line</Text>
            <TouchableOpacity
              style={styles.nearestDirectionsBtn}
              onPress={openDirectionsModal}
            >
              <MaterialCommunityIcons name="navigation" size={16} color={Colors.white} />
              <Text style={styles.nearestDirectionsTxt}>Directions</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.statusText}>Loading train data...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="alert-circle-outline" size={44} color="#E53935" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchTrainData()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : trainData.length === 0 ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="train-variant" size={44} color={Colors.textLight} />
            <Text style={styles.statusText}>No train arrivals available right now</Text>
          </View>
        ) : (
          <>
            {/* ── Line filter tabs — only shown when multiple lines have data ── */}
            {availableLineKeys.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterBar}
                contentContainerStyle={styles.filterBarContent}
              >
                {['ALL', ...availableLineKeys].map(key => {
                  const isActive = lineFilter === key;
                  const tabColor = key === 'ALL' ? Colors.primary : LINE_COLORS[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.filterTab, isActive && { backgroundColor: tabColor, borderColor: tabColor }]}
                      onPress={() => setLineFilter(key)}
                    >
                      <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                        {key === 'ALL' ? 'All Lines' : key.charAt(0) + key.slice(1).toLowerCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* ── Arriving Soon ─────────────────────────────────────────────────────────────── */}
            {arrivingSoon.length > 0 && (
              <View style={styles.arrivingSoonSection}>
                <View style={styles.arrivingSoonHeader}>
                  <MaterialCommunityIcons name="lightning-bolt" size={16} color="#F57F17" />
                  <Text style={styles.arrivingSoonTitle}>Arriving Soon</Text>
                </View>
                {arrivingSoon.map((train, idx) => {
                  const tColor = getLineColor(train.line);
                  const lineKey = (train.line || '').toUpperCase();
                  const chipLabel = lineKey.includes('RED') ? 'R'
                    : lineKey.includes('BLUE') ? 'B'
                    : lineKey.includes('GOLD') ? 'G'
                    : lineKey.includes('GREEN') ? 'Gr' : '?';
                  return (
                    <View
                      key={idx}
                      style={[styles.arrivingSoonRow, idx > 0 && styles.arrivingSoonRowBorder]}
                    >
                      <View style={[styles.lineChip, { backgroundColor: tColor }]}>
                        <Text style={styles.lineChipText}>{chipLabel}</Text>
                      </View>
                      <View style={styles.trainInfo}>
                        <Text style={styles.stationName} numberOfLines={1}>{train.station}</Text>
                        <View style={styles.destinationRow}>
                          <MaterialCommunityIcons name="arrow-right-circle-outline" size={13} color={tColor} />
                          <Text style={styles.destinationText} numberOfLines={1}>
                            {expandDirection(train.direction)} · To {train.destination}
                          </Text>
                        </View>
                      </View>
                      <ArrivalBadge
                        seconds={train.waiting_seconds}
                        nextArrival={train.next_arrival}
                        lineColor={tColor}
                      />
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Trains by line → station ─────────────────────────────────────────────────────── */}
            {sortedLines.map(line => {
              const color = getLineColor(line);
              const stationGroups = groupedByLine[line];
              const totalTrains = Object.values(stationGroups).flat().length;
              return (
                <View key={line} style={styles.lineSection}>
                  <TouchableOpacity
                    style={[styles.lineBanner, { backgroundColor: color }]}
                    onPress={() => toggleLine(line)}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name="train-variant" size={18} color="#fff" />
                    <Text style={styles.lineBannerText}>{getLineLabel(line)}</Text>
                    <Text style={styles.lineBannerCount}>{totalTrains} trains</Text>
                    <MaterialCommunityIcons
                      name={isExpanded(line) ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="rgba(255,255,255,0.8)"
                    />
                  </TouchableOpacity>

                  {isExpanded(line) && Object.entries(stationGroups).map(([station, stTrains]) => (
                    <View key={station}>
                      <View style={styles.stationGroupHeader}>
                        <MaterialCommunityIcons name="map-marker" size={13} color={color} />
                        <Text style={[styles.stationGroupName, { color }]}>{station}</Text>
                      </View>
                      {stTrains.map((train, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.trainRow,
                            idx === stTrains.length - 1 && styles.trainRowLast,
                          ]}
                        >
                          <View style={[styles.lineAccent, { backgroundColor: color }]} />
                          <View style={styles.trainInfo}>
                            <View style={styles.destinationRow}>
                              <MaterialCommunityIcons name="arrow-right-circle-outline" size={13} color={color} />
                              <Text style={styles.destinationText} numberOfLines={1}>
                                {expandDirection(train.direction)} · To {train.destination}
                              </Text>
                            </View>
                          </View>
                          <ArrivalBadge
                            seconds={train.waiting_seconds}
                            nextArrival={train.next_arrival}
                            lineColor={color}
                          />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53935',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.round,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  statusText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  lineSection: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  lineBannerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  lineBannerCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  trainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.md,
  },
  trainRowLast: {
    borderBottomWidth: 0,
  },
  lineAccent: {
    width: 4,
    alignSelf: 'stretch',
    marginRight: Spacing.sm,
  },
  trainInfo: {
    flex: 1,
    gap: 2,
  },
  stationName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  destinationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  arrivalBadgeWrap: {
    alignItems: 'center',
    marginLeft: Spacing.sm,
    gap: 4,
  },
  arrivalBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 64,
    alignItems: 'center',
    gap: 1,
  },
  arrivalBadgeLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    opacity: 0.85,
  },
  arrivalBadgeTime: {
    fontSize: 15,
    fontWeight: '700',
  },
  arrivalAtText: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
  },
  bottomPad: {
    height: Spacing.xxl,
  },
  // Nearest station card
  nearestCard: {
    margin: Spacing.md,
    marginBottom: 0,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  nearestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  nearestLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nearestDist: {
    fontSize: 12,
    color: Colors.textLight,
  },
  nearestName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  nearestLine: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  nearestDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  nearestDirectionsTxt: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  // Line filter tabs
  filterBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterBarContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  // Arriving Soon section
  arrivingSoonSection: {
    margin: Spacing.md,
    marginBottom: 0,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  arrivingSoonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFDE7',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  arrivingSoonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F57F17',
  },
  arrivingSoonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  arrivingSoonRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lineChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  // ── Directions modal ──────────────────────────────────────────────────────────
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
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalModeScroll: {
    marginVertical: Spacing.md,
  },
  modalModeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.backgroundGray,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  modalModeChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  modalModeLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modalModeLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  modalRouteScroll: {
    maxHeight: 240,
    paddingHorizontal: Spacing.md,
  },
  modalCentered: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  modalStatusText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  goNowCard: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  goNowCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  goNowCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  goNowModeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goNowCardInfo: {
    flex: 1,
    gap: 2,
  },
  goNowEta: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  goNowDist: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  goNowTrafficPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.round,
    gap: 4,
  },
  goNowTrafficDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  goNowTrafficLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  goNowDelay: {
    fontSize: 11,
    color: '#E53935',
    marginTop: 4,
    marginLeft: 48,
  },
  modalActions: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  startNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  startNavBtnDisabled: {
    opacity: 0.5,
  },
  startNavText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  // Station sub-header within a line section
  stationGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.backgroundGray,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  stationGroupName: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
