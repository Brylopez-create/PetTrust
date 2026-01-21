from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

# CORS Configuration
allowed_origins_raw = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,https://pettrust.vercel.app,https://pettrust-production.up.railway.app")
origins = [o.strip() for o in allowed_origins_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

SECRET_KEY = os.environ.get('SECRET_KEY', 'demo-secret-key-pettrust-bogota-2025')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

class GeoJSONLocation(BaseModel):
    type: str = "Point"
    coordinates: List[float] = Field(..., description="[longitude, latitude]")

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "owner"
    phone: Optional[str] = None

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
    is_active: bool = False
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
    status: str = "pending"
    price: float
    payment_status: str = "pending"
    payment_id: Optional[str] = None
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

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed_pw = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        phone=user_data.phone
    )
    user_dict = user.model_dump()
    user_dict["password"] = hashed_pw
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token({"sub": user.id, "role": user.role})
    return {"token": token, "user": user}

@api_router.post("/auth/login")
@limiter.limit("5/minute")
async def login(credentials: UserLogin, request: Request):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    user.pop("password")
    return {"token": token, "user": user}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

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
    query = {}
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
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
    query = {}
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
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
    query = {}
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
    pet = Pet(owner_id=current_user["id"], **pet_data.model_dump())
    await db.pets.insert_one(pet.model_dump())
    return pet

