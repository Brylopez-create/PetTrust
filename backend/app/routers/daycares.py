"""
Daycares Router - Daycare Profiles CRUD
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from app.core.database import db
from app.core.security import get_current_user
from app.models.models import DaycareProfile, DaycareCreate, GeoJSONLocation

router = APIRouter(prefix="/daycares", tags=["Daycares"])


@router.post("/", response_model=DaycareProfile)
async def create_daycare(daycare_data: DaycareCreate, current_user: dict = Depends(get_current_user)):
    """Create a daycare profile"""
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


@router.get("/", response_model=List[DaycareProfile])
async def get_daycares(location: Optional[str] = None):
    """Get all active daycares"""
    query = {"is_active": True}
    if location:
        query["location_name"] = {"$regex": location, "$options": "i"}
    daycares = await db.daycares.find(query, {"_id": 0}).to_list(100)
    return daycares


@router.get("/me", response_model=DaycareProfile)
async def get_my_daycare_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's daycare profile"""
    if current_user["role"] != "daycare":
        raise HTTPException(status_code=403, detail="No eres guardería")
    
    daycare = await db.daycares.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not daycare:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return daycare


@router.get("/{daycare_id}", response_model=DaycareProfile)
async def get_daycare(daycare_id: str):
    """Get a specific daycare by ID"""
    daycare = await db.daycares.find_one({"id": daycare_id}, {"_id": 0})
    if not daycare:
        raise HTTPException(status_code=404, detail="Guardería no encontrada")
    return daycare


@router.patch("/{daycare_id}/verify")
async def verify_daycare(daycare_id: str, verified: bool, current_user: dict = Depends(get_current_user)):
    """Verify a daycare (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    await db.daycares.update_one(
        {"id": daycare_id},
        {"$set": {"verified": verified, "verification_status": "approved" if verified else "rejected"}}
    )
    return {"message": "Estado de verificación actualizado"}
