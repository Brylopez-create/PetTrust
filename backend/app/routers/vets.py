"""
Vets Router - Veterinarian Profiles CRUD
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from app.core.database import db
from app.core.security import get_current_user
from app.models.models import VetProfile, VetCreate, GeoJSONLocation

router = APIRouter(prefix="/vets", tags=["Vets"])


@router.post("/", response_model=VetProfile)
async def create_vet(vet_data: VetCreate, current_user: dict = Depends(get_current_user)):
    """Create a vet profile"""
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


@router.get("/", response_model=List[VetProfile])
async def get_vets(location: Optional[str] = None, verified_only: bool = False):
    """Get all active vets"""
    query = {"is_active": True}
    if location:
        query["location_name"] = {"$regex": location, "$options": "i"}
    if verified_only:
        query["verified"] = True
    vets = await db.vets.find(query, {"_id": 0}).to_list(100)
    return vets


@router.get("/me", response_model=VetProfile)
async def get_my_vet_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's vet profile"""
    if current_user["role"] != "vet":
        raise HTTPException(status_code=403, detail="No eres veterinario")
    
    vet = await db.vets.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not vet:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return vet


@router.get("/{vet_id}", response_model=VetProfile)
async def get_vet(vet_id: str):
    """Get a specific vet by ID"""
    vet = await db.vets.find_one({"id": vet_id}, {"_id": 0})
    if not vet:
        raise HTTPException(status_code=404, detail="Veterinario no encontrado")
    return vet


@router.patch("/{vet_id}/verify")
async def verify_vet(vet_id: str, verified: bool, current_user: dict = Depends(get_current_user)):
    """Verify a vet (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    await db.vets.update_one(
        {"id": vet_id},
        {"$set": {"verified": verified, "verification_status": "approved" if verified else "rejected"}}
    )
    return {"message": "Estado de verificación actualizado"}
