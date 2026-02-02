"""
Wellness Router - Pet wellness reports and GPS tracking
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from app.core.database import db
from app.core.security import get_current_user
from app.models.models import WellnessReport, WellnessReportCreate, TrackingUpdate

router = APIRouter(prefix="/wellness", tags=["Wellness"])


@router.post("/", response_model=WellnessReport)
async def create_wellness_report(report_data: WellnessReportCreate, current_user: dict = Depends(get_current_user)):
    """Create a wellness report for a walk"""
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


@router.get("/{booking_id}", response_model=WellnessReport)
async def get_wellness_report(booking_id: str):
    """Get wellness report for a booking"""
    report = await db.wellness_reports.find_one({"booking_id": booking_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return report


@router.post("/tracking")
async def update_tracking(tracking_data: TrackingUpdate, current_user: dict = Depends(get_current_user)):
    """Update GPS tracking for a walk"""
    if current_user["role"] != "walker":
        raise HTTPException(status_code=403, detail="Solo paseadores pueden actualizar tracking")
    
    tracking_entry = {
        "booking_id": tracking_data.booking_id,
        "latitude": tracking_data.latitude,
        "longitude": tracking_data.longitude,
        "timestamp": tracking_data.timestamp or datetime.now(timezone.utc).isoformat(),
        "walker_id": current_user["id"]
    }
    
    await db.tracking.insert_one(tracking_entry)
    
    # Update booking with current location
    await db.bookings.update_one(
        {"id": tracking_data.booking_id},
        {"$set": {
            "walker_current_location": {
                "lat": tracking_data.latitude,
                "lng": tracking_data.longitude
            }
        }}
    )
    
    return {"message": "Ubicación actualizada"}


@router.get("/tracking/{booking_id}")
async def get_tracking(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Get tracking history for a booking"""
    tracking = await db.tracking.find({"booking_id": booking_id}, {"_id": 0}).sort("timestamp", 1).to_list(1000)
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    current_location = booking.get("walker_current_location") if booking else None
    
    return {
        "history": tracking,
        "current_location": current_location
    }
