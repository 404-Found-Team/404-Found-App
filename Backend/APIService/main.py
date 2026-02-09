from fastapi import FastAPI, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
import uvicorn
from api.api_v1 import api_router

# Create a FastAPI app


from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
import os
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app):
    config = Config(environ=os.environ)
    oauth = OAuth(config)
    oauth.register(
        name='google',
        client_id=os.environ.get('GOOGLE_CLIENT_ID', ''),
        client_secret=os.environ.get('GOOGLE_CLIENT_SECRET', ''),
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )
    app.state.oauth = oauth
    yield

app = FastAPI(title="404 Found API", lifespan=lifespan)

app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run(app)
