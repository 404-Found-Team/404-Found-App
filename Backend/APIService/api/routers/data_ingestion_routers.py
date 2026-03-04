from fastapi import APIRouter, Depends, HTTPException

import sys
import os
from pathlib import Path

# Add Backend directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from DataIngestion.webscraper import call_scraper
from models.parking_lots import Lot
from schemas.parking_data_schema import ParkingDataResponse


router = APIRouter(prefix="/parking", tags=["data_ingestion"])

@router.get("/", response_model=ParkingDataResponse)
def get_parking_data():
    lots = call_scraper()
    return {"lots": lots}