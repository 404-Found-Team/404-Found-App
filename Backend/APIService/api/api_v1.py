
"""
API v1 router registration, including OAuth2 endpoints.
"""

from fastapi import APIRouter

from api.routers import auth_routers, oauth_routers, data_ingestion_routers, safety_alert_routers

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_routers.router)
api_router.include_router(oauth_routers.router)
api_router.include_router(data_ingestion_routers.router)
api_router.include_router(safety_alert_routers.router)
