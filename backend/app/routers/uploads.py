"""
Uploads Router - Image Upload Implementation
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
import logging

from app.core.security import get_current_user
from app.services.cloudinary import upload_image

router = APIRouter(prefix="/uploads", tags=["Uploads"])

@router.post("/image")
async def upload_image_endpoint(
    file: UploadFile = File(...),
    folder: str = Form("general"),
    current_user: dict = Depends(get_current_user)
):
    """Upload an image file to Cloudinary"""
    
    # Read file content
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Archivo vacío")
    
    # Upload
    url = await upload_image(content, folder, current_user["id"])
    
    if not url:
        raise HTTPException(status_code=500, detail="Error al subir la imagen a Cloudinary")
    
    return {"url": url, "folder": folder}
