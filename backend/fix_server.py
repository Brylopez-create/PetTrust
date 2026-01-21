import os
import uvicorn
from fastapi import FastAPI, APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
import uuid

# ... (I'll use a script to fix it properly instead of writing 3k lines)
