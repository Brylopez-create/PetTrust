"""
Prospects Router - Walker/Provider Applications
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict
from datetime import datetime, timezone
import secrets

from app.core.database import db
from app.core.security import get_current_user
from app.models.models import Prospect, ProspectCreate, ProspectStatusUpdate
from app.services.email import send_email

router = APIRouter(prefix="/prospects", tags=["Prospects"])


@router.post("/", response_model=Prospect)
async def create_prospect(prospect_data: ProspectCreate):
    """Submit a new provider application"""
    existing = await db.prospects.find_one({"email": prospect_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una solicitud con este correo")
    
    prospect = Prospect(**prospect_data.model_dump())
    await db.prospects.insert_one(prospect.model_dump())
    return prospect


@router.get("/status/{email}")
async def get_prospect_status(email: str):
    """Check prospect application status by email"""
    prospect = await db.prospects.find_one(
        {"email": email}, 
        {"_id": 0, "status": 1, "created_at": 1, "name": 1}
    )
    if not prospect:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return prospect


@router.get("/")
async def get_all_prospects(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all prospects (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    query = {}
    if status:
        query["status"] = status
    
    prospects = await db.prospects.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return prospects


@router.patch("/{prospect_id}/status")
async def update_prospect_status(
    prospect_id: str,
    update_data: ProspectStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Approve/reject a prospect (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    prospect = await db.prospects.find_one({"id": prospect_id})
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospecto no encontrado")
    
    update = {"status": update_data.status}
    
    if update_data.status == "approved":
        verification_token = secrets.token_urlsafe(32)
        update["verification_token"] = verification_token
        
        # Send approval email with registration link
        register_link = f"https://pettrust.vercel.app/register?token={verification_token}"
        html = f"""
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #28B463;">¡Felicitaciones {prospect['name']}!</h1>
            <p>Tu solicitud para ser aliado de PetTrust ha sido aprobada.</p>
            <p>Haz clic en el siguiente enlace para completar tu registro:</p>
            <br>
            <a href="{register_link}" style="background-color: #0F4C75; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Completar Registro
            </a>
        </div>
        """
        await send_email(prospect["email"], "¡Solicitud Aprobada! - PetTrust", html)
    
    await db.prospects.update_one({"id": prospect_id}, {"$set": update})
    return {"message": f"Prospecto {update_data.status}"}
