import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
import requests
import cachetools.func

MARTA_API_KEY = Config.MARTA_API_KEY
BASE_URL = 'https://developerservices.itsmarta.com:18096/itsmarta'
TRAIN_PATH = '/railrealtimearrivals/developerservices/traindata'

url = f'{BASE_URL}{TRAIN_PATH}'
params = {"apiKey": MARTA_API_KEY}

# Holds the most recent successful response so callers get stale-but-valid
# data instead of an empty list when the MARTA API is temporarily unavailable.
_last_good_data: list = []


@cachetools.func.ttl_cache(maxsize=1, ttl=30)
def call_marta() -> list:
    """Return live MARTA train arrivals, cached for 30 s.

    Falls back to the last successful result if the API call fails, so the
    frontend always receives data rather than an empty list.
    """
    global _last_good_data
    result = _marta_request()
    if result:
        _last_good_data = result
        return result
    # API failed — serve the most recent good snapshot
    return _last_good_data


def _marta_request() -> list:
    """Fetch MARTA data from the API. Returns [] on any error."""
    try:
        response = requests.get(url, params=params, timeout=20)
        response.raise_for_status()

        try:
            data = response.json()
        except Exception as e:
            print(f"[MARTA] JSON parse error: {e}")
            return []

        if not isinstance(data, list):
            print(f"[MARTA] Unexpected response format: {type(data)}")
            return []

        return _parse_trains(data)

    except requests.RequestException as e:
        print(f"[MARTA] Request error: {e}")
        return []
    except Exception as e:
        print(f"[MARTA] Unexpected error: {e}")
        return []


def _parse_trains(data: list) -> list:
    """Convert raw MARTA JSON list into normalised dicts."""
    records = []
    for item in data:
        try:
            records.append({
                'line': item['LINE'],
                'direction': item['DIRECTION'],
                'station': item['STATION'],
                'destination': item['DESTINATION'],
                'next_arrival': item['NEXT_ARR'],
                'waiting_seconds': item['WAITING_SECONDS'],
                'timestamp': item['EVENT_TIME'],
            })
        except KeyError as e:
            print(f"[MARTA] Missing field {e} in item — skipping")
            continue
    return records
