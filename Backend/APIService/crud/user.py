from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from models.user import User
from models.auth_token import AuthToken
from schemas.signup_schema import UserCreate
from schemas.login_schema import LoginRequest
from core import security as s
from datetime import datetime, timezone

def create_user(db: Session, user: UserCreate):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(
            status_code=404,
            detail='User already created!'
        )
    
    db_user = User(
        email=user.email, 
        fname=user.fname,
        lname=user.lname,
        password_hash=s.get_password_hash(user.password),
        created_at=datetime.now(),
        is_active=False
        )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

def verify_password(db: Session, credentials: LoginRequest):
    db_user = db.query(User).filter(User.email == credentials.email).first()
    if not db_user or not s.verify_pword(credentials.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = s.create_access_token(data={"sub": db_user.email})
    refresh_token = s.create_refresh_token(data={"sub": db_user.email}, db=db)
    flag_active_user(db, db_user.email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": db_user.user_id
    }

def store_refresh_token(db: Session, email: str, token: str, expires: datetime) -> None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    now = datetime.now(timezone.utc)
    token = AuthToken(
        token_hash=token,
        user_id=user.user_id,
        expires_at=expires,
        created_at=now,
        revoked=False
    )

    db.add(token)
    db.commit()

def revoke_refresh_token(db: Session, token: str) -> None:
    token_obj = db.query(AuthToken).filter(AuthToken.token_hash == token).first()
    if token_obj:
        token_obj.revoked = True
        db.commit()

def is_refresh_revoked(db: Session, token: str) -> bool:
    token_obj = db.query(AuthToken).filter(AuthToken.token_hash == token).first()
    if not token_obj:
        # treat missing token as revoked/invalid
        return True
    # consider expired or explicitly revoked tokens as revoked
    if getattr(token, "revoked", False):
        return True
    expires_at = getattr(token, "expires_at", None)
    if expires_at is not None and datetime.now(timezone.utc) >= expires_at:
        return True
    return False

def flag_active_user(db: Session, email: str):
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    user.is_active = True

    db.commit()

def flag_inactive_user(db: Session, email: str):
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    user.is_active = False
    
    db.commit()