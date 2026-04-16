import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Keyboard,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import axios from 'axios';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { getRoutes, planRoutes, geocodePlace, suggestPlaces, timeObjectToISO } from '../../services/routeService';
import { API_BASE_URL } from '../../constants/api';
import { setPendingRoute } from '../../services/routeStore';

// ── MARTA helpers ─────────────────────────────────────────────────────────────

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

function formatWait(seconds) {
  const s = parseInt(seconds, 10);
  if (isNaN(s) || s < 0) return '--';
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)} min`;
}

function getSoonestByLine(trains) {
  const seen = {};
  return [...trains]
    .sort((a, b) => parseInt(a.waiting_seconds, 10) - parseInt(b.waiting_seconds, 10))
    .filter(t => {
      const key = (t.line || '').toUpperCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function timeToMinutes({ h, m, isPM }) {
  const hour24 = isPM ? (h === 12 ? 12 : h + 12) : h === 12 ? 0 : h;
  return hour24 * 60 + m;
}

function minutesToTime(totalMins) {
  const wrapped = ((totalMins % 1440) + 1440) % 1440;
  const hour24 = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const isPM = hour24 >= 12;
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { h, m, isPM };
}

function formatTime({ h, m, isPM }) {
  return `${h}:${String(m).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
}

// ── Transport modes ───────────────────────────────────────────────────────────

const TRANSPORT_MODES = [
  { id: 'car',        label: 'Drive',   icon: 'car',           apiMode: 'car' },
  { id: 'transit',    label: 'Transit', icon: 'train',         apiMode: 'transit' },
  { id: 'pedestrian', label: 'Walk',    icon: 'walk',          apiMode: 'pedestrian' },
  { id: 'bicycle',    label: 'Bike',    icon: 'bike',          apiMode: 'bicycle' },
];

// ── Traffic level pill ────────────────────────────────────────────────────────

function TrafficPill({ level }) {
  const map = {
    low:    { label: 'Light',    bg: '#E8F5E9', text: '#2E7D32' },
    medium: { label: 'Moderate', bg: '#FFF8E1', text: '#F57F17' },
    high:   { label: 'Heavy',    bg: '#FFEBEE', text: '#C62828' },
  };
  const style = map[level] ?? map.low;
  return (
    <View style={[trafficPillStyles.pill, { backgroundColor: style.bg }]}>
      <View style={[trafficPillStyles.dot, { backgroundColor: style.text }]} />
      <Text style={[trafficPillStyles.label, { color: style.text }]}>{style.label}</Text>
    </View>
  );
}

const trafficPillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.round,
    gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: '600' },
});

// ── Time Picker Modal ─────────────────────────────────────────────────────────

