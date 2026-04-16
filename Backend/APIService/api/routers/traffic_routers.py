from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from DataIngestion.traffic_ingestion import get_traffic_incidents, geocode_address, autosuggest_places

router = APIRouter(prefix="/traffic", tags=["traffic"])


@router.get("/incidents")
def fetch_incidents(
    lat: float = Query(..., description="Centre latitude"),
    lng: float = Query(..., description="Centre longitude"),
    radius: int = Query(5000, ge=500, le=20000, description="Search radius in metres (500–20 000)"),
):
    """Return live traffic incidents near the given coordinates.

    Responses are cached server-side for 3 minutes so repeated requests
    from multiple clients within that window cost only one HERE API call.
    """
    incidents = get_traffic_incidents(lat, lng, radius)
    return {"incidents": incidents, "count": len(incidents)}


@router.get("/geocode")
def geocode(
    q: str = Query(..., min_length=2, description="Address or place name to geocode"),
):
    """Convert an address string to lat/lng coordinates.

    Results are cached server-side for 1 hour.
    """
    result = geocode_address(q)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Could not geocode: {q!r}")
    return result


@router.get("/autosuggest")
def suggest_places(
    q: str = Query(..., min_length=1, description="Partial place name or address"),
    lat: float = Query(None, description="User latitude for location-biased results"),
    lng: float = Query(None, description="User longitude for location-biased results"),
    limit: int = Query(6, ge=1, le=10, description="Max suggestions to return"),
):
    """Return up to *limit* place suggestions for a partial query string.

    Cached server-side for 2 minutes – safe to call on every keystroke
    because the cache absorbs duplicates within that window.
    """
    suggestions = autosuggest_places(q, lat, lng, limit)
    return {"suggestions": suggestions}
