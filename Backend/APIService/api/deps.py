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