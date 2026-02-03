"""
Database Connection - MongoDB via Motor
"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import MONGO_URL, DB_NAME
import logging

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def setup_indices():
    """Ensure database indices are created on startup"""
    try:
        await db.users.create_index("id", unique=True)
        await db.walkers.create_index([("location", "2dsphere")])
        await db.daycares.create_index([("location", "2dsphere")])
        await db.vets.create_index([("location", "2dsphere")])
        logging.info("Database indices verified/created")
    except Exception as e:
        logging.error(f"Error creating indices: {e}")
