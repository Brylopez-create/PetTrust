import requests
import base64

base_url = "https://pettrust-production.up.railway.app"

# 1x1 pixel transparent GIF
MINIMAL_GIF_HEX = "47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b"
image_data = bytes.fromhex(MINIMAL_GIF_HEX)

def test_upload():
    url = f"{base_url}/api/uploads/image"
    files = {
        'file': ('test_pixel.gif', image_data, 'image/gif'),
        'folder': (None, 'general')
    }
    try:
        print(f"Testing POST to {url} with valid 1x1 GIF...")
        response = requests.post(url, files=files, timeout=10)
        print(f"Upload Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"SUCCESS: Upload allowed. URL: {response.json().get('url')}")
        else:
            print(f"FAILURE: Status {response.status_code}")
            # print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error testing upload: {e}")

if __name__ == "__main__":
    test_upload()
