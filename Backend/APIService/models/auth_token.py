from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from datetime import datetime
from db.base import Base

class AuthToken(Base):
    __tablename__ = "auth_token"

    token_hash = Column(String, primary_key=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    created_at = Column(DateTime, nullable=False)

    def __repr__(self) -> str:
        return f"<AuthToken(token_hash='{self.token_hash[:16]}...', user_id={self.user_id})>"
