import requests
import uuid

base_url = "https://pettrust-production.up.railway.app/api"

def register_final_admin():
    # Use a fixed email that is easy to remember but likely unique due to previous failures
    email = "admin_access@pettrust.co" 
    password = "PetTrust2025!"
    
    payload = {
        "name": "Super Admin",
        "email": email,
        "password": password,
        "phone": "3000000000",
        "role": "admin"
    }
    
    print(f"Creating Admin: {email}")
    try:
        res = requests.post(f"{base_url}/auth/register", json=payload)
        if res.status_code == 200:
            print("SUCCESS")
        elif res.status_code == 400 and "ya está registrado" in res.text:
             print("SUCCESS (Already Exists)")
        else:
            print(f"FAILED: {res.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    register_final_admin()
