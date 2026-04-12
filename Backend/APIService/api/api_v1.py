
"""
API v1 router registration, including OAuth2 endpoints.
"""
import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from fastapi import APIRouter

from Backend.APIService.api.routers import parking_routers
from api.routers import auth_routers, oauth_routers, safety_alert_routers, transit_routers, commute_routers

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_routers.router)
api_router.include_router(oauth_routers.router)
api_router.include_router(parking_routers.router)
api_router.include_router(safety_alert_routers.router)
api_router.include_router(transit_routers.router) 
api_router.include_router(commute_routers.router) 
