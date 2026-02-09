
'''
from sqlalchemy import Column, Integer, String, Text, Date
from enum import Enum
from typing import Optional
# from ..database import base
from typing import List
from pydantic import BaseModel, ConfigDict, Json



class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str 
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class OAuth2(BaseModel):
    pass

class PasswordReset(BaseModel):
    pass
'''