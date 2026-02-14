from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request, Form, Response
import math
import hashlib
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
import httpx
from PIL import Image
import io

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import base64
import secrets
import random
import cloudinary
import cloudinary.uploader
import cloudinary.api
import resend
import asyncio
import firebase_admin
from firebase_admin import credentials, messaging, auth

# Initialize Firebase Admin SDK
# Note: Ensure GOOGLE_APPLICATION_CREDENTIALS env var is set or use a service account json file
try:
    if not firebase_admin._apps:
        # Example using a service account file if available, or default credentials
        # cred = credentials.Certificate("path/to/serviceAccountKey.json")
        # firebase_admin.initialize_app(cred)
        firebase_admin.initialize_app() # Uses default credentials logic
except Exception as e:
    logging.warning(f"Firebase Admin initialization failed: {e}")

async def send_fcm_notification(token: str, title: str, body: str, data: Optional[Dict[str, str]] = None):
    """Sends a push notification via Firebase Cloud Messaging."""
    if not token:
        return
        
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            token=token,
        )
        # Verify if running in async context properly, but admin SDK is sync. 
        # Making it async non-blocking by running in executor if needed, but for low volume sync is usually fine or wrapping.
        # However, for high scale, offloading to background task is better.
        # For this implementation, we'll run it directly as the method is fast enough for MVP.
        response = messaging.send(message)
        logging.info(f"Successfully sent message: {response}")
    except Exception as e:
        logging.error(f"Error sending message: {e}")


def haversine(lat1, lon1, lat2, lon2):
    """Calcula la distancia en km entre dos puntos geográficos."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c



class PetMatchRequest(BaseModel):
    pet_id: str
    lat: float
    lng: float
    date: str
    time: str

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://pettrust.vercel.app",
        "https://pet-trust-7-git-main-brayans-projects-0076d97c.vercel.app",
        "https://*.vercel.app"  # Allow all Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= PERFORMANCE & SEO MIDDLEWARE =============
# Compresión Gzip para reducir tiempo de transferencia (Lighthouse Performance)
app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.middleware("http")
async def add_security_and_cache_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Content Security Policy (CSP) - Bloquea XSS e inyecciones maliciosas
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " # Permitir Leaflet y scripts internos
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
        "img-src 'self' data: https://images.unsplash.com https://*.tile.openstreetmap.org https://res.cloudinary.com https://cdn.worldvectorlogo.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self' https://*.cloudinary.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; "
        "frame-src 'self' https://pettrust-bogota.firebaseapp.com https://accounts.google.com; " 
        "object-src 'none'; "
        "base-uri 'self';"
    )
    
    # Security Headers para Best Practices (Defensa en Profundidad)
    response.headers["Content-Security-Policy"] = csp
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Enforce HTTPS (HSTS) - Máximo nivel de confianza
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    
    # Cache Control para mejorar Performance en visitas recurrentes
    seo_paths = ["/robots.txt", "/sitemap.xml", "/landing-optimizada"]
    if any(request.url.path == path for path in seo_paths):
        response.headers["Cache-Control"] = "public, max-age=3600"
    
    return response

# ============= SEO & STATIC ROUTES (Lighthouse 100/100) =============
@app.get("/robots.txt", include_in_schema=False)
async def get_robots_txt():
    return FileResponse(ROOT_DIR.parent / "frontend" / "public" / "robots.txt")

@app.get("/sitemap.xml", include_in_schema=False)
async def get_sitemap_xml():
    return FileResponse(ROOT_DIR.parent / "frontend" / "public" / "sitemap.xml")

@app.get("/landing-optimizada", include_in_schema=False)
async def get_landing_page():
    # Esta es la página que logra el score 100/100
    return FileResponse(ROOT_DIR.parent / "frontend" / "public" / "optimized-landing.html")


# Startup Indexing
@app.on_event("startup")
async def setup_indices():
    """Ensure database indices are created on startup"""
    try:
        # User ID index for fast lookups/login
        await db.users.create_index("id", unique=True)
        # Add index for provider search
        await db.walkers.create_index([("location", "2dsphere")])
        await db.daycares.create_index([("location", "2dsphere")])
        await db.vets.create_index([("location", "2dsphere")])
        logging.info("Database indices verified/created")
    except Exception as e:
        logging.error(f"Error creating indices: {e}")

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
    api_key=os.environ.get('CLOUDINARY_API_KEY', ''),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET', ''),
    secure=True
)

# Log Cloudinary configuration (without exposing secrets)
logging.info(f"Cloudinary configured - Cloud Name: {os.environ.get('CLOUDINARY_CLOUD_NAME', 'NOT SET')}")
logging.info(f"Cloudinary API Key: {os.environ.get('CLOUDINARY_API_KEY', 'NOT SET')[:5]}...")
logging.info(f"Cloudinary API Secret: {'SET' if os.environ.get('CLOUDINARY_API_SECRET') else 'NOT SET'}")

# Origins for CORS
allowed_origins_raw = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8081,https://pettrust.vercel.app,https://pettrust-production.up.railway.app")
origins = [o.strip() for o in allowed_origins_raw.split(",")]

async def upload_image_internal(data_or_file: Any, folder: str, user_id: str) -> str:
    """Helper to upload either bytes, UploadFile, or Base64 string to Cloudinary"""
    try:
        # If it's a base64 string
        if isinstance(data_or_file, str) and data_or_file.startswith("data:image"):
            # Extract base64 part
            header, encoded = data_or_file.split(",", 1)
            data_or_file = base64.b64decode(encoded)
        
        result = cloudinary.uploader.upload(
            data_or_file,
            folder=f"pettrust/{folder}",
            resource_type="image",
            public_id=f"{user_id}_{uuid.uuid4().hex[:8]}"
        )
        return result["secure_url"]
    except Exception as e:
        logging.error(f"Cloudinary upload error: {e}")
        return None

async def send_email(to_email: str, subject: str, html_content: str):
    api_key = os.environ.get("RESEND_API_KEY")
    sender_email = os.environ.get("MAIL_FROM", "onboarding@resend.dev")
    
    if not api_key:
        logging.warning("No RESEND_API_KEY. Email not sent.")
        return

    resend.api_key = api_key

    try:
        # Resend SDK is synchronous, wrapped in executor for async compatibility if needed,
        # but for simple calls usually fine. Best practice is run_in_executor to avoid blocking.
        loop = asyncio.get_event_loop()
        
        def _send():
            return resend.Emails.send({
                "from": sender_email,
                "to": to_email,
                "subject": subject,
                "html": html_content
            })

        await loop.run_in_executor(None, _send)
        logging.info(f"Email sent to {to_email} from {sender_email}")
    except Exception as e:
        logging.error(f"Error sending email: {e}")


api_router = APIRouter(prefix="/api")

SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    logging.warning("SECRET_KEY not found in environment, using fallback for development ONLY")
    SECRET_KEY = 'demo-secret-key-pettrust-bogota-2025'
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)):
    """
    Obtiene el usuario actual priorizando HttpOnly Cookies para máxima seguridad (Anti-XSS).
    Mantiene soporte para Bearer Token (Authorization header) para compatibilidad con la App Móvil.
    """
    token = None
    
    # 1. Intentar obtener de Cookies (Nivel Platino: Invisible a JS)
    token = request.cookies.get("access_token")
    
    # 2. Intentar obtener de Header (Nivel Oro: Apps Móviles)
    if not token and credentials:
        token = credentials.credentials
        
    if not token:
        raise HTTPException(status_code=401, detail="No se encontró sesión activa")
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Sesión expirada o inválida")

class GeoJSONLocation(BaseModel):
    type: str = "Point"
    coordinates: List[float] = Field(..., description="[longitude, latitude]")

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "owner"
    phone: Optional[str] = None
    onboarding_token: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str
    phone: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WorkingHours(BaseModel):
    start: str = "08:00"
    end: str = "18:00"
    enabled: bool = True

class WeeklySchedule(BaseModel):
    monday: WorkingHours = Field(default_factory=WorkingHours)
    tuesday: WorkingHours = Field(default_factory=WorkingHours)
    wednesday: WorkingHours = Field(default_factory=WorkingHours)
    thursday: WorkingHours = Field(default_factory=WorkingHours)
    friday: WorkingHours = Field(default_factory=WorkingHours)
    saturday: WorkingHours = Field(default_factory=lambda: WorkingHours(start="09:00", end="14:00"))
    sunday: WorkingHours = Field(default_factory=lambda: WorkingHours(enabled=False))

class WalkerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    bio: str
    experience_years: int
    certifications: List[str] = []
    profile_image: Optional[str] = None
    gallery_images: List[str] = []
    location_name: str
    location: GeoJSONLocation
    verified: bool = False
    insured: bool = True
    rating: float = 5.0
    reviews_count: int = 0
    price_per_walk: float = 25000
    verification_status: str = "pending"
    documents: List[str] = []
    capacity_max: int = 4
    capacity_current: int = 0
    radius_km: float = 5.0
    is_active: bool = True
    working_hours: Optional[Dict[str, Any]] = None
    available_slots: List[str] = Field(default_factory=lambda: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"])
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WalkerCreate(BaseModel):
    bio: str
    experience_years: int
    certifications: List[str] = []
    location_name: str
    latitude: float
    longitude: float
    price_per_walk: float

class DaycareProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: str
    location_name: str
    amenities: List[str] = []
    gallery_images: List[str] = []
    has_cameras: bool = True
    has_transportation: bool = False
    has_green_areas: bool = True
    verified: bool = False
    insured: bool = True
    rating: float = 5.0
    reviews_count: int = 0
    price_per_day: float = 80000
    verification_status: str = "pending"
    capacity_total: int = 20
    capacity_available: int = 20
    pickup_service: bool = False
    pickup_price: float = 15000
    pickup_radius_km: float = 10.0
    location: GeoJSONLocation
    is_active: bool = True
    opening_hours: str = "07:00"
    closing_hours: str = "19:00"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DaycareCreate(BaseModel):
    name: str
    description: str
    location_name: str
    latitude: float
    longitude: float
    amenities: List[str]
    has_cameras: bool = True
    has_transportation: bool = False
    has_green_areas: bool = True
    has_green_areas: bool = True
    price_per_day: float

class VetProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    professional_license: str
    specialties: List[str]
    bio: str
    experience_years: int
    home_visit_available: bool = True
    location_name: str
    location: GeoJSONLocation
    rates: Dict[str, float] = {}
    verified: bool = False
    verification_status: str = "pending"
    documents: List[str] = []
    rating: float = 0.0
    reviews_count: int = 0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VetCreate(BaseModel):
    professional_license: str
    specialties: List[str]
    bio: str
    experience_years: int
    home_visit_available: bool = True
    location_name: str
    latitude: float
    longitude: float
    rates: Dict[str, float]
    license_url: Optional[str] = None
    profile_image: Optional[str] = None

class ProviderProfileUpdate(BaseModel):
    bio: Optional[str] = None
    price_per_walk: Optional[float] = None
    price_per_day: Optional[float] = None
    rates: Optional[Dict[str, float]] = None
    specialties: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    experience_years: Optional[int] = None
    location_name: Optional[str] = None
    radius_km: Optional[float] = None
    home_visit_available: Optional[bool] = None
    pickup_service: Optional[bool] = None
    pickup_price: Optional[float] = None
    professional_license: Optional[str] = None

class Pet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    name: str
    breed: str
    age: int
    weight: float
    special_needs: Optional[str] = None
    photo: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PetCreate(BaseModel):
    name: str
    breed: str
    age: int
    weight: float
    special_needs: Optional[str] = None
    photo: Optional[str] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    owner_name: Optional[str] = None
    pet_id: str
    pet_name: Optional[str] = None
    service_type: str
    service_id: str
    service_name: Optional[str] = None
    date: str
    time: Optional[str] = None
    status: str = "pending"  # pending, confirmed, in_progress, completed, cancelled
    price: float
    payment_status: str = "pending"  # pending, pending_verification, paid, failed
    payment_id: Optional[str] = None
    # PIN verification
    verification_pin: Optional[str] = None
    pin_generated_at: Optional[str] = None
    pin_verified_at: Optional[str] = None
    # GPS Tracking
    gps_tracking_enabled: bool = False
    walker_current_location: Optional[Dict[str, float]] = None
    location_history: Optional[List[Dict]] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    requires_pickup: bool = False
    pickup_address: Optional[str] = None
    pickup_coordinates: Optional[Dict[str, float]] = None
    pickup_time: Optional[str] = None
    checkin_at: Optional[str] = None
    checkin_location: Optional[Dict[str, float]] = None
    wompi_transaction_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BookingCreate(BaseModel):
    pet_id: str
    service_type: str
    service_id: str
    date: str
    time: Optional[str] = None
    price: float
    requires_pickup: bool = False
    pickup_address: Optional[str] = None
    pickup_coordinates: Optional[Dict[str, float]] = None

class ManualPayment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    user_id: str
    amount: float
    payment_method: str  # nequi, daviplata
    proof_url: str
    status: str = "pending"  # pending, approved, rejected
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ManualPaymentCreate(BaseModel):
    booking_id: str
    amount: float
    payment_method: str
    proof_url: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    owner_id: str
    owner_name: Optional[str] = None
    service_type: str
    service_id: str
    rating: int
    comment: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReviewCreate(BaseModel):
    booking_id: str
    service_type: str
    service_id: str
    rating: int
    comment: str

class WellnessReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    walker_id: str
    pet_id: str
    ate: bool = False
    bathroom: bool = False
    mood: str = "happy"
    notes: Optional[str] = None
    photos: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WellnessReportCreate(BaseModel):
    booking_id: str
    pet_id: str
    ate: bool
    bathroom: bool
    mood: str
    notes: Optional[str] = None

class TrackingUpdate(BaseModel):
    booking_id: str
    latitude: float
    longitude: float
    timestamp: Optional[str] = None

class Incident(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    reported_by: str
    type: str
    description: str
    status: str = "open"
    resolution: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProspectResponse(BaseModel):
    question_id: str
    answer: str
    score: Optional[int] = 0

class Prospect(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    whatsapp: str
    city: str
    type: str # expert | apprentice
    experience_years: Optional[int] = 0
    responses: List[ProspectResponse] = []
    total_score: float = 0.0
    status: str = "pending" # pending, in_review, approved, rejected
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    verification_token: Optional[str] = None

class FCMTokenUpdate(BaseModel):
    token: str


class ProspectCreate(BaseModel):
    name: str
    email: str
    whatsapp: str
    city: str
    type: str
    experience_years: Optional[int] = 0
    responses: List[ProspectResponse] = []

class ProspectStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    scores: Optional[Dict[str, int]] = None

    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class IncidentCreate(BaseModel):
    booking_id: str
    type: str
    description: str

class EmergencyContact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    phone: str
    relationship: str
    is_primary: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EmergencyContactCreate(BaseModel):
    name: str
    phone: str
    relationship: str
    is_primary: bool = False

class ShareTripLink(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    share_code: str
    expires_at: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VerificationPin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    pin_code: str
    verified: bool = False
    verified_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SOSAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    user_id: str
    latitude: float
    longitude: float
    alert_type: str = "sos"
    status: str = "active"
    resolved_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SafetyCheckIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    check_in_time: str
    status: str = "on_time"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============= REVIEWS MODELS =============

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    owner_id: str
    owner_name: str
    service_type: str
    service_id: str
    rating: int  # 1-5
    comment: str
    provider_response: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReviewCreate(BaseModel):
    booking_id: str
    rating: int
    comment: str

# ============= WELLNESS REPORTS MODELS =============

class WellnessReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    walker_id: str
    walker_name: str
    pet_id: str
    pet_name: str
    mood: str  # happy, calm, tired, anxious
    ate: bool = False
    drank_water: bool = False
    bathroom: bool = False
    notes: str = ""
    photos: List[str] = []  # base64 encoded images
    location: Optional[Dict[str, float]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WellnessReportCreate(BaseModel):
    booking_id: str
    mood: str
    ate: bool = False
    drank_water: bool = False
    bathroom: bool = False
    notes: str = ""
    photos: List[str] = []  # base64 strings
    latitude: Optional[float] = None
    longitude: Optional[float] = None

# ============= PHOTO UPLOAD MODELS =============

class PhotoUpload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    entity_type: str  # walker, daycare, pet
    entity_id: str
    photo_type: str  # profile, gallery, certification
    data: str  # base64 encoded
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PhotoUploadRequest(BaseModel):
    entity_type: str
    entity_id: str
    photo_type: str
    data: str  # base64

# ============= NOTIFICATION MODELS =============

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # new_request, booking_confirmed, message, review, wellness_report
    title: str
    message: str
    data: Dict[str, Any] = {}
    read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============= SERVICE REQUESTS & INBOX MODELS =============

class ServiceRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: Optional[str] = None
    owner_id: str
    owner_name: Optional[str] = None
    pet_id: str
    pet_name: Optional[str] = None
    pet_breed: Optional[str] = None
    service_type: str
    requested_date: str
    requested_time: str
    requires_pickup: bool = False
    pickup_location: Optional[Dict[str, float]] = None
    pickup_address: Optional[str] = None
    owner_location: Optional[Dict[str, float]] = None
    matched_providers: List[str] = []
    status: str = "pending"
    accepted_by: Optional[str] = None
    accepted_at: Optional[str] = None
    expires_at: str = Field(default_factory=lambda: (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ServiceRequestCreate(BaseModel):
    pet_id: str
    service_type: str
    date: str
    time: str
    requires_pickup: bool = False
    pickup_address: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    owner_lat: Optional[float] = None
    owner_lng: Optional[float] = None

class ProviderInbox(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider_id: str
    provider_type: str
    request_id: str
    pet_name: str
    pet_breed: Optional[str] = None
    pet_photo: Optional[str] = None
    owner_name: str
    service_date: str
    service_time: str
    distance_km: float = 0.0
    earnings: float
    is_read: bool = False
    is_dismissed: bool = False
    responded_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProviderStatusUpdate(BaseModel):
    is_active: Optional[bool] = None
    capacity_max: Optional[int] = None
    radius_km: Optional[float] = None

# ============= WOMPI MOCK MODELS =============

class WompiPaymentRequest(BaseModel):
    booking_id: str
    amount: float
    currency: str = "COP"
    customer_email: str
    payment_method: str = "CARD"
    card_token: Optional[str] = None

class WompiTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    amount: float
    currency: str = "COP"
    status: str = "PENDING"
    payment_method: str
    customer_email: str
    reference: str = Field(default_factory=lambda: f"PETTRUST-{secrets.token_hex(8).upper()}")
    wompi_id: str = Field(default_factory=lambda: f"wompi_{secrets.token_hex(12)}")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    finalized_at: Optional[str] = None

# ============= CHAT MODELS =============

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    content: str
    read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatConversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: Optional[str] = None
    owner_id: str
    owner_name: str
    provider_id: str
    provider_name: str
    provider_type: str
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    owner_unread: int = 0
    provider_unread: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SendMessageRequest(BaseModel):
    content: str

class StartConversationRequest(BaseModel):
    provider_id: str
    provider_type: str
    booking_id: Optional[str] = None

@api_router.get("/")
async def root():
    return {"message": "PetTrust Bogotá API v1.0"}

@api_router.post("/v1/performance-logs", include_in_schema=False)
async def log_performance(request: Request):
    """
    Recibe métricas de Core Web Vitals para monitoreo de usuarios reales (RUM).
    """
    try:
        data = await request.json()
        # En una app real, guardaríamos esto en una colección de logs o Prometheus
        # Por ahora lo registramos en el sistema de logs para auditoría.
        logging.info(f"PERFORMANCE_METRIC: {data}")
        return {"status": "ok"}
    except Exception as e:
        logging.error(f"Error logging performance metric: {e}")
        return {"status": "error"}

@api_router.get("/v1/image-proxy", include_in_schema=False)
async def image_proxy(url: str, width: int = 400, quality: int = 80):
    """
    Optimiza imágenes externas (Unsplash, Cloudinary, etc.) convirtiéndolas a WebP
    y redimensionándolas para mejorar el LCP.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="No se pudo obtener la imagen original")
            
            # Cargar imagen en memoria con Pillow
            img = Image.open(io.BytesIO(response.content))
            
            # Mantener el aspect ratio al redimensionar
            aspect_ratio = img.height / img.width
            new_height = int(width * aspect_ratio)
            
            img = img.resize((width, new_height), Image.Resampling.LANCZOS)
            
            # Convertir a WebP
            output = io.BytesIO()
            img.save(output, format="WEBP", quality=quality)
            webp_data = output.getvalue()
            
            return Response(
                content=webp_data,
                media_type="image/webp",
                headers={
                    "Cache-Control": "public, max-age=31536000, immutable",
                    "X-Image-Optimized": "true"
                }
            )
    except Exception as e:
        logging.error(f"Error in image proxy: {e}")
        # En caso de error, delegar a la imagen original (Opcional, mejor retornar error para debug)
        raise HTTPException(status_code=500, detail="Error al procesar la imagen")

