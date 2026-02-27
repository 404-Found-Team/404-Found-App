from typing import Optional
from sqlalchemy import Integer, String, DateTime, LargeBinary, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from db.base import Base

class Lot(Base):
    __tablename__ = "parking_status"

    parking_status_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    lot_name: Mapped[str] = mapped_column(String, nullable=False)
    lot_street_address: Mapped[str] = mapped_column(String, nullable=False)
    available_spaces: Mapped[int] = mapped_column(Integer, nullable=False)
    percent_open: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    def __repr__(self) -> str:
        return f"<Lot(parking_status_id={self.parking_status_id}, lot_name={self.lot_name}, spaces={self.available_spaces})>"