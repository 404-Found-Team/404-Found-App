from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class TransitData(BaseModel):
    line: str
    direction: str
    station: str
    destination: str
    next_arrival: datetime
    waiting_seconds: int
    timestamp: datetime

class TransitDataResponse(BaseModel):
    lots: list[TransitData]

    class Config:
        from_attributes = True