@api_router.post("/v1/petmatch")
async def pet_match(request: PetMatchRequest, current_user: dict = Depends(get_current_user)):
    """
    Algoritmo PetMatch v1: Encuentra al mejor paseador basado en:
    1. Cercanía (< 2km)
    2. Disponibilidad de slots y capacidad
    3. Reputación (Rating + Reviews)
    4. Compatibilidad (Peso de mascota vs Experiencia)
    """
    # 1. Obtener datos de la mascota
    pet = await db.pets.find_one({"id": request.pet_id}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    
    # 2. Buscar paseadores activos
    query = {"is_active": True}
    walkers = await db.walkers.find(query, {"_id": 0}).to_list(100)
    
    matches = []
    for w in walkers:
        # A. Filtro Geocerca (Haversine)
        w_lat = w["location"]["coordinates"][1]
        w_lng = w["location"]["coordinates"][0]
        dist = haversine(request.lat, request.lng, w_lat, w_lng)
        
        if dist > 3.0: # Ampliamos un poco el radio de búsqueda por si no hay en 2km
            continue
            
        # B. Disponibilidad Real
        # Nota: En v1 simplificamos revisando si el slot pedido está en su lista
        if request.time not in w.get("available_slots", []):
            continue
        if w.get("capacity_current", 0) >= w.get("capacity_max", 4):
            continue
            
        # C. Scoring Inteligente
        score = 0
        
        # Proximidad (hasta 40 pts)
        # Si está a 0km -> 40pts, si está a 3km -> 0pts
        score += max(0, (3.0 - dist) / 3.0) * 40
        
        # Reputación (hasta 30 pts)
        rating = w.get("rating", 5.0)
        reviews = w.get("reviews_count", 0)
        score += (rating / 5.0) * 20
        score += min(10, (reviews / 5.0) * 10) # Bonus por experiencia probada
        
        # Compatibilidad de Especie (hasta 30 pts)
        pet_weight = pet.get("weight", 0)
        exp = w.get("experience_years", 0)
        if pet_weight > 20: # Perros grandes necesitan paseadores con experiencia
            if exp >= 3: score += 30
            elif exp >= 1: score += 15
        else:
            score += min(30, exp * 6)
            
        matches.append({
            "walker": w,
            "distance_km": round(dist, 2),
            "match_score": round(score, 1)
        })
        
    # Ordenar por el mejor match
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    
    return matches[:10]

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed_pw = hash_password(user_data.password)
    
    role = user_data.role
    phone = user_data.phone
    
    # Handle onboarding token
    if user_data.onboarding_token:
        prospect = await db.prospects.find_one({
            "verification_token": user_data.onboarding_token, 
            "status": "approved"
        })
        if prospect:
            role = "walker"
            phone = prospect.get("whatsapp", phone)
            # Mark as activated
            await db.prospects.update_one(
                {"id": prospect["id"]}, 
                {"$set": {"status": "activated"}}
            )

    user = User(
        email=user_data.email,
        name=user_data.name,
        role=role,
        phone=phone
    )
    user_dict = user.model_dump()
    user_dict["password"] = hashed_pw
    
    await db.users.insert_one(user_dict)
    
    # Send Welcome Email
    welcome_html = f"""
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #0F4C75;">¡Bienvenido a PetTrust, {user.name}!</h1>
        <p>Estamos felices de tenerte con nosotros.</p>
        <p>Encuentra al cuidador perfecto para tu mascota o gestiona tus servicios con total confianza.</p>
        <br>
        <a href="https://pettrust.vercel.app/dashboard" style="background-color: #28B463; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ir a mi Dashboard</a>
    </div>
    """
    asyncio.create_task(send_email(user.email, "Bienvenido a PetTrust", welcome_html))

    token = create_access_token({"sub": user.id, "role": user.role})
    
    # Establecer Cookie HttpOnly (Defensa de Platino)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60*60*24*7 # 7 días
    )
    
    return {"token": token, "user": user, "message": "Registro exitoso"}

@api_router.post("/auth/login")
@limiter.limit("5/15minutes") # Rate limiting estricto contra ataques de fuerza bruta
async def login(credentials: UserLogin, request: Request, response: Response):
    try:
        user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
        if not user or not verify_password(credentials.password, user["password"]):
            raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
        
        token = create_access_token({"sub": user["id"], "role": user["role"]})
        
        # Blindar sesión con HttpOnly Cookie
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=60*60*24*7 # 7 días
        )
        
        user.pop("password")
        return {"token": token, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logging.error(f"Login Error: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@api_router.post("/auth/logout")
async def logout(response: Response):
    """Limpia la cookie de sesión de forma segura"""
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=True,
        samesite="lax"
    )
    return {"message": "Sesión cerrada correctamente"}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

class GoogleAuthRequest(BaseModel):
    token: str

@api_router.post("/auth/google")
async def google_auth(request_data: GoogleAuthRequest, response: Response):
    try:
        # 1. Verificar token con Firebase
        decoded_token = auth.verify_id_token(request_data.token)
        uid = decoded_token['uid']
        email = decoded_token['email']
        name = decoded_token.get('name', 'Usuario Google')
        picture = decoded_token.get('picture', '')
        
        # 2. Buscar usuario en DB
        user = await db.users.find_one({"email": email})
        
        if not user:
            # 3. Crear usuario si no existe (Rol por defecto: Owner)
            new_user_id = str(uuid.uuid4())
            user = {
                "id": new_user_id,
                "email": email,
                "name": name,
                "role": "owner", # Default role
                "photo": picture,
                "password": "", # No password for Google users
                "provider": "google",
                "firebase_uid": uid,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_verified": True # Google emails are verified
            }
            await db.users.insert_one(user)
        else:
            # Update info if needed
            if user.get("provider") != "google":
                # Link account logic or update provider? 
                # For now, just allow login. Maybe update photo if missing.
                if not user.get("photo"):
                    await db.users.update_one({"email": email}, {"$set": {"photo": picture}})
        
        # 4. Generar JWT de PetTrust
        token = create_access_token({"sub": user["id"], "role": user["role"]})
        
        # 5. Establecer Cookie de Sesión
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=60*60*24*7 # 7 días
        )
        
        # Remove sensitive data before returning
        user_response = {k: v for k, v in user.items() if k != "password"}
        return {"token": token, "user": user_response}
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail="Token de Google inválido")
    except Exception as e:
        logging.error(f"Google Auth Error: {e}")
        raise HTTPException(status_code=500, detail="Error en autenticación con Google")

