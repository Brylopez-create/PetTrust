import requests
import time

base_url = "https://pettrust-production.up.railway.app"

def test_upload():
    url = f"{base_url}/api/uploads/image"
    files = {
        'file': ('test.txt', 'dummy content', 'text/plain'),
        'folder': (None, 'general')
    }
    try:
        print(f"Testing POST to {url} without auth...")
        response = requests.post(url, files=files, timeout=10)
        print(f"Upload Status Code: {response.status_code}")
        # print(f"Response: {response.text}")
        if response.status_code == 200:
            print("SUCCESS: Upload allowed without auth.")
        else:
            print("FAILURE: Upload blocked.")
    except Exception as e:
        print(f"Error testing upload: {e}")

def test_seed():
    # Helper to check if seed endpoint exists (even if 403 due to wrong key, it proves endpoint presence vs 404)
    # We use a dummy key
    url = f"{base_url}/api/admin/seed?secret_key=wrong"
    try:
        print(f"Testing POST to {url}...")
        response = requests.post(url, timeout=10)
        print(f"Seed Status Code: {response.status_code}")
        if response.status_code == 403: # Expected for wrong key
            print("SUCCESS: Seed endpoint exists (got 403 as expected for wrong key).")
        elif response.status_code == 404:
            print("FAILURE: Seed endpoint not found.")
        elif response.status_code == 200:
            print("WARNING: Seed endpoint public??")
    except Exception as e:
        print(f"Error testing seed: {e}")

if __name__ == "__main__":
    print("Waiting 10s for potential deployment...")
    # time.sleep(10) 
    test_upload()
    test_seed()
