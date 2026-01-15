import requests
import sys
import json
from datetime import datetime, timedelta

class PetTrustAPITester:
    def __init__(self, base_url="https://mascotaconfianza.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success and response.content:
                try:
                    response_data = response.json()
                    details += f", Response: {json.dumps(response_data, indent=2)[:200]}..."
                    self.log_test(name, True, details)
                    return True, response_data
                except:
                    self.log_test(name, True, details)
                    return True, {}
            elif not success:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Raw response: {response.text[:200]}"
                self.log_test(name, False, details)
                return False, {}
            else:
                self.log_test(name, True, details)
                return True, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "testpass123",
            "role": "owner",
            "phone": "+57300123456"
        }
        
        success, response = self.run_test("User Registration", "POST", "auth/register", 200, user_data)
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # Try to login with the registered user
        if not hasattr(self, '_test_email'):
            return False
            
        login_data = {
            "email": self._test_email,
            "password": "testpass123"
        }
        
        success, response = self.run_test("User Login", "POST", "auth/login", 200, login_data)
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.token:
            self.log_test("Get Current User", False, "No token available")
            return False
        
        return self.run_test("Get Current User", "GET", "auth/me", 200)[0]

    def test_get_walkers(self):
        """Test getting walkers list"""
        return self.run_test("Get Walkers", "GET", "walkers", 200)[0]

    def test_get_walkers_with_location_filter(self):
        """Test getting walkers with location filter"""
        return self.run_test("Get Walkers (Filtered)", "GET", "walkers?location=Usaquén", 200)[0]

    def test_get_daycares(self):
        """Test getting daycares list"""
        return self.run_test("Get Daycares", "GET", "daycares", 200)[0]

    def test_get_daycares_with_location_filter(self):
        """Test getting daycares with location filter"""
        return self.run_test("Get Daycares (Filtered)", "GET", "daycares?location=La Calera", 200)[0]

    def test_create_pet(self):
        """Test creating a pet"""
        if not self.token:
            self.log_test("Create Pet", False, "No token available")
            return False
            
        pet_data = {
            "name": "Buddy Test",
            "breed": "Golden Retriever",
            "age": 3,
            "weight": 25.5,
            "special_needs": "Needs medication"
        }
        
        success, response = self.run_test("Create Pet", "POST", "pets", 200, pet_data)
        if success and 'id' in response:
            self.pet_id = response['id']
            return True
        return False

    def test_get_my_pets(self):
        """Test getting user's pets"""
        if not self.token:
            self.log_test("Get My Pets", False, "No token available")
            return False
            
        return self.run_test("Get My Pets", "GET", "pets", 200)[0]

    def test_create_booking(self):
        """Test creating a booking"""
        if not self.token or not hasattr(self, 'pet_id'):
            self.log_test("Create Booking", False, "No token or pet_id available")
            return False
            
        # First get a walker to book
        success, walkers = self.run_test("Get Walkers for Booking", "GET", "walkers", 200)
        if not success or not walkers:
            self.log_test("Create Booking", False, "No walkers available")
            return False
            
        walker_id = walkers[0]['id']
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        booking_data = {
            "pet_id": self.pet_id,
            "service_type": "walker",
            "service_id": walker_id,
            "date": tomorrow,
            "time": "09:00",
            "price": 25000
        }
        
        success, response = self.run_test("Create Booking", "POST", "bookings", 200, booking_data)
        if success and 'id' in response:
            self.booking_id = response['id']
            return True
        return False

    def test_get_my_bookings(self):
        """Test getting user's bookings"""
        if not self.token:
            self.log_test("Get My Bookings", False, "No token available")
            return False
            
        return self.run_test("Get My Bookings", "GET", "bookings", 200)[0]

    def test_process_payment(self):
        """Test processing payment for booking"""
        if not self.token or not hasattr(self, 'booking_id'):
            self.log_test("Process Payment", False, "No token or booking_id available")
            return False
            
        payment_id = f"demo_payment_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        return self.run_test("Process Payment", "POST", f"bookings/{self.booking_id}/payment?payment_id={payment_id}", 200)[0]

    def test_get_specific_walker(self):
        """Test getting specific walker details"""
        # First get a walker ID
        success, walkers = self.run_test("Get Walkers for Detail", "GET", "walkers", 200)
        if not success or not walkers:
            self.log_test("Get Specific Walker", False, "No walkers available")
            return False
            
        walker_id = walkers[0]['id']
        return self.run_test("Get Specific Walker", "GET", f"walkers/{walker_id}", 200)[0]

    def test_get_specific_daycare(self):
        """Test getting specific daycare details"""
        # First get a daycare ID
        success, daycares = self.run_test("Get Daycares for Detail", "GET", "daycares", 200)
        if not success or not daycares:
            self.log_test("Get Specific Daycare", False, "No daycares available")
            return False
            
        daycare_id = daycares[0]['id']
        return self.run_test("Get Specific Daycare", "GET", f"daycares/{daycare_id}", 200)[0]

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting PetTrust API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Basic API tests
        self.test_root_endpoint()
        
        # Authentication tests
        if self.test_user_registration():
            self.test_get_current_user()
        
        # Service discovery tests
        self.test_get_walkers()
        self.test_get_walkers_with_location_filter()
        self.test_get_daycares()
        self.test_get_daycares_with_location_filter()
        self.test_get_specific_walker()
        self.test_get_specific_daycare()
        
        # Pet management tests (requires auth)
        if self.token:
            if self.test_create_pet():
                self.test_get_my_pets()
                
                # Booking tests (requires pet)
                if self.test_create_booking():
                    self.test_get_my_bookings()
                    self.test_process_payment()

        # Print results
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = PetTrustAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())