from pydantic import BaseModel, Field
from typing import Optional, List, Tuple


class RouteRequest(BaseModel):
    """Request schema for all route endpoints (no arrival time)."""
    origin: Tuple[float, float] = Field(..., description="Origin coordinates as (latitude, longitude)")
    destination: Tuple[float, float] = Field(..., description="Destination coordinates as (latitude, longitude)")


class PlannedRouteRequest(BaseModel):
    """Request schema for planned route endpoints (with arrival time)."""
    origin: Tuple[float, float] = Field(..., description="Origin coordinates as (latitude, longitude)")
    destination: Tuple[float, float] = Field(..., description="Destination coordinates as (latitude, longitude)")
    arrival_time: str = Field(..., description="Target arrival time in ISO 8601 format, e.g. 2026-04-12T18:00:00Z")


class DepartureRouteRequest(BaseModel):
    """Request schema for leave-at route endpoints (with departure time)."""
    origin: Tuple[float, float] = Field(..., description="Origin coordinates as (latitude, longitude)")
    destination: Tuple[float, float] = Field(..., description="Destination coordinates as (latitude, longitude)")
    departure_time: str = Field(..., description="Planned departure time in ISO 8601 format, e.g. 2026-04-12T17:00:00Z")


class RouteData(BaseModel):
    """Schema for a single processed route record."""
    eta_minutes: int
    label: str
    commute_type: str
    arrival_time: str
    departure_time: str
    traffic_level: str
    distance: float
    roads: List[str]
    instructions: List[str]
    origin: Tuple[float, float]
    destination: Tuple[float, float]
    polyline: str
    # Decoded [[lat, lng], ...] coordinates for drawing the route on a map.
    # Computed server-side from HERE's flexible polyline so the frontend
    # doesn't need a decoding library.
    decoded_coords: Optional[List[List[float]]] = Field(default_factory=list)
    delay_minutes: Optional[int] = 0

    class Config:
        from_attributes = True


class RouteResponse(BaseModel):
    """Response schema for route endpoints."""
    routes: List[RouteData]

    class Config:
        from_attributes = True
