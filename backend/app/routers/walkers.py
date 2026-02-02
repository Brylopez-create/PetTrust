"""
Walkers Router - Walker Profiles CRUD
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from app.core.database import db
from app.core.security import get_current_user
from app.models.models import WalkerProfile, WalkerCreate, GeoJSONLocation

router = APIRouter(prefix="/walkers", tags=["Walkers"])


@router.post("/", response_model=WalkerProfile)
async def create_walker(walker_data: WalkerCreate, current_user: dict = Depends(get_current_user)):
    """Create a walker profile"""
    if current_user["role"] != "walker":
        raise HTTPException(status_code=403, detail="Solo paseadores pueden crear perfiles")
    
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


@router.get("/", response_model=List[WalkerProfile])
async def get_walkers(location: Optional[str] = None, verified_only: bool = False):
    """Get all active walkers"""
    query = {"is_active": True}
    if location:
        query["location_name"] = {"$regex": location, "$options": "i"}
    if verified_only:
        query["verified"] = True
    walkers = await db.walkers.find(query, {"_id": 0}).to_list(100)
    return walkers


@router.get("/me", response_model=WalkerProfile)
async def get_my_walker_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's walker profile"""
    if current_user["role"] != "walker":
        raise HTTPException(status_code=403, detail="No eres paseador")
    
    walker = await db.walkers.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not walker:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return walker


@router.get("/{walker_id}", response_model=WalkerProfile)
async def get_walker(walker_id: str):
    """Get a specific walker by ID"""
    walker = await db.walkers.find_one({"id": walker_id}, {"_id": 0})
    if not walker:
        raise HTTPException(status_code=404, detail="Paseador no encontrado")
    return walker


@router.patch("/{walker_id}/verify")
async def verify_walker(walker_id: str, verified: bool, current_user: dict = Depends(get_current_user)):
    """Verify a walker (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    await db.walkers.update_one(
        {"id": walker_id},
        {"$set": {"verified": verified, "verification_status": "approved" if verified else "rejected"}}
    )
    return {"message": "Estado de verificación actualizado"}


@router.post("/{walker_id}/documents")
async def upload_walker_document(walker_id: str, document: str, current_user: dict = Depends(get_current_user)):
    """Upload a document for verification"""
    walker = await db.walkers.find_one({"id": walker_id, "user_id": current_user["id"]}, {"_id": 0})
    if not walker:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    await db.walkers.update_one(
        {"id": walker_id},
        {"$push": {"documents": document}, "$set": {"verification_status": "pending"}}
    )
    return {"message": "Documento agregado"}
