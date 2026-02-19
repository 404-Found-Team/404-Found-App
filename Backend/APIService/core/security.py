"""Security helpers: password hashing, JWT creation/verification, and OAuth helpers.

This module intentionally provides dependency functions and utilities only —
do not create a FastAPI `app` here. Use the `oauth2_scheme`, `get_current_user`,
and `get_current_active_user` dependencies from your routers.
"""

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Callable

from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from api.deps import get_db
from crud import user as u
from models.user import User
from models.auth_token import AuthToken

# Configuration (override with environment variables in production)
SECRET_KEY = os.environ.get("SECRET_KEY", "change-this-secret-in-production")
ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_pword(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    db: Optional[Session] = None
) -> str:
    """Create a refresh token and optionally store its JTI via `store_jti` callback.

    `store_jti` should accept (db, jti, subject, expires_at).
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    jti = str(uuid.uuid4())
    to_encode.update({"jti": jti})
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "iat": now})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    # prefer explicit callback, otherwise if db provided store using DB helper
    if db is not None:
        # default DB-backed storage
        try:
            subject = data.get("sub")
            if subject is not None:
                subject = str(subject)
                u.store_refresh_token(db, subject, token, expire)
            else:
                raise Exception
        except Exception:
            pass

    return token

def verify_refresh_token(token: str, db: Session) -> dict:
    """Decode refresh token, check DB for JTI and revocation. Raises HTTPException on failure."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti: Optional[str] = payload.get("jti")
        if jti is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    if u.is_refresh_revoked(db, token):
        raise credentials_exception

    return payload

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not getattr(current_user, "is_active", False):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
