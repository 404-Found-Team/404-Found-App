from pydantic import BaseModel

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