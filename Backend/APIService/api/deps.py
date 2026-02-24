import sys
import os
from pathlib import Path

# Add Backend directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from fastapi import Depends
from typing import Annotated
from APIService.db.session import SessionLocal
from sqlalchemy.orm import Session

# Manage database transactions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]