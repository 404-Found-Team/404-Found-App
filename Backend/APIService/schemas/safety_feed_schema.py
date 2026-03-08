from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SafetyCreate(BaseModel):
    user_id: Optional[int]
    type: str
    description: str
    location: str

class SafetyData(BaseModel):
    type: str
    description: str
    upvotes: int
    downvotes: int
    location: str
    timestamp: datetime

class SafetyDataResponse(BaseModel):
    lots: list[SafetyData]

    class Config:
        from_attributes = True