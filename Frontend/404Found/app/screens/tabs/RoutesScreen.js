import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// ─── MARTA helpers ───────────────────────────────────────────────────────────

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

// ─── Time helpers ─────────────────────────────────────────────────────────────

// time: { h: 1-12, m: 0-59, isPM: bool }
function timeToMinutes({ h, m, isPM }) {
  const hour24 = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
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

// ─── Time Picker Modal ────────────────────────────────────────────────────────

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

  function toggleAmPm() {
    setDraft(prev => ({ ...prev, isPM: !prev.isPM }));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pickerStyles.overlay} onPress={onClose}>
        <Pressable style={pickerStyles.card} onPress={e => e.stopPropagation()}>
          <Text style={pickerStyles.title}>{title}</Text>

          <View style={pickerStyles.row}>
            {/* Hour */}
            <View style={pickerStyles.spinner}>
              <TouchableOpacity style={pickerStyles.arrow} onPress={() => adjustHour(1)}>
                <MaterialCommunityIcons name="chevron-up" size={28} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={pickerStyles.spinnerValue}>{draft.h}</Text>
              <TouchableOpacity style={pickerStyles.arrow} onPress={() => adjustHour(-1)}>
                <MaterialCommunityIcons name="chevron-down" size={28} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={pickerStyles.colon}>:</Text>

            {/* Minute */}
            <View style={pickerStyles.spinner}>
              <TouchableOpacity style={pickerStyles.arrow} onPress={() => adjustMinute(5)}>
                <MaterialCommunityIcons name="chevron-up" size={28} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={pickerStyles.spinnerValue}>{String(draft.m).padStart(2, '0')}</Text>
              <TouchableOpacity style={pickerStyles.arrow} onPress={() => adjustMinute(-5)}>
                <MaterialCommunityIcons name="chevron-down" size={28} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* AM/PM */}
            <TouchableOpacity style={pickerStyles.ampm} onPress={toggleAmPm}>
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

