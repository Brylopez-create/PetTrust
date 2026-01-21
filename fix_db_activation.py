import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv

load_dotenv('./backend/.env')

async def fix():
    client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client[os.getenv('DB_NAME')]
    
    collections = ['walkers', 'daycares', 'vets']
    for coll in collections:
        res = await db[coll].update_many({}, {'$set': {'is_active': True}})
        print(f"Updated {res.modified_count} in {coll}")
    
    print('DB Fix completed')

if __name__ == "__main__":
    asyncio.run(fix())
