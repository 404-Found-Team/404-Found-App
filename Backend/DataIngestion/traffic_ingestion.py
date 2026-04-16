import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
import cachetools.func
from datetime import datetime, timezone
from config import Config

API_KEY = Config.HERE_API_KEY

session = requests.Session()
ROUTING_URL = "https://router.hereapi.com/v8/routes"
TRANSIT_URL = "https://transit.router.hereapi.com/v8/routes"
INCIDENTS_URL = "https://data.traffic.hereapi.com/v7/incidents"
GEOCODE_URL = "https://geocode.search.hereapi.com/v1/geocode"


# ── Flexible Polyline Decoder ──────────────────────────────────────────────────
# Decodes HERE's flexible polyline format into [[lat, lng], ...] without
# extra dependencies. Spec: https://github.com/heremaps/flexible-polyline

_ENCODING_TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
_DECODING_TABLE: dict[str, int] = {c: i for i, c in enumerate(_ENCODING_TABLE)}


def _decode_unsigned_varint(encoded: str, index: int) -> tuple[int, int]:
    result = 0
    shift = 0
    while index < len(encoded):
        char_val = _DECODING_TABLE.get(encoded[index], 0)
        index += 1
        result |= (char_val & 0x1F) << shift
        if (char_val & 0x20) == 0:
            break
        shift += 5
    return result, index


def _to_signed(value: int) -> int:
    if value & 1:
        return ~(value >> 1)
    return value >> 1


def decode_flexible_polyline(encoded: str) -> list[list[float]]:
    """Decode a HERE flexible polyline string into [[lat, lng], ...] pairs."""
    if not encoded:
        return []
    try:
        header_val = _DECODING_TABLE.get(encoded[0], 0)
        precision = header_val & 0xF
        is_3d = (header_val >> 4) & 1
        factor = 10 ** precision

        coords: list[list[float]] = []
        index = 1
        last_lat = 0
        last_lng = 0

        while index < len(encoded):
            delta_lat, index = _decode_unsigned_varint(encoded, index)
            last_lat += _to_signed(delta_lat)

            delta_lng, index = _decode_unsigned_varint(encoded, index)
            last_lng += _to_signed(delta_lng)

            if is_3d:
                _, index = _decode_unsigned_varint(encoded, index)

            coords.append([round(last_lat / factor, 6), round(last_lng / factor, 6)])

        return coords
    except Exception as e:
        print(f"[traffic] Polyline decode error: {e}")
        return []


# ── Route Fetching ─────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@cachetools.func.ttl_cache(maxsize=100, ttl=300)
def get_routes(origin: tuple, destination: tuple, mode: str) -> dict:
    """Fetch real-time driving/walking/cycling routes. Cached 5 minutes."""
    params = {
        "origin": f"{origin[0]},{origin[1]}",
        "destination": f"{destination[0]},{destination[1]}",
        "transportMode": mode if mode != "any" else "car",
        "routingMode": "fast",
        "departureTime": _now_iso(),
        "alternatives": 2,
        "spans": "names",
        "return": "polyline,summary,actions,instructions",
    }
    try:
        resp = session.get(ROUTING_URL, params={**params, "apiKey": API_KEY}, timeout=8)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        print(f"[traffic] Route fetch error ({mode}): {e}")
        return {"routes": []}


@cachetools.func.ttl_cache(maxsize=100, ttl=300)
def plan_routes(origin: tuple, destination: tuple, arrival_time: str, mode: str = "any") -> dict:
    """Fetch routes for a specific arrival time. Cached 5 minutes."""
    params = {
        "origin": f"{origin[0]},{origin[1]}",
        "destination": f"{destination[0]},{destination[1]}",
        "transportMode": mode if mode != "any" else "car",
        "routingMode": "fast",
        "arrivalTime": arrival_time,
        "alternatives": 2,
        "spans": "names",
        "return": "polyline,summary,actions,instructions",
    }
    try:
        resp = session.get(ROUTING_URL, params={**params, "apiKey": API_KEY}, timeout=8)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        print(f"[traffic] Plan route error ({mode}): {e}")
        return {"routes": []}


