from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class LoginRequest(BaseModel):
    """Schema for user login request"""
    email: EmailStr
    password: str = Field(..., min_length=1, description="User password")

class LoginResponse(BaseModel):
    """Schema for user login response"""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str

    class Config:
        from_attributes = True

class TokenData(BaseModel):
    """Schema for token payload data"""
    email: Optional[str] = None
    user_id: Optional[int] = None
