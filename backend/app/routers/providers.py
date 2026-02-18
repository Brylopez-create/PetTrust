"""
Providers Router - Common endpoints for Walkers, Daycares, and Vets (Inbox, Schedule, Status)
Extracted from server.py
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging

from app.core.database import db
from app.core.security import get_current_user
from app.models.models import Booking, ProviderProfileUpdate, Notification

router = APIRouter(prefix="/providers", tags=["Providers"])

# Helper to check schedule conflicts
async def check_walker_schedule_conflict(walker_id: str, date: str, time: str) -> bool:
    count = await db.bookings.count_documents({
        "service_id": walker_id,
        "date": date,
        "time": time,
        "status": {"$in": ["confirmed", "in_progress"]}
    })
    return count > 0

@router.get("/me/profile")
async def get_my_provider_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's provider profile"""
    if current_user["role"] not in ["walker", "daycare", "vet"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    collection = "walkers" if current_user["role"] == "walker" else "daycares" if current_user["role"] == "daycare" else "vets"
    profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
        
    return profile

@router.patch("/me/profile")
async def update_my_provider_profile(
    update_data: ProviderProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update provider profile details"""
    if current_user["role"] not in ["walker", "daycare", "vet"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
        
    collection = "walkers" if current_user["role"] == "walker" else "daycares" if current_user["role"] == "daycare" else "vets"
    
    # Filter None values
    data_to_update = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not data_to_update:
        return {"message": "Nada que actualizar"}
        
    result = await db[collection].update_one(
        {"user_id": current_user["id"]},
        {"$set": data_to_update}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
        
    return {"message": "Perfil actualizado exitosamente"}

@router.patch("/me/status")
async def update_provider_status(
    status_update: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update specific status fields (is_active, capacity, radius)"""
    if current_user["role"] not in ["walker", "daycare", "vet"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    collection = "walkers" if current_user["role"] == "walker" else "daycares" if current_user["role"] == "daycare" else "vets"
    
    update_data = {}
    if "is_active" in status_update:
        update_data["is_active"] = status_update["is_active"]
    if "capacity_max" in status_update:
        update_data["capacity_max"] = status_update["capacity_max"]
    if "radius_km" in status_update:
        update_data["radius_km"] = status_update["radius_km"]
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")
    
    result = await db[collection].update_one(
        {"user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    return {"message": "Estado actualizado", "updates": update_data}

@router.get("/me/inbox")
async def get_provider_inbox(current_user: dict = Depends(get_current_user)):
    """Get provider's inbox with pending service requests"""
    if current_user["role"] not in ["walker", "daycare", "vet"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    collection = "walkers" if current_user["role"] == "walker" else "daycares" if current_user["role"] == "daycare" else "vets"

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

@router.post("/me/inbox/{inbox_id}/respond")
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
    
    collection = "walkers" if current_user["role"] == "walker" else "daycares" if current_user["role"] == "daycare" else "vets"

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
    
    # Logic from server.py to handle response
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
    
    # Accepting
    await db.service_requests.update_one(
        {"id": request["id"]},
        {"$set": {
            "status": "accepted",
            "accepted_by": profile["id"],
            "accepted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Check conflicts for walkers
    if current_user["role"] == "walker":
        has_conflict = await check_walker_schedule_conflict(
            profile["id"],
            request["requested_date"],
            request["requested_time"]
        )
        if has_conflict:
            # Revert
            await db.service_requests.update_one(
                {"id": request["id"]},
                {"$set": {"status": "pending", "accepted_by": None, "accepted_at": None}}
            )
            raise HTTPException(
                status_code=409, 
                detail="Ya tienes una reserva a esta hora."
            )
    
    # Create Booking
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

@router.get("/me/schedule")
async def get_provider_schedule(
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get provider's booking schedule and stats"""
    if current_user["role"] not in ["walker", "daycare", "vet"]:
        raise HTTPException(status_code=403, detail="Solo proveedores")
    
    collection = "walkers" if current_user["role"] == "walker" else "daycares" if current_user["role"] == "daycare" else "vets"
    profile = await db[collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not profile:
        return {"bookings": [], "capacity_used": 0}
    
    # Stats
    stats_query = {
        "service_id": profile["id"],
        "status": {"$in": ["confirmed", "in_progress", "completed", "pending"]}
    }
    all_related_bookings = await db.bookings.find(stats_query, {"_id": 0}).to_list(200)

    total_earnings = sum(b.get("price", 0) for b in all_related_bookings if b.get("status") == "completed")
    pending_earnings = sum(b.get("price", 0) for b in all_related_bookings if b.get("status") in ["confirmed", "in_progress", "pending"] and b.get("payment_status") == "paid")
    
    # Schedule
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