@cachetools.func.ttl_cache(maxsize=50, ttl=300)
def transit_routes(origin: tuple, destination: tuple, arrival_time: str | None = None) -> dict:
    """Fetch transit routes. Cached 5 minutes."""
    time_param = "arrivalTime" if arrival_time else "departureTime"
    time_value = arrival_time if arrival_time else _now_iso()
    params = {
        "origin": f"{origin[0]},{origin[1]}",
        "destination": f"{destination[0]},{destination[1]}",
        time_param: time_value,
        "alternatives": 2,
        "return": "polyline,summary,intermediateStops,travelSummary",
    }
    try:
        resp = session.get(TRANSIT_URL, params={**params, "apiKey": API_KEY}, timeout=8)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        print(f"[traffic] Transit route error: {e}")
        return {"routes": []}


# ── Traffic Incidents ──────────────────────────────────────────────────────────

@cachetools.func.ttl_cache(maxsize=30, ttl=180)
def get_traffic_incidents(lat: float, lng: float, radius_meters: int = 5000) -> list:
    """Fetch live traffic incidents near a location. Cached 3 minutes.

    Keeps the HERE API call budget low: responses are cached per
    (lat, lng, radius) tuple so nearby identical requests reuse the cache.
    """
    params = {
        "in": f"circle:{lat},{lng};r={radius_meters}",
        "locationReferencing": "shape",
        "apiKey": API_KEY,
    }
    try:
        resp = session.get(INCIDENTS_URL, params=params, timeout=8)
        resp.raise_for_status()
        return _format_incidents(resp.json())
    except requests.exceptions.RequestException as e:
        print(f"[traffic] Incidents fetch error: {e}")
        return []


def _format_incidents(data: dict) -> list:
    results = []
    for incident in data.get("results", []):
        details = incident.get("incidentDetails", {})
        location = incident.get("location", {})

        # Extract first coordinate from the shape
        lat, lng = None, None
        links = location.get("shape", {}).get("links", [])
        if links:
            points = links[0].get("points", [])
            if points:
                lat = points[0].get("lat")
                lng = points[0].get("lng")

        if lat is None or lng is None:
            continue

        incident_type = details.get("type", {})
        description = details.get("description", {})
        criticality = details.get("criticality", {})

        # HERE API may return these fields as strings or dicts depending on version
        if isinstance(incident_type, dict):
            type_label = incident_type.get("label", "Unknown")
            type_code = incident_type.get("code", "")
        else:
            type_label = str(incident_type) if incident_type else "Unknown"
            type_code = str(incident_type) if incident_type else ""

        desc_value = description.get("value", "") if isinstance(description, dict) else str(description or "")
        severity = criticality.get("label", "minor") if isinstance(criticality, dict) else str(criticality or "minor")

        results.append({
            "id": details.get("id", ""),
            "type": type_label,
            "subtype": type_code,
            "description": desc_value,
            "severity": severity,
            "lat": lat,
            "lng": lng,
            "start_time": details.get("startTime", ""),
            "end_time": details.get("endTime", ""),
        })
    return results


# ── Geocoding ─────────────────────────────────────────────────────────────────

AUTOSUGGEST_URL = "https://autosuggest.search.hereapi.com/v1/autosuggest"


@cachetools.func.ttl_cache(maxsize=200, ttl=120)
def autosuggest_places(query: str, lat: float | None = None, lng: float | None = None, limit: int = 6) -> list:
    """Return up to *limit* place suggestions for a partial query string.

    Results are cached for 2 minutes so rapid keystrokes don't each cost a
    HERE API call; the cache key includes the full (query, lat, lng, limit)
    tuple so different contexts get their own entries.
    """
    params: dict = {
        "q": query,
        "limit": limit,
        "apiKey": API_KEY,
    }
    if lat is not None and lng is not None:
        params["at"] = f"{lat},{lng}"

    try:
        resp = session.get(AUTOSUGGEST_URL, params=params, timeout=5)
        resp.raise_for_status()
        items = resp.json().get("items", [])
        suggestions = []
        for item in items:
            pos = item.get("position") or {}
            suggestions.append({
                "title": item.get("title", ""),
                "address": item.get("address", {}).get("label", ""),
                "lat": pos.get("lat"),
                "lng": pos.get("lng"),
            })
        # Only return items that have coordinates (skip category / chain results)
        return [s for s in suggestions if s["lat"] is not None]
    except requests.exceptions.RequestException as e:
        print(f"[traffic] Autosuggest error: {e}")
        return []


