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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import axios from 'axios';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { API_BASE_URL } from '../../constants/api';
import { findNearestStation } from '../../services/routeService';

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
        const station = findNearestStation(loc.coords.latitude, loc.coords.longitude);
        setNearestStation(station);
      } catch { /* silent */ }
    })();
  }, []);

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

  const groupedByLine = trainData.reduce((acc, train) => {
    const key = train.line || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(train);
    return acc;
  }, {});

  // Sort lines in a consistent order: RED, BLUE, GOLD, GREEN, then others
  const lineOrder = ['RED', 'BLUE', 'GOLD', 'GREEN'];
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

  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.logoButton}>
          <Image
            source={require('../../../assets/images1/colored-logo.png')}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons name="menu" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
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
              onPress={() =>
                router.push({
                  pathname: '/navigation',
                  params: {
                    destLat: String(nearestStation.lat),
                    destLng: String(nearestStation.lng),
                    destName: `${nearestStation.name} MARTA Station`,
                  },
                })
              }
            >
              <MaterialCommunityIcons name="walk" size={16} color={Colors.white} />
              <Text style={styles.nearestDirectionsTxt}>Walk Directions</Text>
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
          sortedLines.map(line => {
            const color = getLineColor(line);
            const trains = groupedByLine[line];
            return (
              <View key={line} style={styles.lineSection}>
                <TouchableOpacity
                  style={[styles.lineBanner, { backgroundColor: color }]}
                  onPress={() => toggleLine(line)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="train-variant" size={18} color="#fff" />
                  <Text style={styles.lineBannerText}>{getLineLabel(line)}</Text>
                  <Text style={styles.lineBannerCount}>{trains.length} trains</Text>
                  <MaterialCommunityIcons
                    name={isExpanded(line) ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="rgba(255,255,255,0.8)"
                  />
                </TouchableOpacity>

                {isExpanded(line) && trains.map((train, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.trainRow,
                      idx === trains.length - 1 && styles.trainRowLast,
                    ]}
                  >
                    <View style={[styles.lineAccent, { backgroundColor: color }]} />
                    <View style={styles.trainInfo}>
                      <Text style={styles.stationName} numberOfLines={1}>
                        {train.station}
                      </Text>
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
            );
          })
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
});
