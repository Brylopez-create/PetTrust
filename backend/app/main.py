"""
Main Application Entry Point
Wires together all routers and middleware.
"""
from fastapi import FastAPI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.cors import CORSMiddleware
import cloudinary
import logging

from app.core.config import (
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    ALLOWED_ORIGINS
)
from app.core.database import setup_indices

# Import routers
from app.routers import (
    auth, 
    payments, 
    bookings, 
    walkers, 
    admin,
    daycares,
    vets,
    pets,
    reviews,
    chat,
    wellness,
    prospects,
    providers,
    uploads
)

# Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# FastAPI App
app = FastAPI(
    title="PetTrust API",
    description="API for PetTrust - Pet Care Services Platform",
    version="2.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cloudinary Configuration
cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True
)
logging.info(f"Cloudinary configured - Cloud Name: {CLOUDINARY_CLOUD_NAME}")

# Startup Event
@app.on_event("startup")
async def on_startup():
    await setup_indices()

# Mount ALL Routers under /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(walkers.router, prefix="/api")
app.include_router(daycares.router, prefix="/api")
app.include_router(vets.router, prefix="/api")
app.include_router(pets.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(wellness.router, prefix="/api")
app.include_router(prospects.router, prefix="/api")
app.include_router(providers.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

# Root endpoint
@app.get("/api/")
async def root():
    return {"message": "PetTrust Bogotá API v2.0 (Modular)"}


# Note: To run with modular structure:
# uvicorn app.main:app --reload
# OR keep using server.py which imports from here
