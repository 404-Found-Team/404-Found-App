from typing import Optional
from sqlalchemy import Integer, String, DateTime, LargeBinary, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from db.base import Base


class Route(Base):
    __tablename__ = "route"

    route_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.user_id"), nullable=False)
    start_location: Mapped[str] = mapped_column(String, nullable=False)
    end_location: Mapped[str] = mapped_column(String, nullable=False)
    mode_transport: Mapped[str] = mapped_column(String, nullable=False)
    departure: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    predicted_arrival: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    arrival: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    route_path: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    marta_status_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    parking_status_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("parking_status.parking_status_id"), nullable=True)
    traffic_status_id: Mapped[str] = mapped_column(String, ForeignKey("traffic_status.traffic_status_id"), nullable=False)
    weather_status: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    def __repr__(self) -> str:
        return f"<Route(route_id={self.route_id}, user_id={self.user_id}, start='{self.start_location}', end='{self.end_location}')>"
