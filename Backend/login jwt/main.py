from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt


SECRET_KEY = "replace_this_with_a_secure_random_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# replace with campus db
fake_students_db = {
    "S12345678": {
        "campus_id": "S12345678",
        "hashed_password": pwd_context.hash("password123"),
        "full_name": "Alice Johnson",
        "email": "alice@university.edu"
    }
}


class Token(BaseModel):
    access_token: str
    token_type: str

class Student(BaseModel):
    campus_id: str
    email: str
    full_name: Optional[str]

class StudentInDB(Student):
    hashed_password: str

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_student(campus_id: str):
    student = fake_students_db.get(campus_id)
    if student:
        return StudentInDB(**student)
    return None

def authenticate_student(campus_id: str, password: str):
    student = get_student(campus_id)
    if not student or not verify_password(password, student.hashed_password):
        return False
    return student

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_student(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        campus_id: str = payload.get("sub")
        if campus_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    student = get_student(campus_id)
    if student is None:
        raise HTTPException(status_code=401, detail="Student not found")
    return student


app = FastAPI(title="Login backend")

# login endpoint
@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    student = authenticate_student(form_data.username, form_data.password)
    if not student:
        raise HTTPException(status_code=401, detail="Invalid Campus ID or password")
    access_token = create_access_token(
        data={"sub": student.campus_id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Protected route example 
@app.get("/me", response_model=Student)
def read_student_me(current_student: Student = Depends(get_current_student)):
    return current_student
