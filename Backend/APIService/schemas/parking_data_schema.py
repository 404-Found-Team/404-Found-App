from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class ParkingLotData(BaseModel):
    lot_name: str
    lot_street_address: str
    available_spaces: int
    percent_open: float
    timestamp: int

class ParkingDataResponse(BaseModel):
    lots: list[ParkingLotData]

    class Config:
        from_attributes = True