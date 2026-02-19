"""
OAuth2 login endpoints for third-party authentication (e.g., Google).
"""

# This router handles OAuth2 login and callback for external providers.
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth, OAuthError
from starlette.config import Config
from starlette.responses import JSONResponse
from api.deps import get_db
from crud import user as u
from models.user import User
import os

router = APIRouter(prefix="/oauth", tags=["oauth"])


# OAuth is initialized in app startup and attached to app.state
def get_oauth(request: Request):
    return request.app.state.oauth


@router.get('/login')
async def oauth_login(request: Request):
    oauth = get_oauth(request)
    redirect_uri = request.url_for('oauth_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get('/callback')
async def oauth_callback(request: Request, db: Session = Depends(get_db)):
    oauth = get_oauth(request)
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = await oauth.google.parse_id_token(request, token)
    except OAuthError as error:
        return JSONResponse({'error': str(error)}, status_code=400)
    email = user_info.get('email')
    if not email:
        raise HTTPException(status_code=400, detail='OAuth provider did not return email')
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        # Optionally create a new user
        db_user = u.create_user(db, u.UserCreate(
            fname=user_info.get('given_name', ''),
            lname=user_info.get('family_name', ''),
            email=email,
            password=os.urandom(16).hex(),  # random password
            confirm_password=os.urandom(16).hex()
        ))
    # Mark user as active
    u.flag_active_user(db, db_user.email)
    # Issue tokens
    access_token = u.s.create_access_token(data={"sub": db_user.email})
    refresh_token = u.s.create_refresh_token(data={"sub": db_user.email}, db=db)
    response = RedirectResponse(url="/")  # Redirect to frontend/home
    response.set_cookie("access_token", access_token, httponly=True)
    response.set_cookie("refresh_token", refresh_token, httponly=True)
    return response
