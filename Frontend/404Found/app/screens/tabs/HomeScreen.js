import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchAlerts,
  fetchTrafficIncidents,
  subtypeIcon,
  subtypeColor,
  submitAlert,
  ICON_ALERT_TYPES,
  URGENCY_LEVELS,
} from '../../services/alertService';
import { suggestPlaces, getRoutes, geocodePlace } from '../../services/routeService';
import { setPendingRoute } from '../../services/routeStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_PLACES_KEY = '@404found:recent_places';
const MAX_RECENT = 5;

// GSU campus as the default centre when location is unavailable
const GSU_REGION = {
  latitude: 33.7534,
  longitude: -84.3863,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const DEBOUNCE_MS = 400; // wait 400 ms after last keystroke before calling API

const GO_NOW_MODES = [
  { id: 'car',        label: 'Drive',   icon: 'car' },
  { id: 'pedestrian', label: 'Walk',    icon: 'walk' },
  { id: 'bicycle',    label: 'Bike',    icon: 'bike' },
  { id: 'transit',    label: 'Transit', icon: 'train' },
];

// ── Incident severity → marker colour ─────────────────────────────────────────
function incidentColor(severity) {
  switch ((severity || '').toLowerCase()) {
    case 'critical': return '#C0392B';
    case 'major':    return '#E74C3C';
    case 'minor':    return '#F39C12';
    default:         return '#BDC3C7';
  }
}

function bubbleBorderColor(urgency) {
  switch (urgency) {
    case 'high':   return '#F44336';
    case 'medium': return '#FFC107';
    case 'low':    return '#4CAF50';
    default:       return '#9E9E9E';
  }
}

// ── NavReportSheet ─────────────────────────────────────────────────────────────
// The same compact bottom-sheet used in NavigationScreen, reused here so the
// HomeScreen map also has a quick-report overlay without navigating away.

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
      Alert.alert('Select a type', 'Please pick an alert type.');
      return;
    }
    if (alertKind === 'comment' && !description.trim()) {
      Alert.alert('Description required', 'Please describe the situation.');
      return;
    }

    setSubmitting(true);
    try {
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
      Alert.alert('Error', msg);
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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const debounceTimer = useRef(null);
  // Mirrors userLocation for use in the polling interval closure (avoids stale closure).
  const userLocationRef = useRef(null);

  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Go Now modal state ─────────────────────────────────────────────────────
  const [showGoNow, setShowGoNow] = useState(false);
  const [goNowDest, setGoNowDest] = useState(null); // { title, lat, lng }
  const [goNowMode, setGoNowMode] = useState('car');
  const [goNowRoutes, setGoNowRoutes] = useState([]);
  const [goNowLoading, setGoNowLoading] = useState(false);
  const [goNowSelected, setGoNowSelected] = useState(null);

  // ── Report sheet state ─────────────────────────────────────────────────────
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Recent places – persisted across sessions with AsyncStorage
  const [recentPlaces, setRecentPlaces] = useState([]);

  // ── Recent places – load from storage on mount ────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(RECENT_PLACES_KEY)
      .then(raw => { if (raw) setRecentPlaces(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  async function saveRecentPlace(item) {
    try {
      const entry = { id: item.title, name: item.title, lat: item.lat, lng: item.lng };
      const prev = await AsyncStorage.getItem(RECENT_PLACES_KEY);
      const list = prev ? JSON.parse(prev) : [];
      // Move to front if already present, then cap at MAX_RECENT
      const filtered = list.filter(p => p.name !== entry.name);
      const next = [entry, ...filtered].slice(0, MAX_RECENT);
      await AsyncStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(next));
      setRecentPlaces(next);
    } catch { /* silent — recents are best-effort */ }
  }

  // ── Location permission & initial fetch ────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Access', 'Enable location in Settings to see traffic near you.');
        setLocationLoading(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(loc.coords);
      } catch {
        // Fall back to GSU silently
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  // Keep ref in sync so the polling interval closure never reads a stale location.
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // ── Fetch alerts & incidents whenever screen is focused ────────────────────
  const loadMapData = useCallback(async () => {
    setDataLoading(true);
    try {
      const lat = userLocation?.latitude ?? GSU_REGION.latitude;
      const lng = userLocation?.longitude ?? GSU_REGION.longitude;
      const [alertData, incidentData] = await Promise.all([
        fetchAlerts(lat, lng),
        fetchTrafficIncidents(lat, lng, 8000),
      ]);
      setAlerts(alertData);
      setIncidents(incidentData);
    } catch (err) {
      console.warn('[HomeScreen] map data fetch failed:', err.message);
    } finally {
      setDataLoading(false);
    }
  }, [userLocation]);

  useFocusEffect(
    useCallback(() => { loadMapData(); }, [loadMapData]),
  );

  // ── Background alert polling ───────────────────────────────────────────────
  // Refreshes only the alert markers every 30 s so community reports from
  // AlertsScreen or other users appear on the map without requiring a tab
  // switch.  Uses userLocationRef to avoid a stale closure.
  useEffect(() => {
    const poll = () => {
      const loc = userLocationRef.current;
      const lat = loc?.latitude ?? GSU_REGION.latitude;
      const lng = loc?.longitude ?? GSU_REGION.longitude;
      fetchAlerts(lat, lng)
        .then(data => setAlerts(data))
        .catch(() => {});
    };
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Go Now route fetching ─────────────────────────────────────────────────
  const fetchGoNowRoutes = useCallback(async () => {
    if (!goNowDest) return;
    setGoNowLoading(true);
    setGoNowRoutes([]);
    setGoNowSelected(null);
    try {
      const origin = userLocation
        ? [userLocation.latitude, userLocation.longitude]
        : [GSU_REGION.latitude, GSU_REGION.longitude];
      const dest = [goNowDest.lat, goNowDest.lng];
      const routes = await getRoutes(origin, dest, goNowMode);
      setGoNowRoutes(routes);
      if (routes.length > 0) setGoNowSelected(routes[0]);
    } catch { /* silent – will show empty state */ }
    finally { setGoNowLoading(false); }
  }, [goNowDest, goNowMode, userLocation]);

  useEffect(() => {
    if (showGoNow && goNowDest) fetchGoNowRoutes();
  }, [showGoNow, goNowMode, goNowDest]); // eslint-disable-line react-hooks/exhaustive-deps

  function openGoNow(item) {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchQuery('');
    setGoNowDest(item);
    setGoNowMode('car');
    setGoNowRoutes([]);
    setGoNowSelected(null);
    setShowGoNow(true);
    saveRecentPlace(item);
  }

  // ── Autocomplete – debounced ────────────────────────────────────────────────
  function onSearchChange(text) {
    setSearchQuery(text);

    clearTimeout(debounceTimer.current);

    if (text.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const lat = userLocation?.latitude ?? null;
        const lng = userLocation?.longitude ?? null;
        const results = await suggestPlaces(text.trim(), lat, lng);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        // Non-fatal – suggestion list stays empty
      } finally {
        setSuggestLoading(false);
      }
    }, DEBOUNCE_MS);
  }

  function onSuggestionPress(item) {
    openGoNow(item);
  }

  async function onSearchSubmit() {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setShowSuggestions(false);
    try {
      const geo = await geocodePlace(searchQuery.trim());
      if (geo?.lat && geo?.lng) {
        openGoNow({ title: searchQuery.trim(), lat: geo.lat, lng: geo.lng });
      }
    } catch { /* silent */ }
  }

  // ── Re-centre ─────────────────────────────────────────────────────────────
  function recenterMap() {
    if (!userLocation || !mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 600);
  }

  // ── Alert submit handler ────────────────────────────────────────────────────
  async function handleAlertSubmit(payload) {
    const newAlert = await submitAlert(payload);
    // Prepend so the new marker appears on the map immediately without waiting
    // for the next 30-second polling cycle.
    setAlerts(prev => [newAlert, ...prev]);
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 2500);
  }

  const mapRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : GSU_REGION;

  // ── Marker renderers ───────────────────────────────────────────────────────

  function renderAlertMarker(alert) {
    if (!alert.lat || !alert.lng) return null;

    if (alert.is_comment) {
      const borderColor = bubbleBorderColor(alert.urgency);
      return (
        <Marker
          key={`comment-${alert.alert_id}`}
          coordinate={{ latitude: alert.lat, longitude: alert.lng }}
        >
          <View style={[styles.commentBubble, { borderColor }]}>
            <MaterialCommunityIcons name="dots-horizontal" size={16} color={borderColor} />
          </View>
          <Callout tooltip>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{alert.type}</Text>
              <Text style={styles.calloutBody}>{alert.description}</Text>
              {alert.location ? <Text style={styles.calloutSub}>{alert.location}</Text> : null}
              <View style={styles.calloutVotes}>
                <MaterialCommunityIcons name="thumb-up-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.calloutVoteText}>{alert.upvotes}</Text>
                <MaterialCommunityIcons name="thumb-down-outline" size={12} color={Colors.textSecondary} style={{ marginLeft: 8 }} />
                <Text style={styles.calloutVoteText}>{alert.downvotes}</Text>
              </View>
            </View>
          </Callout>
        </Marker>
      );
    }

    const iconName = subtypeIcon(alert.subtype);
    const iconColor = subtypeColor(alert.subtype);
    return (
      <Marker
        key={`icon-${alert.alert_id}`}
        coordinate={{ latitude: alert.lat, longitude: alert.lng }}
      >
        <View style={[styles.iconMarker, { backgroundColor: iconColor + '22', borderColor: iconColor }]}>
          <MaterialCommunityIcons name={iconName} size={18} color={iconColor} />
        </View>
        <Callout tooltip>
          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>{alert.subtype?.replace(/_/g, ' ') ?? alert.type}</Text>
            <Text style={styles.calloutBody}>{alert.description}</Text>
            {alert.location ? <Text style={styles.calloutSub}>{alert.location}</Text> : null}
            <View style={styles.calloutVotes}>
              <MaterialCommunityIcons name="thumb-up-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.calloutVoteText}>{alert.upvotes}</Text>
              <MaterialCommunityIcons name="thumb-down-outline" size={12} color={Colors.textSecondary} style={{ marginLeft: 8 }} />
              <Text style={styles.calloutVoteText}>{alert.downvotes}</Text>
            </View>
          </View>
        </Callout>
      </Marker>
    );
  }

  function renderIncidentMarker(incident) {
    if (!incident.lat || !incident.lng) return null;
    const color = incidentColor(incident.severity);
    return (
      <Marker
        key={`incident-${incident.id}`}
        coordinate={{ latitude: incident.lat, longitude: incident.lng }}
        pinColor={color}
      >
        <Callout tooltip>
          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>{incident.type}</Text>
            <Text style={styles.calloutBody}>{incident.description || 'No details'}</Text>
            <Text style={[styles.calloutSub, { color }]}>Severity: {incident.severity}</Text>
          </View>
        </Callout>
      </Marker>
    );
  }

  const renderRecentPlace = ({ item }) => (
    <TouchableOpacity
      style={styles.recentItem}
      onPress={() => openGoNow({ title: item.name, lat: item.lat, lng: item.lng })}
    >
      <MaterialCommunityIcons name="history" size={24} color={Colors.textSecondary} />
      <Text style={styles.recentText}>{item.name}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textLight} />
    </TouchableOpacity>
  );

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => onSuggestionPress(item)}>
      <MaterialCommunityIcons name="map-marker-outline" size={18} color={Colors.primary} />
      <View style={styles.suggestionText}>
        <Text style={styles.suggestionTitle} numberOfLines={1}>{item.title}</Text>
        {item.address ? (
          <Text style={styles.suggestionAddress} numberOfLines={1}>{item.address}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  // ── ETA formatter for GoNow cards ─────────────────────────────────────────
  function fmtEta(min) {
    if (!min && min !== 0) return '--';
    if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`;
    return `${min} min`;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar style="dark" />

      {/* ── Go Now Modal ───────────────────────────────────────────────────── */}
      <Modal
        visible={showGoNow}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGoNow(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowGoNow(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#E53935" />
              <Text style={styles.modalTitle} numberOfLines={1}>{goNowDest?.title ?? 'Destination'}</Text>
              <TouchableOpacity onPress={() => setShowGoNow(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Transport mode tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalModeScroll} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}>
              {GO_NOW_MODES.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modalModeChip, goNowMode === m.id && styles.modalModeChipActive]}
                  onPress={() => setGoNowMode(m.id)}
                >
                  <MaterialCommunityIcons
                    name={m.icon}
                    size={16}
                    color={goNowMode === m.id ? Colors.primaryDark : Colors.textSecondary}
                  />
                  <Text style={[styles.modalModeLabel, goNowMode === m.id && styles.modalModeLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Route results */}
            <ScrollView style={styles.modalRouteScroll} nestedScrollEnabled>
              {goNowLoading ? (
                <View style={styles.modalCentered}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.modalStatusText}>Finding routes…</Text>
                </View>
              ) : goNowRoutes.length === 0 ? (
                <View style={styles.modalCentered}>
                  <MaterialCommunityIcons name="routes" size={40} color={Colors.textLight} />
                  <Text style={styles.modalStatusText}>No routes found</Text>
                </View>
              ) : (
                goNowRoutes.map((route, i) => {
                  const sel = goNowSelected === route;
                  const tl = route.traffic_level;
                  const tlColor = tl === 'high' ? '#E53935' : tl === 'medium' ? '#FFC107' : '#43A047';
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.goNowCard, sel && styles.goNowCardSelected]}
                      onPress={() => setGoNowSelected(route)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.goNowCardRow}>
                        <View style={[styles.goNowModeIcon, sel && { backgroundColor: Colors.primary }]}>
                          <MaterialCommunityIcons
                            name={GO_NOW_MODES.find(m => m.id === route.commute_type)?.icon ?? 'car'}
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

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.startNavBtn, !goNowSelected && styles.startNavBtnDisabled]}
                disabled={!goNowSelected}
                onPress={() => {
                  if (!goNowSelected || !goNowDest) return;
                  setShowGoNow(false);
                  setPendingRoute(goNowSelected);
                  router.push({
                    pathname: '/navigation',
                    params: {
                      destLat: String(goNowDest.lat),
                      destLng: String(goNowDest.lng),
                      destName: goNowDest.title,
                    },
                  });
                }}
              >
                <MaterialCommunityIcons name="navigation" size={18} color={Colors.white} />
                <Text style={styles.startNavText}>Start Navigation</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.planTripBtn}
                onPress={() => {
                  setShowGoNow(false);
                  router.push({
                    pathname: '/(tabs)/routes',
                    params: {
                      destName: goNowDest?.title,
                      destLat: String(goNowDest?.lat ?? ''),
                      destLng: String(goNowDest?.lng ?? ''),
                    },
                  });
                }}
              >
                <MaterialCommunityIcons name="calendar-clock" size={16} color={Colors.primary} />
                <Text style={styles.planTripText}>Plan / Schedule Trip</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoButton}>
          <MaterialCommunityIcons name="map-marker" size={28} color={Colors.primaryDark} />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons name="menu" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('../../screens/SettingsScreen')}
          >
            <MaterialCommunityIcons name="cog" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('../../screens/MyAccountScreen')}
          >
            <MaterialCommunityIcons name="account" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {locationLoading ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.mapLoadingText}>Getting your location…</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={mapRegion}
            showsUserLocation
            showsMyLocationButton={false}
            showsTraffic
            showsPointsOfInterest={false}
            loadingEnabled
            onPress={() => Keyboard.dismiss()}
          >
            {alerts.map(renderAlertMarker)}
            {incidents.map(renderIncidentMarker)}
          </MapView>
        )}

        {dataLoading && !locationLoading && (
          <View style={styles.dataLoadingBadge}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}

        <TouchableOpacity style={styles.locationButton} onPress={recenterMap}>
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => setShowReportSheet(true)}
        >
          <MaterialCommunityIcons name="alert-plus" size={22} color={Colors.white} />
        </TouchableOpacity>

      </View>

      {/* Alert reported success toast */}
      {reportSuccess && (
        <View style={styles.successToast}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />
          <Text style={styles.successToastText}>Alert reported!</Text>
        </View>
      )}

      {/* Report alert bottom sheet */}
      <NavReportSheet
        visible={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        onSubmit={handleAlertSubmit}
        userLocation={userLocation}
      />

      {/* Bottom Sheet */}
      <View style={[styles.bottomSheet, { paddingBottom: Platform.OS === 'ios' ? 100 : 80 }]}>
        <Text style={styles.whereToTitle}>Where to?</Text>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={24} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a place…"
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={onSearchChange}
            returnKeyType="search"
            onSubmitEditing={onSearchSubmit}
            onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {suggestLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }}>
              <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Autocomplete suggestions */}
        {showSuggestions && (
          <View style={styles.suggestionList}>
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(_, i) => String(i)}
              keyboardShouldPersistTaps="always"
              scrollEnabled={suggestions.length > 4}
            />
          </View>
        )}

        {/* Recent places (hidden while suggestions are showing) */}
        {!showSuggestions && (
          <>
            <Text style={styles.recentTitle}>Recent</Text>
            {recentPlaces.length === 0 ? (
              <Text style={styles.recentEmpty}>Your recent searches will appear here.</Text>
            ) : (
              <FlatList
                data={recentPlaces}
                renderItem={renderRecentPlace}
                keyExtractor={item => item.id}
                scrollEnabled={false}
              />
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

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
    zIndex: 10,
  },
  logoButton: {
    width: 50, height: 50,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  headerIcons: { flexDirection: 'row', gap: Spacing.md },
  iconButton: { padding: Spacing.xs },
  mapContainer: { flex: 1, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.backgroundGray },
  mapLoadingText: { marginTop: Spacing.sm, color: Colors.textSecondary, fontSize: 14 },
  dataLoadingBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: Colors.white, borderRadius: BorderRadius.round,
    width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
  },
  locationButton: {
    position: 'absolute', bottom: 80, right: 16,
    width: 48, height: 48, backgroundColor: Colors.white,
    borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
  },
  reportButton: {
    position: 'absolute', bottom: 136, right: 16,
    width: 48, height: 48, backgroundColor: Colors.primary,
    borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  // Markers
  iconMarker: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.white,
  },
  commentBubble: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.sm,
    borderWidth: 2, paddingHorizontal: 6, paddingVertical: 4,
    minWidth: 32, alignItems: 'center',
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 3,
  },
  callout: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    padding: Spacing.sm, maxWidth: 220,
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  calloutTitle: { fontWeight: '700', fontSize: 13, color: Colors.textPrimary, marginBottom: 2, textTransform: 'capitalize' },
  calloutBody: { fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  calloutSub: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  calloutVotes: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 3 },
  calloutVoteText: { fontSize: 11, color: Colors.textSecondary },
  // Bottom sheet
  bottomSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    minHeight: '35%',
    zIndex: 20,
  },
  whereToTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Spacing.md },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1, borderColor: Colors.border,
    gap: Spacing.xs,
  },
  searchInput: { flex: 1, fontSize: 16, color: Colors.textPrimary, marginLeft: Spacing.xs },
  // Suggestions
  suggestionList: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  suggestionText: { flex: 1 },
  suggestionTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  suggestionAddress: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  // Recent
  recentTitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: Spacing.md, marginTop: Spacing.sm },
  recentItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  recentText: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  recentEmpty: { fontSize: 14, color: Colors.textLight, paddingVertical: Spacing.sm },

  // Suggestion overlay – floats over the map just above the bottom sheet
  suggestionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 240,
    zIndex: 100,
    elevation: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  // Success toast
  successToast: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#43A047',
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    zIndex: 200,
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  successToastText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Go Now Modal ──────────────────────────────────────────────────────────
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
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: {
    flex: 1, fontSize: 17, fontWeight: '700', color: Colors.textPrimary,
  },
  modalModeScroll: {
    marginVertical: Spacing.md,
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
  modalRouteScroll: { maxHeight: 240, paddingHorizontal: Spacing.md },
  modalCentered: {
    alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm,
  },
  modalStatusText: { fontSize: 14, color: Colors.textSecondary },
  goNowCard: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  goNowCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  goNowCardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  goNowModeIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  goNowCardInfo: { flex: 1, gap: 2 },
  goNowEta: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  goNowDist: { fontSize: 12, color: Colors.textSecondary },
  goNowTrafficPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.round, gap: 4,
  },
  goNowTrafficDot: { width: 6, height: 6, borderRadius: 3 },
  goNowTrafficLabel: { fontSize: 11, fontWeight: '600' },
  goNowDelay: { fontSize: 11, color: '#E53935', marginTop: 4, marginLeft: 48 },
  modalActions: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
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
  planTripBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primary,
  },
  planTripText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
});

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
