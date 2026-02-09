from fastapi import FastAPI, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
import uvicorn
from api.api_v1 import api_router

# Create a FastAPI app
app = FastAPI(title="404 Found API")

app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run(app)
