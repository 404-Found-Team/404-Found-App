from fastapi import APIRouter
from sqlalchemy.orm import Session
from typing import List
from api.deps import get_db, db_dependency
from models.user import User
from schemas.signup_schema import UserCreate, UserResponse
from crud.user import create_user

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: db_dependency):
    return create_user(db, user)