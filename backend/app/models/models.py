"""
Pydantic Models for PetTrust Application
Extracted from monolithic server.py for better organization.
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

# ============= LOCATION MODELS =============
class GeoJSONLocation(BaseModel):
    type: str = "Point"
    coordinates: List[float] = Field(..., description="[longitude, latitude]")

# ============= USER MODELS =============
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

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

# ============= SCHEDULE MODELS =============
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

# ============= PROVIDER MODELS =============
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
    working_hours: Optional[Dict[str, Any]] = None

# ============= PET MODELS =============
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

# ============= BOOKING MODELS =============
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
    verification_pin: Optional[str] = None
    pin_generated_at: Optional[str] = None
    pin_verified_at: Optional[str] = None
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
    has_review: bool = False
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

# ============= PAYMENT MODELS =============
class ManualPayment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    user_id: str
    amount: float
    payment_method: str
    proof_url: str
    status: str = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ManualPaymentCreate(BaseModel):
    booking_id: str
    amount: float
    payment_method: str
    proof_url: str

# ============= REVIEW MODELS =============
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

# ============= WELLNESS MODELS =============
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

# ============= INCIDENT MODELS =============
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

# ============= PROSPECT MODELS =============
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
    type: str
    experience_years: Optional[int] = 0
    responses: List[ProspectResponse] = []
    total_score: float = 0.0
    status: str = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    verification_token: Optional[str] = None

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

# ============= EMERGENCY MODELS =============
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

class PetMatchRequest(BaseModel):
    pet_id: str
    lat: float
    lng: float
    date: str
    time: str
