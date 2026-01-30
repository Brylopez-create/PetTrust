import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

async def make_admin(email):
    if not MONGO_URL:
        print("Error: MONGO_URL not found in .env")
        return

    client = AsyncIOMotorClient(MONGO_URL)
    db_name = os.getenv("DB_NAME", "PetTrust")
    db = client[db_name]

    user = await db.users.find_one({"email": email})
    
    if not user:
        print(f"❌ Usuario con email '{email}' no encontrado.")
        return

    if user.get("role") == "admin":
        print(f"⚠️ El usuario '{email}' ya es Administrador.")
        return

    result = await db.users.update_one(
        {"email": email},
        {"$set": {"role": "admin"}}
    )

    if result.modified_count > 0:
        print(f"✅ ÉXITO: Usuario '{email}' ahora es ADMINISTRADOR.")
    else:
        print("❌ Error al actualizar el rol.")

if __name__ == "__main__":
    email = input("Ingresa el email del usuario a convertir en admin: ")
    asyncio.run(make_admin(email.strip()))
