import axios from 'axios';
import { API_BASE_URL } from '../constants/api';

// ── Alert Types & Metadata ─────────────────────────────────────────────────────

/** Predefined icon-alert subtypes with display metadata. */
export const ICON_ALERT_TYPES = [
  { subtype: 'heavy_traffic',  label: 'Heavy Traffic',   icon: 'traffic-cone',         color: '#F5A623' },
  { subtype: 'construction',   label: 'Construction',    icon: 'road-variant',          color: '#E67E22' },
  { subtype: 'police',         label: 'Police',          icon: 'police-badge',          color: '#3498DB' },
  { subtype: 'accident',       label: 'Accident',        icon: 'car-emergency',         color: '#E74C3C' },
  { subtype: 'stalled_car',    label: 'Stalled Car',     icon: 'car-off',               color: '#E74C3C' },
  { subtype: 'road_closure',   label: 'Road Closed',     icon: 'road-variant',          color: '#C0392B' },
  { subtype: 'hazard',         label: 'Hazard',          icon: 'alert-rhombus',         color: '#E74C3C' },
  { subtype: 'flooding',       label: 'Flooding',        icon: 'water',                 color: '#2980B9' },
  { subtype: 'runaway_animal', label: 'Animal on Road',  icon: 'dog',                   color: '#27AE60' },
];

/** Urgency levels for comment bubbles. */
export const URGENCY_LEVELS = [
  { value: null,     label: 'Default',  color: '#9E9E9E' },
  { value: 'low',    label: 'Low',      color: '#4CAF50' },
  { value: 'medium', label: 'Medium',   color: '#FFC107' },
  { value: 'high',   label: 'High',     color: '#F44336' },
];

export function urgencyColor(urgency) {
  return URGENCY_LEVELS.find(u => u.value === urgency)?.color ?? '#9E9E9E';
}

export function subtypeIcon(subtype) {
  return ICON_ALERT_TYPES.find(t => t.subtype === subtype)?.icon ?? 'alert-circle';
}

export function subtypeColor(subtype) {
  return ICON_ALERT_TYPES.find(t => t.subtype === subtype)?.color ?? '#F5A623';
}

// Alert type → display colour mapping for the list cards
export function alertCardColor(type) {
  switch (type) {
    case 'Traffic':      return '#FFF9E6';
    case 'Construction': return '#FFF0E6';
    case 'Accident':     return '#FFE6E6';
    case 'Transit':      return '#E6F2FF';
    default:             return '#F5F5F5';
  }
}

// ── API Calls ─────────────────────────────────────────────────────────────────

/**
 * Fetch active alerts.
 * @param {number|null} lat  User's latitude – enables proximity sorting
 * @param {number|null} lng  User's longitude
 */
export async function fetchAlerts(lat = null, lng = null) {
  const params = {};
  if (lat !== null && lng !== null) {
    params.lat = lat;
    params.lng = lng;
  }
  const resp = await axios.get(`${API_BASE_URL}/safety/`, { params });
  return resp.data.lots || [];
}

/**
 * Submit a new alert.
 * @param {{
 *   type: string,
 *   subtype?: string,
 *   description: string,
 *   location?: string,
 *   lat?: number,
 *   lng?: number,
 *   is_comment: boolean,
 *   urgency?: string|null,
 *   user_id?: number|null,
 * }} alertData
 */
export async function submitAlert(alertData) {
  const resp = await axios.post(`${API_BASE_URL}/safety/`, alertData);
  return resp.data;
}

/** Upvote an alert and return the updated alert object. */
export async function upvoteAlert(alertId) {
  const resp = await axios.post(`${API_BASE_URL}/safety/upvote`, { alert_id: alertId });
  return resp.data;
}

/** Downvote an alert and return the updated alert object. */
export async function downvoteAlert(alertId) {
  const resp = await axios.post(`${API_BASE_URL}/safety/downvote`, { alert_id: alertId });
  return resp.data;
}

/**
 * Fetch traffic incidents near a location.
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radius=5000]  metres
 */
export async function fetchTrafficIncidents(lat, lng, radius = 5000) {
  const resp = await axios.get(`${API_BASE_URL}/traffic/incidents`, {
    params: { lat, lng, radius },
  });
  return resp.data.incidents || [];
}