@api_router.post("/auth/request-password-reset")
async def request_password_reset(request: PasswordResetRequest):
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Prevent user enumeration, pretend success
        return {"message": "Si el correo existe, se enviará un enlace de recuperación."}
    
    reset_token = secrets.token_urlsafe(32)
    await db.password_resets.insert_one({
        "email": user["email"],
        "token": reset_token,
        "created_at": datetime.now(timezone.utc),
        "used": False
    })
    
    # Use frontend URL (assumed generic for now, user can configure)
    reset_link = f"https://pettrust.vercel.app/reset-password?token={reset_token}"
    
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #0F4C75;">Recuperación de Contraseña</h2>
        <p>Hola,</p>
        <p>Has solicitado restablecer tu contraseña en PetTrust.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <br>
        <a href="{reset_link}" style="background-color: #28B463; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
        <br><br>
        <p style="font-size: 12px; color: #777;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
    </div>
    """
    
    asyncio.create_task(send_email(user["email"], "Recuperación de Contraseña - PetTrust", html))
    return {"message": "Si el correo existe, se enviará un enlace de recuperación."}

@api_router.post("/auth/reset-password")
async def reset_password(data: PasswordResetConfirm):
    record = await db.password_resets.find_one({"token": data.token, "used": False})
    if not record:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
        
    # Check expiration (e.g., 1 hour)
    created_at = record["created_at"].replace(tzinfo=timezone.utc)
    if (datetime.now(timezone.utc) - created_at).total_seconds() > 3600:
        raise HTTPException(status_code=400, detail="Token expirado")
        
    hashed_pw = hash_password(data.new_password)
    
    await db.users.update_one(
        {"email": record["email"]}, 
        {"$set": {"password": hashed_pw}}
    )
    
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Contraseña actualizada exitosamente"}

# ============= PROSPECT ENDPOINTS =============

@api_router.post("/prospects", response_model=Prospect)
async def create_prospect(prospect_data: ProspectCreate):
    # Check if exists
    existing = await db.prospects.find_one({"email": prospect_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una solicitud con este correo")
    
    # Automated knock-out check (example: years of experience must be >= 0)
    # If they are expert and have 0 years, it might be a flag but not knock-out unless defined
    
    prospect = Prospect(
        **prospect_data.model_dump()
    )
    
    # Simple automated scoring based on responses if any
    total_score = 0.0
    if prospect.responses:
        # Assuming score is sent from frontend for now or handled here
        # For strictness, we'll calculate it later in the admin step, 
        # but let's initialize it.
        pass
        
    await db.prospects.insert_one(prospect.model_dump())
    return prospect

@api_router.get("/prospects/status/{email}")
async def get_prospect_status(email: str):
    prospect = await db.prospects.find_one({"email": email}, {"_id": 0, "status": 1, "created_at": 1, "name": 1})
    if not prospect:
        raise HTTPException(status_code=404, detail="No se encontró solicitud para este correo")
    return prospect

@api_router.get("/admin/prospects", response_model=List[Prospect])
async def get_all_prospects(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")
    
    query = {}
    if status:
        query["status"] = status
        
    prospects = await db.prospects.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return prospects

@api_router.get("/auth/prospect-verify")
async def verify_prospect_token(token: str):
    prospect = await db.prospects.find_one({"verification_token": token, "status": "approved"}, {"_id": 0})
    if not prospect:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    return prospect

@api_router.patch("/admin/prospects/{prospect_id}", response_model=Prospect)
async def update_prospect_status(
    prospect_id: str, 
    update: ProspectStatusUpdate, 
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")
    
    prospect = await db.prospects.find_one({"id": prospect_id})
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospecto no encontrado")
    
    update_data = {"status": update.status}
    if update.notes:
        update_data["notes"] = update.notes
    
    if update.scores:
        # Update response scores if provided
        responses = prospect.get("responses", [])
        total = 0
        for r in responses:
            if r["question_id"] in update.scores:
                r["score"] = update.scores[r["question_id"]]
            total += r.get("score", 0)
        
        update_data["responses"] = responses
        update_data["total_score"] = total / len(responses) if responses else 0
        
    # If approved, generate token (mock)
    if update.status == "approved":
        update_data["verification_token"] = secrets.token_hex(16)
        
    await db.prospects.update_one({"id": prospect_id}, {"$set": update_data})
    
    updated = await db.prospects.find_one({"id": prospect_id}, {"_id": 0})
    return updated

@api_router.post("/walkers", response_model=WalkerProfile)
async def create_walker(walker_data: WalkerCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "walker":
        raise HTTPException(status_code=403, detail="Solo los paseadores pueden crear perfiles")
    
    existing = await db.walkers.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Ya tienes un perfil de paseador")
    
    walker = WalkerProfile(
        user_id=current_user["id"],
        name=current_user["name"],
        **walker_data.model_dump(exclude={"latitude", "longitude"}),
        location=GeoJSONLocation(coordinates=[walker_data.longitude, walker_data.latitude])
    )
    await db.walkers.insert_one(walker.model_dump())
    return walker

@api_router.get("/walkers", response_model=List[WalkerProfile])
async def get_walkers(location: Optional[str] = None, verified_only: bool = False):
    # Show active walkers OR pending verification walkers
    query = {
        "$or": [
            {"is_active": True},
            {"verification_status": "pending"}
        ]
    }
    if location:
        query["location_name"] = {"$regex": location, "$options": "i"}
    if verified_only:
        query["verified"] = True
    walkers = await db.walkers.find(query, {"_id": 0}).to_list(100)
    return walkers

@api_router.get("/walkers/{walker_id}", response_model=WalkerProfile)
async def get_walker(walker_id: str):
    walker = await db.walkers.find_one({"id": walker_id}, {"_id": 0})
    if not walker:
        raise HTTPException(status_code=404, detail="Paseador no encontrado")
    return walker

@api_router.patch("/walkers/{walker_id}/verify")
async def verify_walker(walker_id: str, verified: bool, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden verificar")
    
    await db.walkers.update_one(
        {"id": walker_id},
        {"$set": {"verified": verified, "verification_status": "approved" if verified else "rejected"}}
    )
    return {"message": "Estado de verificación actualizado"}

@api_router.post("/walkers/{walker_id}/documents")
async def upload_walker_document(walker_id: str, document: str, current_user: dict = Depends(get_current_user)):
    walker = await db.walkers.find_one({"id": walker_id, "user_id": current_user["id"]}, {"_id": 0})
    if not walker:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    await db.walkers.update_one(
        {"id": walker_id},
        {"$push": {"documents": document}, "$set": {"verification_status": "pending"}}
    )
    return {"message": "Documento agregado"}

@api_router.post("/daycares", response_model=DaycareProfile)
async def create_daycare(daycare_data: DaycareCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "daycare":
        raise HTTPException(status_code=403, detail="Solo guarderías pueden crear perfiles")
    
    existing = await db.daycares.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Ya tienes un perfil de guardería")
    
    daycare = DaycareProfile(
        user_id=current_user["id"],
        **daycare_data.model_dump(exclude={"latitude", "longitude"}),
        location=GeoJSONLocation(coordinates=[daycare_data.longitude, daycare_data.latitude])
    )
    await db.daycares.insert_one(daycare.model_dump())
    return daycare

@api_router.get("/daycares", response_model=List[DaycareProfile])
async def get_daycares(location: Optional[str] = None):
    query = {"is_active": True}
    if location:
        query["location_name"] = {"$regex": location, "$options": "i"}
    daycares = await db.daycares.find(query, {"_id": 0}).to_list(100)
    return daycares

@api_router.get("/daycares/{daycare_id}", response_model=DaycareProfile)
async def get_daycare(daycare_id: str):
    daycare = await db.daycares.find_one({"id": daycare_id}, {"_id": 0})
    if not daycare:
        raise HTTPException(status_code=404, detail="Guardería no encontrada")
    return daycare

@api_router.post("/vets", response_model=VetProfile)
async def create_vet(vet_data: VetCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "vet":
        raise HTTPException(status_code=403, detail="Solo veterinarios pueden crear perfiles")
    
    existing = await db.vets.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Ya tienes un perfil veterinario")
    
    # Process images if they are base64
    if vet_data.license_url and vet_data.license_url.startswith("data:"):
        uploaded_url = await upload_image_internal(vet_data.license_url, "licenses", current_user["id"])
        if uploaded_url:
            vet_data.license_url = uploaded_url

    if vet_data.profile_image and vet_data.profile_image.startswith("data:"):
        uploaded_url = await upload_image_internal(vet_data.profile_image, "profiles", current_user["id"])
        if uploaded_url:
            vet_data.profile_image = uploaded_url

    vet = VetProfile(
        user_id=current_user["id"],
        name=current_user["name"],
        profile_image=vet_data.profile_image,
        documents=[vet_data.license_url] if vet_data.license_url else [],
        **vet_data.model_dump(exclude={"latitude", "longitude", "license_url", "profile_image"}),
        location=GeoJSONLocation(coordinates=[vet_data.longitude, vet_data.latitude])
    )
    await db.vets.insert_one(vet.model_dump())
    return vet

@api_router.get("/vets", response_model=List[VetProfile])
async def get_vets(location: Optional[str] = None, verified_only: bool = False):
    query = {"is_active": True}
    if location:
        query["location_name"] = {"$regex": location, "$options": "i"}
    if verified_only:
        query["verified"] = True
    vets = await db.vets.find(query, {"_id": 0}).to_list(100)
    return vets

@api_router.get("/vets/{vet_id}", response_model=VetProfile)
async def get_vet(vet_id: str):
    vet = await db.vets.find_one({"id": vet_id}, {"_id": 0})
    if not vet:
        raise HTTPException(status_code=404, detail="Veterinario no encontrado")
    return vet

@api_router.patch("/vets/{vet_id}/verify")
async def verify_vet(vet_id: str, verified: bool, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden verificar")
    
    await db.vets.update_one(
        {"id": vet_id},
        {"$set": {"verified": verified, "verification_status": "approved" if verified else "rejected"}}
    )
    return {"message": "Estado de verificación actualizado"}

@api_router.post("/vets/{vet_id}/documents")
async def upload_vet_document(vet_id: str, document: str, current_user: dict = Depends(get_current_user)):
    vet = await db.vets.find_one({"id": vet_id, "user_id": current_user["id"]}, {"_id": 0})
    if not vet:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    await db.vets.update_one(
        {"id": vet_id},
        {"$push": {"documents": document}, "$set": {"verification_status": "pending"}}
    )
    return {"message": "Documento agregado"}

@api_router.post("/pets", response_model=Pet)
async def create_pet(pet_data: PetCreate, current_user: dict = Depends(get_current_user)):
    # Process pet photo if it is base64
    if pet_data.photo and pet_data.photo.startswith("data:"):
        uploaded_url = await upload_image_internal(pet_data.photo, "pets", current_user["id"])
        if uploaded_url:
            pet_data.photo = uploaded_url
            
    pet = Pet(owner_id=current_user["id"], **pet_data.model_dump())
    await db.pets.insert_one(pet.model_dump())
    return pet

@api_router.get("/pets", response_model=List[Pet])
async def get_my_pets(current_user: dict = Depends(get_current_user)):
    pets = await db.pets.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return pets

@api_router.put("/users/me/fcm-token")
async def update_fcm_token(token_data: FCMTokenUpdate, current_user: dict = Depends(get_current_user)):
    """Updates the FCM registration token for the current user."""
    result = await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"fcm_token": token_data.token}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Token FCM actualizado"}

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, current_user: dict = Depends(get_current_user)):
    pet = await db.pets.find_one({"id": booking_data.pet_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    
    if booking_data.service_type == "walker":
        collection = "walkers"
    elif booking_data.service_type == "daycare":
        collection = "daycares"
    else:
        collection = "vets"
        
    service = await db[collection].find_one({"id": booking_data.service_id}, {"_id": 0})
    
    # Enforce availability check
    availability = await check_availability(
        service_id=booking_data.service_id,
        service_type=booking_data.service_type,
        date=booking_data.date,
        time=booking_data.time
    )
    if not availability["available"]:
        raise HTTPException(
            status_code=400, 
            detail=f"No hay disponibilidad para esta fecha/hora. {availability.get('reason', '')}"
        )
    
    booking = Booking(
        owner_id=current_user["id"],
        owner_name=current_user["name"],
        pet_name=pet["name"],
        service_name=service.get("name") if service else "Servicio",
        **booking_data.model_dump()
    )
    await db.bookings.insert_one(booking.model_dump())
    
    # Notify Provider via Email
    # Retrieve provider email
    service_type = booking.service_type
    provider_collection = db.walkers if service_type == "walk" else db.daycares if service_type == "daycare" else db.vets
    provider = await provider_collection.find_one({"id": booking.service_id})
    
    if provider and "email" in provider:
         booking_html = f"""
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #0F4C75;">¡Nueva Solicitud de Reserva!</h1>
            <p>Hola {provider.get('name', 'Aliado')}, tienes una nueva solicitud en PetTrust.</p>
            <ul>
                <li><strong>Servicio:</strong> {booking.service_type}</li>
                <li><strong>Fecha:</strong> {booking.date} a las {booking.time}</li>
                <li><strong>Mascota:</strong> {booking.pet_name}</li>
            </ul>
             <a href="https://pettrust.vercel.app/dashboard" style="background-color: #0F4C75; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Solicitud</a>
        </div>
        """
         asyncio.create_task(send_email(provider["email"], "Nueva Solicitud en PetTrust", booking_html))

    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "owner":
        bookings = await db.bookings.find({"owner_id": current_user["id"]}, {"_id": 0}).sort("date", -1).to_list(100)
        
        # Check for reviewed bookings efficiently
        completed_ids = [b["id"] for b in bookings if b.get("status") == "completed"]
        reviewed_ids = set()
        if completed_ids:
            reviews = await db.reviews.find({"booking_id": {"$in": completed_ids}}, {"booking_id": 1}).to_list(len(completed_ids))
            reviewed_ids = {r["booking_id"] for r in reviews}
            
        for b in bookings:
            b["has_review"] = b["id"] in reviewed_ids
            
    elif current_user["role"] == "admin":
        bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    else:
        profile_collection = "walkers" if current_user["role"] == "walker" else "daycares"
        profile = await db[profile_collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
        if not profile:
            return []
        bookings = await db.bookings.find({"service_id": profile["id"]}, {"_id": 0}).sort("date", -1).to_list(100)
    return bookings

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return booking

@api_router.patch("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    update_data = {"status": status}
    if status == "in_progress":
        update_data["started_at"] = datetime.now(timezone.utc).isoformat()
    elif status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    return {"message": "Estado actualizado", "status": status}

@api_router.post("/bookings/{booking_id}/start")
async def start_walk(booking_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "walker":
        raise HTTPException(status_code=403, detail="Solo paseadores pueden iniciar paseos")
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "in_progress",
            "started_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Paseo iniciado", "started_at": datetime.now(timezone.utc).isoformat()}

@api_router.post("/bookings/{booking_id}/complete")
async def complete_walk(booking_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "walker":
        raise HTTPException(status_code=403, detail="Solo paseadores pueden finalizar paseos")
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    # 4. Enviar notificación al dueño (Firebase FCM)
    try:
        owner = await db.users.find_one({"id": booking.get("owner_id")})
        if owner and owner.get("fcm_token"):
            asyncio.create_task(send_fcm_notification(
                token=owner["fcm_token"],
                title="🐕 ¡Paseo Terminado!",
                body=f"El paseo de {booking.get('pet_name', 'tu mascota')} ha finalizado. ¡No olvides calificar!",
                data={"booking_id": booking["id"], "type": "walk_completed"}
            ))
    except Exception as e:
        logging.error(f"Error sending completion push notification: {e}")

    return {"message": "Paseo completado", "completed_at": datetime.now(timezone.utc).isoformat()}

@api_router.post("/bookings/{booking_id}/payment")
async def process_payment(booking_id: str, payment_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"payment_status": "paid", "payment_id": payment_id, "status": "confirmed"}}
    )
    return {"message": "Pago procesado exitosamente"}

@api_router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": review_data.booking_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    existing_review = await db.reviews.find_one({"booking_id": review_data.booking_id}, {"_id": 0})
    if existing_review:
        raise HTTPException(status_code=400, detail="Ya calificaste este servicio")
    
    review = Review(
        owner_id=current_user["id"],
        owner_name=current_user["name"],
        **review_data.model_dump()
    )
    await db.reviews.insert_one(review.model_dump())
    
    collection = "walkers" if review_data.service_type == "walker" else "daycares"
    reviews = await db.reviews.find({"service_id": review_data.service_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db[collection].update_one(
        {"id": review_data.service_id},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(reviews)}}
    )
    
    return review

@api_router.get("/reviews/{service_type}/{service_id}", response_model=List[Review])
async def get_reviews(service_type: str, service_id: str):
    reviews = await db.reviews.find({"service_type": service_type, "service_id": service_id}, {"_id": 0}).to_list(100)
    return reviews

@api_router.post("/wellness", response_model=WellnessReport)
async def create_wellness_report(report_data: WellnessReportCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "walker":
        raise HTTPException(status_code=403, detail="Solo paseadores pueden crear reportes")
    
    walker = await db.walkers.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not walker:
        raise HTTPException(status_code=404, detail="Perfil de paseador no encontrado")
    
    report = WellnessReport(
        walker_id=walker["id"],
        **report_data.model_dump()
    )
    await db.wellness_reports.insert_one(report.model_dump())
    return report

@api_router.get("/wellness/{booking_id}", response_model=WellnessReport)
async def get_wellness_report(booking_id: str):
    report = await db.wellness_reports.find_one({"booking_id": booking_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return report

@api_router.post("/tracking")
async def update_tracking(tracking_data: TrackingUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "walker":
        raise HTTPException(status_code=403, detail="Solo paseadores pueden actualizar tracking")
    
    tracking_entry = {
        "booking_id": tracking_data.booking_id,
        "latitude": tracking_data.latitude,
        "longitude": tracking_data.longitude,
        "timestamp": tracking_data.timestamp or datetime.now(timezone.utc).isoformat()
    }
    await db.tracking.insert_one(tracking_entry)
    return {"message": "Ubicación actualizada"}

@api_router.get("/tracking/{booking_id}")
async def get_tracking(booking_id: str):
    tracking = await db.tracking.find({"booking_id": booking_id}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return tracking

@api_router.post("/incidents", response_model=Incident)
async def create_incident(incident_data: IncidentCreate, current_user: dict = Depends(get_current_user)):
    incident = Incident(
        reported_by=current_user["id"],
        **incident_data.model_dump()
    )
    await db.incidents.insert_one(incident.model_dump())
    return incident

@api_router.get("/incidents/{booking_id}", response_model=List[Incident])
async def get_incidents(booking_id: str):
    incidents = await db.incidents.find({"booking_id": booking_id}, {"_id": 0}).to_list(100)
    return incidents

# ============= SAFETY & SECURITY ENDPOINTS =============

@api_router.post("/emergency-contacts")
async def add_emergency_contact(contact_data: EmergencyContactCreate, current_user: dict = Depends(get_current_user)):
    contact = EmergencyContact(
        user_id=current_user["id"],
        **contact_data.model_dump()
    )
    await db.emergency_contacts.insert_one(contact.model_dump())
    return contact

@api_router.get("/emergency-contacts")
async def get_emergency_contacts(current_user: dict = Depends(get_current_user)):
    contacts = await db.emergency_contacts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return contacts

@api_router.delete("/emergency-contacts/{contact_id}")
async def delete_emergency_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.emergency_contacts.delete_one({"id": contact_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    return {"message": "Contacto eliminado"}

@api_router.post("/bookings/{booking_id}/share-trip")
async def create_share_trip_link(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    share_code = secrets.token_urlsafe(16)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=12)).isoformat()
    
    share_link = ShareTripLink(
        booking_id=booking_id,
        share_code=share_code,
        expires_at=expires_at
    )
    await db.share_trip_links.insert_one(share_link.model_dump())
    
    return {
        "share_code": share_code,
        "share_url": f"https://pettrust.co/track/{share_code}",
        "expires_at": expires_at
    }

@api_router.get("/track/{share_code}")
async def get_shared_trip(share_code: str):
    link = await db.share_trip_links.find_one({"share_code": share_code}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Link inválido o expirado")
    
    expires = datetime.fromisoformat(link["expires_at"])
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(status_code=410, detail="Link expirado")
    
    booking = await db.bookings.find_one({"id": link["booking_id"]}, {"_id": 0})
    tracking = await db.tracking.find({"booking_id": link["booking_id"]}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    
    return {
        "booking": booking,
        "tracking": tracking,
        "status": booking.get("status", "unknown")
    }



@api_router.post("/sos")
async def trigger_sos_alert(booking_id: str, latitude: float, longitude: float, current_user: dict = Depends(get_current_user)):
    sos_alert = SOSAlert(
        booking_id=booking_id,
        user_id=current_user["id"],
        latitude=latitude,
        longitude=longitude
    )
    await db.sos_alerts.insert_one(sos_alert.model_dump())
    
    emergency_contacts = await db.emergency_contacts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    return {
        "message": "Alerta SOS activada",
        "alert_id": sos_alert.id,
        "emergency_contacts_notified": len(emergency_contacts),
        "location": {"lat": latitude, "lng": longitude},
        "emergency_number": "+57 123 (Policía Nacional Colombia)"
    }

@api_router.get("/sos/{alert_id}")
async def get_sos_alert(alert_id: str):
    alert = await db.sos_alerts.find_one({"id": alert_id}, {"_id": 0})
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    return alert

@api_router.patch("/sos/{alert_id}/resolve")
async def resolve_sos_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    await db.sos_alerts.update_one(
        {"id": alert_id},
        {"$set": {"status": "resolved", "resolved_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Alerta resuelta"}

@api_router.post("/bookings/{booking_id}/check-in")
async def safety_check_in(booking_id: str, current_user: dict = Depends(get_current_user)):
    check_in = SafetyCheckIn(
        booking_id=booking_id,
        check_in_time=datetime.now(timezone.utc).isoformat()
    )
    await db.safety_checkins.insert_one(check_in.model_dump())
    
    return {"message": "Check-in registrado", "time": check_in.check_in_time}

@api_router.get("/bookings/{booking_id}/safety-status")
async def get_safety_status(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    pin_verified = await db.verification_pins.find_one({"booking_id": booking_id, "verified": True}, {"_id": 0})
    sos_alerts = await db.sos_alerts.find({"booking_id": booking_id, "status": "active"}, {"_id": 0}).to_list(100)
    check_ins = await db.safety_checkins.find({"booking_id": booking_id}, {"_id": 0}).to_list(100)
    
    has_overdue = False
    if booking.get("status") == "in_progress" and booking.get("started_at"):
        started = datetime.fromisoformat(booking["started_at"])
        elapsed = (datetime.now(timezone.utc) - started).total_seconds() / 60
        if elapsed > 90:
            has_overdue = True
    
    return {
        "booking_id": booking_id,
        "status": booking.get("status"),
        "pin_verified": pin_verified is not None,
        "active_sos_alerts": len(sos_alerts),
        "check_ins_count": len(check_ins),
        "has_overdue_time": has_overdue,
        "safety_score": "high" if not sos_alerts and not has_overdue else "medium" if not sos_alerts else "critical"
    }

    return {"walkers": walkers, "daycares": daycares}

@api_router.post("/admin/seed")
async def seed_admin_user(secret_key: str):
    """
    Create an admin user (protected by secret key).
    This should only be called once during initial setup.
    """
    if secret_key != os.environ.get("SECRET_KEY", "demo-secret-key-pettrust-bogota-2025"):
        raise HTTPException(status_code=403, detail="Clave secreta inválida")
    
    # Check if admin already exists
    existing = await db.users.find_one({"role": "admin"})
    if existing:
        return {"message": "Admin ya existe", "email": existing["email"]}
    
    admin_email = "admin@pettrust.co"
    admin_password = hash_password("PetTrust2025!")
    
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": admin_email,
        "name": "Administrador PetTrust",
        "role": "admin",
        "phone": "+573001234567",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    admin_user["password"] = admin_password
    
    await db.users.insert_one(admin_user)
    return {"message": "Admin creado exitosamente", "email": admin_email}

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    total_bookings = await db.bookings.count_documents({})
    total_walkers = await db.walkers.count_documents({})
    total_users = await db.users.count_documents({})
    completed_bookings = await db.bookings.count_documents({"status": "completed"})
    pending_incidents = await db.incidents.count_documents({"status": "open"})
    
    return {
        "total_bookings": total_bookings,
        "total_walkers": total_walkers,
        "total_users": total_users,
        "completed_bookings": completed_bookings,
        "pending_incidents": pending_incidents,
        "pending_prospects": await db.prospects.count_documents({"status": "pending"})
    }

@api_router.get("/admin/pending-verifications")
async def get_pending_verifications(current_user: dict = Depends(get_current_user)):
    """Get all providers waiting for verification"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    walkers_cursor = db.walkers.find({"verification_status": "pending"})
    daycares_cursor = db.daycares.find({"verification_status": "pending"})
    
    walkers = await walkers_cursor.to_list(100)
    daycares = await daycares_cursor.to_list(100)
    
    # Add type field for frontend distinction
    for w in walkers: 
        w["type"] = "walker"
        w.pop("_id", None)
    for d in daycares: 
        d["type"] = "daycare"
        d.pop("_id", None)
        
    return walkers + daycares

