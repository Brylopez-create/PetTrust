# PetTrust Bogotá - API Documentation for Mobile App

## Base URL
```
https://pettrust-bogota.preview.emergentagent.com/api
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 1. AUTHENTICATION ENDPOINTS

### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "usuario@email.com",
  "password": "password123",
  "name": "Nombre Completo",
  "role": "owner",  // "owner" | "walker" | "daycare"
  "phone": "+57 300 123 4567"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-string",
    "email": "usuario@email.com",
    "name": "Nombre Completo",
    "role": "owner",
    "phone": "+57 300 123 4567",
    "created_at": "2025-01-17T05:33:13.603899+00:00"
  }
}
```

**Errors:**
- 400: "El email ya está registrado"

---

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "usuario@email.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-string",
    "email": "usuario@email.com",
    "name": "Nombre Completo",
    "role": "owner",
    "phone": "+57 300 123 4567",
    "created_at": "2025-01-17T05:33:13.603899+00:00"
  }
}
```

**Errors:**
- 401: "Email o contraseña incorrectos"

---

### GET /auth/me
Get current authenticated user. **Requires Auth.**

**Response (200):**
```json
{
  "id": "uuid-string",
  "email": "usuario@email.com",
  "name": "Nombre Completo",
  "role": "owner",
  "phone": "+57 300 123 4567",
  "created_at": "2025-01-17T05:33:13.603899+00:00"
}
```

---

## 2. WALKERS (Paseadores)

### GET /walkers
Get all walkers. Public endpoint.

**Query Parameters:**
- `location` (optional): Filter by location (e.g., "Chapinero")
- `verified_only` (optional): boolean, only verified walkers

**Response (200):**
```json
[
  {
    "id": "walker-uuid",
    "user_id": "user-uuid",
    "name": "Carlos Mendoza",
    "bio": "Paseador profesional con 5 años de experiencia...",
    "experience_years": 5,
    "certifications": ["Primeros Auxilios Caninos", "Comportamiento Animal"],
    "profile_image": "https://url-to-image.jpg",
    "gallery_images": ["url1", "url2"],
    "location": "Chapinero, Bogotá",
    "verified": true,
    "insured": true,
    "rating": 4.9,
    "reviews_count": 127,
    "price_per_walk": 25000,
    "verification_status": "approved",
    "capacity_max": 4,
    "capacity_current": 1,
    "radius_km": 10.0,
    "is_active": true,
    "coordinates": {"lat": 4.6486, "lng": -74.0628},
    "available_slots": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    "created_at": "2025-01-17T00:00:00+00:00"
  }
]
```

---

### GET /walkers/{walker_id}
Get a specific walker by ID.

**Response (200):** Same as single walker object above.

**Errors:**
- 404: "Paseador no encontrado"

---

### POST /walkers
Create walker profile. **Requires Auth (role: walker).**

**Request Body:**
```json
{
  "bio": "Descripción del paseador...",
  "experience_years": 3,
  "certifications": ["Certificado 1", "Certificado 2"],
  "location": "Usaquén, Bogotá",
  "price_per_walk": 30000
}
```

**Response (200):** Returns created walker profile.

---

## 3. DAYCARES (Guarderías)

### GET /daycares
Get all daycares. Public endpoint.

**Query Parameters:**
- `location` (optional): Filter by location

**Response (200):**
```json
[
  {
    "id": "daycare-uuid",
    "user_id": "user-uuid",
    "name": "Pet Paradise Bogotá",
    "description": "Guardería premium con amplias zonas verdes...",
    "location": "Chicó, Bogotá",
    "amenities": ["Piscina", "Zona de Juegos", "Spa", "Alimentación Premium"],
    "gallery_images": ["url1", "url2"],
    "has_cameras": true,
    "has_transportation": true,
    "has_green_areas": true,
    "verified": true,
    "insured": true,
    "rating": 4.9,
    "reviews_count": 203,
    "price_per_day": 85000,
    "verification_status": "approved",
    "capacity_total": 30,
    "capacity_available": 25,
    "pickup_service": true,
    "pickup_price": 15000,
    "pickup_radius_km": 10.0,
    "coordinates": {"lat": 4.6697, "lng": -74.0520},
    "is_active": true,
    "opening_hours": "07:00",
    "closing_hours": "19:00",
    "created_at": "2025-01-17T00:00:00+00:00"
  }
]
```

---

### GET /daycares/{daycare_id}
Get a specific daycare by ID.

---

## 4. PROVIDER SEARCH (Búsqueda Inteligente)

### GET /providers/search
Search available providers with smart matching. Public endpoint.

**Query Parameters:**
- `service_type` (required): "walker" | "daycare"
- `date` (required): "YYYY-MM-DD"
- `time` (optional): "HH:MM" (for walkers)
- `lat` (optional): User latitude
- `lng` (optional): User longitude
- `needs_pickup` (optional): boolean (for daycares)

**Response (200):**
```json
[
  {
    "id": "provider-uuid",
    "name": "Carlos Mendoza",
    "bio": "Descripción...",
    "location": "Chapinero, Bogotá",
    "distance_km": 2.5,
    "rating": 4.9,
    "reviews_count": 127,
    "price": 25000,
    "capacity_available": 3,
    "available_slots": ["09:00", "10:00", "14:00"],
    "verified": true,
    "profile_image": "url",
    "has_pickup": false
  }
]
```

---

### GET /availability/check
Check provider availability for specific date/time.

**Query Parameters:**
- `service_id` (required): Provider UUID
- `service_type` (required): "walker" | "daycare"
- `date` (required): "YYYY-MM-DD"
- `time` (optional): "HH:MM"

**Response (200):**
```json
{
  "available": true,
  "capacity_remaining": 3,
  "next_available_slot": "10:00",
  "provider_name": "Carlos Mendoza"
}
```

---

## 5. PETS (Mascotas)

### GET /pets
Get current user's pets. **Requires Auth.**

**Response (200):**
```json
[
  {
    "id": "pet-uuid",
    "owner_id": "user-uuid",
    "name": "Max",
    "breed": "Golden Retriever",
    "age": 3,
    "weight": 30.5,
    "special_needs": "Activo, necesita mucho ejercicio",
    "photo": "url-to-photo",
    "created_at": "2025-01-17T00:00:00+00:00"
  }
]
```

---

### POST /pets
Create a new pet. **Requires Auth.**

**Request Body:**
```json
{
  "name": "Max",
  "breed": "Golden Retriever",
  "age": 3,
  "weight": 30.5,
  "special_needs": "Activo, necesita mucho ejercicio"
}
```

**Response (200):** Returns created pet object.

---

## 6. BOOKINGS (Reservas)

### GET /bookings
Get user's bookings. **Requires Auth.**

- For owners: Returns their bookings
- For walkers/daycares: Returns bookings for their services
- For admin: Returns all bookings

**Response (200):**
```json
[
  {
    "id": "booking-uuid",
    "owner_id": "user-uuid",
    "owner_name": "Usuario Demo",
    "pet_id": "pet-uuid",
    "pet_name": "Max",
    "service_type": "walker",
    "service_id": "walker-uuid",
    "service_name": "Carlos Mendoza",
    "date": "2025-01-20",
    "time": "09:00",
    "status": "confirmed",
    "price": 25000,
    "payment_status": "paid",
    "payment_id": "wompi_abc123",
    "started_at": null,
    "completed_at": null,
    "requires_pickup": false,
    "pickup_address": null,
    "created_at": "2025-01-17T00:00:00+00:00"
  }
]
```

**Status values:** `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`
**Payment status values:** `pending`, `paid`, `refunded`

---

### POST /bookings
Create a new booking. **Requires Auth.**

**Request Body:**
```json
{
  "pet_id": "pet-uuid",
  "service_type": "walker",
  "service_id": "walker-uuid",
  "date": "2025-01-20",
  "time": "09:00",
  "price": 25000,
  "requires_pickup": false,
  "pickup_address": null
}
```

**Response (200):** Returns created booking object.

---

### GET /bookings/{booking_id}
Get a specific booking. **Requires Auth.**

---

### PATCH /bookings/{booking_id}/status
Update booking status. **Requires Auth.**

**Query Parameters:**
- `status`: New status value

---

### POST /bookings/{booking_id}/start
Start a walk (for walkers). **Requires Auth (role: walker).**

**Response (200):**
```json
{
  "message": "Paseo iniciado",
  "started_at": "2025-01-20T09:00:00+00:00"
}
```

---

### POST /bookings/{booking_id}/complete
Complete a walk (for walkers). **Requires Auth (role: walker).**

---

## 7. SERVICE REQUESTS (Solicitudes con Matching)

### POST /service-requests
Create a service request with automatic matching. **Requires Auth.**

**Request Body:**
```json
{
  "pet_id": "pet-uuid",
  "service_type": "walker",
  "date": "2025-01-21",
  "time": "10:00",
  "requires_pickup": false,
  "pickup_address": null,
  "owner_lat": 4.6951,
  "owner_lng": -74.0621
}
```

**Response (200):**
```json
{
  "request_id": "request-uuid",
  "matched_providers_count": 4,
  "expires_at": "2025-01-17T05:50:58+00:00",
  "status": "pending"
}
```

---

### GET /service-requests/{request_id}
Get service request details. **Requires Auth.**

---

## 8. PROVIDER DASHBOARD

### GET /providers/me/profile
Get current provider's profile. **Requires Auth (role: walker | daycare).**

**Response (200):** Returns walker or daycare profile object.

---

### PATCH /providers/me/status
Update provider status. **Requires Auth (role: walker | daycare).**

**Request Body:**
```json
{
  "is_active": true,
  "capacity_max": 4,
  "radius_km": 10.0
}
```

**Response (200):**
```json
{
  "message": "Estado actualizado",
  "updates": {"is_active": true}
}
```

---

### GET /providers/me/inbox
Get provider's inbox with pending requests. **Requires Auth (role: walker | daycare).**

**Response (200):**
```json
[
  {
    "id": "inbox-uuid",
    "provider_id": "provider-uuid",
    "provider_type": "walker",
    "request_id": "request-uuid",
    "pet_name": "Max",
    "pet_breed": "Golden Retriever",
    "pet_photo": null,
    "owner_name": "Usuario Demo",
    "service_date": "2025-01-21",
    "service_time": "10:00",
    "distance_km": 5.17,
    "earnings": 25000,
    "is_read": false,
    "is_dismissed": false,
    "expires_in_seconds": 891,
    "is_expired": false,
    "created_at": "2025-01-17T05:35:58+00:00"
  }
]
```

---

### POST /providers/me/inbox/{inbox_id}/respond
Respond to a service request. **Requires Auth (role: walker | daycare).**

**Query Parameters:**
- `action`: "accept" | "reject"

**Response (200) on accept:**
```json
{
  "message": "Solicitud aceptada exitosamente",
  "booking_id": "booking-uuid",
  "booking": { /* booking object */ }
}
```

**Errors:**
- 409: "Esta solicitud ya fue tomada por otro proveedor"
- 410: "La solicitud ha expirado"

---

### GET /providers/me/schedule
Get provider's schedule. **Requires Auth (role: walker | daycare).**

**Query Parameters:**
- `date` (optional): "YYYY-MM-DD"

**Response (200):**
```json
{
  "bookings": [ /* array of bookings */ ],
  "capacity_max": 4,
  "capacity_used": 2,
  "is_active": true
}
```

---

## 9. PAYMENTS (Wompi - MOCK)

### POST /payments/wompi/create
Create a payment transaction. **Requires Auth.**

**Request Body:**
```json
{
  "booking_id": "booking-uuid",
  "amount": 25000,
  "currency": "COP",
  "customer_email": "usuario@email.com",
  "payment_method": "CARD"
}
```

**Response (200):**
```json
{
  "transaction_id": "transaction-uuid",
  "wompi_id": "wompi_abc123",
  "reference": "PETTRUST-8551F32605218218",
  "status": "PENDING",
  "amount": 25000,
  "currency": "COP",
  "redirect_url": "https://checkout.wompi.co/mock/...",
  "message": "Transacción creada (MOCK - Sandbox)"
}
```

---

### POST /payments/wompi/confirm/{transaction_id}
Confirm a payment (simulates successful payment). **Requires Auth.**

**Response (200):**
```json
{
  "message": "Pago confirmado exitosamente (MOCK)",
  "transaction_id": "transaction-uuid",
  "wompi_id": "wompi_abc123",
  "status": "APPROVED",
  "booking_status": "confirmed"
}
```

---

### GET /payments/wompi/status/{transaction_id}
Get payment status.

---

## 10. SAFETY CENTER (Seguridad)

### POST /emergency-contacts
Add emergency contact. **Requires Auth.**

**Request Body:**
```json
{
  "name": "María García",
  "phone": "+57 300 123 4567",
  "relationship": "Hermana",
  "is_primary": true
}
```

---

### GET /emergency-contacts
Get user's emergency contacts. **Requires Auth.**

---

### DELETE /emergency-contacts/{contact_id}
Delete emergency contact. **Requires Auth.**

---

### POST /bookings/{booking_id}/share-trip
Generate share trip link. **Requires Auth.**

**Response (200):**
```json
{
  "share_code": "abc123xyz",
  "share_url": "https://pettrust.co/track/abc123xyz",
  "expires_at": "2025-01-17T17:00:00+00:00"
}
```

---

### GET /track/{share_code}
Get shared trip info. Public endpoint.

**Response (200):**
```json
{
  "booking": { /* booking object */ },
  "tracking": [ /* tracking history */ ],
  "status": "in_progress"
}
```

---

### POST /bookings/{booking_id}/generate-pin
Generate verification PIN. **Requires Auth.**

**Response (200):**
```json
{
  "pin_code": "1234",
  "message": "PIN generado. Compártelo con el paseador/dueño."
}
```

---

### POST /bookings/{booking_id}/verify-pin
Verify PIN. **Requires Auth.**

**Query Parameters:**
- `pin_code`: 4-digit PIN

**Response (200):**
```json
{
  "message": "PIN verificado exitosamente",
  "verified": true
}
```

---

### POST /sos
Trigger SOS alert. **Requires Auth.**

**Query Parameters:**
- `booking_id`: Booking UUID
- `latitude`: Current latitude
- `longitude`: Current longitude

**Response (200):**
```json
{
  "message": "Alerta SOS activada",
  "alert_id": "alert-uuid",
  "emergency_contacts_notified": 2,
  "location": {"lat": 4.6951, "lng": -74.0621},
  "emergency_number": "+57 123 (Policía Nacional Colombia)"
}
```

---

### GET /bookings/{booking_id}/safety-status
Get safety status for a booking. **Requires Auth.**

**Response (200):**
```json
{
  "booking_id": "booking-uuid",
  "status": "in_progress",
  "pin_verified": true,
  "active_sos_alerts": 0,
  "check_ins_count": 3,
  "has_overdue_time": false,
  "safety_score": "high"
}
```

---

## 11. GPS TRACKING

### POST /tracking
Update location during walk. **Requires Auth (role: walker).**

**Request Body:**
```json
{
  "booking_id": "booking-uuid",
  "latitude": 4.6951,
  "longitude": -74.0621,
  "timestamp": "2025-01-20T09:15:00+00:00"
}
```

---

### GET /tracking/{booking_id}
Get tracking history for a booking.

**Response (200):**
```json
[
  {
    "booking_id": "booking-uuid",
    "latitude": 4.6951,
    "longitude": -74.0621,
    "timestamp": "2025-01-20T09:15:00+00:00"
  }
]
```

---

## 12. REVIEWS

### POST /reviews
Create a review. **Requires Auth.**

**Request Body:**
```json
{
  "booking_id": "booking-uuid",
  "service_type": "walker",
  "service_id": "walker-uuid",
  "rating": 5,
  "comment": "Excelente servicio, mi perro llegó muy feliz."
}
```

---

### GET /reviews/{service_type}/{service_id}
Get reviews for a service. Public endpoint.

---

## 13. WELLNESS REPORTS

### POST /wellness
Create wellness report. **Requires Auth (role: walker).**

**Request Body:**
```json
{
  "booking_id": "booking-uuid",
  "pet_id": "pet-uuid",
  "ate": true,
  "bathroom": true,
  "mood": "happy",
  "notes": "Max estuvo muy activo hoy."
}
```

---

### GET /wellness/{booking_id}
Get wellness report for a booking.

---

## Test Credentials

```
Owner Account:
- Email: testowner@demo.com
- Password: test123

Walker Account:
- Email: testwalker@demo.com
- Password: test123

Admin Account:
- Email: admin@pettrust.com
- Password: admin123
```

---

## Notes for Mobile App

1. **Token Storage**: Store JWT token securely (AsyncStorage/SecureStore)
2. **Token Refresh**: Tokens expire in 7 days
3. **Geolocation**: Request permissions for GPS tracking and SOS features
4. **Push Notifications**: Not yet implemented (future feature)
5. **Payments**: Currently MOCKED - will integrate real Wompi later
6. **File Upload**: Not yet implemented - photos stored as URLs

---

## Data Models Summary

### User Roles
- `owner`: Pet owners who book services
- `walker`: Dog walkers who provide walking services
- `daycare`: Daycare facilities
- `admin`: Platform administrators

### Booking Status Flow
```
pending → confirmed → in_progress → completed
                   ↘ cancelled
```

### Payment Status
```
pending → paid
       ↘ refunded
```

### Service Request Flow
```
pending → accepted (creates booking)
       ↘ rejected
       ↘ expired (after 15 minutes)
```
