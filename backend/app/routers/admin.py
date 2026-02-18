"""
Admin Router - Dashboard, Stats, Verifications
"""
from fastapi import APIRouter, HTTPException, Depends
import os
import uuid
from datetime import datetime, timezone

from app.core.database import db
from app.core.security import get_current_user, hash_password
from app.models.models import Notification

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/seed")
async def seed_admin_user(secret_key: str):
    """Create initial admin user (protected by secret key)"""
    if secret_key != os.environ.get("SECRET_KEY", "demo-secret-key-pettrust-bogota-2025"):
        raise HTTPException(status_code=403, detail="Clave secreta inválida")
    
    existing = await db.users.find_one({"role": "admin"})
    if existing:
        return {"message": "Admin ya existe", "email": existing["email"]}
    
    admin_email = "admin@pettrust.co"
    admin_password = hash_password("PetTrust2025!")
    
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": admin_email,
        "name": "Administrador PetTrust",
        "role": "admin",
        "phone": "+573001234567",
        "password": admin_password,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_user)
    return {"message": "Admin creado exitosamente", "email": admin_email}


@router.get("/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    """Get admin dashboard statistics"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    return {
        "total_bookings": await db.bookings.count_documents({}),
        "total_walkers": await db.walkers.count_documents({}),
        "total_users": await db.users.count_documents({}),
        "completed_bookings": await db.bookings.count_documents({"status": "completed"}),
        "pending_incidents": await db.incidents.count_documents({"status": "open"}),
        "pending_prospects": await db.prospects.count_documents({"status": "pending"})
    }


@router.get("/pending-verifications")
async def get_pending_verifications(current_user: dict = Depends(get_current_user)):
    """Get all providers pending verification"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    walkers = await db.walkers.find({"verification_status": "pending"}).to_list(100)
    daycares = await db.daycares.find({"verification_status": "pending"}).to_list(100)
    
    for w in walkers: 
        w["type"] = "walker"
        w.pop("_id", None)
    for d in daycares: 
        d["type"] = "daycare"
        d.pop("_id", None)
        
    return walkers + daycares


@router.get("/payments/pending")
async def get_pending_payments(current_user: dict = Depends(get_current_user)):
    """Get all pending manual payments"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
        
    payments = await db.manual_payments.find({"status": "pending"}).sort("created_at", -1).to_list(100)
    
    enriched = []
    for p in payments:
        p.pop("_id", None)
        booking = await db.bookings.find_one({"id": p["booking_id"]}, {"_id": 0})
        if booking:
            p["booking_details"] = {
                "service_name": booking.get("service_name") or "Servicio",
                "date": booking.get("date"),
                "owner_name": booking.get("owner_name") or "Usuario",
                "service_type": booking.get("service_type"),
                "expected_amount": booking.get("price") or 0
            }
        enriched.append(p)
        
    return enriched


@router.patch("/payments/{payment_id}/review")
async def review_payment(
    payment_id: str, 
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject a manual payment"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    action = body.get("action")
    
    payment = await db.manual_payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
        
    if action == "approve":
        new_status = "approved"
        booking_status = "confirmed"
        payment_status = "paid"
    elif action == "reject":
        new_status = "rejected"
        booking_status = "payment_rejected"
        payment_status = "rejected"
    else:
        raise HTTPException(status_code=400, detail="Acción inválida")
    
    await db.manual_payments.update_one(
        {"id": payment_id},
        {"$set": {"status": new_status, "reviewed_by": current_user["id"], "reviewed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.bookings.update_one(
        {"id": payment["booking_id"]},
        {"$set": {"status": booking_status, "payment_status": payment_status}}
    )

    # 1. Notificar al Paseador (Walker/Provider)
    notification_provider = Notification(
        user_id=payment.get("provider_id") or booking.get("service_id"), # Intentar obtener ID del proveedor
        type="booking_confirmed",
        title="✨ ¡Reserva Confirmada y Pagada!",
        message=f"El pago para el servicio de {booking.get('owner_name') or 'un cliente'} ha sido aprobado. ¡Prepárate!",
        data={"booking_id": payment["booking_id"]}
    )
    # Buscamos el user_id del proveedor si no lo tenemos directo
    provider_id = booking.get("service_id")
    service_type = booking.get("service_type")
    
    collection_name = "walkers"
    if service_type == "daycare": collection_name = "daycares"
    elif service_type == "vet": collection_name = "vets"
    
    provider_doc = await db[collection_name].find_one({"id": provider_id})
    if provider_doc:
        notification_provider.user_id = provider_doc["user_id"]
        await db.notifications.insert_one(notification_provider.model_dump())

    # 2. Notificar al Dueño (Owner)
    notification_owner = Notification(
        user_id=booking.get("owner_id"),
        type="payment_approved",
        title="✅ Pago Aprobado",
        message=f"Tu pago de ${payment['amount']:,.0f} ha sido validado. ¡Tu reserva está confirmada!",
        data={"booking_id": payment["booking_id"]}
    )
    await db.notifications.insert_one(notification_owner.model_dump())
    
    return {"message": f"Pago {new_status} y notificaciones enviadas", "action": action}


@router.post("/seed/demo")
async def seed_demo_data():
    """Seed demo data for testing (Walkers and Daycares)"""
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
    
    # Check for admin
    admin_exists = await db.users.find_one({"email": "admin@pettrust.com"}, {"_id": 0})
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@pettrust.com",
            # Assuming hash_password is imported or we use fixed string for demo/test
            # Ideally verify imports. hash_password imported at top of file.
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
