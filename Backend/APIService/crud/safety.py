from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from models.safety_feed import SafetyFeed
from schemas.safety_feed_schema import SafetyCreate, SafetyData, SafetyDataResponse
from core import security as s
from datetime import datetime, timezone

def insert_alert(db: Session, alert: SafetyCreate):
    """
    Insert alert from post request into database
    """
    print(f'User_id: {alert.user_id}')
    db_alert = SafetyFeed(
        user_id=alert.user_id,
        type=alert.type,
        description=alert.description,
        location=alert.location,
        upvotes=0,
        downvotes=0,
        created_at=datetime.now(),
        is_active=True
    )

    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)

    return db_alert

def get_alerts(db: Session):
    """
    Get all active alerts from the database
    """
    alert_is_active(db)
    alerts = db.query(
        SafetyFeed.type,
        SafetyFeed.description,
        SafetyFeed.upvotes,
        SafetyFeed.downvotes,
        SafetyFeed.location,
        SafetyFeed.created_at
    ).filter(SafetyFeed.is_active == True).all()

    alert_models = [
        SafetyData(
            type=a[0],
            description=a[1],
            upvotes=a[2],
            downvotes=a[3],
            location=a[4],
            timestamp=a[5]
        ) for a in alerts
    ]
    return SafetyDataResponse(lots=alert_models)

def upvote_alert(db: Session, alert_id: int):
    """
    Add upvotes for alerts to the database
    """
    alert = db.query(SafetyFeed).filter(SafetyFeed.alert_id == alert_id).first()
    if alert:
        alert.upvotes += 1
        db.commit()
    return alert

def downvote_alert(db: Session, alert_id: int):
    """
    Add downvotes for alerts to the database
    """
    alert = db.query(SafetyFeed).filter(SafetyFeed.alert_id == alert_id).first()
    if alert:
        alert.downvotes += 1
        db.commit()
    return alert

def alert_is_active(db: Session):
    """
    Validates active alerts every 15 minutes based on 
    time since creation, upvote count, and downvote count.
    """
    alerts = db.query(SafetyFeed).filter(SafetyFeed.is_active == True).all()
    
    for alert in alerts:
        sentiment = alert.upvotes - alert.downvotes
        duration = datetime.now() - alert.created_at
        duration_mins = duration.total_seconds() / 60
        match sentiment:
            case value if value <= -2:
                alert.is_active = False
            case value if -1 <= value <= 1:
                if duration_mins > 30: 
                    alert.is_active = False
            case value if 2 <= value >= 4:
                if duration_mins >= 180:
                    alert.is_active = False
            case _:
                if duration_mins >= 360:
                    alert.is_active = False
    db.commit()