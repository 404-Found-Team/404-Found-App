from fastapi import APIRouter, Depends, HTTPException
from api.deps import db_dependency
from schemas.safety_feed_schema import SafetyCreate, SafetyDataResponse

router = APIRouter(prefix="/safety", tags=["alerts"])

@router.post("/")
def post_alert(alert: SafetyCreate, db: db_dependency):
    pass