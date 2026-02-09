
from sqlalchemy import Column, Integer, String, Text, Date, Enum, DateTime, Boolean
from datetime import datetime
from db.base import Base

class User(Base):
    __tablename__ = "user"

    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    fname = Column(String, nullable=False)
    lname = Column(String, nullable=False)
    pword_hash = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False)

    def __repr__(self) -> str:
        return f"<User(id={self.user_id}, email='{self.email}')>"
