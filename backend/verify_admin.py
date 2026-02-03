import requests

base_url = "https://pettrust-production.up.railway.app/api"
secret_key = "demo-secret-key-pettrust-bogota-2025"

def setup_admin():
    # 1. Try to seed (create) admin
    print("Attempting to seed admin...")
    try:
        res = requests.post(f"{base_url}/admin/seed?secret_key={secret_key}")
        print(f"Seed Status: {res.status_code}")
        print(f"Seed Response: {res.json()}")
    except Exception as e:
        print(f"Seed Error: {e}")

    # 2. Try to login
    print("\nVerifying Admin Login...")
    payload = {
        "email": "admin@pettrust.co",
        "password": "PetTrust2025!"
    }
    try:
        res = requests.post(f"{base_url}/auth/login", json=payload)
        if res.status_code == 200:
            print("Login SUCCESS!")
            print(f"Token: {res.json().get('token')[:20]}...")
        else:
            print(f"Login FAILED: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Login Error: {e}")

if __name__ == "__main__":
    setup_admin()
