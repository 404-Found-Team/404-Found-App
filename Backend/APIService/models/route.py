from sqlalchemy import Column, Integer, String, DateTime, LargeBinary, ForeignKey
from datetime import datetime
from db.base import Base

class Route(Base):
    __tablename__ = "route"

    route_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    start_location = Column(String, nullable=False)
    end_location = Column(String, nullable=False)
    mode_transport = Column(String, nullable=False)
    departure = Column(DateTime, nullable=False)
    predicted_arrival = Column(DateTime, nullable=False)
    arrival = Column(DateTime, nullable=False)
    route_path = Column(LargeBinary, nullable=False)
    marta_status_id = Column(Integer, nullable=True)
    parking_status_id = Column(Integer, ForeignKey("parking_status.parking_status_id"), nullable=True)
    traffic_status_id = Column(String, ForeignKey("traffic_status.traffic_status_id"), nullable=False)
    weather_status = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)

    def __repr__(self) -> str:
        return f"<Route(route_id={self.route_id}, user_id={self.user_id}, start='{self.start_location}', end='{self.end_location}')>"