function TimePickerModal({ visible, time, onChange, onClose, title = 'Select Time' }) {
  const [draft, setDraft] = useState(time);

  useEffect(() => {
    if (visible) setDraft(time);
  }, [visible, time]);

  function adjustHour(delta) {
    setDraft(prev => {
      let h = prev.h + delta;
      if (h > 12) h = 1;
      if (h < 1) h = 12;
      return { ...prev, h };
    });
  }

  function adjustMinute(delta) {
    setDraft(prev => {
      let m = prev.m + delta;
      if (m >= 60) m = 0;
      if (m < 0) m = 55;
      return { ...prev, m };
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pickerStyles.overlay} onPress={onClose}>
        <Pressable style={pickerStyles.card} onPress={e => e.stopPropagation()}>
          <Text style={pickerStyles.title}>{title}</Text>
          <View style={pickerStyles.row}>
            <View style={pickerStyles.spinner}>
              <TouchableOpacity onPress={() => adjustHour(1)} style={pickerStyles.arrow}>
                <MaterialCommunityIcons name="chevron-up" size={28} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={pickerStyles.spinnerValue}>{draft.h}</Text>
              <TouchableOpacity onPress={() => adjustHour(-1)} style={pickerStyles.arrow}>
                <MaterialCommunityIcons name="chevron-down" size={28} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={pickerStyles.colon}>:</Text>
            <View style={pickerStyles.spinner}>
              <TouchableOpacity onPress={() => adjustMinute(5)} style={pickerStyles.arrow}>
                <MaterialCommunityIcons name="chevron-up" size={28} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={pickerStyles.spinnerValue}>{String(draft.m).padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => adjustMinute(-5)} style={pickerStyles.arrow}>
                <MaterialCommunityIcons name="chevron-down" size={28} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={pickerStyles.ampm}
              onPress={() => setDraft(p => ({ ...p, isPM: !p.isPM }))}
            >
              <Text style={[pickerStyles.ampmOption, !draft.isPM && pickerStyles.ampmActive]}>AM</Text>
              <Text style={[pickerStyles.ampmOption, draft.isPM && pickerStyles.ampmActive]}>PM</Text>
            </TouchableOpacity>
          </View>
          <View style={pickerStyles.actions}>
            <TouchableOpacity style={pickerStyles.cancelBtn} onPress={onClose}>
              <Text style={pickerStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={pickerStyles.confirmBtn}
              onPress={() => { onChange(draft); onClose(); }}
            >
              <Text style={pickerStyles.confirmText}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── MARTA Live Widget ─────────────────────────────────────────────────────────

function MartaLiveWidget({ trains, loading, error }) {
  if (loading) {
    return (
      <View style={widgetStyles.container}>
        <View style={widgetStyles.header}>
          <MaterialCommunityIcons name="train-variant" size={16} color={Colors.textSecondary} />
          <Text style={widgetStyles.headerText}>MARTA Live</Text>
        </View>
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.sm }} />
      </View>
    );
  }
  if (error || trains.length === 0) {
    return (
      <View style={widgetStyles.container}>
        <View style={widgetStyles.header}>
          <MaterialCommunityIcons name="train-variant" size={16} color={Colors.textSecondary} />
          <Text style={widgetStyles.headerText}>MARTA Live</Text>
        </View>
        <Text style={widgetStyles.emptyText}>{error ? 'Data unavailable' : 'No arrivals right now'}</Text>
      </View>
    );
  }
  const soonest = getSoonestByLine(trains);
  return (
    <View style={widgetStyles.container}>
      <View style={widgetStyles.header}>
        <MaterialCommunityIcons name="train-variant" size={16} color={Colors.textSecondary} />
        <Text style={widgetStyles.headerText}>MARTA Live Arrivals</Text>
        <View style={widgetStyles.livePill}>
          <View style={widgetStyles.liveDot} />
          <Text style={widgetStyles.liveLabel}>LIVE</Text>
        </View>
      </View>
      {soonest.map((train, idx) => {
        const color = getLineColor(train.line);
        const urgent = parseInt(train.waiting_seconds, 10) <= 120;
        return (
          <View key={idx} style={widgetStyles.row}>
            <View style={[widgetStyles.lineDot, { backgroundColor: color }]} />
            <View style={widgetStyles.rowInfo}>
              <Text style={widgetStyles.lineName}>{getLineLabel(train.line)}</Text>
              <Text style={widgetStyles.stationText} numberOfLines={1}>
                {train.station} → {train.destination}
              </Text>
            </View>
            <View style={[widgetStyles.waitBadge, urgent && { backgroundColor: color }]}>
              <Text style={[widgetStyles.waitText, urgent && { color: '#fff' }]}>
                {formatWait(train.waiting_seconds)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Route Map Preview ─────────────────────────────────────────────────────────

function RouteMapPreview({ route }) {
  const [mapReady, setMapReady] = React.useState(false);

  if (!route?.decoded_coords?.length) {
    console.log('[RouteMapPreview] No decoded_coords — map preview hidden. route keys:', route ? Object.keys(route) : 'null');
    return null;
  }

  const coords = route.decoded_coords.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
  console.log('[RouteMapPreview] decoded_coords count:', coords.length, 'sample:', JSON.stringify(coords.slice(0, 2)));

  // Compute bounding box so the polyline always fills the preview regardless of length
  const lats = coords.map(c => c.latitude);
  const lngs = coords.map(c => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPad = Math.max((maxLat - minLat) * 0.3, 0.004);
  const lngPad = Math.max((maxLng - minLng) * 0.3, 0.004);
  const region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: (maxLat - minLat) + latPad * 2,
    longitudeDelta: (maxLng - minLng) + lngPad * 2,
  };

  return (
    <View style={mapPreviewStyles.container}>
      <MapView
        style={mapPreviewStyles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        showsPointsOfInterest={false}
        pointerEvents="none"
        onMapReady={() => {
          console.log('[RouteMapPreview] onMapReady fired, coords:', coords.length);
          setMapReady(true);
        }}
      >
        {/* Gate on mapReady — on the new Fabric architecture a Polyline mounted
            before the native map layer is ready enters an invalid state and never
            renders, even after the coordinates prop updates. */}
        {mapReady && (
          <Polyline
            key={coords.length}
            coordinates={coords}
            strokeColor={Colors.primary}
            strokeWidth={4}
          />
        )}
        {mapReady && <Marker coordinate={coords[0]} pinColor={Colors.primaryDark ?? Colors.primary} />}
        {mapReady && <Marker coordinate={coords[coords.length - 1]} pinColor="#E53935" />}
      </MapView>
    </View>
  );
}

const mapPreviewStyles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: { flex: 1 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function RoutesScreen() {
  const router = useRouter();
  const mapRef = useRef(null);

  // Accept destination pre-filled from HomeScreen search / recent places
  const { destName, destLat, destLng } = useLocalSearchParams();

  // Origin – default to user's current location; tap to switch to typed input
  const [originMode, setOriginMode] = useState('current'); // 'current' | 'typed'
  const [originText, setOriginText] = useState('');
  const [originSelectedCoords, setOriginSelectedCoords] = useState(null);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [showOriginSugg, setShowOriginSugg] = useState(false);

  // Destination – empty by default; populated if coming from HomeScreen params
  const [destination, setDestination] = useState(destName || '');
  const [destSelectedCoords, setDestSelectedCoords] = useState(
    (destLat && destLng && !isNaN(parseFloat(destLat)))
      ? [parseFloat(destLat), parseFloat(destLng)]
      : null,
  );
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showDestSugg, setShowDestSugg] = useState(false);

  const suggestTimer = useRef(null);
  const [selectedMode, setSelectedMode] = useState('car');
  const [planMode, setPlanMode] = useState('leave_at'); // 'arrive_by' | 'leave_at'
  const [arriveBy, setArriveBy] = useState({ h: 9, m: 0, isPM: false });
  const [leaveAt, setLeaveAt] = useState({ h: 8, m: 0, isPM: false });
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [transitExpanded, setTransitExpanded] = useState(false);

  const [trainData, setTrainData] = useState([]);
  const [trainLoading, setTrainLoading] = useState(true);
  const [trainError, setTrainError] = useState(null);

  const [userLocation, setUserLocation] = useState(null);

  // ── User location ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation(loc.coords);
      } catch { /* silent */ }
    })();
  }, []);

  // ── Auto-search when screen is opened with a destination param ─────────────
  const autoSearchFired = useRef(false);
  useEffect(() => {
    if (destName && !autoSearchFired.current) {
      autoSearchFired.current = true;
      setDestination(destName);
      if (destLat && destLng && !isNaN(parseFloat(destLat))) {
        setDestSelectedCoords([parseFloat(destLat), parseFloat(destLng)]);
      }
      const t = setTimeout(() => searchRoutes(), 600);
      return () => clearTimeout(t);
    }
  }, [destName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── MARTA polling ──────────────────────────────────────────────────────────
  const fetchTrainData = useCallback(async () => {
    setTrainError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/transit/`);
      setTrainData(response.data.trains || []);
    } catch {
      setTrainError('Could not load MARTA data.');
    } finally {
      setTrainLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrainData();
      const interval = setInterval(fetchTrainData, 30000);
      return () => clearInterval(interval);
    }, [fetchTrainData]),
  );

  // ── Autosuggest helpers ────────────────────────────────────────────────────
  function fetchOriginSuggestions(text) {
    clearTimeout(suggestTimer.current);
    if (text.length < 2) { setOriginSuggestions([]); setShowOriginSugg(false); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const results = await suggestPlaces(text, userLocation?.latitude ?? null, userLocation?.longitude ?? null);
        setOriginSuggestions(results);
        setShowOriginSugg(results.length > 0);
      } catch { /* silent */ }
    }, 300);
  }

  function fetchDestSuggestions(text) {
    clearTimeout(suggestTimer.current);
    if (text.length < 2) { setDestSuggestions([]); setShowDestSugg(false); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const results = await suggestPlaces(text, userLocation?.latitude ?? null, userLocation?.longitude ?? null);
        setDestSuggestions(results);
        setShowDestSugg(results.length > 0);
      } catch { /* silent */ }
    }, 300);
  }

  // ── Route search ───────────────────────────────────────────────────────────
  async function searchRoutes() {
    setRoutesError(null);
    setRoutesLoading(true);
    setRoutes([]);
    setSelectedRoute(null);

    try {
      // Resolve origin coordinates
      let originCoords;
      if (originMode === 'current') {
        if (!userLocation) {
          setRoutesError('Still acquiring your location. Please wait a moment and try again.');
          setRoutesLoading(false);
          return;
        }
        originCoords = [userLocation.latitude, userLocation.longitude];
      } else if (originSelectedCoords) {
        originCoords = originSelectedCoords;
      } else {
        if (!originText.trim()) {
          setRoutesError('Please enter a starting location.');
          setRoutesLoading(false);
          return;
        }
        const geo = await geocodePlace(originText);
        originCoords = [geo.lat, geo.lng];
      }

      // Resolve destination coordinates
      let destCoords;
      if (destSelectedCoords) {
        destCoords = destSelectedCoords;
      } else {
        if (!destination.trim()) {
          setRoutesError('Please enter a destination.');
          setRoutesLoading(false);
          return;
        }
        const geoD = await geocodePlace(destination);
        destCoords = [geoD.lat, geoD.lng];
      }

      let result;
      if (planMode === 'arrive_by') {
        const iso = timeObjectToISO(arriveBy);
        result = await planRoutes(originCoords, destCoords, iso, selectedMode);
      } else {
        result = await getRoutes(originCoords, destCoords, selectedMode);
      }

      // Filter out routes with obviously corrupt durations (HERE API transit bug)
      const validRoutes = result.filter(r => r.eta_minutes <= 1440);
      console.log('[RoutesScreen] routes returned:', result.length, 'valid:', validRoutes.length);
      if (validRoutes.length > 0) {
        console.log('[RoutesScreen] first route decoded_coords:', validRoutes[0].decoded_coords?.length, 'sample:', JSON.stringify(validRoutes[0].decoded_coords?.slice(0, 2)));
      }
      setRoutes(validRoutes);
      if (validRoutes.length > 0) setSelectedRoute(validRoutes[0]);
    } catch (err) {
      setRoutesError('Could not fetch routes. Check your connection and try again.');
      console.warn('[RoutesScreen] route fetch error:', err.message);
    } finally {
      setRoutesLoading(false);
    }
  }

  const arriveByMins = timeToMinutes(arriveBy);
  const leaveAtMins = timeToMinutes(leaveAt);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <TimePickerModal
        visible={showTimePicker}
        time={planMode === 'arrive_by' ? arriveBy : leaveAt}
        onChange={planMode === 'arrive_by' ? setArriveBy : setLeaveAt}
        onClose={() => setShowTimePicker(false)}
        title={planMode === 'arrive_by' ? 'Arrive By' : 'Leave At'}
      />

      {/* Header */}
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

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

        {/* ── Planning section ──────────────────────────────────────────── */}
        <View style={styles.planningSection}>
          <Text style={styles.title}>Plan Your Route</Text>

          {/* Origin / Destination */}
          <View style={styles.inputContainer}>
            {/* ── Origin ── */}
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="circle-outline" size={16} color={Colors.white} style={styles.inputIcon} />
              {originMode === 'current' ? (
                <TouchableOpacity
                  style={[styles.input, styles.locationPill]}
                  onPress={() => setOriginMode('typed')}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="crosshairs-gps" size={14} color={Colors.primary} />
                  <Text style={styles.locationPillText}>Current Location</Text>
                  <MaterialCommunityIcons name="pencil-outline" size={13} color={Colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    value={originText}
                    onChangeText={text => {
                      setOriginText(text);
                      setOriginSelectedCoords(null);
                      fetchOriginSuggestions(text);
                    }}
                    placeholder="Starting location"
                    placeholderTextColor={Colors.textLight}
                    autoFocus
                    returnKeyType="search"
                  />
                  {showOriginSugg && (
                    <View style={styles.suggList}>
                      {originSuggestions.map((s, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.suggItem, i === originSuggestions.length - 1 && styles.suggItemLast]}
                          onPress={() => {
                            setOriginText(s.title);
                            setOriginSelectedCoords([s.lat, s.lng]);
                            setShowOriginSugg(false);
                            setOriginSuggestions([]);
                            Keyboard.dismiss();
                          }}
                        >
                          <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.textSecondary} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.suggTitle} numberOfLines={1}>{s.title}</Text>
                            {!!s.address && <Text style={styles.suggAddr} numberOfLines={1}>{s.address}</Text>}
                          </View>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={styles.suggUseLocation}
                        onPress={() => { setOriginMode('current'); setOriginText(''); setShowOriginSugg(false); }}
                      >
                        <MaterialCommunityIcons name="crosshairs-gps" size={13} color={Colors.primary} />
                        <Text style={styles.suggUseLocationText}>Use current location</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* ── Destination ── */}
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#E53935" style={styles.inputIcon} />
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  value={destination}
                  onChangeText={text => {
                    setDestination(text);
                    setDestSelectedCoords(null);
                    fetchDestSuggestions(text);
                  }}
                  placeholder="Where to?"
                  placeholderTextColor={Colors.textLight}
                  returnKeyType="search"
                  onSubmitEditing={searchRoutes}
                />
                {showDestSugg && (
                  <View style={styles.suggList}>
                    {destSuggestions.map((s, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.suggItem, i === destSuggestions.length - 1 && styles.suggItemLast]}
                        onPress={() => {
                          setDestination(s.title);
                          setDestSelectedCoords([s.lat, s.lng]);
                          setShowDestSugg(false);
                          setDestSuggestions([]);
                          Keyboard.dismiss();
                        }}
                      >
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.textSecondary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggTitle} numberOfLines={1}>{s.title}</Text>
                          {!!s.address && <Text style={styles.suggAddr} numberOfLines={1}>{s.address}</Text>}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Transport mode tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll}>
            {TRANSPORT_MODES.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.modeChip, selectedMode === m.apiMode && styles.modeChipActive]}
                onPress={() => setSelectedMode(m.apiMode)}
              >
                <MaterialCommunityIcons
                  name={m.icon}
                  size={18}
                  color={selectedMode === m.apiMode ? Colors.primaryDark : 'rgba(255,255,255,0.7)'}
                />
                <Text style={[styles.modeChipText, selectedMode === m.apiMode && styles.modeChipTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Arrive by / Leave at toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, planMode === 'leave_at' && styles.modeBtnActive]}
              onPress={() => setPlanMode('leave_at')}
            >
              <Text style={[styles.modeBtnText, planMode === 'leave_at' && styles.modeBtnTextActive]}>
                Leave At
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, planMode === 'arrive_by' && styles.modeBtnActive]}
              onPress={() => setPlanMode('arrive_by')}
            >
              <Text style={[styles.modeBtnText, planMode === 'arrive_by' && styles.modeBtnTextActive]}>
                Arrive By
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time input */}
          <TouchableOpacity style={styles.timeInput} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.timeLabel}>
              {planMode === 'arrive_by' ? 'Arrive By' : 'Leave At'}
            </Text>
            <View style={styles.timeValueRow}>
              <Text style={styles.timeValue}>
                {formatTime(planMode === 'arrive_by' ? arriveBy : leaveAt)}
              </Text>
              <MaterialCommunityIcons name="pencil" size={14} color="rgba(255,255,255,0.7)" />
            </View>
          </TouchableOpacity>

          {/* Search button */}
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={searchRoutes}
            disabled={routesLoading}
          >
            {routesLoading ? (
              <ActivityIndicator size="small" color={Colors.primaryDark} />
            ) : (
              <>
                <MaterialCommunityIcons name="magnify" size={20} color={Colors.primaryDark} />
                <Text style={styles.searchBtnText}>Get Routes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Results ───────────────────────────────────────────────────── */}
        <View style={styles.routesContainer}>

          {routesError ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color={Colors.danger} />
              <Text style={styles.errorText}>{routesError}</Text>
            </View>
          ) : null}

          {/* Route map preview for the selected route */}
          {selectedRoute && <RouteMapPreview route={selectedRoute} />}

          {/* Start Navigation button */}
          {selectedRoute && (
            <TouchableOpacity
              style={styles.startNavBtn}
              onPress={() => {
                // Priority: freshly-selected suggestion coords → URL params → route.destination
                const paramLat = parseFloat(destLat);
                const paramLng = parseFloat(destLng);
                const dLat = destSelectedCoords?.[0]
                  ?? (paramLat && !isNaN(paramLat) ? paramLat : null)
                  ?? selectedRoute.destination?.[0]
                  ?? 0;
                const dLng = destSelectedCoords?.[1]
                  ?? (paramLng && !isNaN(paramLng) ? paramLng : null)
                  ?? selectedRoute.destination?.[1]
                  ?? 0;
                setPendingRoute(selectedRoute);
                router.push({
                  pathname: '/navigation',
                  params: {
                    destLat: String(dLat),
                    destLng: String(dLng),
                    destName: destination,
                  },
                });
              }}
            >
              <MaterialCommunityIcons name="navigation" size={20} color={Colors.white} />
              <Text style={styles.startNavText}>Start Navigation</Text>
            </TouchableOpacity>
          )}

          {routes.length === 0 && !routesLoading && !routesError ? (
            <View style={styles.emptyRoutes}>
              <MaterialCommunityIcons name="routes" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>Enter a destination and tap Get Routes</Text>
            </View>
          ) : null}

          {routes.map((route, idx) => {
            const isSelected = selectedRoute === route;
            const durationLabel =
              route.eta_minutes >= 60
                ? `${Math.floor(route.eta_minutes / 60)}h ${route.eta_minutes % 60}m`
                : `${route.eta_minutes} min`;

            // Compute depart/arrive times from the leaveAt time
            const leaveAtMinsVal = leaveAtMins;
            const arrivalMins = leaveAtMinsVal + route.eta_minutes;
            const arrivalTime = minutesToTime(arrivalMins);
            const departMins = arriveByMins - route.eta_minutes;
            const departTime = minutesToTime(departMins);

            const isTransit = route.commute_type === 'transit';
            const modeInfo = TRANSPORT_MODES.find(m => m.apiMode === route.commute_type)
              ?? TRANSPORT_MODES[0];

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.routeCard, isSelected && styles.routeCardSelected]}
                onPress={() => {
                  setSelectedRoute(route);
                  if (isTransit) setTransitExpanded(e => !e);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.routeHeader}>
                  <View style={styles.routeIconContainer}>
                    <MaterialCommunityIcons name={modeInfo.icon} size={28} color={Colors.white} />
                  </View>

                  <View style={styles.routeMainInfo}>
                    <Text style={styles.routeType}>{modeInfo.label}</Text>
                    <Text style={styles.routeDuration}>{durationLabel}</Text>
                  </View>

                  <View style={styles.routeHeaderRight}>
                    <TrafficPill level={route.traffic_level} />
                    <View style={[styles.routeTag, { backgroundColor: Colors.primary + '33' }]}>
                      <Text style={[styles.routeTagText, { color: Colors.primaryDark }]}>
                        {route.label}
                      </Text>
                    </View>
                    {isTransit && (
                      <MaterialCommunityIcons
                        name={transitExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={Colors.textSecondary}
                      />
                    )}
                  </View>
                </View>

                {idx === 0 && <Text style={styles.fastestRoute}>Best Option</Text>}

                {route.roads?.length > 0 && (
                  <Text style={styles.routeDescription} numberOfLines={2}>
                    via {route.roads.slice(0, 3).join(' · ')}
                  </Text>
                )}

                {route.delay_minutes > 0 && (
                  <Text style={styles.delayText}>+{route.delay_minutes} min delay due to traffic</Text>
                )}

                <View style={styles.routeFooter}>
                  <View style={styles.routeDetail}>
                    <Text style={styles.detailLabel}>
                      {planMode === 'arrive_by' ? 'Leave By' : 'Leave At'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {planMode === 'arrive_by' ? formatTime(departTime) : formatTime(leaveAt)}
                    </Text>
                  </View>
                  <View style={styles.routeDetail}>
                    <Text style={styles.detailLabel}>
                      {planMode === 'arrive_by' ? 'Arrive By' : 'Est. Arrival'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {planMode === 'arrive_by' ? formatTime(arriveBy) : formatTime(arrivalTime)}
                    </Text>
                  </View>
                  <View style={styles.routeDetail}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>{route.distance} mi</Text>
                  </View>
                </View>

                {/* MARTA live widget inside transit card */}
                {isTransit && transitExpanded && isSelected && (
                  <View style={styles.martaWidgetWrapper}>
                    <MartaLiveWidget trains={trainData} loading={trainLoading} error={trainError} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: 300,
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  spinner: { alignItems: 'center', width: 60 },
  arrow: { padding: Spacing.xs },
  spinnerValue: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary, minWidth: 44, textAlign: 'center' },
  colon: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  ampm: { marginLeft: Spacing.sm, gap: Spacing.xs },
  ampmOption: { fontSize: 16, fontWeight: '600', color: Colors.textLight, paddingVertical: 4, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm },
  ampmActive: { color: Colors.white, backgroundColor: Colors.primary },
  actions: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  confirmText: { fontSize: 15, color: Colors.white, fontWeight: '600' },
});

const widgetStyles = StyleSheet.create({
  container: { backgroundColor: Colors.backgroundGray, borderRadius: BorderRadius.sm, padding: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  headerText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E53935', paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.round, gap: 3 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  liveLabel: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.4 },
  emptyText: { fontSize: 13, color: Colors.textLight, textAlign: 'center', paddingVertical: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.xs, gap: Spacing.sm },
  lineDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  rowInfo: { flex: 1, gap: 1 },
  lineName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  stationText: { fontSize: 11, color: Colors.textSecondary },
  waitBadge: { backgroundColor: Colors.backgroundGray, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm, minWidth: 48, alignItems: 'center' },
  waitText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  logoButton: {
    width: 50, height: 50, backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center',
  },
  headerIcons: { flexDirection: 'row', gap: Spacing.md },
  iconButton: { padding: Spacing.xs },
  content: { flex: 1 },
  planningSection: { backgroundColor: Colors.primary, padding: Spacing.lg },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.white, marginBottom: Spacing.md },
  inputContainer: { gap: Spacing.xs, marginBottom: Spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  inputIcon: { width: 24, textAlign: 'center' },
  input: {
    flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: 16, color: Colors.textPrimary,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
  },
  locationPillText: {
    flex: 1,
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  suggList: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginTop: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 200,
  },
  suggItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggItemLast: { borderBottomWidth: 0 },
  suggTitle: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  suggAddr: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  suggUseLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  suggUseLocationText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  modeScroll: { marginBottom: Spacing.sm },
  modeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md,
    paddingVertical: 8, borderRadius: BorderRadius.round, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)', marginRight: Spacing.xs,
  },
  modeChipActive: { backgroundColor: Colors.white, borderColor: Colors.white },
  modeChipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  modeChipTextActive: { color: Colors.primaryDark },
  modeToggle: {
    flexDirection: 'row', backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md, padding: 3, gap: 3, marginBottom: Spacing.sm,
  },
  modeBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm },
  modeBtnActive: { backgroundColor: Colors.white },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  modeBtnTextActive: { color: Colors.primaryDark },
  timeInput: {
    backgroundColor: Colors.primaryDark, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timeLabel: { fontSize: 16, color: Colors.white },
  timeValueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  timeValue: { fontSize: 16, color: Colors.white, fontWeight: '600' },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm, marginTop: Spacing.xs,
  },
  searchBtnText: { fontSize: 16, fontWeight: '700', color: Colors.primaryDark },
  routesContainer: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  startNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  startNavText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyRoutes: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyText: { fontSize: 15, color: Colors.textLight, textAlign: 'center' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#FFEBEE', borderRadius: BorderRadius.md, padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { flex: 1, fontSize: 14, color: '#C62828' },
  routeCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  routeCardSelected: { borderColor: Colors.primary, borderWidth: 2 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  routeIconContainer: {
    width: 50, height: 50, backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  routeMainInfo: { flex: 1 },
  routeType: { fontSize: 14, color: Colors.textSecondary, marginBottom: 2 },
  routeDuration: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary },
  routeHeaderRight: { alignItems: 'flex-end', gap: 4 },
  routeTag: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  routeTagText: { fontSize: 12, fontWeight: '600' },
  fastestRoute: { fontSize: 14, fontWeight: '600', color: Colors.primaryDark, marginBottom: Spacing.sm },
  routeDescription: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.xs },
  delayText: { fontSize: 13, color: '#E65100', marginBottom: Spacing.sm },
  routeFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm,
  },
  routeDetail: { flex: 1 },
  detailLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  martaWidgetWrapper: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
});
