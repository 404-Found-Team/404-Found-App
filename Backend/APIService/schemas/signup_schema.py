from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    """Schema for user signup/creation"""
    fname: str = Field(..., min_length=1, max_length=75, description="First name")
    lname: str = Field(..., min_length=1, max_length=75, description="Last name")
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    confirm_password: str = Field(..., min_length=8, description="Password confirmation")

class UserResponse(BaseModel):
    """Schema for user response"""
    user_id: int
    fname: str 
    lname: str 
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    """Schema for updating user information"""
    fname: Optional[str] = Field(None, min_length=1, max_length=75)
    lname: Optional[str] = Field(None, min_length=1, max_length=75)

    class Config:
        from_attributes = True