@api_router.get("/pets", response_model=List[Pet])
async def get_my_pets(current_user: dict = Depends(get_current_user)):
    pets = await db.pets.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return pets

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, current_user: dict = Depends(get_current_user)):
    pet = await db.pets.find_one({"id": booking_data.pet_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    
    collection = "walkers" if booking_data.service_type == "walker" else "daycares"
    service = await db[collection].find_one({"id": booking_data.service_id}, {"_id": 0})
    
    booking = Booking(
        owner_id=current_user["id"],
        owner_name=current_user["name"],
        pet_name=pet["name"],
        service_name=service.get("name") if service else "Servicio",
        **booking_data.model_dump()
    )
    await db.bookings.insert_one(booking.model_dump())
    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "owner":
        bookings = await db.bookings.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(100)
    elif current_user["role"] == "admin":
        bookings = await db.bookings.find({}, {"_id": 0}).to_list(100)
    else:
        profile_collection = "walkers" if current_user["role"] == "walker" else "daycares"
        profile = await db[profile_collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
        if not profile:
            return []
        bookings = await db.bookings.find({"service_id": profile["id"]}, {"_id": 0}).to_list(100)
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

@api_router.post("/bookings/{booking_id}/generate-pin")
async def generate_verification_pin(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    if booking["owner_id"] != current_user["id"] and booking.get("service_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    existing_pin = await db.verification_pins.find_one({"booking_id": booking_id, "verified": False}, {"_id": 0})
    if existing_pin:
        return {"pin_code": existing_pin["pin_code"], "message": "PIN ya generado"}
    
    pin_code = str(random.randint(1000, 9999))
    
    pin = VerificationPin(
        booking_id=booking_id,
        pin_code=pin_code
    )
    await db.verification_pins.insert_one(pin.model_dump())
    
    return {"pin_code": pin_code, "message": "PIN generado. Compártelo con el paseador/dueño."}

@api_router.post("/bookings/{booking_id}/verify-pin")
async def verify_pin(booking_id: str, pin_code: str, current_user: dict = Depends(get_current_user)):
    pin = await db.verification_pins.find_one({"booking_id": booking_id, "pin_code": pin_code, "verified": False}, {"_id": 0})
    if not pin:
        raise HTTPException(status_code=400, detail="PIN inválido o ya verificado")
    
    await db.verification_pins.update_one(
        {"id": pin["id"]},
        {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "PIN verificado exitosamente", "verified": True}

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

@api_router.get("/admin/pending-verifications")
async def get_pending_verifications(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    walkers = await db.walkers.find({"verification_status": "pending"}, {"_id": 0}).to_list(100)
    daycares = await db.daycares.find({"verification_status": "pending"}, {"_id": 0}).to_list(100)
    
    return {"walkers": walkers, "daycares": daycares}

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
        "pending_incidents": pending_incidents
    }

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

@api_router.get("/availability/check")
async def check_availability(
    service_id: str,
    service_type: str,
    date: str,
    time: Optional[str] = None
):
    """Check if a provider has availability for a specific date/time"""
    collection = "walkers" if service_type == "walker" else "daycares"
    provider = await db[collection].find_one({"id": service_id}, {"_id": 0})
    
    if not provider:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    if not provider.get("is_active", False):
        return {
            "available": False,
            "reason": "Proveedor no disponible",
            "capacity_remaining": 0
        }
    
    if service_type == "walker":
        bookings_count = await db.bookings.count_documents({
            "service_id": service_id,
            "date": date,
            "time": time,
            "status": {"$in": ["pending", "confirmed", "in_progress"]}
        })
        capacity_max = provider.get("capacity_max", 4)
        capacity_remaining = capacity_max - bookings_count
        
        available_slots = provider.get("available_slots", [])
        next_available = None
        if time in available_slots:
            idx = available_slots.index(time)
            if idx + 1 < len(available_slots):
                next_available = available_slots[idx + 1]
        
    else:
        bookings_count = await db.bookings.count_documents({
            "service_id": service_id,
            "date": date,
            "status": {"$in": ["pending", "confirmed", "in_progress"]}
        })
        capacity_max = provider.get("capacity_total", 20)
        capacity_remaining = capacity_max - bookings_count
        next_available = None
    
    return {
        "available": capacity_remaining > 0,
        "capacity_remaining": capacity_remaining,
        "next_available_slot": next_available,
        "provider_name": provider.get("name", "")
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
    
    query = {
        "service_id": profile["id"],
        "status": {"$in": ["confirmed", "in_progress"]}
    }
    
    if date:
        query["date"] = date
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("date", 1).to_list(100)
    
    capacity_max = profile.get("capacity_max", 4) if current_user["role"] == "walker" else profile.get("capacity_total", 20)
    capacity_used = len([b for b in bookings if b.get("date") == date]) if date else len(bookings)
    
    return {
        "bookings": bookings,
        "capacity_max": capacity_max,
        "capacity_used": capacity_used,
        "is_active": profile.get("is_active", False)
    }

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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= CLOUDINARY UPLOAD ENDPOINT =============

class ImageUploadResponse(BaseModel):
    url: str
    public_id: str
    folder: str

@api_router.post("/uploads/image", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    folder: str = "general",
    current_user: dict = Depends(get_current_user)
):
    """
    Upload image to Cloudinary.
    Folders: pets, licenses, payments, profiles, gallery
    """
    allowed_folders = ["pets", "licenses", "payments", "profiles", "gallery", "general"]
    if folder not in allowed_folders:
        raise HTTPException(status_code=400, detail=f"Folder debe ser uno de: {allowed_folders}")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes (JPEG, PNG, WebP, GIF)")
    
    # Max 5MB
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen no puede superar 5MB")
    
    try:
        result = cloudinary.uploader.upload(
            contents,
            folder=f"pettrust/{folder}",
            resource_type="image",
            public_id=f"{current_user['id']}_{uuid.uuid4().hex[:8]}"
        )
        return ImageUploadResponse(
            url=result["secure_url"],
            public_id=result["public_id"],
            folder=folder
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir imagen: {str(e)}")


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
    status: str = "pending"  # pending, approved, rejected
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.post("/payments/manual")
async def create_manual_payment(
    payment: ManualPaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit manual payment proof for admin approval"""
    # Verify booking exists
    booking = await db.bookings.find_one({"id": payment.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    if booking["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    manual_payment = ManualPayment(
        booking_id=payment.booking_id,
        user_id=current_user["id"],
        amount=payment.amount,
        payment_method=payment.payment_method,
        proof_image_url=payment.proof_image_url
    )
    
    await db.manual_payments.insert_one(manual_payment.model_dump())
    
    # Create notification for admin
    admin_notification = Notification(
        user_id="admin",
        type="manual_payment",
        title="Nuevo Pago Manual",
        message=f"El usuario {current_user['name']} ha subido un comprobante de pago por ${payment.amount:,.0f}",
        data={"payment_id": manual_payment.id, "booking_id": payment.booking_id}
    )
    await db.notifications.insert_one(admin_notification.model_dump())
    
    return {"message": "Comprobante enviado para revisión", "payment_id": manual_payment.id}

@api_router.get("/admin/payments/pending")
async def get_pending_payments(current_user: dict = Depends(get_current_user)):
    """Get all pending manual payments (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    payments = await db.manual_payments.find({"status": "pending"}).to_list(100)
    for p in payments:
        p.pop("_id", None)
    return payments

@api_router.patch("/admin/payments/{payment_id}/review")
async def review_manual_payment(
    payment_id: str,
    action: str,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject manual payment (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action debe ser 'approve' o 'reject'")
    
    payment = await db.manual_payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    new_status = "approved" if action == "approve" else "rejected"
    await db.manual_payments.update_one(
        {"id": payment_id},
        {"$set": {
            "status": new_status,
            "admin_notes": notes,
            "reviewed_by": current_user["id"],
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update booking payment status if approved
    if action == "approve":
        await db.bookings.update_one(
            {"id": payment["booking_id"]},
            {"$set": {"payment_status": "paid"}}
        )
    
    # Notify user
    user_notification = Notification(
        user_id=payment["user_id"],
        type="payment_reviewed",
        title="Pago Revisado",
        message=f"Tu pago ha sido {'aprobado' if action == 'approve' else 'rechazado'}",
        data={"payment_id": payment_id, "status": new_status}
    )
    await db.notifications.insert_one(user_notification.model_dump())
    
    return {"message": f"Pago {new_status}", "payment_id": payment_id}

# ============= WALKER SCHEDULE CONFLICT CHECK =============

async def check_walker_schedule_conflict(walker_id: str, date: str, time: str) -> bool:
    """Check if walker has a booking at the same time"""
    existing = await db.bookings.find_one({
        "provider_id": walker_id,
        "service_type": "walker",
        "date": date,
        "time": time,
        "status": {"$in": ["confirmed", "in_progress"]}
    })
    return existing is not None

# ============= ADMIN USER SEED =============

@api_router.post("/admin/seed")
async def seed_admin_user(secret_key: str):
    """
    Create an admin user (protected by secret key).
    This should only be called once during initial setup.
    """
    if secret_key != os.environ.get("SECRET_KEY", ""):
        raise HTTPException(status_code=403, detail="Clave secreta inválida")
    
    # Check if admin already exists
    existing = await db.users.find_one({"role": "admin"})
    if existing:
        return {"message": "Admin ya existe", "email": existing["email"]}
    
    admin_email = "admin@pettrust.co"
    admin_password = hash_password("PetTrust2025!")
    
    admin_user = User(
        email=admin_email,
        name="Administrador PetTrust",
        role="admin",
        phone="+573001234567"
    )
    admin_data = admin_user.model_dump()
    admin_data["password"] = admin_password
    
    await db.users.insert_one(admin_data)
    
    return {
        "message": "Admin creado exitosamente",
        "email": admin_email,
        "password": "PetTrust2025!",
        "note": "Por favor cambia esta contraseña inmediatamente"
    }

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)