import requests

urls = [
    "https://pettrust-production.up.railway.app/api/uploads/image",
    "http://localhost:8001/api/uploads/image"
]

files = {
    'file': ('test.txt', 'dummy content', 'text/plain'),
    'folder': (None, 'general')
}

for url in urls:
    try:
        print(f"Testing POST to {url} without auth...")
        response = requests.post(url, files=files, timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error testing {url}: {e}")
