from fastapi import APIRouter, Depends, HTTPException
from pathlib import Path
import sys
import os
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from DataIngestion.marta_ingestion import call_marta

router = APIRouter(prefix="/transit", tags=["transit"])

@router.get("/")
def get_transit():
    data = call_marta()
    data.sort(key=lambda t: int(t.get('waiting_seconds') or 9999))
    return {'trains': data}