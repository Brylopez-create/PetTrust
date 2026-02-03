import requests
import uuid

base_url = "https://pettrust-production.up.railway.app/api"

def register_new_admin():
    email = f"admin_{uuid.uuid4().hex[:4]}@pettrust.co"
    password = "PetTrust2025!"
    
    payload = {
        "name": "Admin Recovery",
        "email": email,
        "password": password,
        "phone": "3000000000",
        "role": "admin"  # Trying to force admin role
    }
    
    print(f"Registering new admin: {email}")
    try:
        res = requests.post(f"{base_url}/auth/register", json=payload)
        if res.status_code == 200:
            print("SUCCESS! Admin Registered.")
            print(f"Token: {res.json()['token']}")
            print(f"User: {res.json()['user']}")
        else:
            print(f"FAILED: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    register_new_admin()
