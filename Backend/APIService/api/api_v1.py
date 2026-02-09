
from fastapi import APIRouter
from api.routers import auth_routers

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_routers.router)
