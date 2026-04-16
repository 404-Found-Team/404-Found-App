from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Request Schemas ────────────────────────────────────────────────────────────

class SafetyCreate(BaseModel):
    user_id: Optional[int] = None
    type: str
    # For icon alerts: 'heavy_traffic' | 'construction' | 'police' |
    #   'runaway_animal' | 'accident' | 'hazard' | 'road_closure' |
    #   'flooding' | 'stalled_car'
    subtype: Optional[str] = None
    description: str
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    # True = comment bubble, False = icon alert
    is_comment: bool = False
    # Urgency for comment bubbles: 'low' | 'medium' | 'high' | None (default)
    urgency: Optional[str] = None


class VoteRequest(BaseModel):
    alert_id: int


# ── Response Schemas ───────────────────────────────────────────────────────────

class SafetyData(BaseModel):
    alert_id: int
    type: str
    subtype: Optional[str] = None
    description: str
    upvotes: int
    downvotes: int
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_comment: bool = False
    urgency: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class SafetyDataResponse(BaseModel):
    lots: list[SafetyData]

    class Config:
        from_attributes = True
