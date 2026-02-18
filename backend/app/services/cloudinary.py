"""
Cloudinary Service - Image Uploads
"""
import cloudinary
import cloudinary.uploader
import cloudinary.api
import base64
import uuid
import logging
from typing import Any

from app.core.config import (
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET
)

# Configure Cloudinary
cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True
)

async def upload_image(data_or_file: Any, folder: str, user_id: str) -> str:
    """
    Upload image to Cloudinary.
    Accepts bytes, file-like object, or base64 string.
    """
    try:
        # If it's a base64 string
        if isinstance(data_or_file, str) and data_or_file.startswith("data:image"):
            # Extract base64 part
            header, encoded = data_or_file.split(",", 1)
            data_or_file = base64.b64decode(encoded)
        
        # Determine public_id
        public_id = f"{user_id}_{uuid.uuid4().hex[:8]}"
        
        # Run upload in a thread/executor implicitly by library or wrap if needed
        # Cloudinary python SDK is synchronous.
        # Ideally we should run this in an executor, but for now direct call:
        result = cloudinary.uploader.upload(
            data_or_file,
            folder=f"pettrust/{folder}",
            resource_type="image",
            public_id=public_id
        )
        return result["secure_url"]
    except Exception as e:
        logging.error(f"Cloudinary upload error: {e}")
        return None
