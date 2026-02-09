from fastapi import FastAPI, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Annotated, List, Callable, Optional, Dict
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import timedelta, datetime
import uvicorn
from models.user import User
from schemas.signup_schema import UserCreate, UserResponse, UserUpdate
from schemas.login_schema import LoginRequest, LoginResponse, TokenData
from schemas.pword_reset_schema import PasswordChangeRequest, PasswordResetRequest, PasswordResetResponse, PasswordResetTokenRequest
from api.api_v1 import api_router
from api.deps import get_db, db_dependency

# Create a FastAPI app
app = FastAPI(title="404 Found API")

app.include_router(api_router)

SECRET_KEY = "secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=['bcrypt'], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.post("/users", response_model=List[UserResponse])
def signup(user: UserCreate, db: db_dependency):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(
            status_code=404,
            detail='User already created!'
        )
    

if __name__ == "__main__":
    uvicorn.run(app)
