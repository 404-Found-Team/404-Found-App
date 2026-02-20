from fastapi import FastAPI, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
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

origins = [
    'http://localhost:8081',
    'http://localhost:8000',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8000',
    'http://192.168.1.157:8081',
    'http://192.168.1.157:8000',
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run(app)
