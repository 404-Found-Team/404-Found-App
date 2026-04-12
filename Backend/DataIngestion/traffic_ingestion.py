import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import requests
import json
import cachetools.func
from datetime import datetime, timezone
from config import Config

API_KEY = Config.HERE_API_KEY

session = requests.Session()
url = "https://router.hereapi.com/v8/routes"

@cachetools.func.ttl_cache(maxsize=50)
def get_routes(origin, destination, mode):
    params = {
        "origin": f"{origin[0]},{origin[1]}",
        "destination": f"{destination[0]},{destination[1]}",
        "transportMode": mode if mode != "any" else "car",
        "routingMode": "fast",
        "departureTime": '2026-04-11T18:00:00Z', #datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "alternatives": 1,
        "spans": "names",
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

@cachetools.func.ttl_cache(maxsize=50)
def plan_routes(origin, destination, arrival_time, mode = "any"):
    params = {
        "origin": f"{origin[0]},{origin[1]}",
        "destination": f"{destination[0]},{destination[1]}",
        "transportMode": mode if mode != "any" else "car",
        "routingMode": "fast",
        "arrivalTime": arrival_time, #datetime.now(timezone.utc).isoformat(),
        "alternatives": 1,
        "spans": "names",
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

@cachetools.func.ttl_cache(maxsize=50)
def transit_routes(origin, destination, arrival_time = None):
    url = "https://transit.router.hereapi.com/v8/routes"
    time_param = "departureTime" if not arrival_time else "arrivalTime"
    params = {
    "origin": f"{origin[0]},{origin[1]}",
    "destination": f"{destination[0]},{destination[1]}",
    time_param: datetime.now(timezone.utc).isoformat() if not arrival_time else arrival_time,
    "alternatives": 1,
    "return": "polyline,summary,intermediateStops,travelSummary"
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


def format_route(route):
    section = route["sections"][0]
    summary = section["summary"]
    actions = section["actions"]
    instructions = [action['instruction'] for action in actions]
    roads = set()
    arrival_time = section["arrival"]["time"]
    destination : tuple = (section["arrival"]["place"]["location"]["lat"], section["arrival"]["place"]["location"]["lng"])
    departure_time = section["departure"]["time"]
    origin : tuple = (section["departure"]["place"]["location"]["lat"], section["departure"]["place"]["location"]["lng"])
    spans = section["spans"]
    tmode = section["transport"]["mode"]

    for span in spans:
        for name in span.get("names", []):
            roads.add(name.get("value", ""))
    roads = list(roads)

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
        "origin": origin,
        "destination": destination,
        "eta_minutes": round(duration / 60),
        "distance_miles": round(length / 1609.34, 1),
        "delay_minutes": round(delay / 60),
        "arrival_time": arrival_time,
        "departure_time": departure_time,
        "transport_mode": tmode,
        "traffic_level": traffic_level,
        "road_names": roads,
        "instructions": instructions,
        "polyline": section["polyline"]
    }

def label_route(route_data):
    if route_data["traffic_level"] == "low":
        return "Reliable"
    elif route_data["delay_minutes"] < 5:
        return "Fastest"
    else:
        return "Traffic Heavy"
    
def rank_routes(routes):
    return sorted(routes, key=lambda r: (
        r["eta_minutes"],
        r["delay_minutes"]
    ))

def generate_dataframe(data):
    try: 
        df = pd.DataFrame(columns=["eta_minutes", "label", "commute_type", "arrival_time", "departure_time", "traffic_level", "distance", "roads", "instructions", "origin", "destination", "polyline"])
        for route in data:
            data_dict = {
                "eta_minutes": [route["eta_minutes"]],
                "label": [label_route(route)],
                "commute_type": [route["transport_mode"]],
                "arrival_time": [route["arrival_time"]],
                "departure_time": [route["departure_time"]],
                "traffic_level": [route["traffic_level"]],
                "distance": [route["distance_miles"]],
                "roads": [route["road_names"]],
                "instructions": [route["instructions"]],
                "origin": [route["origin"]],
                "destination": [route["destination"]],
                "polyline": [route["polyline"]]
            }
            df1 = pd.DataFrame(data_dict, index=[0])
            df = pd.concat([df, df1], ignore_index=True)

        output_path = os.path.join(os.path.dirname(__file__), 'traffic_data_output.csv')
        df.to_csv(output_path, index=False)
        print(f"DataFrame exported to {output_path}")

        records = df.to_dict(orient="records")
        return records
    except Exception as e:
        print(f"Error creating dataframe: {e}")
        return []

def format_data(data):
    if not data.get("routes"):
        return []
    formatted_routes = [format_route(route) for route in data["routes"]]
    records = generate_dataframe(formatted_routes)
    return records

def get_formatted_routes(origin: tuple, destination: tuple, mode: str = "any"):
    data = get_routes(origin, destination, mode)
    return format_data(data)

def get_planned_routes(origin: tuple, destination: tuple, arrival_time: str, mode: str = "any"):
    data = plan_routes(origin, destination, arrival_time, mode)
    return format_data(data)

def get_transit_routes(origin: tuple, destination: tuple, arrival_time: str | None = None):
    data = transit_routes(origin, destination, arrival_time)
    return format_data(data)

if __name__ == "__main__":
    origin = (33.7542, -84.3873)
    destination = (33.50614, -84.23510)
    records = get_transit_routes((33.753746,-84.386330), (33.640728,-84.427700), "2026-04-12T18:00:00Z")
    #print(records)