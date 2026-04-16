from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.safety_feed import SafetyFeed
from schemas.safety_feed_schema import SafetyCreate, SafetyData, SafetyDataResponse
from datetime import datetime

# ── Content Filter ─────────────────────────────────────────────────────────────
# A minimal word list. Extend this set as needed – it is intentionally kept
# small here to avoid shipping a large profanity corpus in source code.
_BANNED_WORDS: frozenset[str] = frozenset({
    "fuck", "shit", "bitch", "asshole", "cunt", "nigger", "faggot",
    "retard", "kike", "spic", "chink",
})


def _passes_content_filter(text: str) -> bool:
    """Return True if the text contains no banned words."""
    words = text.lower().split()
    return not any(w.strip(".,!?;:\"'") in _BANNED_WORDS for w in words)


# ── Insert ─────────────────────────────────────────────────────────────────────

def insert_alert(db: Session, alert: SafetyCreate) -> SafetyFeed:
    """Validate and insert a new alert into the database."""
    if not _passes_content_filter(alert.description):
        raise HTTPException(status_code=400, detail="Alert contains inappropriate language.")

    db_alert = SafetyFeed(
        user_id=alert.user_id,
        type=alert.type,
        subtype=alert.subtype,
        description=alert.description,
        location=alert.location,
        lat=alert.lat,
        lng=alert.lng,
        is_comment=alert.is_comment,
        urgency=alert.urgency,
        upvotes=0,
        downvotes=0,
        created_at=datetime.now(),
        is_active=True,
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
                # return db_alert
    # Convert through _to_safety_data so the `timestamp` field (mapped from
    # `created_at`) is present on the returned object.  All other CRUD
    # functions already use this helper; skipping it here caused a Pydantic
    # ResponseValidationError in the router because SafetyFeed has no
    # `timestamp` attribute.
    return _to_safety_data(db_alert)


# ── Fetch ──────────────────────────────────────────────────────────────────────

def get_alerts(db: Session, lat: float | None = None, lng: float | None = None) -> SafetyDataResponse:
    """Return active alerts.

    If *lat* and *lng* are provided the list is sorted so alerts closer to
    that location appear first (approximate relevance without trip history).
    """
    _expire_stale_alerts(db)

    rows = db.query(SafetyFeed).filter(SafetyFeed.is_active == True).all()

    if lat is not None and lng is not None:
        def _dist(a: SafetyFeed) -> float:
            if a.lat is None or a.lng is None:
                return float("inf")
            return (a.lat - lat) ** 2 + (a.lng - lng) ** 2
        rows = sorted(rows, key=_dist)

    return SafetyDataResponse(lots=[_to_safety_data(r) for r in rows])


def _to_safety_data(row: SafetyFeed) -> SafetyData:
    return SafetyData(
        alert_id=row.alert_id,
        type=row.type,
        subtype=row.subtype,
        description=row.description,
        upvotes=row.upvotes,
        downvotes=row.downvotes,
        location=row.location,
        lat=row.lat,
        lng=row.lng,
        is_comment=row.is_comment,
        urgency=row.urgency,
        timestamp=row.created_at,
    )


# ── Voting ─────────────────────────────────────────────────────────────────────

def upvote_alert(db: Session, alert_id: int) -> SafetyData:
    alert = db.query(SafetyFeed).filter(SafetyFeed.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    alert.upvotes += 1
    db.commit()
    db.refresh(alert)
    return _to_safety_data(alert)


def downvote_alert(db: Session, alert_id: int) -> SafetyData:
    alert = db.query(SafetyFeed).filter(SafetyFeed.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    alert.downvotes += 1
    db.commit()
    db.refresh(alert)
    return _to_safety_data(alert)


# ── Expiry Logic ───────────────────────────────────────────────────────────────

def _expire_stale_alerts(db: Session) -> None:
    """Mark alerts inactive based on sentiment and age.

    Thresholds:
      - Strongly downvoted (net ≤ -2): expire immediately.
      - Neutral  (-1 to +1): expire after 30 min.
      - Moderately upvoted (2-4): expire after 3 h.
      - Highly upvoted (>4): expire after 6 h.
    """
    alerts = db.query(SafetyFeed).filter(SafetyFeed.is_active == True).all()
    now = datetime.now()
    for a in alerts:
        net = a.upvotes - a.downvotes
        age_mins = (now - a.created_at).total_seconds() / 60
        if net <= -2:
            a.is_active = False
        elif net <= 1 and age_mins > 30:
            a.is_active = False
        elif net <= 4 and age_mins > 180:
            a.is_active = False
        elif age_mins > 360:
            a.is_active = False
    db.commit()
