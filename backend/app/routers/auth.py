"""
Authentication Router - Register, Login, Password Reset
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
import secrets
import asyncio
import logging

from app.core.database import db
from app.core.security import (
    hash_password, 
    verify_password, 
    create_access_token, 
    get_current_user
)
from app.models.models import (
    UserRegister,
    UserLogin,
    User,
    PasswordResetRequest,
    PasswordResetConfirm
)

# Import limiter and send_email from main server (will be refactored later)
# For now, we import from the parent to avoid circular imports
# These will be passed as dependencies or moved to services

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed_pw = hash_password(user_data.password)
    
    role = user_data.role
    phone = user_data.phone
    
    # Handle onboarding token for walker prospects
    if user_data.onboarding_token:
        prospect = await db.prospects.find_one({
            "verification_token": user_data.onboarding_token, 
            "status": "approved"
        })
        if prospect:
            role = "walker"
            phone = prospect.get("whatsapp", phone)
            await db.prospects.update_one(
                {"id": prospect["id"]}, 
                {"$set": {"status": "activated"}}
            )

    user = User(
        email=user_data.email,
        name=user_data.name,
        role=role,
        phone=phone
    )
    user_dict = user.model_dump()
    user_dict["password"] = hashed_pw
    
    await db.users.insert_one(user_dict)
    
    # Note: Email sending will be handled by a service module
    # For now, import send_email from server or create a service
    
    token = create_access_token({"sub": user.id, "role": user.role})
    return {"token": token, "user": user}


@router.post("/login")
async def login(credentials: UserLogin, request: Request):
    try:
        user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
        if not user or not verify_password(credentials.password, user["password"]):
            raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
        
        token = create_access_token({"sub": user["id"], "role": user["role"]})
        user.pop("password")
        return {"token": token, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logging.error(f"Login Error: {e}")
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"LOGIN ERROR: {str(e)}")


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.post("/request-password-reset")
async def request_password_reset(request_data: PasswordResetRequest):
    user = await db.users.find_one({"email": request_data.email})
    if not user:
        # Prevent user enumeration
        return {"message": "Si el correo existe, se enviará un enlace de recuperación."}
    
    reset_token = secrets.token_urlsafe(32)
    await db.password_resets.insert_one({
        "email": user["email"],
        "token": reset_token,
        "created_at": datetime.now(timezone.utc),
        "used": False
    })
    
    # Note: Email sending will be handled by a service module
    # reset_link = f"https://pettrust.vercel.app/reset-password?token={reset_token}"
    
    return {"message": "Si el correo existe, se enviará un enlace de recuperación."}


@router.post("/reset-password")
async def reset_password(data: PasswordResetConfirm):
    record = await db.password_resets.find_one({"token": data.token, "used": False})
    if not record:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
        
    created_at = record["created_at"].replace(tzinfo=timezone.utc)
    if (datetime.now(timezone.utc) - created_at).total_seconds() > 3600:
        raise HTTPException(status_code=400, detail="Token expirado")
        
    hashed_pw = hash_password(data.new_password)
    
    await db.users.update_one(
        {"email": record["email"]}, 
        {"$set": {"password": hashed_pw}}
    )
    
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Contraseña actualizada exitosamente"}