// ─── MARTA Live Widget ────────────────────────────────────────────────────────

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
        <Text style={widgetStyles.emptyText}>
          {error ? 'Data unavailable' : 'No arrivals right now'}
        </Text>
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
        const wait = parseInt(train.waiting_seconds, 10);
        const urgent = !isNaN(wait) && wait <= 120;
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RoutesScreen() {
  const router = useRouter();
  const [origin, setOrigin] = useState('Current Location');
  const [destination, setDestination] = useState('Langdale Hall');
  const [mode, setMode] = useState('arrive_by'); // 'arrive_by' | 'leave_at'
  const [arriveBy, setArriveBy] = useState({ h: 9, m: 0, isPM: false }); // 9:00 AM
  const [leaveAt, setLeaveAt] = useState({ h: 8, m: 0, isPM: false }); // 8:00 AM
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [transitExpanded, setTransitExpanded] = useState(false);
  const [trainData, setTrainData] = useState([]);
  const [trainLoading, setTrainLoading] = useState(true);
  const [trainError, setTrainError] = useState(null);

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
    }, [fetchTrainData])
  );

  // Routes with durationMins so we can compute departure times
  const routes = [
    {
      id: '1',
      type: 'Drive',
      icon: 'car',
      durationMins: 22,
      tag: 'Recommended',
      tagColor: Colors.primary,
      description: 'Drive I-75 North → Park at G-Deck → Walk 3 mins',
      cost: '$2.50',
      fastest: true,
      isTransit: false,
    },
    {
      id: '2',
      type: 'Transit',
      icon: 'train',
      durationMins: 35,
      tag: 'Eco-Friendly',
      tagColor: Colors.success,
      description: 'Walk 5 min → MARTA train to Civic Center → Walk 8 mins',
      cost: '$2.75',
      fastest: false,
      isTransit: true,
    },
    {
      id: '3',
      type: 'Walk',
      icon: 'walk',
      durationMins: 52,
      tag: 'Scenic',
      tagColor: Colors.info,
      description: 'Walk via Main Street path',
      cost: 'Free',
      fastest: false,
      isTransit: false,
    },
  ];

  const arriveByMins = timeToMinutes(arriveBy);
  const leaveAtMins = timeToMinutes(leaveAt);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <TimePickerModal
        visible={showTimePicker}
        time={mode === 'arrive_by' ? arriveBy : leaveAt}
        onChange={mode === 'arrive_by' ? setArriveBy : setLeaveAt}
        onClose={() => setShowTimePicker(false)}
        title={mode === 'arrive_by' ? 'Arrive By' : 'Leave At'}
      />

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

      <ScrollView style={styles.content}>
        {/* Route Planning Section */}
        <View style={styles.planningSection}>
          <Text style={styles.title}>Plan Your Route</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={origin}
              onChangeText={setOrigin}
              placeholder="Starting Location"
              placeholderTextColor={Colors.textLight}
            />
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="Destination"
              placeholderTextColor={Colors.textLight}
            />

            {/* Mode toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'arrive_by' && styles.modeBtnActive]}
                onPress={() => setMode('arrive_by')}
              >
                <Text style={[styles.modeBtnText, mode === 'arrive_by' && styles.modeBtnTextActive]}>
                  Arrive By
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'leave_at' && styles.modeBtnActive]}
                onPress={() => setMode('leave_at')}
              >
                <Text style={[styles.modeBtnText, mode === 'leave_at' && styles.modeBtnTextActive]}>
                  Leave At
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tappable time row */}
            <TouchableOpacity style={styles.timeInput} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.timeLabel}>
                {mode === 'arrive_by' ? 'Arrive By' : 'Leave At'}
              </Text>
              <View style={styles.timeValueRow}>
                <Text style={styles.timeValue}>
                  {formatTime(mode === 'arrive_by' ? arriveBy : leaveAt)}
                </Text>
                <MaterialCommunityIcons name="pencil" size={14} color="rgba(255,255,255,0.7)" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Routes */}
        <View style={styles.routesContainer}>
          {routes.map(route => {
            const departMins = arriveByMins - route.durationMins;
            const departTime = minutesToTime(departMins);
            const arrivalMins = leaveAtMins + route.durationMins;
            const arrivalTime = minutesToTime(arrivalMins);
            const durationLabel =
              route.durationMins >= 60
                ? `${Math.floor(route.durationMins / 60)}h ${route.durationMins % 60}m`
                : `${route.durationMins} min`;

            return (
              <TouchableOpacity
                key={route.id}
                style={styles.routeCard}
                onPress={() => route.isTransit && setTransitExpanded(e => !e)}
                activeOpacity={route.isTransit ? 0.7 : 1}
              >
                <View style={styles.routeHeader}>
                  <View style={styles.routeIconContainer}>
                    <MaterialCommunityIcons name={route.icon} size={28} color={Colors.white} />
                  </View>

                  <View style={styles.routeMainInfo}>
                    <Text style={styles.routeType}>{route.type}</Text>
                    <Text style={styles.routeDuration}>{durationLabel}</Text>
                  </View>

                  <View style={styles.routeHeaderRight}>
                    {route.tag && (
                      <View style={[styles.routeTag, { backgroundColor: route.tagColor }]}>
                        <Text style={styles.routeTagText}>{route.tag}</Text>
                      </View>
                    )}
                    {route.isTransit && (
                      <MaterialCommunityIcons
                        name={transitExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={Colors.textSecondary}
                        style={{ marginTop: 4 }}
                      />
                    )}
                  </View>
                </View>

                {route.fastest && (
                  <Text style={styles.fastestRoute}>Fastest Route</Text>
                )}

                <Text style={styles.routeDescription}>{route.description}</Text>

                <View style={styles.routeFooter}>
                  <View style={styles.routeDetail}>
                    <Text style={styles.detailLabel}>
                      {mode === 'arrive_by' ? 'Leave By' : 'Leave At'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {mode === 'arrive_by' ? formatTime(departTime) : formatTime(leaveAt)}
                    </Text>
                  </View>
                  <View style={styles.routeDetail}>
                    <Text style={styles.detailLabel}>
                      {mode === 'arrive_by' ? 'Arrive By' : 'Est. Arrival'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {mode === 'arrive_by' ? formatTime(arriveBy) : formatTime(arrivalTime)}
                    </Text>
                  </View>
                  <View style={styles.routeDetail}>
                    <Text style={styles.detailLabel}>Cost</Text>
                    <Text style={styles.detailValue}>{route.cost}</Text>
                  </View>
                </View>

                {/* MARTA live widget inside Transit card */}
                {route.isTransit && transitExpanded && (
                  <View style={styles.martaWidgetWrapper}>
                    <MartaLiveWidget
                      trains={trainData}
                      loading={trainLoading}
                      error={trainError}
                    />
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  spinner: {
    alignItems: 'center',
    width: 60,
  },
  arrow: {
    padding: Spacing.xs,
  },
  spinnerValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 44,
    textAlign: 'center',
  },
  colon: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  ampm: {
    marginLeft: Spacing.sm,
    gap: Spacing.xs,
  },
  ampmOption: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  ampmActive: {
    color: Colors.white,
    backgroundColor: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    color: Colors.white,
    fontWeight: '600',
  },
});

const widgetStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  headerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53935',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
    gap: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  lineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    gap: 1,
  },
  lineName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  stationText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  waitBadge: {
    backgroundColor: Colors.backgroundGray,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  waitText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});

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
    backgroundColor: Colors.primaryLight,
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
  planningSection: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    padding: 3,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  modeBtnActive: {
    backgroundColor: Colors.white,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  modeBtnTextActive: {
    color: Colors.primaryDark,
  },
  timeInput: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 16,
    color: Colors.white,
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeValue: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
  routesContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  routeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  routeIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  routeMainInfo: {
    flex: 1,
  },
  routeType: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  routeDuration: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  routeHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  routeTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  routeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  fastestRoute: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  routeDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  routeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  routeDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  martaWidgetWrapper: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
});
