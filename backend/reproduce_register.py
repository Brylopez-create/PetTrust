import requests
import uuid
import random

base_url = "https://pettrust-production.up.railway.app"

def test_register():
    url = f"{base_url}/api/auth/register"
    random_id = str(uuid.uuid4())[:8]
    email = f"final_check_{random_id}@example.com"
    
    payload = {
        "name": "Final Check User",
        "email": email,
        "password": "Password123!",
        "phone": "3001234567",
        "role": "walker"
    }
    
    print(f"Testing REGISTER to {url}...")
    try:
        response = requests.post(url, json=payload, timeout=15)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
             print(f"SUCCESS: {response.json().get('token') and 'Token Received'}")
        else:
             print(f"FAILURE: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_register()
