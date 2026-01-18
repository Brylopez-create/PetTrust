# PetTrust - Resumen para Vibecode

## URL Base del Backend
```
https://pettrust-bogota.preview.emergentagent.com/api
```

## Autenticación
Todas las rutas protegidas requieren header:
```
Authorization: Bearer <token>
```

## Roles de Usuario
- `owner` - Dueño de mascota (ve paseadores, reserva, paga)
- `walker` - Paseador (recibe solicitudes, acepta trabajos)
- `daycare` - Guardería (similar a walker)
- `admin` - Administrador

## Endpoints Principales

### Auth
- `POST /api/auth/register` - {email, password, name, role, phone}
- `POST /api/auth/login` - {email, password} → {token, user}
- `GET /api/auth/me` - Obtener usuario actual

### Para Owners
- `GET /api/walkers` - Lista paseadores
- `GET /api/daycares` - Lista guarderías
- `GET /api/providers/search?service_type=walker&date=2025-01-20&lat=4.69&lng=-74.06`
- `GET /api/pets` - Mis mascotas
- `POST /api/pets` - {name, breed, age, weight, special_needs}
- `GET /api/bookings` - Mis reservas
- `POST /api/bookings` - {pet_id, service_type, service_id, date, time, price}
- `POST /api/payments/wompi/create` - Crear pago
- `POST /api/payments/wompi/confirm/{id}` - Confirmar pago

### Para Walkers/Daycares
- `GET /api/providers/me/profile` - Mi perfil
- `PATCH /api/providers/me/status` - {is_active, capacity_max}
- `GET /api/providers/me/inbox` - Solicitudes pendientes
- `POST /api/providers/me/inbox/{id}/respond?action=accept`
- `GET /api/providers/me/schedule` - Mi agenda

### Seguridad
- `POST /api/emergency-contacts` - {name, phone, relationship}
- `GET /api/emergency-contacts`
- `POST /api/bookings/{id}/share-trip` - Compartir paseo
- `POST /api/bookings/{id}/generate-pin` - Generar PIN
- `POST /api/bookings/{id}/verify-pin?pin_code=1234`
- `POST /api/sos?booking_id=xxx&latitude=4.69&longitude=-74.06`

### Tracking GPS
- `POST /api/tracking` - {booking_id, latitude, longitude}
- `GET /api/tracking/{booking_id}`

## Credenciales de Prueba
```
Owner: testowner@demo.com / test123
Walker: testwalker@demo.com / test123
Admin: admin@pettrust.com / admin123
```

## Flujo Principal Owner
1. Login → obtener token
2. GET /pets → ver mascotas (o crear una)
3. GET /providers/search → buscar paseadores disponibles
4. POST /bookings → crear reserva
5. POST /payments/wompi/create → iniciar pago
6. POST /payments/wompi/confirm/{id} → confirmar pago
7. Ver estado en GET /bookings

## Flujo Principal Walker
1. Login (rol walker) → obtener token
2. PATCH /providers/me/status {is_active: true} → activarse
3. GET /providers/me/inbox → ver solicitudes
4. POST /providers/me/inbox/{id}/respond?action=accept → aceptar
5. POST /bookings/{id}/start → iniciar paseo
6. POST /tracking → enviar ubicación GPS
7. POST /bookings/{id}/complete → finalizar

## Notas Importantes
- Pagos Wompi están en MOCK (sandbox)
- GPS tracking es simulado
- Token JWT expira en 7 días
- Coordenadas de Bogotá: lat ~4.6, lng ~-74.0
