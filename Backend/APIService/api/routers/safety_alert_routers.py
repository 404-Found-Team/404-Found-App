from fastapi import APIRouter
from typing import Optional
from api.deps import db_dependency
from schemas.safety_feed_schema import SafetyCreate, SafetyData, SafetyDataResponse, VoteRequest
from crud import safety as s

router = APIRouter(prefix="/safety", tags=["alerts"])


@router.post("/", response_model=SafetyData)
def post_alert(alert: SafetyCreate, db: db_dependency):
    return s.insert_alert(db, alert)


@router.get("/", response_model=SafetyDataResponse)
def fetch_alerts(
    db: db_dependency,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
):
    """Fetch active alerts. Pass ?lat=&lng= to sort by proximity."""
    return s.get_alerts(db, lat=lat, lng=lng)


@router.post("/upvote", response_model=SafetyData)
def upvote_alert(body: VoteRequest, db: db_dependency):
    return s.upvote_alert(db, body.alert_id)


@router.post("/downvote", response_model=SafetyData)
def downvote_alert(body: VoteRequest, db: db_dependency):
    return s.downvote_alert(db, body.alert_id)
