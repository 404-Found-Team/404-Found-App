from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from api.deps import get_db, db_dependency
from models.user import User
from schemas.signup_schema import UserCreate, UserResponse
from schemas.login_schema import LoginRequest, LoginResponse
from schemas.pword_reset_schema import PasswordChangeRequest, PasswordResetRequest, PasswordResetResponse, PasswordResetTokenRequest
from crud import user as u
from core import security as s

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: db_dependency):
    return u.create_user(db, user)

@router.post("/login", response_model=LoginResponse)
def login(user: LoginRequest, db: db_dependency):
    return u.verify_password(db, user)

@router.post("/logout")
async def logout(db: db_dependency, current_user: User = Depends(s.get_current_active_user)):
    u.flag_inactive_user(db, current_user.email)
    # optionally revoke all refresh tokens for this user
    return {"message": "Logged out successfully"}

@router.post("/refresh")
async def refresh_token(db: db_dependency, current_user: User = Depends(s.get_current_active_user)):
    refresh_token_obj = u.get_refresh_token_for_user(db, current_user.email)
    if not refresh_token_obj or not s.is_refresh_token_valid(refresh_token_obj):
        u.flag_inactive_user(db, current_user.email)
        raise HTTPException(status_code=401, detail="No valid refresh token found.")
    
    new_access_token = s.create_access_token(data={"sub": current_user.email})
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.post("/reset")
async def request_reset(reset_request: PasswordResetRequest):
    pass