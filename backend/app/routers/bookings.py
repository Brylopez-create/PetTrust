"""
Bookings Router - CRUD and Status Management
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import asyncio
import logging

from app.core.database import db
from app.core.security import get_current_user
from app.models.models import Booking, BookingCreate, Review, ReviewCreate
from app.services.email import send_email

router = APIRouter(prefix="/bookings", tags=["Bookings"])


async def check_availability(service_id: str, service_type: str, date: str, time: str = None):
    """Check if a provider is available for the given date/time"""
    collection = "walkers" if service_type == "walker" else "daycares" if service_type == "daycare" else "vets"
    
    existing_bookings = await db.bookings.count_documents({
        "service_id": service_id,
        "date": date,
        "status": {"$in": ["confirmed", "in_progress", "pending"]}
    })
    
    provider = await db[collection].find_one({"id": service_id}, {"_id": 0})
    if not provider:
        return {"available": False, "reason": "Proveedor no encontrado"}
    
    max_capacity = provider.get("capacity_max", 4) if service_type == "walker" else provider.get("capacity_total", 20)
    
    if existing_bookings >= max_capacity:
        return {"available": False, "reason": "Sin disponibilidad para esta fecha"}
    
    return {"available": True}


@router.post("/", response_model=Booking)
async def create_booking(booking_data: BookingCreate, current_user: dict = Depends(get_current_user)):
    """Create a new booking"""
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
    
    # Check availability
    availability = await check_availability(
        service_id=booking_data.service_id,
        service_type=booking_data.service_type,
        date=booking_data.date,
        time=booking_data.time
    )
    if not availability["available"]:
        raise HTTPException(
            status_code=400, 
            detail=f"No hay disponibilidad. {availability.get('reason', '')}"
        )
    
    # Generate 6-digit PIN for this booking
    import secrets
    verification_pin = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    booking = Booking(
        owner_id=current_user["id"],
        owner_name=current_user["name"],
        pet_name=pet["name"],
        service_name=service.get("name") if service else "Servicio",
        verification_pin=verification_pin,
        pin_generated_at=datetime.now(timezone.utc).isoformat(),
        **booking_data.model_dump()
    )
    await db.bookings.insert_one(booking.model_dump())
    
    return booking


@router.get("/", response_model=List[Booking])
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    """Get bookings for the current user"""
    if current_user["role"] == "owner":
        bookings = await db.bookings.find({"owner_id": current_user["id"]}, {"_id": 0}).to_list(100)
    elif current_user["role"] == "admin":
        bookings = await db.bookings.find({}, {"_id": 0}).to_list(100)
    else:
        profile_collection = "walkers" if current_user["role"] == "walker" else "daycares"
        # Vet fallback
        if current_user["role"] == "vet":
            profile_collection = "vets"
            
        profile = await db[profile_collection].find_one({"user_id": current_user["id"]}, {"_id": 0})
        if not profile:
            return []
        bookings = await db.bookings.find({"service_id": profile["id"]}, {"_id": 0}).to_list(100)
    return bookings


@router.get("/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific booking by ID"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return booking


@router.post("/{booking_id}/verify-pin")
async def verify_pin(booking_id: str, pin: str, current_user: dict = Depends(get_current_user)):
    """Verify start PIN for a booking"""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
    if booking["verification_pin"] == pin:
        await db.bookings.update_one(
            {"id": booking_id},
            {
                "$set": {
                    "pin_verified_at": datetime.now(timezone.utc).isoformat(),
                    "status": "in_progress",
                    "started_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return {"success": True, "message": "PIN verificado correctamente"}
    else:
        return {"success": False, "message": "PIN incorrecto"}


@router.patch("/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, current_user: dict = Depends(get_current_user)):
    """Update booking status"""
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


@router.post("/{booking_id}/start")
async def start_walk(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Start a walk (walker only)"""
    if current_user["role"] != "walker":
        raise HTTPException(status_code=403, detail="Solo paseadores")
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    started_at = datetime.now(timezone.utc).isoformat()
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "in_progress", "started_at": started_at}}
    )
    return {"message": "Paseo iniciado", "started_at": started_at}


@router.post("/{booking_id}/complete")
async def complete_walk(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Complete a walk (walker only)"""
    if current_user["role"] != "walker":
        raise HTTPException(status_code=403, detail="Solo paseadores")
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    completed_at = datetime.now(timezone.utc).isoformat()
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "completed", "completed_at": completed_at}}
    )
    return {"message": "Paseo completado", "completed_at": completed_at}


@router.post("/{booking_id}/payment")
async def process_payment(booking_id: str, payment_id: str, current_user: dict = Depends(get_current_user)):
    """Process payment for a booking"""
    booking = await db.bookings.find_one({"id": booking_id, "owner_id": current_user["id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"payment_status": "paid", "payment_id": payment_id, "status": "confirmed"}}
    )
    return {"message": "Pago procesado exitosamente"}
