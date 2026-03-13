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
async def logout(db: db_dependency, token: str = Depends(s.oauth2_scheme)):
    data = s.decode_token(token)
    if data:
        email = data['sub']
        u.flag_inactive_user(db, email)
        # Revoke all refresh tokens for this user
        token_obj = u.get_refresh_token_for_user(db, email)
        if token_obj is not None:
            u.revoke_refresh_token(db, email)
    return {"message": "Logged out successfully"}

@router.post("/refresh")
async def refresh_token(db: db_dependency, access_token: str):
    data = s.decode_token(access_token)
    if data:
        refresh_token_obj = u.get_refresh_token_for_user(db, data['sub'])
        if not refresh_token_obj or not s.is_refresh_token_valid(refresh_token_obj):
            u.flag_inactive_user(db, data['sub'])
            raise HTTPException(status_code=401, detail="No valid refresh token found.")
        
        new_access_token = s.create_access_token(data={"sub": data['sub']})
        return {"access_token": new_access_token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid access token")

@router.post("/reset")
async def request_reset(reset_request: PasswordResetRequest):
    pass

@router.get("/me")
async def user_info(db: db_dependency, token: str = Depends(s.oauth2_scheme)):
    data = s.decode_token(token)
    if data:
        email = data['sub']
        info = u.get_user_info(db, email)
        return info