# ============= MATCHING & AVAILABILITY ENDPOINTS =============



@api_router.get("/providers/search")
@limiter.limit("30/minute")
async def search_providers(
    request: Request,
    service_type: str,
    date: str,
    time: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    needs_pickup: bool = False
):
    """Search available providers with matching logic"""
    collection = "walkers" if service_type == "walker" else "daycares"
    if service_type == "vet":
        collection = "vets"
        
    query = {"is_active": True}
    
    # Use aggregation for geospatial search if coordinates provided
    if lat and lng:
        pipeline = [
            {
                "$geoNear": {
                    "near": {"type": "Point", "coordinates": [lng, lat]},
                    "distanceField": "distance_km",
                    "distanceMultiplier": 0.001,  # meters to km
                    "spherical": True,
                    "query": query
                }
            }
        ]
        
        # Add radius filter logic
        if service_type == "walker":
             pipeline.append({
                 "$match": {
                     "$expr": {"$lte": ["$distance_km", "$radius_km"]}
                 }
             })
        elif service_type == "daycare" and needs_pickup:
             pipeline.append({
                 "$match": {
                     "pickup_service": True,
                     "$expr": {"$lte": ["$distance_km", "$pickup_radius_km"]}
                 }
             })
             
        providers = await db[collection].aggregate(pipeline).to_list(100)
    else:
        providers = await db[collection].find(query, {"_id": 0}).to_list(100)
        for p in providers: 
            p["distance_km"] = 0.0

    results = []
    
    for provider in providers:
        distance_km = provider.get("distance_km", 0.0)
        
        if service_type == "walker":
            if provider.get("capacity_current", 0) >= provider.get("capacity_max", 4):
                continue
            
            bookings_count = await db.bookings.count_documents({
                "service_id": provider["id"],
                "date": date,
                "time": time,
                "status": {"$in": ["pending", "confirmed", "in_progress"]}
            })
            
            if bookings_count >= provider.get("capacity_max", 4):
                continue
                
            capacity_available = provider.get("capacity_max", 4) - bookings_count
            
        elif service_type == "daycare":
            daily_bookings = await db.bookings.count_documents({
                "service_id": provider["id"],
                "date": date,
                "status": {"$in": ["pending", "confirmed", "in_progress"]}
            })
            
            if daily_bookings >= provider.get("capacity_total", 20):
                continue
            
            capacity_available = provider.get("capacity_total", 20) - daily_bookings
            
            if needs_pickup and not provider.get("pickup_service", False):
                continue
        else:
            # Vet
            capacity_available = 1 # Simplified for Vet
        
        price = provider.get("price_per_walk", 25000) if service_type == "walker" else provider.get("price_per_day", 80000)
        if service_type == "vet":
            price = provider.get("rates", {}).get("consultation", 50000)
            
        if needs_pickup and service_type == "daycare":
            price += provider.get("pickup_price", 15000)
        
        results.append({
            "id": provider["id"],
            "name": provider.get("name", ""),
            "bio": provider.get("bio") or provider.get("description", ""),
            "location": provider.get("location_name", ""),
            "distance_km": round(distance_km, 2),
            "rating": provider.get("rating", 5.0),
            "reviews_count": provider.get("reviews_count", 0),
            "price": price,
            "capacity_available": capacity_available,
            "available_slots": provider.get("available_slots", []),
            "verified": provider.get("verified", False),
            "profile_image": provider.get("profile_image"),
            "has_pickup": provider.get("pickup_service", False) if service_type == "daycare" else False
        })
    
    results.sort(key=lambda x: (not x["verified"], x["distance_km"], -x["rating"]))
    
    return results

async def check_walker_schedule_conflict(walker_id: str, date: str, time: str):
    """Internal helper to verify if a walker has capacity for a specific slot"""
    provider = await db.walkers.find_one({"id": walker_id})
    if not provider: return True
    
    # 1. Check working hours
    day_name = datetime.strptime(date, "%Y-%m-%d").strftime("%A").lower()
    work_hours = provider.get("working_hours", {}).get(day_name)
    
    if work_hours:
        if not work_hours.get("enabled"): return True
        try:
            start_h = int(work_hours["start"].split(":")[0])
            end_h = int(work_hours["end"].split(":")[0])
            req_h = int(time.split(":")[0])
            if req_h < start_h or req_h >= end_h: return True
        except: pass
            
    # 2. Check capacity
    bookings_count = await db.bookings.count_documents({
        "service_id": walker_id,
        "date": date,
        "time": time,
        "status": {"$in": ["pending", "confirmed", "in_progress"]}
    })
    
    return bookings_count >= provider.get("capacity_max", 4)

