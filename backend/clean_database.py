import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL")

if not MONGO_URL:
    print("Error: MONGO_URL no encontrada en .env")
    exit(1)

async def clean_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.PetTrust
    
    print("🧹 Iniciando limpieza de base de datos...")
    print("=" * 50)
    
    # Preserve admin user
    admin_user = await db.users.find_one({"role": "admin"})
    admin_email = admin_user.get("email") if admin_user else None
    
    # Collections to clean completely
    collections_to_wipe = [
        "bookings",
        "pets",
        "walkers",
        "daycares",
        "vets",
        "manual_payments",
        "wompi_transactions",
        "conversations",
        "messages",
        "reviews",
        "wellness_reports",
        "photos",
        "notifications",
        "incidents",
        "emergency_contacts",
        "share_links",
        "verification_pins",
        "sos_alerts",
        "safety_checkins",
        "prospects",
        "service_requests"
    ]
    
    for collection_name in collections_to_wipe:
        result = await db[collection_name].delete_many({})
        print(f"✅ {collection_name}: {result.deleted_count} documentos eliminados")
    
    # Clean users but keep admin
    if admin_email:
        result = await db.users.delete_many({"email": {"$ne": admin_email}})
        print(f"✅ users: {result.deleted_count} usuarios eliminados (admin preservado)")
    else:
        result = await db.users.delete_many({})
        print(f"⚠️  users: {result.deleted_count} usuarios eliminados (NO SE ENCONTRÓ ADMIN)")
    
    print("=" * 50)
    print("✨ Limpieza completada. Base de datos lista para pruebas.")
    
    if admin_email:
        print(f"🔐 Usuario admin preservado: {admin_email}")

if __name__ == "__main__":
    asyncio.run(clean_database())
