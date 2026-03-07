from typing import Optional
from sqlalchemy import Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from db.base import Base


class SafetyFeed(Base):
    __tablename__ = "safety_feed"

    alert_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("user.user_id"), nullable=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    upvotes: Mapped[int] = mapped_column(Integer, nullable=False)
    downvotes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False)

    def __repr__(self) -> str:
        return f"<SafetyFeed(alert_id={self.alert_id}, type='{self.type}', user_id={self.user_id})>"

