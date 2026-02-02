from fastapi import FastAPI, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from typing import Annotated, List
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn

# Create a FastAPI app
app = FastAPI()

if __name__ == "__main__":
    uvicorn.run(app)
