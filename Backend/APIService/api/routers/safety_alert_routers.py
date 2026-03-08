from fastapi import APIRouter, Depends, HTTPException
from api.deps import db_dependency
from schemas.safety_feed_schema import SafetyCreate, SafetyDataResponse
from crud import safety as s

router = APIRouter(prefix="/safety", tags=["alerts"])

@router.post("/")
def post_alert(alert: SafetyCreate, db: db_dependency):
    return s.insert_alert(db, alert)

@router.get("/", response_model=SafetyDataResponse)
def fetch_alerts(db: db_dependency):
    print("Endpoint hit")
    return s.get_alerts(db)

@router.post("/upvote")
def upvote_alert(alert_id: int, db: db_dependency):
    return s.upvote_alert(db, alert_id)

@router.post("/downvote")
def downvote_alert(alert_id: int, db: db_dependency):
    return s.downvote_alert(db, alert_id)