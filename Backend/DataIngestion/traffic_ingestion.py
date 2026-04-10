import requests
import json
import cachetools.func
from datetime import datetime, timezone
from config import Config

API_KEY = Config.HERE_API_KEY

session = requests.Session()
call_count = 0

@cachetools.func.ttl_cache(maxsize=50)
def get_routes(origin, destination):
    global call_count
    call_count += 1
    print(f'API call: #{call_count}')

    url = "https://router.hereapi.com/v8/routes"

    params = {
        "origin": f"{origin[0]},{origin[1]}",
        "destination": f"{destination[0]},{destination[1]}",
        "transportMode": "car",
        "routingMode": "fast",
        "departureTime": '2026-04-08T16:00:00Z', #datetime.now(timezone.utc).isoformat(),
        "alternatives": 1,
        "return": "polyline,summary,actions,instructions"
    }

    try:
        response = session.get(
            url,
            params={**params, "apiKey": API_KEY},
            timeout=5
        )
        response.raise_for_status()
        return response.json()

    except requests.exceptions.RequestException as e:
        print("Error fetching routes:", e)
        return {"routes": []}



def extract_highways(actions):
    highways = []

    for action in actions:
        instruction = action.get("instruction", "").lower()

        if "i-" in instruction or "highway" in instruction:
            highways.append(action["instruction"])

    return highways[:3]  # limit for UI


def simplify_steps(actions, limit=5):
    steps = []

    for action in actions:
        instruction = action.get("instruction")
        if instruction:
            steps.append(instruction)

    return steps[:limit]


def format_route(route):
    section = route["sections"][0]
    summary = section["summary"]

    duration = summary["duration"]          # seconds
    base_duration = summary["baseDuration"] # seconds
    length = summary["length"]              # meters

    delay = duration - base_duration

    # Traffic classification
    if delay > 600:
        traffic_level = "high"
    elif delay > 300:
        traffic_level = "medium"
    else:
        traffic_level = "low"

    return {
        "eta_minutes": round(duration / 60),
        "distance_miles": round(length / 1609.34, 1),
        "delay_minutes": round(delay / 60),
        "traffic_level": traffic_level,

        "primary_roads": extract_highways(section["actions"]),
        "preview_steps": simplify_steps(section["actions"]),

        "polyline": section["polyline"]
    }

def label_route(route_data):
    if route_data["traffic_level"] == "low":
        return "🛡 Reliable"
    elif route_data["delay_minutes"] < 5:
        return "⚡ Fastest"
    else:
        return "⚠️ Traffic Heavy"
    
def rank_routes(routes):
    return sorted(routes, key=lambda r: (
        r["eta_minutes"],
        r["delay_minutes"]
    ))

def format_data(data):
    formatted_routes = [format_route(route) for route in data["routes"]]
    labeled_routes = [label_route(route) for route in formatted_routes]
    ranked_routes = rank_routes(formatted_routes)
    print(ranked_routes)

origin = (33.7542, -84.3873)
destination = (33.50614, -84.23510)
data = get_routes(origin, destination)
format_data(data)