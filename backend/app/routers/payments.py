"""
Payments Router - Manual Payment Submission and Admin Review
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
import asyncio
import logging

from app.core.database import db
from app.core.security import get_current_user
from app.models.models import ManualPayment, ManualPaymentCreate

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/register_manual")
async def register_manual_payment(
    payment_data: ManualPaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Register a manual payment (JSON body with pre-uploaded proof URL)"""
    booking = await db.bookings.find_one({
        "id": payment_data.booking_id,
        "owner_id": current_user["id"]
    }, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
    payment = ManualPayment(
        booking_id=payment_data.booking_id,
        user_id=current_user["id"],
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        proof_url=payment_data.proof_url
    )
    
    await db.manual_payments.insert_one(payment.model_dump())
    
    await db.bookings.update_one(
        {"id": payment_data.booking_id},
        {"$set": {"status": "awaiting_approval", "payment_status": "pending_approval"}}
    )
    
    return payment


# Note: /payments/submit endpoint requires upload_image_internal which is currently
# in server.py. It will be moved to a services module in a future refactor phase.
# For now, keeping it in server.py to avoid breaking the upload functionality.
