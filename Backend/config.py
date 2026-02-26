import os 
from dotenv import load_dotenv

load_dotenv()

def get_env_var(name: str):
    int_vars = ["ACCESS_TOKEN_EXPIRE_MINUTES", "REFRESH_TOKEN_EXPIRE_DAYS"]
    value = os.getenv(name)
    if value is None:
        raise ValueError(f"Missing environment variable: {name}")
    if name in int_vars:
        return int(value)
    return str(value)

class Config:
    MARTA_API_KEY = get_env_var("MARTA_API_KEY")
    DEBUG = get_env_var("DEBUG")
    GOOGLE_CLIENT_ID = get_env_var("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = get_env_var("GOOGLE_CLIENT_SECRET")
    DATABASE_URL = get_env_var("DATABASE_URL")
    SECRET_KEY = get_env_var("SECRET_KEY")
    ALGORITHM = get_env_var("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES = get_env_var("ACCESS_TOKEN_EXPIRE_MINUTES")
    REFRESH_TOKEN_EXPIRE_DAYS = get_env_var("REFRESH_TOKEN_EXPIRE_DAYS")