@cachetools.func.ttl_cache(maxsize=200, ttl=3600)
def geocode_address(query: str) -> dict | None:
    """Convert an address to lat/lng. Cached 1 hour to minimize API calls."""
    params = {"q": query, "limit": 1, "apiKey": API_KEY}
    try:
        resp = session.get(GEOCODE_URL, params=params, timeout=5)
        resp.raise_for_status()
        items = resp.json().get("items", [])
        if not items:
            return None
        pos = items[0].get("position", {})
        return {
            "lat": pos.get("lat"),
            "lng": pos.get("lng"),
            "label": items[0].get("title", query),
        }
    except requests.exceptions.RequestException as e:
        print(f"[traffic] Geocode error: {e}")
        return None


# ── Route Formatting ──────────────────────────────────────────────────────────

def _classify_traffic(delay_seconds: int) -> str:
    if delay_seconds > 600:
        return "high"
    if delay_seconds > 300:
        return "medium"
    return "low"


def _label_route(traffic_level: str, delay_minutes: int) -> str:
    if traffic_level == "low":
        return "Reliable"
    if delay_minutes < 5:
        return "Fastest"
    return "Traffic Heavy"


def format_route(route: dict) -> dict | None:
    """Format a single HERE routing API route into a normalised dict."""
    sections = route.get("sections", [])
    if not sections:
        return None

    # For multi-section routes (transit), aggregate across all sections
    first = sections[0]
    last = sections[-1]

    total_duration = 0
    total_base = 0
    total_length = 0
    all_roads: set[str] = set()
    all_instructions: list[str] = []
    all_coords: list[list[float]] = []

    for sec in sections:
        summary = sec.get("summary") or sec.get("travelSummary") or {}
        total_duration += summary.get("duration", 0)
        total_base += summary.get("baseDuration", summary.get("duration", 0))
        total_length += summary.get("length", 0)

        for span in sec.get("spans", []):
            for name in span.get("names", []):
                all_roads.add(name.get("value", ""))

        for action in sec.get("actions", []):
            if action.get("instruction"):
                all_instructions.append(action["instruction"])

        polyline_str = sec.get("polyline", "")
        all_coords.extend(decode_flexible_polyline(polyline_str))

    delay = total_duration - total_base
    traffic_level = _classify_traffic(delay)
    transport_mode = first.get("transport", {}).get("mode", "car")

    departure_place = first.get("departure", {})
    arrival_place = last.get("arrival", {})

    origin_loc = departure_place.get("place", {}).get("location", {})
    dest_loc = arrival_place.get("place", {}).get("location", {})

    eta = round(total_duration / 60)
    delay_mins = round(delay / 60)

    return {
        "eta_minutes": eta,
        "label": _label_route(traffic_level, delay_mins),
        "commute_type": transport_mode,
        "arrival_time": arrival_place.get("time", ""),
        "departure_time": departure_place.get("time", ""),
        "traffic_level": traffic_level,
        "distance": round(total_length / 1609.34, 1),
        "roads": list(all_roads),
        "instructions": all_instructions,
        "origin": (origin_loc.get("lat", 0.0), origin_loc.get("lng", 0.0)),
        "destination": (dest_loc.get("lat", 0.0), dest_loc.get("lng", 0.0)),
        "polyline": first.get("polyline", ""),
        "decoded_coords": all_coords,
        "delay_minutes": delay_mins,
    }


def format_data(data: dict) -> list:
    if not data.get("routes"):
        return []
    formatted = [r for r in (format_route(route) for route in data["routes"]) if r]
    return sorted(formatted, key=lambda r: (r["eta_minutes"], r["delay_minutes"]))


def get_formatted_routes(origin: tuple, destination: tuple, mode: str = "any") -> list:
    return format_data(get_routes(origin, destination, mode))


def get_planned_routes(origin: tuple, destination: tuple, arrival_time: str, mode: str = "any") -> list:
    return format_data(plan_routes(origin, destination, arrival_time, mode))


def get_transit_routes(origin: tuple, destination: tuple, arrival_time: str | None = None) -> list:
    return format_data(transit_routes(origin, destination, arrival_time))


if __name__ == "__main__":
    # Quick smoke test
    records = get_formatted_routes((33.753746, -84.386330), (33.640728, -84.427700), "car")
    print(f"Routes returned: {len(records)}")
    if records:
        r = records[0]
        print(f"  ETA: {r['eta_minutes']} min | Traffic: {r['traffic_level']} | Coords: {len(r['decoded_coords'])}")
