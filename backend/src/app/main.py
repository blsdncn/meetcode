import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
import asyncio

from app.services.matchmaking_loop import matchmaking_loop
from app.routes import api_router
from app.routes.websocket import router as websocket_router
from app.core.database import Base, engine
from fastapi.middleware.cors import CORSMiddleware

background_tasks = set()

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(matchmaking_loop())
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)
    print("[Startup] Matchmaking loop started")
    try:
        yield
    finally:
        print("[Shutdown] Stopping matchmaking loop")
        for task in background_tasks:
            task.cancel()
        if background_tasks:
            await asyncio.gather(*background_tasks, return_exceptions=True)
        print("[Shutdown] Matchmaking loop stopped")

Base.metadata.create_all(bind=engine)

app = FastAPI(
    lifespan=lifespan,
    title="Meetcode API",
    description="LeetCode Study Partner Backend API",
    version="1.0.0"
)
app.include_router(api_router, prefix="")

# CORS configuration from environment variable
# Accepts comma-separated list of origins
cors_origins_env = os.getenv("CORS_ORIGINS", "https://localhost")
origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,  # Using JWT in Authorization header, not cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/")
async def root():
    return {"message": "Meetcode - LeetCode Study Partner Backend"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# API health endpoint for reverse proxy
@app.get("/api/health")
async def api_health():
    return {"status": "healthy"}
