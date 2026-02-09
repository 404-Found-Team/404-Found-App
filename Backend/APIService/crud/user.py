from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.user import User
from schemas.signup_schema import UserCreate
from datetime import datetime

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
        pword_hash=user.password,
        created_at=datetime.now(),
        is_active=False
        )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user