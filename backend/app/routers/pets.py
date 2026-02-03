"""
Pets Router - Pet Profiles CRUD
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app.core.database import db
from app.core.security import get_current_user
from app.models.models import Pet, PetCreate

router = APIRouter(prefix="/pets", tags=["Pets"])


@router.post("/", response_model=Pet)
async def create_pet(pet_data: PetCreate, current_user: dict = Depends(get_current_user)):
    """Create a new pet"""
    pet = Pet(
        owner_id=current_user["id"],
        **pet_data.model_dump()
    )
    await db.pets.insert_one(pet.model_dump())
    return pet


@router.get("/", response_model=List[Pet])
async def get_my_pets(current_user: dict = Depends(get_current_user)):
    """Get all pets for current user"""
    pets = await db.pets.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return pets


@router.get("/{pet_id}", response_model=Pet)
async def get_pet(pet_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific pet by ID"""
    pet = await db.pets.find_one({"id": pet_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    return pet


@router.patch("/{pet_id}")
async def update_pet(pet_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    """Update a pet"""
    pet = await db.pets.find_one({"id": pet_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    
    allowed_fields = ["name", "breed", "age", "weight", "special_needs", "photo"]
    update = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    await db.pets.update_one({"id": pet_id}, {"$set": update})
    return {"message": "Mascota actualizada"}


@router.delete("/{pet_id}")
async def delete_pet(pet_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a pet"""
    result = await db.pets.delete_one({"id": pet_id, "owner_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mascota no encontrada")
    return {"message": "Mascota eliminada"}
