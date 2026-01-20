import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URI = os.environ.get('MONGO_URL') or os.environ.get('MONGO_URI')
if not MONGO_URI:
    print("MONGO_URL not found in environment variables")
    # For safety, fallback to localhost if dev
    # MONGO_URI = "mongodb://localhost:27017" 
    exit(1)

client = AsyncIOMotorClient(MONGO_URI)
db = client.pettrust_bogota

async def create_indices():
    print("Creating indices...")
    
    # Users
    print("Indexing users...")
    await db.users.create_index("email", unique=True)
    
    # Walkers
    print("Indexing walkers...")
    await db.walkers.create_index([("location", "2dsphere")])
    await db.walkers.create_index("user_id", unique=True)
    await db.walkers.create_index("is_active")
    
    # Daycares
    print("Indexing daycares...")
    await db.daycares.create_index([("location", "2dsphere")])
    await db.daycares.create_index("user_id", unique=True)
    
    # Vets
    print("Indexing vets...")
    await db.vets.create_index([("location", "2dsphere")])
    await db.vets.create_index("user_id", unique=True)
    
    # Bookings
    print("Indexing bookings...")
    await db.bookings.create_index("owner_id")
    await db.bookings.create_index("service_id")
    await db.bookings.create_index("status")
    
    # Service Requests
    print("Indexing service_requests...")
    await db.service_requests.create_index([("owner_location", "2dsphere")])
    
    print("Indices created successfully!")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(create_indices())
