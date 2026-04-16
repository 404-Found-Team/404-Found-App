from typing import Optional
from sqlalchemy import Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from db.base import Base


class SafetyFeed(Base):
    __tablename__ = "safety_feed"

    alert_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("user.user_id"), nullable=True)

    # Alert classification
    type: Mapped[str] = mapped_column(String, nullable=False)
    # Predefined icon subtype (e.g. 'heavy_traffic', 'construction', 'police',
    # 'runaway_animal', 'accident', 'hazard', 'road_closure', 'flooding',
    # 'stalled_car') – only populated for icon-style alerts.
    subtype: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # GPS coordinates for placing the alert on the map
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Comment-bubble vs icon-marker
    is_comment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Urgency for comment bubbles: 'low' (green), 'medium' (yellow),
    # 'high' (red), or None for default (grey)
    urgency: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    upvotes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    downvotes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return (
            f"<SafetyFeed(alert_id={self.alert_id}, type='{self.type}', "
            f"subtype='{self.subtype}', is_comment={self.is_comment})>"
        )
