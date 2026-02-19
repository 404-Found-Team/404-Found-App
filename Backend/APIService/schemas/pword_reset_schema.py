from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class PasswordResetRequest(BaseModel):
    """Schema for password reset request"""
    email: EmailStr
    
class PasswordResetTokenRequest(BaseModel):
    """Schema for password reset with token"""
    token: str
    new_password: str = Field(..., min_length=8, description="New password must be at least 8 characters")
    confirm_password: str = Field(..., min_length=8, description="Password confirmation")

class PasswordChangeRequest(BaseModel):
    """Schema for authenticated user changing their password"""
    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=8, description="New password must be at least 8 characters")
    confirm_password: str = Field(..., min_length=8, description="Password confirmation")

class PasswordResetResponse(BaseModel):
    """Schema for password reset response"""
    message: str
    email: EmailStr

    class Config:
        from_attributes = True
