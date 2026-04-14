import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import {
  fetchAlerts,
  submitAlert,
  upvoteAlert,
  downvoteAlert,
  ICON_ALERT_TYPES,
  URGENCY_LEVELS,
  alertCardColor,
  subtypeIcon,
  subtypeColor,
  urgencyColor,
} from '../../services/alertService';

// ── Filter tabs ───────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { id: 'all',          label: 'All' },
  { id: 'Traffic',      label: 'Traffic' },
  { id: 'Construction', label: 'Construction' },
  { id: 'Accident',     label: 'Accident' },
  { id: 'Transit',      label: 'Transit' },
  { id: 'comments',     label: 'Comments' },
];

// ── Alert type → icon name (for icon alerts without a subtype) ─────────────────

function cardIcon(alert) {
  if (alert.is_comment) return 'comment-text-outline';
  if (alert.subtype) return subtypeIcon(alert.subtype);
  switch (alert.type) {
    case 'Traffic':      return 'traffic-cone';
    case 'Construction': return 'road-variant';
    case 'Accident':     return 'car-emergency';
    case 'Transit':      return 'train';
    default:             return 'alert-circle';
  }
}

function cardIconColor(alert) {
  if (alert.subtype) return subtypeColor(alert.subtype);
  switch (alert.type) {
    case 'Traffic':      return '#F5A623';
    case 'Construction': return '#E67E22';
    case 'Accident':     return '#E74C3C';
    case 'Transit':      return '#3498DB';
    default:             return '#7F8C8D';
  }
}

// ── Submit Modal ──────────────────────────────────────────────────────────────

