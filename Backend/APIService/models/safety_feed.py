from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from datetime import datetime
from db.base import Base

class SafetyFeed(Base):
    __tablename__ = "safety_feed"

    alert_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=True)
    type = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    upvotes = Column(Integer, nullable=False)
    downvotes = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False)

    def __repr__(self) -> str:
        return f"<SafetyFeed(alert_id={self.alert_id}, type='{self.type}', user_id={self.user_id})>"

