import sys
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "PetTrust")

async def cleanup():
    print(f"Connecting to Database: {DB_NAME}...")
    if not MONGO_URL:
        print("ERROR: MONGO_URL not found in .env")
        return

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # 1. Fetch Admins
    print("Fetching Admins...")
    admins = await db.users.find({"role": "admin"}).to_list(length=100)
    
    with open("admin_credentials.txt", "w", encoding="utf-8") as f:
        if not admins:
            print("WARNING: No admins found! Not deleting anything to be safe.")
            f.write("No admins found.\n")
            return
        else:
            print(f"Found {len(admins)} admins. Writing to admin_credentials.txt")
            f.write("=== CREDENCIALES DE ADMIN (Existentes) ===\n")
            for admin in admins:
                f.write(f"Email: {admin.get('email')}\n")
                f.write(f"Name: {admin.get('name')}\n")
                if "PetTrust2025" in str(admin.get('password', '')): 
                     f.write("Password Note: Seems to be the default 'PetTrust2025!'\n")
                else:
                     f.write("Password: (Hash protegido - use 'PetTrust2025!' si fue creado con script)\n")
                f.write("---\n")

    # 2. Delete non-admins
    print("\nDeleting non-admin users...")
    
    # Delete users
    result_users = await db.users.delete_many({"role": {"$ne": "admin"}})
    print(f"Deleted {result_users.deleted_count} users.")
    
    print("Cleanup complete.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(cleanup())