function SubmitModal({ visible, onClose, onSubmit, userLocation }) {
  const [alertKind, setAlertKind] = useState('icon'); // 'icon' | 'comment'
  const [selectedSubtype, setSelectedSubtype] = useState(null);
  const [selectedUrgency, setSelectedUrgency] = useState(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [alertType, setAlertType] = useState('Traffic');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setAlertKind('icon');
    setSelectedSubtype(null);
    setSelectedUrgency(null);
    setDescription('');
    setLocation('');
    setAlertType('Traffic');
  }

  async function handleSubmit() {
    if (!description.trim()) {
      Alert.alert('Description required', 'Please describe the alert.');
      return;
    }
    if (alertKind === 'icon' && !selectedSubtype) {
      Alert.alert('Select a type', 'Please pick an alert icon.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: alertType,
        subtype: alertKind === 'icon' ? selectedSubtype : null,
        description: description.trim(),
        location: location.trim() || null,
        lat: userLocation?.latitude ?? null,
        lng: userLocation?.longitude ?? null,
        is_comment: alertKind === 'comment',
        urgency: alertKind === 'comment' ? selectedUrgency : null,
      };
      await onSubmit(payload);
      reset();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Failed to submit alert. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={modalStyles.sheet} onPress={e => e.stopPropagation()}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>Report an Alert</Text>

          {/* Kind toggle */}
          <View style={modalStyles.kindToggle}>
            <TouchableOpacity
              style={[modalStyles.kindBtn, alertKind === 'icon' && modalStyles.kindBtnActive]}
              onPress={() => setAlertKind('icon')}
            >
              <MaterialCommunityIcons
                name="map-marker-alert"
                size={18}
                color={alertKind === 'icon' ? Colors.white : Colors.textSecondary}
              />
              <Text style={[modalStyles.kindBtnText, alertKind === 'icon' && modalStyles.kindBtnTextActive]}>
                Icon Alert
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.kindBtn, alertKind === 'comment' && modalStyles.kindBtnActive]}
              onPress={() => setAlertKind('comment')}
            >
              <MaterialCommunityIcons
                name="comment-text"
                size={18}
                color={alertKind === 'comment' ? Colors.white : Colors.textSecondary}
              />
              <Text style={[modalStyles.kindBtnText, alertKind === 'comment' && modalStyles.kindBtnTextActive]}>
                Comment
              </Text>
            </TouchableOpacity>
          </View>

          {alertKind === 'icon' ? (
            <>
              {/* Icon subtype grid */}
              <Text style={modalStyles.sectionLabel}>Alert type</Text>
              <View style={modalStyles.iconGrid}>
                {ICON_ALERT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.subtype}
                    style={[
                      modalStyles.iconCell,
                      selectedSubtype === t.subtype && {
                        borderColor: t.color,
                        backgroundColor: t.color + '18',
                      },
                    ]}
                    onPress={() => {
                      setSelectedSubtype(t.subtype);
                      setAlertType('Traffic'); // default type for icon alerts
                    }}
                  >
                    <MaterialCommunityIcons name={t.icon} size={22} color={t.color} />
                    <Text style={modalStyles.iconCellLabel} numberOfLines={2}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              {/* Urgency selector */}
              <Text style={modalStyles.sectionLabel}>Urgency</Text>
              <View style={modalStyles.urgencyRow}>
                {URGENCY_LEVELS.map(u => (
                  <TouchableOpacity
                    key={String(u.value)}
                    style={[
                      modalStyles.urgencyChip,
                      { borderColor: u.color },
                      selectedUrgency === u.value && { backgroundColor: u.color },
                    ]}
                    onPress={() => setSelectedUrgency(u.value)}
                  >
                    <Text
                      style={[
                        modalStyles.urgencyChipText,
                        { color: selectedUrgency === u.value ? Colors.white : u.color },
                      ]}
                    >
                      {u.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Description */}
          <Text style={modalStyles.sectionLabel}>Description</Text>
          <TextInput
            style={modalStyles.textInput}
            value={description}
            onChangeText={setDescription}
            placeholder={
              alertKind === 'icon'
                ? 'Briefly describe the situation…'
                : 'What do other drivers need to know?'
            }
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={280}
          />
          <Text style={modalStyles.charCount}>{description.length}/280</Text>

          {/* Location (optional override) */}
          <Text style={modalStyles.sectionLabel}>Location (optional)</Text>
          <TextInput
            style={[modalStyles.textInput, modalStyles.textInputSingle]}
            value={location}
            onChangeText={setLocation}
            placeholder={userLocation ? 'Using your GPS location…' : 'e.g. I-85 N near Exit 91'}
            placeholderTextColor={Colors.textLight}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[modalStyles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Text style={modalStyles.submitBtnText}>Submit Alert</Text>
            }
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Alert Card ────────────────────────────────────────────────────────────────

function AlertCard({ alert, onUpvote, onDownvote }) {
  const [expanded, setExpanded] = useState(false);
  const bgColor = alertCardColor(alert.type);
  const icon = cardIcon(alert);
  const iconColor = cardIconColor(alert);

  // Comment bubble border colour based on urgency
  const urgencyBorder = alert.is_comment ? urgencyColor(alert.urgency) : null;

  return (
    <TouchableOpacity
      style={[
        styles.alertCard,
        { backgroundColor: bgColor },
        alert.is_comment && urgencyBorder && { borderLeftWidth: 4, borderLeftColor: urgencyBorder },
      ]}
      onPress={() => alert.is_comment && setExpanded(e => !e)}
      activeOpacity={alert.is_comment ? 0.85 : 1}
    >
      <View style={styles.alertHeader}>
        <View style={[styles.alertIconBadge, { backgroundColor: iconColor + '22' }]}>
          <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={styles.alertTitle} numberOfLines={expanded ? undefined : 1}>
          {alert.is_comment
            ? (alert.urgency ? `${alert.urgency.charAt(0).toUpperCase() + alert.urgency.slice(1)} Alert` : 'Community Note')
            : (alert.subtype?.replace(/_/g, ' ') ?? alert.type)}
        </Text>
        {alert.is_comment && (
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.textSecondary}
          />
        )}
      </View>

      {(!alert.is_comment || expanded) && (
        <Text style={styles.alertDescription}>{alert.description}</Text>
      )}

      <View style={styles.alertFooter}>
        <View style={styles.locationRow}>
          {alert.location ? (
            <>
              <MaterialCommunityIcons name="map-marker" size={13} color={Colors.danger} />
              <Text style={styles.locationText} numberOfLines={1}>{alert.location}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.voteRow}>
          <Text style={styles.timeText}>
            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <TouchableOpacity style={styles.voteBtn} onPress={() => onUpvote(alert.alert_id)}>
            <MaterialCommunityIcons name="thumb-up-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.voteBtnText}>{alert.upvotes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.voteBtn} onPress={() => onDownvote(alert.alert_id)}>
            <MaterialCommunityIcons name="thumb-down-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.voteBtnText}>{alert.downvotes}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const router = useRouter();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // ── Location ───────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setUserLocation(loc.coords);
          } catch { /* silent */ }
        }
      })();
    }, []),
  );

  // ── Fetch alerts ───────────────────────────────────────────────────────────
  const loadAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const lat = userLocation?.latitude ?? null;
      const lng = userLocation?.longitude ?? null;
      const data = await fetchAlerts(lat, lng);
      setAlerts(data);
    } catch (err) {
      console.warn('[AlertsScreen] fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userLocation]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts]),
  );

  // ── Voting ─────────────────────────────────────────────────────────────────
  async function handleUpvote(alertId) {
    try {
      const updated = await upvoteAlert(alertId);
      setAlerts(prev => prev.map(a => a.alert_id === alertId ? { ...a, upvotes: updated.upvotes } : a));
    } catch { /* silent */ }
  }

  async function handleDownvote(alertId) {
    try {
      const updated = await downvoteAlert(alertId);
      setAlerts(prev => prev.map(a => a.alert_id === alertId ? { ...a, downvotes: updated.downvotes } : a));
    } catch { /* silent */ }
  }

  // ── Submit new alert ───────────────────────────────────────────────────────
  async function handleSubmit(payload) {
    const newAlert = await submitAlert(payload);
    setAlerts(prev => [newAlert, ...prev]);
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredAlerts = alerts.filter(a => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'comments') return a.is_comment;
    return a.type === activeFilter && !a.is_comment;
  });

  // ── Counts for filter badge ────────────────────────────────────────────────
  function filterCount(tabId) {
    if (tabId === 'all') return alerts.length;
    if (tabId === 'comments') return alerts.filter(a => a.is_comment).length;
    return alerts.filter(a => a.type === tabId && !a.is_comment).length;
  }

  return (
    <SafeAreaView style={styles.container}>
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

      {/* Title bar */}
      <View style={styles.titleSection}>
        <View>
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.subtitle}>Community traffic & road updates</Text>
        </View>
        <TouchableOpacity style={styles.reportFab} onPress={() => setShowSubmitModal(true)}>
          <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
          <Text style={styles.reportFabText}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTER_TABS.map(tab => {
          const count = filterCount(tab.id);
          const active = activeFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.id)}
            >
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Alert list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading alerts…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAlerts(true)}
              tintColor={Colors.primary}
            />
          }
        >
          <View style={styles.alertsContainer}>
            {filteredAlerts.length === 0 ? (
              <View style={styles.noAlertsContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={64} color={Colors.textLight} />
                <Text style={styles.noAlertsText}>
                  {activeFilter === 'all'
                    ? 'No active alerts in your area.'
                    : `No ${activeFilter.toLowerCase()} alerts right now.`}
                </Text>
                <TouchableOpacity
                  style={styles.beFirstBtn}
                  onPress={() => setShowSubmitModal(true)}
                >
                  <Text style={styles.beFirstBtnText}>Be the first to report one</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredAlerts.map(alert => (
                <AlertCard
                  key={alert.alert_id}
                  alert={alert}
                  onUpvote={handleUpvote}
                  onDownvote={handleDownvote}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Submit modal */}
      <SubmitModal
        visible={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSubmit={handleSubmit}
        userLocation={userLocation}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
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
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  kindBtnActive: { backgroundColor: Colors.primary },
  kindBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  kindBtnTextActive: { color: Colors.white },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  iconCell: {
    width: '21%',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
  },
  iconCellLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 13,
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  urgencyChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  urgencyChipText: { fontSize: 13, fontWeight: '700' },
  textInput: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  textInputSingle: { minHeight: 46 },
  charCount: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});

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
    width: 50, height: 50, backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center',
  },
  headerIcons: { flexDirection: 'row', gap: Spacing.md },
  iconButton: { padding: Spacing.xs },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  reportFab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
  },
  reportFabText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  filterScroll: { maxHeight: 52, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.round,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterTabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTabTextActive: { color: Colors.white },
  filterBadge: {
    backgroundColor: Colors.border,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
  filterBadgeTextActive: { color: Colors.white },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  alertsContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  alertCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  alertIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  alertTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textTransform: 'capitalize' },
  alertDescription: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20, marginBottom: Spacing.sm },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  locationText: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timeText: { fontSize: 11, color: Colors.textLight },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  voteBtnText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  noAlertsContainer: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  noAlertsText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  beFirstBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.round },
  beFirstBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primaryDark },
});