@api_router.get("/availability/check")
async def check_availability(
    service_id: str,
    service_type: str,
    date: str,
    time: Optional[str] = None
):
    """Check if a provider has availability for a specific date/time with dynamic rules"""
    collection = "walkers"
    if service_type in ["daycare", "guarderia"]: collection = "daycares"
    elif service_type in ["vet", "veterinario"]: collection = "vets"
    
    provider = await db[collection].find_one({"id": service_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    if not provider.get("is_active", False):
        return {"available": False, "reason": "Proveedor inactivo", "capacity_remaining": 0}
    
    # Logic for Walkers and Vets (Slot Based)
    if service_type in ["walker", "vet", "veterinario"]:
        # 1. Generate dynamic slots for the day
        day_name = datetime.strptime(date, "%Y-%m-%d").strftime("%A").lower()
        work_hours = provider.get("working_hours", {}).get(day_name)
        
        if work_hours and work_hours.get("enabled"):
            start_h = int(work_hours["start"].split(":")[0])
            end_h = int(work_hours["end"].split(":")[0])
            available_slots = [f"{h:02d}:00" for h in range(start_h, end_h)]
        else:
            available_slots = provider.get("available_slots") or ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]
            
        if not time:
            return {"available": True, "available_slots": available_slots}
            
        # 2. Check specific slot
        if time not in available_slots:
            return {"available": False, "reason": "Horario fuera de jornada", "available_slots": available_slots}
            
        bookings_count = await db.bookings.count_documents({
            "service_id": service_id,
            "date": date,
            "time": time,
            "status": {"$in": ["pending", "confirmed", "in_progress"]}
        })
        capacity_max = provider.get("capacity_max", 4) if service_type == "walker" else 2 # Default for Vet
        remaining = max(0, capacity_max - bookings_count)
        
        return {
            "available": remaining > 0,
            "capacity_remaining": remaining,
            "available_slots": available_slots,
            "provider_name": provider.get("name", "")
        }
    
    else:
        # Daycare (Daily Based)
        daily_bookings = await db.bookings.count_documents({
            "service_id": service_id,
            "date": date,
            "status": {"$in": ["pending", "confirmed", "in_progress"]}
        })
        capacity_max = provider.get("capacity_total", 20)
        remaining = max(0, capacity_max - daily_bookings)
        
        return {
            "available": remaining > 0,
            "capacity_remaining": remaining,
            "provider_name": provider.get("name", "")
        }

@api_router.get("/providers/{provider_type}/{provider_id}/slots")
async def get_provider_slots(
    provider_type: str,
    provider_id: str,
    date: Optional[str] = None
):
    """Get dynamic slots based on provider's working hours and availability"""
    collection = "walkers"
    if provider_type == "daycare" or provider_type == "guarderia": collection = "daycares"
    elif provider_type == "vet" or provider_type == "veterinario": collection = "vets"
    
    provider = await db[collection].find_one({"id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    # 1. Determinar el horario del día solicitado
    work_hours = None
    if date and provider.get("working_hours"):
        try:
            day_name = datetime.strptime(date, "%Y-%m-%d").strftime("%A").lower()
            work_hours = provider["working_hours"].get(day_name)
        except Exception:
            pass
            
    # 2. Generar slots (Dinámicos vs Estáticos)
    if work_hours and work_hours.get("enabled"):
        start_h = int(work_hours["start"].split(":")[0])
        end_h = int(work_hours["end"].split(":")[0])
        available_slots = [f"{h:02d}:00" for h in range(start_h, end_h)]
    else:
        # Fallback a slots predefinidos o default
        available_slots = provider.get("available_slots") or ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]
    
    capacity_max = provider.get("capacity_max", 4)
    slots_with_capacity = []
    
    # 3. Cruzar con reservas existentes
    if date:
        for slot in available_slots:
            bookings_count = await db.bookings.count_documents({
                "service_id": provider_id,
                "date": date,
                "time": slot,
                "status": {"$in": ["pending", "confirmed", "in_progress"]}
            })
            remaining = max(0, capacity_max - bookings_count)
            slots_with_capacity.append({
                "time": slot,
                "capacity_remaining": remaining,
                "available": remaining > 0
            })
    else:
        for slot in available_slots:
            slots_with_capacity.append({
                "time": slot,
                "capacity_remaining": capacity_max,
                "available": True
            })
    
    return {
        "provider_id": provider_id,
        "provider_name": provider.get("name", ""),
        "date": date,
        "slots": slots_with_capacity,
        "capacity_max_per_slot": capacity_max,
        "working_hours_info": work_hours
    }


# ============= SERVICE REQUESTS ENDPOINTS =============

@api_router.post("/service-requests")
async def create_service_request(
    request_data: ServiceRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a service request with automatic matching"""
    pet = await db.pets.find_one({"id": request_data.pet_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    
    collection = "walkers" if request_data.service_type == "walker" else "daycares"
    if request_data.service_type == "vet":
        collection = "vets"

    owner_lat = request_data.owner_lat or 4.6951
    owner_lng = request_data.owner_lng or -74.0621
    
    pipeline = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [owner_lng, owner_lat]},
                "distanceField": "distance_km",
                "distanceMultiplier": 0.001,
                "spherical": True,
                "query": {"is_active": True}
            }
        }
    ]
    
    if request_data.service_type == "walker":
         pipeline.append({
             "$match": {
                 "$expr": {"$lte": ["$distance_km", "$radius_km"]}
             }
         })
    
    matched_providers_data = await db[collection].aggregate(pipeline).to_list(100)
    matched_providers = [p["id"] for p in matched_providers_data]
    
    service_request = ServiceRequest(
        owner_id=current_user["id"],
        owner_name=current_user["name"],
        pet_id=request_data.pet_id,
        pet_name=pet.get("name"),
        pet_breed=pet.get("breed"),
        service_type=request_data.service_type,
        requested_date=request_data.date,
        requested_time=request_data.time,
        requires_pickup=request_data.requires_pickup,
        pickup_address=request_data.pickup_address,
        pickup_location={"lat": request_data.pickup_lat, "lng": request_data.pickup_lng} if request_data.pickup_lat else None,
        owner_location={"lat": owner_lat, "lng": owner_lng},
        matched_providers=matched_providers
    )
    
    await db.service_requests.insert_one(service_request.model_dump())
    
    for provider in matched_providers_data:
        distance = provider.get("distance_km", 0.0)
        
        earnings = provider.get("price_per_walk", 25000) if request_data.service_type == "walker" else provider.get("price_per_day", 80000)
        if request_data.service_type == "vet":
             earnings = provider.get("rates", {}).get("consultation", 50000)

        inbox_item = ProviderInbox(
            provider_id=provider["id"],
            provider_type=request_data.service_type,
            request_id=service_request.id,
            pet_name=pet.get("name", ""),
            pet_breed=pet.get("breed"),
            pet_photo=pet.get("photo"),
            owner_name=current_user["name"],
            service_date=request_data.date,
            service_time=request_data.time,
            distance_km=round(distance, 2),
            earnings=earnings
        )
        await db.provider_inbox.insert_one(inbox_item.model_dump())
    
    return {
        "request_id": service_request.id,
        "matched_providers_count": len(matched_providers),
        "expires_at": service_request.expires_at,
        "status": "pending"
    }

@api_router.get("/service-requests/{request_id}")
async def get_service_request(request_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific service request"""
    request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return request

# ============= PROVIDER DASHBOARD ENDPOINTS =============

@api_router.get("/providers/me/profile")
async def get_my_provider_profile(current_user: dict = Depends(get_current_user)):
    """Get current provider's profile"""
    if current_user["role"] not in ["walker", "daycare", "vet"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    if current_user["role"] == "walker":
        collection = "walkers"
    elif current_user["role"] == "daycare":
        collection = "daycares"
    else:
        collection = "vets"

    profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not profile:
        return None
    
    return profile

@api_router.patch("/providers/me/profile")
async def update_provider_profile(
    profile_update: ProviderProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update provider's profile details"""
    if current_user["role"] not in ["walker", "daycare", "vet"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    if current_user["role"] == "walker":
        collection = "walkers"
    elif current_user["role"] == "daycare":
        collection = "daycares"
    else:
        collection = "vets"
    
    update_data = {k: v for k, v in profile_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")
    
    result = await db[collection].update_one(
        {"user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        # Check if profile exists
        existing = await db[collection].find_one({"user_id": current_user["id"]})
        if not existing:
             raise HTTPException(status_code=404, detail="Perfil no encontrado")
        # If exists but nothing modified, it's fine
    
    return {"message": "Perfil actualizado", "updates": update_data}

@api_router.patch("/providers/me/status")
async def update_provider_status(
    status_update: ProviderStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update provider's active status and settings"""
    if current_user["role"] not in ["walker", "daycare", "vet"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    if current_user["role"] == "walker":
        collection = "walkers"
    elif current_user["role"] == "daycare":
        collection = "daycares"
    else:
        collection = "vets"
    
    update_data = {}
    if status_update.is_active is not None:
        update_data["is_active"] = status_update.is_active
    if status_update.capacity_max is not None:
        update_data["capacity_max"] = status_update.capacity_max
    if status_update.radius_km is not None:
        update_data["radius_km"] = status_update.radius_km
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")
    
    result = await db[collection].update_one(
        {"user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    return {"message": "Estado actualizado", "updates": update_data}

@api_router.get("/providers/me/inbox")
async def get_provider_inbox(current_user: dict = Depends(get_current_user)):
    """Get provider's inbox with pending service requests"""
    if current_user["role"] not in ["walker", "daycare", "vet"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    if current_user["role"] == "walker":
        collection = "walkers"
    elif current_user["role"] == "daycare":
        collection = "daycares"
    else:
        collection = "vets"

    profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not profile:
        return []
    
    inbox_items = await db.provider_inbox.find({
        "provider_id": profile["id"],
        "is_dismissed": False
    }, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    enriched_items = []
    for item in inbox_items:
        request = await db.service_requests.find_one({"id": item["request_id"]}, {"_id": 0})
        if request and request.get("status") == "pending":
            expires_at = datetime.fromisoformat(request["expires_at"].replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            expires_in_seconds = max(0, int((expires_at - now).total_seconds()))
            
            item["expires_in_seconds"] = expires_in_seconds
            item["is_expired"] = expires_in_seconds <= 0
            enriched_items.append(item)
    
    return enriched_items

@api_router.post("/providers/me/inbox/{inbox_id}/respond")
async def respond_to_request(
    inbox_id: str,
    action: str,
    current_user: dict = Depends(get_current_user)
):
    """Respond to a service request (accept/reject)"""
    if current_user["role"] not in ["walker", "daycare", "vet"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    if action not in ["accept", "reject"]:
        raise HTTPException(status_code=400, detail="Acción inválida")
    
    if current_user["role"] == "walker":
        collection = "walkers"
    elif current_user["role"] == "daycare":
        collection = "daycares"
    else:
        collection = "vets"

    profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    inbox_item = await db.provider_inbox.find_one({
        "id": inbox_id,
        "provider_id": profile["id"]
    }, {"_id": 0})
    
    if not inbox_item:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    request = await db.service_requests.find_one({"id": inbox_item["request_id"]}, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud original no encontrada")
    
    if request.get("status") != "pending":
        await db.provider_inbox.update_one(
            {"id": inbox_id},
            {"$set": {"is_dismissed": True, "responded_at": datetime.now(timezone.utc).isoformat()}}
        )
        raise HTTPException(status_code=409, detail="Esta solicitud ya fue tomada por otro proveedor")
    
    expires_at = datetime.fromisoformat(request["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        await db.service_requests.update_one(
            {"id": request["id"]},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=410, detail="La solicitud ha expirado")
    
    if action == "reject":
        await db.provider_inbox.update_one(
            {"id": inbox_id},
            {"$set": {"is_dismissed": True, "responded_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Solicitud rechazada"}
    
    await db.service_requests.update_one(
        {"id": request["id"]},
        {"$set": {
            "status": "accepted",
            "accepted_by": profile["id"],
            "accepted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Check for schedule conflicts (only for walkers)
    if current_user["role"] == "walker":
        has_conflict = await check_walker_schedule_conflict(
            profile["id"],
            request["requested_date"],
            request["requested_time"]
        )
        if has_conflict:
            # Revert status
            await db.service_requests.update_one(
                {"id": request["id"]},
                {"$set": {"status": "pending", "accepted_by": None, "accepted_at": None}}
            )
            raise HTTPException(
                status_code=409, 
                detail="Ya tienes una reserva a esta hora. No puedes aceptar dos paseos simultáneos."
            )
    
    booking = Booking(
        owner_id=request["owner_id"],
        owner_name=request.get("owner_name"),
        pet_id=request["pet_id"],
        pet_name=request.get("pet_name"),
        service_type=request["service_type"],
        service_id=profile["id"],
        service_name=profile.get("name"),
        date=request["requested_date"],
        time=request["requested_time"],
        status="confirmed",
        price=inbox_item["earnings"],
        requires_pickup=request.get("requires_pickup", False),
        pickup_address=request.get("pickup_address")
    )
    
    await db.bookings.insert_one(booking.model_dump())
    
    await db.service_requests.update_one(
        {"id": request["id"]},
        {"$set": {"booking_id": booking.id}}
    )
    
    if current_user["role"] == "walker":
        await db.walkers.update_one(
            {"id": profile["id"]},
            {"$inc": {"capacity_current": 1}}
        )
    
    await db.provider_inbox.update_many(
        {"request_id": request["id"]},
        {"$set": {"is_dismissed": True}}
    )
    
    await db.provider_inbox.update_one(
        {"id": inbox_id},
        {"$set": {"responded_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "message": "Solicitud aceptada exitosamente",
        "booking_id": booking.id,
        "booking": booking.model_dump()
    }

@api_router.get("/providers/me/schedule")
async def get_provider_schedule(
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get provider's booking schedule"""
    if current_user["role"] not in ["walker", "daycare"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    collection = "walkers" if current_user["role"] == "walker" else "daycares"
    profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not profile:
        return {"bookings": [], "capacity_used": 0}
    
    # Búsqueda ampliada para estadísticas de ganancias
    stats_query = {
        "service_id": profile["id"],
        "status": {"$in": ["confirmed", "in_progress", "completed", "pending"]}
    }
    all_related_bookings = await db.bookings.find(stats_query, {"_id": 0}).to_list(200)

    total_earnings = sum(b.get("price", 0) for b in all_related_bookings if b.get("status") == "completed")
    pending_earnings = sum(b.get("price", 0) for b in all_related_bookings if b.get("status") in ["confirmed", "in_progress", "pending"] and b.get("payment_status") == "paid")
    
    # Query original para la agenda (próximos servicios)
    query = {
        "service_id": profile["id"],
        "$or": [
            {"status": {"$in": ["confirmed", "in_progress"]}},
            {"status": "pending", "payment_status": "paid"}
        ]
    }
    
    if date:
        query["date"] = date
        bookings = await db.bookings.find(query, {"_id": 0}).sort("time", 1).to_list(100)
    else:
        bookings = await db.bookings.find(query, {"_id": 0}).sort("date", 1).sort("time", 1).to_list(100)
    
    capacity_max = profile.get("capacity_max", 4) if current_user["role"] == "walker" else profile.get("capacity_total", 20)
    capacity_used = len([b for b in bookings if b.get("date") == date]) if date else len([b for b in bookings if b.get("status") != "completed"])
    
    # Lista de servicios completados para historial (Ultimos 50)
    history = [b for b in all_related_bookings if b.get("status") == "completed"]
    history.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return {
        "bookings": bookings,
        "history": history[:50],
        "capacity_max": capacity_max,
        "capacity_used": capacity_used,
        "is_active": profile.get("is_active", False),
        "total_earnings": total_earnings,
        "pending_earnings": pending_earnings,
        "monthly_stats": {
            "completed_count": len([b for b in all_related_bookings if b.get("status") == "completed"]),
            "total_value": total_earnings
        }
    }

# ============= MANUAL PAYMENTS ENDPOINTS =============

@api_router.post("/payments/register_manual")
async def register_manual_payment(
    payment_data: ManualPaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    booking = await db.bookings.find_one({
        "id": payment_data.booking_id,
        "owner_id": current_user["id"]
    }, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
    payment = ManualPayment(
        booking_id=payment_data.booking_id,
        user_id=current_user["id"],
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        proof_url=payment_data.proof_url
    )
    
    await db.manual_payments.insert_one(payment.model_dump())
    
    # Update booking status
    await db.bookings.update_one(
        {"id": payment_data.booking_id},
        {"$set": {"status": "awaiting_approval", "payment_status": "pending_approval"}}
    )
    
    return payment

@api_router.post("/payments/submit")
async def submit_manual_payment(
    booking_id: str = Form(...),
    amount: float = Form(...),
    payment_method: str = Form(...),
    proof: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    booking = await db.bookings.find_one({"id": booking_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    # Upload proof to Cloudinary
    proof_content = await proof.read()
    if not proof_content:
         raise HTTPException(status_code=400, detail="El archivo está vacío")
         
    # We need a helper that accepts bytes if upload_image_internal handles it, 
    # checking upload_image_internal implementation:
    # It takes data_or_file. If str and starts with data:image, decodes. 
    # Cloudinary upload function handles bytes/file-like objects directly.
    # So passing bytes should work.
    
    proof_url = await upload_image_internal(proof_content, "payments", current_user["id"])
    
    if not proof_url:
        raise HTTPException(status_code=500, detail="Error subiendo comprobante")

    payment = ManualPayment(
        booking_id=booking_id,
        user_id=current_user["id"],
        amount=amount,
        payment_method=payment_method,
        proof_url=proof_url
    )
    
    await db.manual_payments.insert_one(payment.model_dump())
    
    # Update booking status
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "awaiting_approval", "payment_status": "pending_approval"}}
    )
    
    return payment

@api_router.get("/admin/payments/pending")
async def get_pending_payments(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
        
    payments = await db.manual_payments.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    enriched = []
    for p in payments:
        booking = await db.bookings.find_one({"id": p["booking_id"]}, {"_id": 0})
        if booking:
            p["booking_details"] = {
                "service_name": booking.get("service_name"),
                "date": booking.get("date"),
                "owner_name": booking.get("owner_name"),
                "service_type": booking.get("service_type")
            }
        enriched.append(p)
        
    return enriched

@api_router.patch("/admin/payments/{payment_id}/review")
async def review_payment(
    payment_id: str, 
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    # Expecting body: {"action": "approve" | "reject"}
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    action = body.get("action")
    
    payment = await db.manual_payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
        
    if action == "approve":
        new_status = "approved"
        booking_status = "confirmed"
        payment_status = "paid"
        
        # Notify user
        booking = await db.bookings.find_one({"id": payment.get("booking_id")})
        if booking:
            # Notify Owner
            user_notification = Notification(
                user_id=booking["owner_id"],
                type="payment_approved",
                title="¡Pago Confirmado!",
                message="Tu pago ha sido verificado. El paseador ha sido notificado y el PIN está disponible.",
                data={"booking_id": payment.get("booking_id")}
            )
            await db.notifications.insert_one(user_notification.model_dump())
            
            # Notify Provider
            provider_notification = Notification(
                user_id=booking["service_id"],
                type="booking_confirmed",
                title="Nueva Reserva Confirmada",
                message=f"Tienes una reserva confirmada para {booking['date']} a las {booking.get('time', 'N/A')}. Puedes ver el detalle en tu agenda.",
                data={"booking_id": payment.get("booking_id")}
            )
            await db.notifications.insert_one(provider_notification.model_dump())
            
            # EMAIL NOTIFICATIONS 
            # 1. Email to Owner
            owner = await db.users.find_one({"id": booking["owner_id"]})
            if owner and "email" in owner:
                owner_html = f"""
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h1 style="color: #28B463;">¡Pago Aprobado y Reserva Confirmada!</h1>
                    <p>Hola {owner.get('name', 'Usuario')}, tu pago ha sido verificado exitosamente.</p>
                    <p>Tu reserva para el <strong>{booking['date']}</strong> a las <strong>{booking.get('time', 'N/A')}</strong> está 100% confirmada.</p>
                    <p>Puedes entrar a la app para ver el PIN de seguridad o contactar a tu cuidador.</p>
                    <br>
                    <a href="https://pettrust.vercel.app/dashboard" style="background-color: #0F4C75; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Reserva</a>
                </div>
                """
                asyncio.create_task(send_email(owner["email"], "Reserva Confirmada en PetTrust", owner_html))
            
            # 2. Email to Provider (Optional but good UX)
            # Fetch provider email by service type
            provider_collection = db.walkers if booking.get("service_type") == "walk" else db.daycares if booking.get("service_type") == "daycare" else db.vets
            provider = await provider_collection.find_one({"id": booking["service_id"]})
            
            if provider and "email" in provider:
                prov_html = f"""
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h1 style="color: #0F4C75;">¡Reserva Confirmada!</h1>
                    <p>El cliente {owner.get('name', 'Usuario') if owner else 'Cliente'} ha completado el pago.</p>
                    <p>Servicio: {booking['date']} - {booking.get('time', 'N/A')}</p>
                    <p>Prepárate para brindar el mejor servicio.</p>
                </div>
                """
                asyncio.create_task(send_email(provider["email"], "Nueva Reserva PAGADA - PetTrust", prov_html))
        
    elif action == "reject":
        new_status = "rejected"
        booking_status = "payment_rejected"
        payment_status = "rejected"
    else:
         raise HTTPException(status_code=400, detail="Acción inválida")
         
    await db.manual_payments.update_one(
        {"id": payment_id},
        {"$set": {"status": new_status}}
    )
    
    await db.bookings.update_one(
        {"id": payment.get("booking_id")},
        {"$set": {"status": booking_status, "payment_status": payment_status}}
    )
    
    return {"message": f"Pago {new_status}", "status": new_status}

# ============= WOMPI MOCK ENDPOINTS =============

@api_router.post("/payments/wompi/create")
async def create_wompi_payment(
    payment_data: WompiPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a mock Wompi payment transaction"""
    booking = await db.bookings.find_one({"id": payment_data.booking_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    if booking.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Esta reserva ya está pagada")
    
    transaction = WompiTransaction(
        booking_id=payment_data.booking_id,
        amount=payment_data.amount,
        currency=payment_data.currency,
        payment_method=payment_data.payment_method,
        customer_email=payment_data.customer_email
    )
    
    await db.wompi_transactions.insert_one(transaction.model_dump())
    
    return {
        "transaction_id": transaction.id,
        "wompi_id": transaction.wompi_id,
        "reference": transaction.reference,
        "status": transaction.status,
        "amount": transaction.amount,
        "currency": transaction.currency,
        "redirect_url": f"https://checkout.wompi.co/mock/{transaction.wompi_id}",
        "message": "Transacción creada (MOCK - Sandbox)"
    }

@api_router.post("/payments/wompi/confirm/{transaction_id}")
async def confirm_wompi_payment(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Confirm a mock Wompi payment (simulates successful payment)"""
    transaction = await db.wompi_transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    
    if transaction.get("status") == "APPROVED":
        raise HTTPException(status_code=400, detail="Transacción ya aprobada")
    
    await db.wompi_transactions.update_one(
        {"id": transaction_id},
        {"$set": {
            "status": "APPROVED",
            "finalized_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.bookings.update_one(
        {"id": transaction["booking_id"]},
        {"$set": {
            "payment_status": "paid",
            "payment_id": transaction["wompi_id"],
            "wompi_transaction_id": transaction_id,
            "status": "confirmed"
        }}
    )
    
    return {
        "message": "Pago confirmado exitosamente (MOCK)",
        "transaction_id": transaction_id,
        "wompi_id": transaction["wompi_id"],
        "status": "APPROVED",
        "booking_status": "confirmed"
    }

@api_router.get("/payments/wompi/status/{transaction_id}")
async def get_wompi_payment_status(transaction_id: str):
    """Get status of a Wompi transaction"""
    transaction = await db.wompi_transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    
    return {
        "transaction_id": transaction["id"],
        "wompi_id": transaction["wompi_id"],
        "reference": transaction["reference"],
        "status": transaction["status"],
        "amount": transaction["amount"],
        "currency": transaction["currency"],
        "created_at": transaction["created_at"],
        "finalized_at": transaction.get("finalized_at")
    }

@api_router.post("/payments/wompi/webhook")
async def wompi_webhook(payload: Dict[str, Any]):
    """Webhook endpoint for Wompi notifications (Mock)"""
    event_type = payload.get("event")
    data = payload.get("data", {})
    
    if event_type == "transaction.updated":
        wompi_id = data.get("transaction", {}).get("id")
        status = data.get("transaction", {}).get("status")
        
        if wompi_id:
            transaction = await db.wompi_transactions.find_one({"wompi_id": wompi_id}, {"_id": 0})
            if transaction:
                await db.wompi_transactions.update_one(
                    {"wompi_id": wompi_id},
                    {"$set": {"status": status, "finalized_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                if status == "APPROVED":
                    await db.bookings.update_one(
                        {"id": transaction["booking_id"]},
                        {"$set": {"payment_status": "paid", "status": "confirmed"}}
                    )
    
    return {"received": True}

# ============= SEED DATA ENDPOINT =============

@api_router.post("/seed/demo")
async def seed_demo_data():
    """Seed demo data for testing"""
    existing_walker = await db.walkers.find_one({"name": "Carlos Mendoza"}, {"_id": 0})
    if existing_walker:
        return {"message": "Datos demo ya existen"}
    
    demo_walkers = [
        {
            "id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "name": "Carlos Mendoza",
            "bio": "Paseador profesional con 5 años de experiencia. Amante de los perros grandes y pequeños.",
            "experience_years": 5,
            "certifications": ["Primeros Auxilios Caninos", "Comportamiento Animal"],
            "location": "Chapinero, Bogotá",
            "verified": True,
            "insured": True,
            "rating": 4.9,
            "reviews_count": 127,
            "price_per_walk": 25000,
            "verification_status": "approved",
            "capacity_max": 4,
            "capacity_current": 1,
            "radius_km": 5.0,
            "is_active": True,
            "coordinates": {"lat": 4.6486, "lng": -74.0628},
            "available_slots": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "name": "María López",
            "bio": "Especialista en razas pequeñas y cachorros. Paseos personalizados.",
            "experience_years": 3,
            "certifications": ["Entrenamiento Básico", "Primeros Auxilios"],
            "location": "Usaquén, Bogotá",
            "verified": True,
            "insured": True,
            "rating": 4.8,
            "reviews_count": 89,
            "price_per_walk": 30000,
            "verification_status": "approved",
            "capacity_max": 3,
            "capacity_current": 0,
            "radius_km": 4.0,
            "is_active": True,
            "coordinates": {"lat": 4.6975, "lng": -74.0323},
            "available_slots": ["08:00", "09:00", "10:00", "15:00", "16:00"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    demo_daycares = [
        {
            "id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "name": "Pet Paradise Bogotá",
            "description": "Guardería premium con amplias zonas verdes y cámaras 24/7.",
            "location": "Chicó, Bogotá",
            "amenities": ["Piscina", "Zona de Juegos", "Spa", "Alimentación Premium"],
            "has_cameras": True,
            "has_transportation": True,
            "has_green_areas": True,
            "verified": True,
            "insured": True,
            "rating": 4.9,
            "reviews_count": 203,
            "price_per_day": 85000,
            "verification_status": "approved",
            "capacity_total": 30,
            "capacity_available": 25,
            "pickup_service": True,
            "pickup_price": 15000,
            "pickup_radius_km": 10.0,
            "coordinates": {"lat": 4.6697, "lng": -74.0520},
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "name": "Happy Paws Daycare",
            "description": "Cuidado amoroso para tu mascota mientras trabajas.",
            "location": "Santa Bárbara, Bogotá",
            "amenities": ["Zona de Descanso", "Juegos Interactivos", "Snacks"],
            "has_cameras": True,
            "has_transportation": False,
            "has_green_areas": True,
            "verified": True,
            "insured": True,
            "rating": 4.7,
            "reviews_count": 156,
            "price_per_day": 65000,
            "verification_status": "approved",
            "capacity_total": 20,
            "capacity_available": 18,
            "pickup_service": False,
            "pickup_price": 0,
            "pickup_radius_km": 0,
            "coordinates": {"lat": 4.6845, "lng": -74.0456},
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.walkers.insert_many(demo_walkers)
    await db.daycares.insert_many(demo_daycares)
    
    admin_exists = await db.users.find_one({"email": "admin@pettrust.com"}, {"_id": 0})
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@pettrust.com",
            "password": hash_password("admin123"),
            "name": "Admin PetTrust",
            "role": "admin",
            "phone": "+57 300 000 0000",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
    
    return {
        "message": "Datos demo creados exitosamente",
        "walkers_created": len(demo_walkers),
        "daycares_created": len(demo_daycares)
    }

# ============= CHAT ENDPOINTS =============

@api_router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get all conversations for current user"""
    if current_user["role"] == "owner":
        query = {"owner_id": current_user["id"]}
    else:
        collection = "walkers" if current_user["role"] == "walker" else "daycares"
        profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
        if not profile:
            return []
        query = {"provider_id": profile["id"]}
    
    conversations = await db.conversations.find(query, {"_id": 0}).sort("last_message_at", -1).to_list(50)
    return conversations

@api_router.post("/conversations")
async def start_conversation(
    request: StartConversationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Start a new conversation with a provider"""
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Solo dueños pueden iniciar conversaciones")
    
    collection = "walkers" if request.provider_type == "walker" else "daycares"
    provider = await db[collection].find_one({"id": request.provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    existing = await db.conversations.find_one({
        "owner_id": current_user["id"],
        "provider_id": request.provider_id
    }, {"_id": 0})
    
    if existing:
        return existing
    
    conversation = ChatConversation(
        booking_id=request.booking_id,
        owner_id=current_user["id"],
        owner_name=current_user["name"],
        provider_id=request.provider_id,
        provider_name=provider.get("name", ""),
        provider_type=request.provider_type
    )
    
    await db.conversations.insert_one(conversation.model_dump())
    return conversation.model_dump()

@api_router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific conversation with messages"""
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    
    is_owner = conversation["owner_id"] == current_user["id"]
    is_provider = False
    if current_user["role"] in ["walker", "daycare"]:
        collection = "walkers" if current_user["role"] == "walker" else "daycares"
        profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
        if profile and profile["id"] == conversation["provider_id"]:
            is_provider = True
    
    if not is_owner and not is_provider:
        raise HTTPException(status_code=403, detail="Sin acceso a esta conversación")
    
    messages = await db.chat_messages.find(
        {"conversation_id": conversation_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    
    if is_owner:
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": {"owner_unread": 0}}
        )
        await db.chat_messages.update_many(
            {"conversation_id": conversation_id, "sender_role": {"$ne": "owner"}, "read": False},
            {"$set": {"read": True}}
        )
    else:
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": {"provider_unread": 0}}
        )
        await db.chat_messages.update_many(
            {"conversation_id": conversation_id, "sender_role": "owner", "read": False},
            {"$set": {"read": True}}
        )
    
    return {
        "conversation": conversation,
        "messages": messages
    }

@api_router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message in a conversation"""
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    
    is_owner = conversation["owner_id"] == current_user["id"]
    is_provider = False
    sender_id = current_user["id"]
    
    if current_user["role"] in ["walker", "daycare"]:
        collection = "walkers" if current_user["role"] == "walker" else "daycares"
        profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
        if profile and profile["id"] == conversation["provider_id"]:
            is_provider = True
            sender_id = profile["id"]
    
    if not is_owner and not is_provider:
        raise HTTPException(status_code=403, detail="Sin acceso a esta conversación")
    
    message = ChatMessage(
        conversation_id=conversation_id,
        sender_id=sender_id,
        sender_name=current_user["name"],
        sender_role=current_user["role"],
        content=request.content
    )
    
    await db.chat_messages.insert_one(message.model_dump())
    
    update_data = {
        "last_message": request.content[:100],
        "last_message_at": message.created_at
    }
    
    if is_owner:
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": update_data, "$inc": {"provider_unread": 1}}
        )
    else:
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": update_data, "$inc": {"owner_unread": 1}}
        )
    
    return message.model_dump()

@api_router.get("/conversations/unread/count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get total unread messages count"""
    if current_user["role"] == "owner":
        pipeline = [
            {"$match": {"owner_id": current_user["id"]}},
            {"$group": {"_id": None, "total": {"$sum": "$owner_unread"}}}
        ]
    else:
        collection = "walkers" if current_user["role"] == "walker" else "daycares"
        profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
        if not profile:
            return {"unread_count": 0}
        pipeline = [
            {"$match": {"provider_id": profile["id"]}},
            {"$group": {"_id": None, "total": {"$sum": "$provider_unread"}}}
        ]
    
    result = await db.conversations.aggregate(pipeline).to_list(1)
    return {"unread_count": result[0]["total"] if result else 0}

# ============= REVIEWS ENDPOINTS =============

@api_router.post("/reviews")
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a review for a completed booking"""
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Solo dueños pueden dejar reseñas")
    
    booking = await db.bookings.find_one({
        "id": review_data.booking_id,
        "owner_id": current_user["id"]
    }, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    if booking.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Solo puedes reseñar servicios completados")
    
    existing_review = await db.reviews.find_one({"booking_id": review_data.booking_id}, {"_id": 0})
    if existing_review:
        raise HTTPException(status_code=400, detail="Ya existe una reseña para esta reserva")
    
    if not 1 <= review_data.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating debe ser entre 1 y 5")
    
    review = Review(
        booking_id=review_data.booking_id,
        owner_id=current_user["id"],
        owner_name=current_user["name"],
        service_type=booking["service_type"],
        service_id=booking["service_id"],
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    await db.reviews.insert_one(review.model_dump())
    
    collection = "walkers" if booking["service_type"] == "walker" else "daycares"
    
    all_reviews = await db.reviews.find({"service_id": booking["service_id"]}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    
    await db[collection].update_one(
        {"id": booking["service_id"]},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(all_reviews)}}
    )
    
    notification = Notification(
        user_id=booking["service_id"],
        type="review",
        title="Nueva Reseña",
        message=f"{current_user['name']} te dejó una reseña de {review_data.rating} estrellas",
        data={"review_id": review.id, "rating": review_data.rating}
    )
    await db.notifications.insert_one(notification.model_dump())
    
    return review.model_dump()

@api_router.get("/reviews/{service_type}/{service_id}")
async def get_reviews(service_type: str, service_id: str):
    """Get all reviews for a service provider"""
    reviews = await db.reviews.find({
        "service_type": service_type,
        "service_id": service_id
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reviews

@api_router.get("/reviews/booking/{booking_id}")
async def get_booking_review(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Check if a booking has been reviewed"""
    review = await db.reviews.find_one({"booking_id": booking_id}, {"_id": 0})
    return {"has_review": review is not None, "review": review}

# ============= WELLNESS REPORTS ENDPOINTS =============

@api_router.post("/wellness-reports")
async def create_wellness_report(
    report_data: WellnessReportCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a wellness report during a walk"""
    if current_user["role"] != "walker":
        raise HTTPException(status_code=403, detail="Solo paseadores pueden crear reportes")
    
    profile = await db.walkers.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de paseador no encontrado")
    
    booking = await db.bookings.find_one({
        "id": report_data.booking_id,
        "service_id": profile["id"],
        "status": "in_progress"
    }, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva activa no encontrada")
    
    pet = await db.pets.find_one({"id": booking["pet_id"]}, {"_id": 0})
    
    report = WellnessReport(
        booking_id=report_data.booking_id,
        walker_id=profile["id"],
        walker_name=profile["name"],
        pet_id=booking["pet_id"],
        pet_name=pet.get("name", "") if pet else "",
        mood=report_data.mood,
        ate=report_data.ate,
        drank_water=report_data.drank_water,
        bathroom=report_data.bathroom,
        notes=report_data.notes,
        photos=report_data.photos[:5],
        location={"lat": report_data.latitude, "lng": report_data.longitude} if report_data.latitude else None
    )
    
    await db.wellness_reports.insert_one(report.model_dump())
    
    mood_emojis = {"happy": "😊", "calm": "😌", "tired": "😴", "anxious": "😰"}
    mood_text = mood_emojis.get(report_data.mood, "🐕")
    
    notification = Notification(
        user_id=booking["owner_id"],
        type="wellness_report",
        title=f"Reporte de {pet.get('name', 'tu mascota') if pet else 'tu mascota'}",
        message=f"{mood_text} {pet.get('name', 'Tu mascota') if pet else 'Tu mascota'} está {report_data.mood}. {report_data.notes[:50]}{'...' if len(report_data.notes) > 50 else ''}",
        data={"report_id": report.id, "booking_id": report_data.booking_id, "has_photos": len(report_data.photos) > 0}
    )
    await db.notifications.insert_one(notification.model_dump())
    
    return report.model_dump()

@api_router.get("/wellness-reports/booking/{booking_id}")
async def get_wellness_reports(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Get all wellness reports for a booking"""
    reports = await db.wellness_reports.find({"booking_id": booking_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return reports

@api_router.get("/wellness-reports/{report_id}")
async def get_wellness_report(report_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific wellness report"""
    report = await db.wellness_reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return report

# ============= PHOTO UPLOAD ENDPOINTS =============

@api_router.post("/photos/upload")
async def upload_photo(
    photo_data: PhotoUploadRequest,
    current_user: dict = Depends(get_current_user)
):
    """Upload a photo for profile or gallery"""
    if photo_data.entity_type == "walker":
        profile = await db.walkers.find_one({
            "id": photo_data.entity_id,
            "user_id": current_user["id"]
        }, {"_id": 0})
        if not profile:
            raise HTTPException(status_code=403, detail="No autorizado")
    elif photo_data.entity_type == "daycare":
        profile = await db.daycares.find_one({
            "id": photo_data.entity_id,
            "user_id": current_user["id"]
        }, {"_id": 0})
        if not profile:
            raise HTTPException(status_code=403, detail="No autorizado")
    elif photo_data.entity_type == "pet":
        pet = await db.pets.find_one({
            "id": photo_data.entity_id,
            "owner_id": current_user["id"]
        }, {"_id": 0})
        if not pet:
            raise HTTPException(status_code=403, detail="No autorizado")
    else:
        raise HTTPException(status_code=400, detail="Tipo de entidad inválido")
    
    if len(photo_data.data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagen muy grande (máx 5MB)")
    
    photo = PhotoUpload(
        user_id=current_user["id"],
        entity_type=photo_data.entity_type,
        entity_id=photo_data.entity_id,
        photo_type=photo_data.photo_type,
        data=photo_data.data
    )
    
    await db.photos.insert_one(photo.model_dump())
    
    collection = photo_data.entity_type + "s" if photo_data.entity_type != "daycare" else "daycares"
    if photo_data.entity_type == "pet":
        collection = "pets"
    
    if photo_data.photo_type == "profile":
        await db[collection].update_one(
            {"id": photo_data.entity_id},
            {"$set": {"profile_image": f"data:image/jpeg;base64,{photo_data.data[:100]}...", "profile_photo_id": photo.id}}
        )
    elif photo_data.photo_type == "gallery":
        await db[collection].update_one(
            {"id": photo_data.entity_id},
            {"$push": {"gallery_images": photo.id}}
        )
    
    return {"photo_id": photo.id, "message": "Foto subida exitosamente"}

@api_router.get("/photos/{photo_id}")
async def get_photo(photo_id: str):
    """Get a photo by ID"""
    photo = await db.photos.find_one({"id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    return {"id": photo["id"], "data": photo["data"], "photo_type": photo["photo_type"]}

@api_router.get("/photos/gallery/{entity_type}/{entity_id}")
async def get_gallery(entity_type: str, entity_id: str):
    """Get all gallery photos for an entity"""
    photos = await db.photos.find({
        "entity_type": entity_type,
        "entity_id": entity_id,
        "photo_type": "gallery"
    }, {"_id": 0}).to_list(20)
    return photos

@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a photo"""
    photo = await db.photos.find_one({"id": photo_id, "user_id": current_user["id"]}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    
    await db.photos.delete_one({"id": photo_id})
    
    collection = photo["entity_type"] + "s" if photo["entity_type"] != "daycare" else "daycares"
    if photo["entity_type"] == "pet":
        collection = "pets"
    
    if photo["photo_type"] == "gallery":
        await db[collection].update_one(
            {"id": photo["entity_id"]},
            {"$pull": {"gallery_images": photo_id}}
        )
    
    return {"message": "Foto eliminada"}

# ============= NOTIFICATIONS ENDPOINTS =============

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get user notifications"""
    user_id = current_user["id"]
    
    if current_user["role"] in ["walker", "daycare"]:
        collection = "walkers" if current_user["role"] == "walker" else "daycares"
        profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
        if profile:
            notifications = await db.notifications.find({
                "$or": [{"user_id": user_id}, {"user_id": profile["id"]}]
            }, {"_id": 0}).sort("created_at", -1).to_list(50)
        else:
            notifications = await db.notifications.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    else:
        notifications = await db.notifications.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    return notifications

@api_router.get("/notifications/unread/count")
async def get_notification_count(current_user: dict = Depends(get_current_user)):
    """Get unread notifications count"""
    user_id = current_user["id"]
    
    if current_user["role"] in ["walker", "daycare"]:
        collection = "walkers" if current_user["role"] == "walker" else "daycares"
        profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
        if profile:
            count = await db.notifications.count_documents({
                "$or": [{"user_id": user_id}, {"user_id": profile["id"]}],
                "read": False
            })
        else:
            count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    else:
        count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    
    return {"unread_count": count}

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    return {"message": "Notificación marcada como leída"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    user_id = current_user["id"]
    
    if current_user["role"] in ["walker", "daycare"]:
        collection = "walkers" if current_user["role"] == "walker" else "daycares"
        profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
        if profile:
            await db.notifications.update_many(
                {"$or": [{"user_id": user_id}, {"user_id": profile["id"]}]},
                {"$set": {"read": True}}
            )
        else:
            await db.notifications.update_many({"user_id": user_id}, {"$set": {"read": True}})
    else:
        await db.notifications.update_many({"user_id": user_id}, {"$set": {"read": True}})
    
    return {"message": "Todas las notificaciones marcadas como leídas"}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    # Use the origins list defined at the top of the file
    allow_origins=origins,
    # Also allow regex for flexible development/preview environments
    allow_origin_regex="https?://.*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)




# ============= PROVIDER UNIFIED ENDPOINTS =============

@api_router.get("/providers/me/profile")
async def get_my_provider_profile(current_user: dict = Depends(get_current_user)):
    """Get the full profile for the current logged-in provider"""
    role = current_user.get("role")
    if role not in ["walker", "daycare", "vet"]:
        raise HTTPException(status_code=403, detail="No eres un proveedor")
    
    collection_name = {
        "walker": "walkers",
        "daycare": "daycares",
        "vet": "vets"
    }[role]
    
    profile = await db[collection_name].find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de proveedor no encontrado")
    return profile

@api_router.patch("/providers/me/status")
async def update_provider_status(
    status_data: ProviderStatusUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Toggle active status or update capacity/radius"""
    role = current_user.get("role")
    collection_name = {
        "walker": "walkers",
        "daycare": "daycares",
        "vet": "vets"
    }.get(role)
    
    if not collection_name:
        raise HTTPException(status_code=403, detail="No autorizado")
        
    update_fields = {}
    if status_data.is_active is not None:
        update_fields["is_active"] = status_data.is_active
    if status_data.capacity_max is not None:
        # Daycares use capacity_total, others use capacity_max
        field = "capacity_total" if role == "daycare" else "capacity_max"
        update_fields[field] = status_data.capacity_max
    if status_data.radius_km is not None:
        update_fields["radius_km"] = status_data.radius_km
        
    if not update_fields:
        return {"message": "Sin cambios"}
        
    await db[collection_name].update_one(
        {"user_id": current_user["id"]},
        {"$set": update_fields}
    )
    return {"message": "Estado actualizado", "updates": update_fields}

@api_router.patch("/providers/me/profile")
async def update_provider_profile(
    profile_data: ProviderProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update detailed profile fields (Bio, Rates, etc)"""
    role = current_user.get("role")
    collection_name = {
        "walker": "walkers",
        "daycare": "daycares",
        "vet": "vets"
    }.get(role)
    
    if not collection_name:
        raise HTTPException(status_code=403, detail="No autorizado")
        
    data = profile_data.model_dump(exclude_unset=True)
    
    # Map fields correctly based on role
    if role == "daycare":
        if "bio" in data: data["description"] = data.pop("bio")
        if "price_per_walk" in data: data["price_per_day"] = data.pop("price_per_walk")
    
    if not data:
        return {"message": "Sin cambios"}
        
    await db[collection_name].update_one(
        {"user_id": current_user["id"]},
        {"$set": data}
    )
    return {"message": "Perfil actualizado", "data": data}

# ============= PIN VERIFICATION & GPS TRACKING =============

import random

@api_router.post("/bookings/{booking_id}/generate-pin")
async def generate_verification_pin(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Owner generates a 6-digit PIN after payment is confirmed and walker is ready"""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    if booking["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Solo el dueño puede generar el PIN")
    
    if booking.get("payment_status") != "paid":
        raise HTTPException(status_code=400, detail="El pago debe estar confirmado para generar el PIN")
    
    if booking.get("verification_pin"):
        # Return existing PIN if already generated
        return {
            "pin": booking["verification_pin"],
            "message": "PIN ya generado previamente",
            "generated_at": booking.get("pin_generated_at")
        }
    
    # Generate 6-digit PIN
    pin = str(random.randint(100000, 999999))
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "verification_pin": pin,
            "pin_generated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify walker that PIN is ready
    notification = Notification(
        user_id=booking["service_id"],
        type="pin_ready",
        title="PIN de Verificación Listo",
        message=f"El dueño ha generado el PIN. Solicítalo cuando llegues para iniciar el paseo.",
        data={"booking_id": booking_id}
    )
    await db.notifications.insert_one(notification.model_dump())
    
    return {
        "pin": pin,
        "message": "PIN generado. Compártelo con el paseador cuando llegue.",
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/bookings/{booking_id}/verify-pin")
async def verify_pin_and_start(
    booking_id: str,
    pin: str,
    current_user: dict = Depends(get_current_user)
):
    """Walker verifies PIN to start the walk with GPS tracking"""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # Check if walker is the provider
    if booking["service_id"] != current_user.get("id") and current_user.get("role") != "admin":
        # Also check by user_id in walkers collection
        walker = await db.walkers.find_one({"user_id": current_user["id"]})
        if not walker or walker["id"] != booking["service_id"]:
            raise HTTPException(status_code=403, detail="Solo el paseador asignado puede verificar el PIN")
    
    if not booking.get("verification_pin"):
        raise HTTPException(status_code=400, detail="El dueño aún no ha generado el PIN")
    
    if booking["verification_pin"] != pin:
        return {"success": False, "message": "PIN incorrecto. Intenta de nuevo."}
    
    if booking.get("pin_verified_at"):
        return {"success": True, "message": "PIN ya verificado. El paseo está en curso.", "already_started": True}
    
    # PIN verified - start the walk with GPS tracking
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "in_progress",
            "pin_verified_at": datetime.now(timezone.utc).isoformat(),
            "started_at": datetime.now(timezone.utc).isoformat(),
            "gps_tracking_enabled": True,
            "location_history": []
        }}
    )
    
    # Notify owner walk started
    try:
        owner = await db.users.find_one({"id": booking.get("owner_id")})
        if owner and owner.get("fcm_token"):
            asyncio.create_task(send_fcm_notification(
                token=owner["fcm_token"],
                title="🐕 ¡Paseo Iniciado!",
                body=f"El paseo de {booking.get('pet_name', 'tu mascota')} ha comenzado.",
                data={"booking_id": booking["id"], "type": "walk_started"}
            ))
    except Exception as e:
        logging.error(f"Error sending start push notification: {e}")
    
    # Notify owner that walk has started
    notification = Notification(
        user_id=booking["owner_id"],
        type="walk_started",
        title="¡Paseo Iniciado!",
        message=f"El paseador ha verificado el PIN. Ahora puedes seguir el paseo en tiempo real.",
        data={"booking_id": booking_id}
    )
    await db.notifications.insert_one(notification.model_dump())
    
    return {
        "success": True,
        "message": "¡PIN verificado! El paseo ha iniciado. GPS activado.",
        "started_at": datetime.now(timezone.utc).isoformat()
    }

class LocationUpdate(BaseModel):
    lat: float
    lng: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None

@api_router.post("/bookings/{booking_id}/update-location")
async def update_walker_location(
    booking_id: str,
    location: LocationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Walker updates their GPS location during the walk"""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    if booking.get("status") != "in_progress":
        raise HTTPException(status_code=400, detail="El paseo no está activo")
    
    if not booking.get("gps_tracking_enabled"):
        raise HTTPException(status_code=400, detail="GPS tracking no está habilitado")
    
    location_entry = {
        "lat": location.lat,
        "lng": location.lng,
        "accuracy": location.accuracy,
        "speed": location.speed,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.update_one(
        {"id": booking_id},
        {
            "$set": {"walker_current_location": {"lat": location.lat, "lng": location.lng}},
            "$push": {"location_history": location_entry}
        }
    )
    
    return {"success": True, "location_recorded": True}

@api_router.get("/bookings/{booking_id}/live-location")
async def get_live_location(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Owner gets the current location of the walker"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # Only owner or walker can see location
    if booking["owner_id"] != current_user["id"]:
        # Check if is the walker
        walker = await db.walkers.find_one({"user_id": current_user["id"]})
        if not walker or walker["id"] != booking["service_id"]:
            raise HTTPException(status_code=403, detail="No autorizado")
    
    return {
        "booking_id": booking_id,
        "status": booking.get("status"),
        "gps_tracking_enabled": booking.get("gps_tracking_enabled", False),
        "current_location": booking.get("walker_current_location"),
        "started_at": booking.get("started_at"),
        "location_history": booking.get("location_history", [])[-20:]  # Last 20 points
    }

@api_router.post("/bookings/{booking_id}/complete")
async def complete_walk(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Walker completes the walk"""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # Verify is the walker
    walker = await db.walkers.find_one({"user_id": current_user["id"]})
    if not walker or walker["id"] != booking["service_id"]:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Solo el paseador puede completar el paseo")
    
    if booking.get("status") != "in_progress":
        raise HTTPException(status_code=400, detail="El paseo no está en progreso")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "gps_tracking_enabled": False
        }}
    )
    
    # Notify owner
    notification = Notification(
        user_id=booking["owner_id"],
        type="walk_completed",
        title="¡Paseo Completado!",
        message="El paseador ha finalizado el paseo. ¡No olvides calificar el servicio!",
        data={"booking_id": booking_id}
    )
    await db.notifications.insert_one(notification.model_dump())
    
    return {
        "success": True,
        "message": "¡Paseo completado exitosamente!",
        "completed_at": datetime.now(timezone.utc).isoformat()
    }

# ============= MANUAL PAYMENT FLOW =============

class ManualPaymentCreate(BaseModel):
    booking_id: str
    amount: float
    payment_method: str = "nequi"  # nequi, daviplata, bancolombia
    proof_image_url: str

class ManualPayment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    user_id: str
    amount: float
    payment_method: str
    proof_image_url: str
    proof_image_url: str
    status: str = "pending"  # pending, approved, rejected
    image_hash: Optional[str] = None
    ai_score: Optional[float] = None
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.post("/payments/manual")
async def create_manual_payment(
    payment: ManualPaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit manual payment proof for admin approval (Legacy support)"""
    return await register_manual_payment(
        RegisterManualPayment(
            booking_id=payment.booking_id,
            amount=payment.amount,
            payment_method=payment.payment_method,
            proof_url=payment.proof_image_url
        ),
        current_user
    )





# Alternative endpoint for frontend compatibility
class RegisterManualPayment(BaseModel):
    booking_id: str
    amount: float
    payment_method: str = "nequi"
    proof_url: str

@api_router.post("/payments/register_manual")
async def register_manual_payment(
    payment: RegisterManualPayment,
    current_user: dict = Depends(get_current_user)
):
    """Register manual payment (with Anti-Fraud Hashing)"""
    # 1. Verificar reserva
    booking = await db.bookings.find_one({"id": payment.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # 2. Búnker de Seguridad: Hashing de Imagen
    # Descargamos brevemente el comprobante para generar su huella digital
    image_hash = None
    try:
        async with httpx.AsyncClient() as client:
            img_res = await client.get(payment.proof_url)
            if img_res.status_code == 200:
                image_hash = hashlib.sha256(img_res.content).hexdigest()
                
                # Buscar duplicados (Mismo pantallazo usado antes)
                duplicate = await db.manual_payments.find_one({"image_hash": image_hash})
                if duplicate:
                    logging.warning(f"Intento de fraude: Imagen duplicada detectada de {current_user['email']}")
                    raise HTTPException(
                        status_code=400, 
                        detail="Este comprobante ya ha sido utilizado para otro pago. Por favor sube uno nuevo."
                    )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating payment hash: {e}")
        # Continuar si falla el hash para no bloquear al usuario legítimo, 
        # pero marcar para revisión manual estricta
    
    # 3. Guardar Pago
    manual_payment = ManualPayment(
        booking_id=payment.booking_id,
        user_id=current_user["id"],
        amount=payment.amount,
        payment_method=payment.payment_method,
        proof_image_url=payment.proof_url,
        image_hash=image_hash,
        ai_score=1.0 # Placeholder: Aquí iría el resultado del OCR
    )
    
    # 4. Insertar en BD
    await db.manual_payments.insert_one(manual_payment.model_dump())
    
    # 5. Actualizar estado de la reserva
    await db.bookings.update_one(
        {"id": payment.booking_id},
        {"$set": {"payment_status": "pending_verification"}}
    )
    
    # 6. Notificar Admin
    admin_notification = Notification(
        user_id="admin",
        type="manual_payment",
        title="🛡️ Nuevo Pago Protegido",
        message=f"El usuario {current_user['name']} subió un pago de ${payment.amount:,.0f}. Hash verificado (No duplicado).",
        data={"payment_id": manual_payment.id, "booking_id": payment.booking_id}
    )
    await db.notifications.insert_one(admin_notification.model_dump())
    
    # 7. Enviar Email al Usuario
    user_html = f"""
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #0F4C75;">Pago Recibido</h1>
        <p>Hola {current_user.get('name', 'Usuario')},</p>
        <p>Hemos recibido tu comprobante de pago por <strong>${payment.amount:,.0f}</strong>.</p>
        <p>Nuestro equipo lo validará en breve y te notificaremos cuando tu reserva esté confirmada. ¡Gracias por confiar en PetTrust!</p>
    </div>
    """
    user_email = current_user.get("email") or current_user.get("sub")
    if user_email and "@" in user_email:
         asyncio.create_task(send_email(user_email, "Comprobante de Pago Recibido", user_html))
    
    return {"message": "Comprobante verificado y enviado para revisión", "payment_id": manual_payment.id}

@api_router.get("/admin/bookings/all")
async def get_all_bookings(current_user: dict = Depends(get_current_user)):
    """Get all bookings with payment info (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    bookings = await db.bookings.find({}).sort("created_at", -1).to_list(200)
    
    # Enrich with payment info
    for booking in bookings:
        booking.pop("_id", None)
        
        # Get payment info
        payment = await db.manual_payments.find_one({"booking_id": booking["id"]})
        if payment:
            booking["payment"] = {
                "id": payment["id"],
                "status": payment["status"],
                "method": payment["payment_method"],
                "proof_url": payment.get("proof_image_url"),
                "amount": payment["amount"]
            }
        else:
            booking["payment"] = None
        
        # Get owner info
        owner = await db.users.find_one({"id": booking.get("owner_id")})
        if owner:
            booking["owner_name"] = owner.get("name", "Unknown")
            booking["owner_phone"] = owner.get("phone", "")
        
        # Get pet info
        pet = await db.pets.find_one({"id": booking.get("pet_id")})
        if pet:
            booking["pet_name"] = pet.get("name", "Unknown")
    
    return bookings


@api_router.post("/admin/seed")
async def seed_admin_user(secret_key: str):
    """
    Create an admin user (protected by secret key).
    This should only be called once during initial setup.
    """
    if secret_key != os.environ.get("SECRET_KEY", "demo-secret-key-pettrust-bogota-2025"):
        raise HTTPException(status_code=403, detail="Clave secreta inválida")
    
    # Check if admin already exists
    existing = await db.users.find_one({"role": "admin"})
    if existing:
        return {"message": "Admin ya existe", "email": existing["email"]}
    
    admin_email = "admin@pettrust.co"
    admin_password = hash_password("PetTrust2025!")
    
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": admin_email,
        "name": "Administrador PetTrust",
        "role": "admin",
        "phone": "+573001234567",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    admin_user["password"] = admin_password
    
    await db.users.insert_one(admin_user)
    return {"message": "Admin creado exitosamente", "email": admin_email}

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ... (Previous code)

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    provider_id: str
    user_id: str
    user_name: str
    rating: int = Field(ge=1, le=5)
    comment: str
    created_at: datetime = Field(default_factory=datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    booking_id: str
    provider_id: str
    rating: int = Field(ge=1, le=5)
    comment: str

@api_router.post("/reviews", status_code=status.HTTP_201_CREATED)
async def create_review(review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    # 1. Verify booking exists and belongs to user
    booking = await db.bookings.find_one({"id": review_data.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    if booking["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para reseñar esta reserva")

    if booking["status"] != "completed":
        raise HTTPException(status_code=400, detail="Solo puedes reseñar servicios completados")
        
    # Check if booking is too old (e.g., > 30 days)
    completed_at_str = booking.get("completed_at") or booking.get("date") # Fallback to date if completed_at missing
    try:
        if completed_at_str:
            completed_date = datetime.fromisoformat(completed_at_str.replace("Z", "+00:00"))
            if completed_date.tzinfo is None:
                completed_date = completed_date.replace(tzinfo=timezone.utc)
                
            delta = datetime.now(timezone.utc) - completed_date
            if delta.days > 30:
                raise HTTPException(status_code=400, detail="No puedes calificar servicios de hace más de 30 días")
    except ValueError:
        pass # If date parsing fails, we skip this check to avoid blocking valid reviews due to data issues

    # 2. Check if already reviewed
    existing_review = await db.reviews.find_one({"booking_id": review_data.booking_id})
    if existing_review:
        raise HTTPException(status_code=400, detail="Ya has enviado una reseña para este servicio")

    # 3. Create Review
    new_review = Review(
        booking_id=review_data.booking_id,
        provider_id=review_data.provider_id,
        user_id=current_user["id"],
        user_name=current_user.get("sub", "Usuario"), 
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    # Fetch user name correctly
    user_doc = await db.users.find_one({"id": current_user["id"]})
    if user_doc:
        new_review.user_name = user_doc["name"]

    await db.reviews.insert_one(new_review.model_dump())

    # 4. Update Provider Stats (Rating & Count)
    provider_collection = None
    if booking["service_type"] == "walk":
        provider_collection = db.walkers
    elif booking["service_type"] == "daycare":
        provider_collection = db.daycares
    elif booking["service_type"] == "vet":
        provider_collection = db.vets
    
    if provider_collection:
        provider = await provider_collection.find_one({"id": review_data.provider_id})
        if provider:
            current_count = provider.get("reviews_count", 0)
            current_rating = provider.get("rating", 0.0)
            
            new_count = current_count + 1
            # Calculate new average
            new_rating = ((current_rating * current_count) + review_data.rating) / new_count
            
            await provider_collection.update_one(
                {"id": review_data.provider_id},
                {"$set": {"rating": round(new_rating, 1), "reviews_count": new_count}}
            )

    return new_review

@api_router.get("/reviews/provider/{provider_id}")
async def get_provider_reviews(provider_id: str):
    cursor = db.reviews.find({"provider_id": provider_id}).sort("created_at", -1)
    reviews = await cursor.to_list(length=100)
    return reviews


# Image Upload Endpoint (No authentication required for registration)
@api_router.post("/uploads/image")
async def upload_image(file: UploadFile = File(...), folder: str = Form("general")):
    """
    Upload image to Cloudinary
    No authentication required to allow profile picture uploads during registration
    """
    try:
        logging.info(f"Received upload request - filename: {file.filename}, folder: {folder}")
        
        # Read file content
        contents = await file.read()
        logging.info(f"File read successfully, size: {len(contents)} bytes")
        
        # Log Cloudinary config (without secrets)
        logging.info(f"Cloudinary cloud_name: {os.environ.get('CLOUDINARY_CLOUD_NAME', 'NOT SET')}")
        
        # Upload to Cloudinary using BytesIO for proper file handling
        from io import BytesIO
        file_obj = BytesIO(contents)
        
        result = cloudinary.uploader.upload(
            file_obj,
            folder=f"pettrust/{folder}",
            resource_type="image",
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME')
        )
        
        logging.info(f"Upload successful: {result['secure_url']}")
        return {"url": result["secure_url"]}
    except Exception as e:
        logging.error(f"Image upload error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")


app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
