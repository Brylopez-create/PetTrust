"""
PetTrust Bogotá API Tests
Tests for: Authentication, Pets, Bookings, Walkers, Daycares, Service Requests, Payments, Safety Center
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pettrust-bogota.preview.emergentagent.com')

# Test credentials
TEST_OWNER = {"email": "testowner@demo.com", "password": "test123"}
TEST_WALKER = {"email": "testwalker@demo.com", "password": "test123"}
ADMIN = {"email": "admin@pettrust.com", "password": "admin123"}


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_owner_success(self):
        """Test owner login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_OWNER)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_OWNER["email"]
        assert data["user"]["role"] == "owner"
    
    def test_login_walker_success(self):
        """Test walker login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_WALKER)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_WALKER["email"]
        assert data["user"]["role"] == "walker"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
    
    def test_register_new_user(self):
        """Test user registration"""
        unique_email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test User",
            "role": "owner"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == unique_email
    
    def test_register_duplicate_email(self):
        """Test registration with existing email"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_OWNER["email"],
            "password": "testpass123",
            "name": "Duplicate User",
            "role": "owner"
        })
        assert response.status_code == 400
    
    def test_get_current_user(self):
        """Test getting current user info"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_OWNER)
        token = login_response.json()["token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_OWNER["email"]


class TestWalkers:
    """Walker endpoints tests"""
    
    def test_get_all_walkers(self):
        """Test getting all walkers"""
        response = requests.get(f"{BASE_URL}/api/walkers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # Demo data has 3 walkers
    
    def test_get_walker_by_id(self):
        """Test getting a specific walker"""
        # First get all walkers
        walkers_response = requests.get(f"{BASE_URL}/api/walkers")
        walkers = walkers_response.json()
        
        if walkers:
            walker_id = walkers[0]["id"]
            response = requests.get(f"{BASE_URL}/api/walkers/{walker_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == walker_id
            assert "name" in data
            assert "price_per_walk" in data
    
    def test_get_walkers_by_location(self):
        """Test filtering walkers by location"""
        response = requests.get(f"{BASE_URL}/api/walkers?location=Usaquén")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestDaycares:
    """Daycare endpoints tests"""
    
    def test_get_all_daycares(self):
        """Test getting all daycares"""
        response = requests.get(f"{BASE_URL}/api/daycares")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # Demo data has 2 daycares
    
    def test_get_daycare_by_id(self):
        """Test getting a specific daycare"""
        daycares_response = requests.get(f"{BASE_URL}/api/daycares")
        daycares = daycares_response.json()
        
        if daycares:
            daycare_id = daycares[0]["id"]
            response = requests.get(f"{BASE_URL}/api/daycares/{daycare_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == daycare_id
            assert "name" in data
            assert "price_per_day" in data


class TestPets:
    """Pet CRUD tests"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_OWNER)
        return response.json()["token"]
    
    def test_get_my_pets(self, owner_token):
        """Test getting owner's pets"""
        response = requests.get(
            f"{BASE_URL}/api/pets",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_pet(self, owner_token):
        """Test creating a new pet"""
        pet_data = {
            "name": f"TEST_Pet_{uuid.uuid4().hex[:6]}",
            "breed": "Golden Retriever",
            "age": 3,
            "weight": 25.5,
            "special_needs": "Ninguna"
        }
        response = requests.post(
            f"{BASE_URL}/api/pets",
            json=pet_data,
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == pet_data["name"]
        assert data["breed"] == pet_data["breed"]
        assert "id" in data


class TestBookings:
    """Booking CRUD tests"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_OWNER)
        return response.json()["token"]
    
    @pytest.fixture
    def walker_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_WALKER)
        return response.json()["token"]
    
    def test_get_my_bookings(self, owner_token):
        """Test getting owner's bookings"""
        response = requests.get(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_booking(self, owner_token):
        """Test creating a new booking"""
        # Get pets first
        pets_response = requests.get(
            f"{BASE_URL}/api/pets",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        pets = pets_response.json()
        
        # Get walkers
        walkers_response = requests.get(f"{BASE_URL}/api/walkers")
        walkers = walkers_response.json()
        
        if pets and walkers:
            booking_data = {
                "pet_id": pets[0]["id"],
                "service_type": "walker",
                "service_id": walkers[0]["id"],
                "date": "2026-01-20",
                "time": "10:00",
                "price": walkers[0]["price_per_walk"]
            }
            response = requests.post(
                f"{BASE_URL}/api/bookings",
                json=booking_data,
                headers={"Authorization": f"Bearer {owner_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["pet_id"] == booking_data["pet_id"]
            assert data["service_id"] == booking_data["service_id"]
            assert "id" in data


class TestProviderSearch:
    """Provider search and availability tests"""
    
    def test_search_walkers(self):
        """Test searching for available walkers"""
        response = requests.get(
            f"{BASE_URL}/api/providers/search",
            params={
                "service_type": "walker",
                "date": "2026-01-20",
                "time": "10:00"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_search_daycares(self):
        """Test searching for available daycares"""
        response = requests.get(
            f"{BASE_URL}/api/providers/search",
            params={
                "service_type": "daycare",
                "date": "2026-01-20"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_check_availability(self):
        """Test checking provider availability"""
        # Get a walker first
        walkers_response = requests.get(f"{BASE_URL}/api/walkers")
        walkers = walkers_response.json()
        
        if walkers:
            response = requests.get(
                f"{BASE_URL}/api/availability/check",
                params={
                    "service_id": walkers[0]["id"],
                    "service_type": "walker",
                    "date": "2026-01-20",
                    "time": "10:00"
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert "available" in data
            assert "capacity_remaining" in data


class TestServiceRequests:
    """Service request and matching tests"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_OWNER)
        return response.json()["token"]
    
    def test_create_service_request(self, owner_token):
        """Test creating a service request with automatic matching"""
        # Get pets first
        pets_response = requests.get(
            f"{BASE_URL}/api/pets",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        pets = pets_response.json()
        
        if pets:
            request_data = {
                "pet_id": pets[0]["id"],
                "service_type": "walker",
                "date": "2026-01-21",
                "time": "11:00",
                "requires_pickup": False
            }
            response = requests.post(
                f"{BASE_URL}/api/service-requests",
                json=request_data,
                headers={"Authorization": f"Bearer {owner_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            # API returns request_id instead of id
            assert "request_id" in data
            assert "matched_providers_count" in data
            assert data["status"] == "pending"


class TestProviderInbox:
    """Provider inbox and response tests"""
    
    @pytest.fixture
    def walker_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_WALKER)
        return response.json()["token"]
    
    def test_get_provider_profile(self, walker_token):
        """Test getting provider profile"""
        response = requests.get(
            f"{BASE_URL}/api/providers/me/profile",
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
    
    def test_get_provider_inbox(self, walker_token):
        """Test getting provider inbox"""
        response = requests.get(
            f"{BASE_URL}/api/providers/me/inbox",
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_provider_status(self, walker_token):
        """Test updating provider active status"""
        # First set to False, then True to ensure a change happens
        response1 = requests.patch(
            f"{BASE_URL}/api/providers/me/status",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        # May return 200 or 404 if already False
        
        response = requests.patch(
            f"{BASE_URL}/api/providers/me/status",
            json={"is_active": True},
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data or "updates" in data
    
    def test_get_provider_schedule(self, walker_token):
        """Test getting provider schedule"""
        response = requests.get(
            f"{BASE_URL}/api/providers/me/schedule",
            params={"date": "2026-01-17"},
            headers={"Authorization": f"Bearer {walker_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "bookings" in data


class TestWompiPayments:
    """Wompi payment mock tests"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_OWNER)
        return response.json()["token"]
    
    def test_create_wompi_transaction(self, owner_token):
        """Test creating a Wompi payment transaction (MOCKED)"""
        # Get bookings first
        bookings_response = requests.get(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        bookings = bookings_response.json()
        
        if bookings:
            payment_data = {
                "booking_id": bookings[0]["id"],
                "amount": 25000,
                "currency": "COP",
                "customer_email": TEST_OWNER["email"],
                "payment_method": "CARD"
            }
            response = requests.post(
                f"{BASE_URL}/api/payments/wompi/create",
                json=payment_data,
                headers={"Authorization": f"Bearer {owner_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "id" in data
            assert "wompi_id" in data
            assert data["status"] == "PENDING"
    
    def test_confirm_wompi_transaction(self, owner_token):
        """Test confirming a Wompi payment (MOCKED)"""
        # Get bookings first
        bookings_response = requests.get(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        bookings = bookings_response.json()
        
        if bookings:
            # Create transaction first
            payment_data = {
                "booking_id": bookings[0]["id"],
                "amount": 25000,
                "currency": "COP",
                "customer_email": TEST_OWNER["email"],
                "payment_method": "CARD"
            }
            create_response = requests.post(
                f"{BASE_URL}/api/payments/wompi/create",
                json=payment_data,
                headers={"Authorization": f"Bearer {owner_token}"}
            )
            
            if create_response.status_code == 200:
                transaction_id = create_response.json()["id"]
                
                # Confirm transaction
                confirm_response = requests.post(
                    f"{BASE_URL}/api/payments/wompi/confirm/{transaction_id}",
                    headers={"Authorization": f"Bearer {owner_token}"}
                )
                assert confirm_response.status_code == 200
                data = confirm_response.json()
                assert data["status"] == "APPROVED"


class TestSafetyCenter:
    """Safety center tests - SOS, PIN, Emergency Contacts"""
    
    @pytest.fixture
    def owner_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_OWNER)
        return response.json()["token"]
    
    def test_add_emergency_contact(self, owner_token):
        """Test adding emergency contact"""
        contact_data = {
            "name": f"TEST_Contact_{uuid.uuid4().hex[:6]}",
            "phone": "+57 300 123 4567",
            "relationship": "Hermano"
        }
        response = requests.post(
            f"{BASE_URL}/api/emergency-contacts",
            json=contact_data,
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == contact_data["name"]
        assert "id" in data
    
    def test_get_emergency_contacts(self, owner_token):
        """Test getting emergency contacts"""
        response = requests.get(
            f"{BASE_URL}/api/emergency-contacts",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_generate_verification_pin(self, owner_token):
        """Test generating verification PIN"""
        # Get bookings first
        bookings_response = requests.get(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        bookings = bookings_response.json()
        
        if bookings:
            response = requests.post(
                f"{BASE_URL}/api/bookings/{bookings[0]['id']}/generate-pin",
                headers={"Authorization": f"Bearer {owner_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "pin_code" in data
            assert len(data["pin_code"]) == 4
    
    def test_get_safety_status(self, owner_token):
        """Test getting safety status for a booking"""
        bookings_response = requests.get(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        bookings = bookings_response.json()
        
        if bookings:
            response = requests.get(
                f"{BASE_URL}/api/bookings/{bookings[0]['id']}/safety-status",
                headers={"Authorization": f"Bearer {owner_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "safety_score" in data
            assert "pin_verified" in data
    
    def test_share_trip_link(self, owner_token):
        """Test creating share trip link"""
        bookings_response = requests.get(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {owner_token}"}
        )
        bookings = bookings_response.json()
        
        if bookings:
            response = requests.post(
                f"{BASE_URL}/api/bookings/{bookings[0]['id']}/share-trip",
                headers={"Authorization": f"Bearer {owner_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "share_code" in data
            assert "share_url" in data


class TestReviews:
    """Review tests"""
    
    def test_get_reviews_for_service(self):
        """Test getting reviews for a service"""
        walkers_response = requests.get(f"{BASE_URL}/api/walkers")
        walkers = walkers_response.json()
        
        if walkers:
            response = requests.get(
                f"{BASE_URL}/api/reviews/walker/{walkers[0]['id']}"
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
