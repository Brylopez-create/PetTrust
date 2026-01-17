from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
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
    location: str
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
    coordinates: Optional[Dict[str, float]] = None
    working_hours: Optional[Dict[str, Any]] = None
    available_slots: List[str] = Field(default_factory=lambda: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"])
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WalkerCreate(BaseModel):
    bio: str
    experience_years: int
    certifications: List[str] = []
    location: str
    price_per_walk: float

class DaycareProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: str
    location: str
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
    coordinates: Optional[Dict[str, float]] = None
    is_active: bool = True
    opening_hours: str = "07:00"
    closing_hours: str = "19:00"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DaycareCreate(BaseModel):
    name: str
    description: str
    location: str
    amenities: List[str]
    has_cameras: bool = True
    has_transportation: bool = False
    has_green_areas: bool = True
    price_per_day: float

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
async def login(credentials: UserLogin):
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
        **walker_data.model_dump()
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
        **daycare_data.model_dump()
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
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
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

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in km between two coordinates using Haversine formula"""
    import math
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

@api_router.get("/providers/search")
async def search_providers(
    service_type: str,
    date: str,
    time: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    needs_pickup: bool = False
):
    """Search available providers with matching logic"""
    collection = "walkers" if service_type == "walker" else "daycares"
    
    query = {"is_active": True}
    
    providers = await db[collection].find(query, {"_id": 0}).to_list(100)
    results = []
    
    for provider in providers:
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
            
        else:
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
        
        distance_km = 0.0
        if lat and lng and provider.get("coordinates"):
            distance_km = haversine_distance(
                lat, lng,
                provider["coordinates"].get("lat", 0),
                provider["coordinates"].get("lng", 0)
            )
            
            provider_radius = provider.get("radius_km", 5) if service_type == "walker" else provider.get("pickup_radius_km", 10)
            if distance_km > provider_radius:
                continue
        
        price = provider.get("price_per_walk", 25000) if service_type == "walker" else provider.get("price_per_day", 80000)
        if needs_pickup and service_type == "daycare":
            price += provider.get("pickup_price", 15000)
        
        results.append({
            "id": provider["id"],
            "name": provider.get("name", ""),
            "bio": provider.get("bio") or provider.get("description", ""),
            "location": provider.get("location", ""),
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
    query = {"is_active": True}
    providers = await db[collection].find(query, {"_id": 0}).to_list(100)
    
    matched_providers = []
    owner_lat = request_data.owner_lat or 4.6951
    owner_lng = request_data.owner_lng or -74.0621
    
    for provider in providers:
        if provider.get("coordinates"):
            distance = haversine_distance(
                owner_lat, owner_lng,
                provider["coordinates"].get("lat", 0),
                provider["coordinates"].get("lng", 0)
            )
            provider_radius = provider.get("radius_km", 5) if request_data.service_type == "walker" else provider.get("pickup_radius_km", 10)
            if distance <= provider_radius:
                matched_providers.append(provider["id"])
        else:
            matched_providers.append(provider["id"])
    
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
    
    for provider_id in matched_providers:
        provider = await db[collection].find_one({"id": provider_id}, {"_id": 0})
        if provider:
            distance = 0.0
            if provider.get("coordinates"):
                distance = haversine_distance(
                    owner_lat, owner_lng,
                    provider["coordinates"].get("lat", 0),
                    provider["coordinates"].get("lng", 0)
                )
            
            earnings = provider.get("price_per_walk", 25000) if request_data.service_type == "walker" else provider.get("price_per_day", 80000)
            
            inbox_item = ProviderInbox(
                provider_id=provider_id,
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
    if current_user["role"] not in ["walker", "daycare"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    collection = "walkers" if current_user["role"] == "walker" else "daycares"
    profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not profile:
        return None
    
    return profile

@api_router.patch("/providers/me/status")
async def update_provider_status(
    status_update: ProviderStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update provider's active status and settings"""
    if current_user["role"] not in ["walker", "daycare"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    collection = "walkers" if current_user["role"] == "walker" else "daycares"
    
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
    if current_user["role"] not in ["walker", "daycare"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    collection = "walkers" if current_user["role"] == "walker" else "daycares"
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
    if current_user["role"] not in ["walker", "daycare"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    if action not in ["accept", "reject"]:
        raise HTTPException(status_code=400, detail="Acción inválida")
    
    collection = "walkers" if current_user["role"] == "walker" else "daycares"
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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)