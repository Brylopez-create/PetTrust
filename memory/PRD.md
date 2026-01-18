# PetTrust Bogotá - Product Requirements Document

## Original Problem Statement
Plataforma web premium para el mercado de Bogotá que conecta dueños de mascotas con paseadores certificados y guarderías de alta gama. El valor central es **"confianza y estatus"** sobre "urgencia".

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: Wompi (MOCKED - sandbox mode)

## User Roles
1. **Pet Owners** (owner) - Dueños de mascotas
2. **Walkers** (walker) - Paseadores de perros
3. **Daycares** (daycare) - Guarderías caninas
4. **Admin** (admin) - Administrador de la plataforma

## Core Features Implemented ✅

### Authentication & Users
- [x] Registro con selección de rol (owner, walker, daycare)
- [x] Login con JWT tokens
- [x] Perfiles de usuario

### Pet Management
- [x] CRUD de mascotas
- [x] Foto, raza, edad, peso, necesidades especiales

### Walker/Daycare Profiles
- [x] Biografía, certificaciones, galería de fotos
- [x] Ubicación, rating, reviews
- [x] Sistema de verificación
- [x] Capacidad dinámica (capacity_max, capacity_current)
- [x] Radio de acción (radius_km)
- [x] Estado activo/inactivo
- [x] Slots de disponibilidad horaria

### Booking System
- [x] Crear reservas de paseo o guardería
- [x] Estados: pending, confirmed, in_progress, completed, cancelled
- [x] Precio calculado con servicio de recogida opcional

### Smart Matching System
- [x] Búsqueda de proveedores por ubicación (Haversine distance)
- [x] Filtro por disponibilidad y capacidad
- [x] Service Requests con matching automático
- [x] Provider Inbox con solicitudes pendientes
- [x] Aceptar/rechazar solicitudes en tiempo real
- [x] Expiración de solicitudes (15 min)

### Payment System (Wompi MOCK)
- [x] Crear transacciones
- [x] Confirmar pagos
- [x] Status tracking
- [x] Webhook endpoint

### Security System (Uber-like)
- [x] Botón de Emergencia SOS con geolocalización
- [x] Verificación PIN antes de iniciar servicio
- [x] Compartir paseo (share trip link)
- [x] Contactos de emergencia
- [x] Safety status tracking
- [x] Check-ins durante el servicio

### Provider Dashboard
- [x] Toggle activo/inactivo
- [x] Slider de capacidad
- [x] Bandeja de entrada con solicitudes
- [x] Agenda de reservas
- [x] Configuración de perfil

### GPS Tracking (Simulated)
- [x] Actualizar ubicación
- [x] Obtener historial de tracking
- [x] Página de tracking en vivo (simulado)

### Chat en Tiempo Real ✅ NEW
- [x] Conversaciones entre owner y provider
- [x] Envío/recepción de mensajes
- [x] Conteo de mensajes no leídos
- [x] Iniciar chat desde perfil del proveedor
- [x] Polling para nuevos mensajes (cada 5 seg)

### UI Móvil Mejorada ✅ NEW
- [x] Menú hamburguesa completo
- [x] Información del usuario logueado
- [x] Botón "Cerrar Sesión" visible
- [x] Botón "Mensajes" con badge de no leídos
- [x] Diseño responsive para todas las páginas

## Mobile App Documentation
Ver archivos:
- `/app/API_DOCUMENTATION_MOBILE.md` - Documentación completa de API para app nativa
- `/app/VIBECODE_QUICK_REFERENCE.md` - Referencia rápida para Vibecode

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Providers
- GET /api/walkers
- GET /api/walkers/{id}
- GET /api/daycares
- GET /api/daycares/{id}
- GET /api/providers/search

### Provider Dashboard
- GET /api/providers/me/profile
- PATCH /api/providers/me/status
- GET /api/providers/me/inbox
- POST /api/providers/me/inbox/{id}/respond
- GET /api/providers/me/schedule

### Pets & Bookings
- GET /api/pets
- POST /api/pets
- GET /api/bookings
- POST /api/bookings
- PATCH /api/bookings/{id}/status

### Service Requests
- POST /api/service-requests
- GET /api/service-requests/{id}
- GET /api/availability/check

### Payments (Wompi MOCK)
- POST /api/payments/wompi/create
- POST /api/payments/wompi/confirm/{id}
- GET /api/payments/wompi/status/{id}
- POST /api/payments/wompi/webhook

### Chat ✅ NEW
- GET /api/conversations
- POST /api/conversations
- GET /api/conversations/{id}
- POST /api/conversations/{id}/messages
- GET /api/conversations/unread/count

### Safety
- POST /api/emergency-contacts
- GET /api/emergency-contacts
- POST /api/bookings/{id}/share-trip
- POST /api/bookings/{id}/generate-pin
- POST /api/bookings/{id}/verify-pin
- POST /api/sos
- GET /api/bookings/{id}/safety-status

## Test Credentials
- **Owner**: testowner@demo.com / test123
- **Walker**: testwalker@demo.com / test123
- **Admin**: admin@pettrust.com / admin123

## Testing Status
- **Backend Tests**: 31/31 passed (100%)
- **Frontend Tests**: All critical flows working
- **Test File**: /app/tests/test_pettrust_api.py

## Known Limitations
1. **Wompi Payments**: MOCKED - No integración real con el gateway
2. **GPS Tracking**: Simulado - No usa geolocalización real
3. **Push Notifications**: No implementado
4. **File Storage**: No integrado con AWS S3

## Upcoming Tasks (P1)
1. Integración real con Wompi cuando el usuario tenga API keys
2. Integración con AWS S3 para almacenamiento de imágenes
3. GPS tracking real con WebSockets
4. Push notifications con Firebase

## Future Tasks (P2)
1. Chat en tiempo real entre usuarios y proveedores
2. Sistema de gamificación para proveedores
3. Modelos de suscripción premium
4. Panel de administración avanzado
5. App móvil

## Deployment Notes
- Frontend: Preparado para Vercel (vercel.json incluido)
- Backend: Preparado para Railway (railway.toml, Procfile incluidos)
- MongoDB: Usar Atlas en producción

---
*Last Updated: January 17, 2025*
