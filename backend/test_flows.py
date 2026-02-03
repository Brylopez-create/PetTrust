import requests
import uuid
import time
import json

# BASE_URL = "http://localhost:8001"
BASE_URL = "https://pettrust-production.up.railway.app"
API_URL = f"{BASE_URL}/api"

HEADERS = {}

def log(msg, type="INFO"):
    print(f"[{type}] {msg}")

def test_auth_flow():
    log("=== TESTING AUTH FLOW ===")
    
    # 1. Register Owner
    email = f"owner_{uuid.uuid4().hex[:6]}@test.com"
    password = "TestPassword123!"
    payload = {
        "name": "Test Owner",
        "email": email,
        "password": password,
        "role": "owner",
        "phone": "3001234567"
    }
    
    try:
        res = requests.post(f"{API_URL}/auth/register", json=payload)
        if res.status_code == 200:
            log(f"Register Owner Success: {email}", "SUCCESS")
            token = res.json()["token"]
            owner_id = res.json()["user"]["id"]
            return token, owner_id
        else:
            log(f"Register Failed: {res.text}", "ERROR")
            return None, None
    except Exception as e:
        log(f"Register Exception: {e}", "ERROR")
        return None, None

def test_provider_flow():
    log("=== TESTING PROVIDER FLOW ===")
    
    # 1. Register Walker
    email = f"walker_{uuid.uuid4().hex[:6]}@test.com"
    password = "TestPassword123!"
    payload = {
        "name": "Test Walker",
        "email": email,
        "password": password,
        "role": "walker",
        "phone": "3007654321"
    }
    
    token = None
    try:
        res = requests.post(f"{API_URL}/auth/register", json=payload)
        if res.status_code == 200:
            log(f"Register Walker Success: {email}", "SUCCESS")
            token = res.json()["token"]
        else:
            log(f"Register Walker Failed: {res.text}", "ERROR")
            return None
    except Exception as e:
        log(f"Exception: {e}", "ERROR")
        return None

    # 2. Create Walker Profile
    headers = {"Authorization": f"Bearer {token}"}
    profile_payload = {
        "bio": "I love dogs and walking them.",
        "experience_years": 3,
        "price_per_walk": 20000,
        "location_name": "Chapinero, Bogota",
        "latitude": 4.64,
        "longitude": -74.06,
        "certifications": []
    }
    
    try:
        res = requests.post(f"{API_URL}/walkers", json=profile_payload, headers=headers)
        if res.status_code == 200:
            log("Create Walker Profile Success", "SUCCESS")
            return token
        else:
            log(f"Create Profile Failed: {res.text}", "ERROR")
            return None
    except Exception as e:
        log(f"Exception: {e}", "ERROR")
        return None

def test_pet_flow(owner_token):
    log("=== TESTING PET FLOW ===")
    headers = {"Authorization": f"Bearer {owner_token}"}
    
    payload = {
        "name": "Firulais",
        "breed": "Golden Retriever",
        "age": 3,
        "weight": 25.5,
        "special_needs": "None"
    }
    
    try:
        res = requests.post(f"{API_URL}/pets", json=payload, headers=headers)
        if res.status_code == 200:
            pet_id = res.json()["id"]
            log(f"Create Pet Success: {pet_id}", "SUCCESS")
            return pet_id
        else:
            log(f"Create Pet Failed: {res.text}", "ERROR")
            return None
    except Exception as e:
        log(f"Exception: {e}", "ERROR")
        return None

def test_booking_flow(owner_token, pet_id, walker_token):
    # This is complex because we need a walker ID first. 
    # For simplicity, we'll search for walkers first.
    log("=== TESTING BOOKING FLOW ===")
    headers = {"Authorization": f"Bearer {owner_token}"}
    
    # 1. Search Walkers
    walker_id = None
    try:
        # Correct endpoint: /api/providers/search?service_type=walker
        search_url = f"{API_URL}/providers/search?service_type=walker&date=2025-02-01&lat=4.64&lng=-74.06"
        res = requests.get(search_url)
        if res.status_code == 200:
            walkers = res.json()
            if len(walkers) > 0:
                walker_id = walkers[0]["id"]
                log(f"Found Walker: {walker_id}", "SUCCESS")
            else:
                log("No walkers found in search", "WARNING")
        else:
            log(f"Search Failed: {res.status_code} - {res.text}", "ERROR")
    except Exception as e:
        log(f"Exception: {e}", "ERROR")
    
    if not walker_id:
        return

    # 2. Create Booking
    payload = {
        "pet_id": pet_id,
        "service_type": "walker",
        "service_id": walker_id,
        "date": "2025-02-01",
        "time": "10:00",
        "price": 25000
    }
    
    booking_id = None
    try:
        res = requests.post(f"{API_URL}/bookings", json=payload, headers=headers)
        if res.status_code == 200:
            booking_id = res.json()["id"]
            log(f"Booking Created: {booking_id}", "SUCCESS")
        else:
            log(f"Booking Failed: {res.text}", "ERROR")
            return
    except Exception as e:
        log(f"Exception: {e}", "ERROR")
        return

    # 3. Simulate Payment (Manual)
    payment_payload = {
         "booking_id": booking_id,
         "amount": 25000,
         "payment_method": "nequi",
         "proof_url": "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    }
    
    try:
        res = requests.post(f"{API_URL}/payments/manual", json=payment_payload, headers=headers)
        if res.status_code == 200:
            log("Payment Proof Uploaded", "SUCCESS")
        else:
            log(f"Payment Upload Failed: {res.status_code} - {res.text}", "ERROR")
    except Exception as e:
         log(f"Exception: {e}", "ERROR")

if __name__ == "__main__":
    owner_token, owner_id = test_auth_flow()
    walker_token = test_provider_flow()
    
    if owner_token:
        pet_id = test_pet_flow(owner_token)
        if pet_id and walker_token:
            test_booking_flow(owner_token, pet_id, walker_token)
