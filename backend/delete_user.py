import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL")

if not MONGO_URL:
    print("Error: MONGO_URL no encontrada en .env")
    exit(1)

async def delete_user(email):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.PetTrust
    
    # Check if user exists
    user = await db.users.find_one({"email": email})
    
    if not user:
        print(f"❌ Usuario con email '{email}' no encontrado.")
        return

    # Delete user
    result = await db.users.delete_one({"email": email})
    
    if result.deleted_count > 0:
        print(f"✅ Usuario '{email}' eliminado correctamente.")
    else:
        print(f"⚠️ No se pudo eliminar el usuario '{email}'.")

if __name__ == "__main__":
    email_to_delete = "brylop71@gmail.com"
    asyncio.run(delete_user(email_to_delete))
