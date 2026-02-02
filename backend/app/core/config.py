"""
Application Configuration - Environment Variables
"""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / '.env')

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'PetTrust')

# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'demo-secret-key-pettrust-bogota-2025')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# Cloudinary
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

# Email (Resend)
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
MAIL_FROM = os.environ.get('MAIL_FROM', 'onboarding@resend.dev')

# CORS
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://pettrust.vercel.app",
    "https://*.vercel.app",
]
