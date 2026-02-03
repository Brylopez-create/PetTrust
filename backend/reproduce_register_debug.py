import requests
import uuid
import time

base_url = "https://pettrust-production.up.railway.app"

def test_register_debug():
    url = f"{base_url}/api/auth/register"
    random_id = str(uuid.uuid4())[:8]
    email = f"debug_{random_id}@example.com"
    
    payload = {
        "name": "Debug User",
        "email": email,
        "password": "Password123!",
        "phone": "3001234567",
        "role": "walker"
    }
    
    print(f"Testing REGISTER to {url}...")
    try:
        response = requests.post(url, json=payload, timeout=15)
        print(f"Status Code: {response.status_code}")
        with open("debug_output.txt", "w") as f:
            f.write(response.text)
        print("Output saved to debug_output.txt")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Waiting 15s for deployment propogation...")
    time.sleep(15) 
    test_register_debug()
