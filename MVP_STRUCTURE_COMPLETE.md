# 🏗️ ESTRUCTURA COMPLETA DEL MVP - PETTRUST BOGOTÁ

## 📊 ANÁLISIS DE GAP (Estado Actual vs. Requerido)

### ✅ YA IMPLEMENTADO

| Funcionalidad | Estado | Ubicación |
|---------------|--------|-----------|
| Perfiles de Usuario (Owner) | ✅ Completo | `/api/auth/register`, `User` model |
| Perfiles de Paseador | ✅ Completo | `/api/walkers`, `WalkerProfile` model |
| Perfiles de Guardería | ✅ Completo | `/api/daycares`, `DaycareProfile` model |
| Mascotas por Usuario | ✅ Completo | `/api/pets`, `Pet` model |
| Sistema de Reservas | ✅ Completo | `/api/bookings`, `Booking` model |
| Ubicación por Barrio | ✅ Completo | Campo `location` en perfiles |
| Historial de Servicios | ✅ Completo | Bookings por `owner_id` |
| Amenidades Guardería | ✅ Completo | `amenities`, `has_cameras`, etc. |
| Verificación de Seguridad (PIN) | ✅ Completo | `/api/bookings/{id}/verify-pin` |
| Sistema de Calificaciones | ✅ Completo | `/api/reviews` |

### ⚠️ IMPLEMENTADO PARCIALMENTE

| Funcionalidad | Estado Actual | Mejora Requerida |
|---------------|---------------|------------------|
| Calendario de Disponibilidad | Fecha simple | Necesita slots horarios dinámicos |
| Dashboard Proveedor | Básico | Falta bandeja de entrada en tiempo real |
| Notificaciones | Sin implementar | Push notifications con Firebase |
| Gestión de Cupos | Manual | Necesita control automático de capacidad |

### ❌ POR IMPLEMENTAR (CRÍTICO)

| Funcionalidad | Prioridad | Complejidad |
|---------------|-----------|-------------|
| **Capacidad y Slots Dinámicos** | 🔴 Alta | Media |
| **Radio de Acción (Geofencing)** | 🔴 Alta | Media |
| **Estado Activo/Inactivo** | 🔴 Alta | Baja |
| **Servicio de Recogida** | 🟡 Media | Baja |
| **Matching Automático** | 🟡 Media | Alta |
| **Validación Automática de Espacios** | 🔴 Alta | Media |
| **Bandeja de Solicitudes Real-Time** | 🟡 Media | Alta |
| **Check-in de Recogida** | 🟢 Baja | Baja |

---

## 🗄️ ESQUEMA DE BASE DE DATOS ACTUALIZADO

### 📋 COLECCIONES EXISTENTES

#### 1. `users`
```javascript
{
  id: string (UUID),
  email: string,
  password: string (hashed),
  name: string,
  role: enum['owner', 'walker', 'daycare', 'admin'],
  phone: string,
  created_at: datetime
}
```

#### 2. `walkers` (Paseadores)
```javascript
{
  id: string (UUID),
  user_id: string (FK → users),
  name: string,
  bio: string,
  experience_years: int,
  certifications: array[string],
  profile_image: string (URL),
  gallery_images: array[string],
  location: string (Barrio),
  
  // ✅ Existente
  verified: boolean,
  insured: boolean,
  rating: float,
  reviews_count: int,
  price_per_walk: float,
  
  // 🆕 A AGREGAR
  capacity_max: int (default: 4),          // Máximo perros simultáneos
  capacity_current: int (default: 0),       // Ocupación actual
  radius_km: float (default: 5),            // Radio de acción en km
  is_active: boolean (default: false),      // Disponible para solicitudes
  coordinates: {                            // Ubicación GPS
    lat: float,
    lng: float
  },
  working_hours: {                          // Horario de trabajo
    monday: { start: "08:00", end: "18:00", enabled: true },
    tuesday: { start: "08:00", end: "18:00", enabled: true },
    // ... resto de días
  },
  
  created_at: datetime
}
```

#### 3. `daycares` (Guarderías)
```javascript
{
  id: string (UUID),
  user_id: string (FK → users),
  name: string,
  description: string,
  location: string,
  
  // ✅ Existente
  amenities: array[string],
  gallery_images: array[string],
  has_cameras: boolean,
  has_transportation: boolean,
  has_green_areas: boolean,
  verified: boolean,
  insured: boolean,
  rating: float,
  reviews_count: int,
  price_per_day: float,
  
  // 🆕 A AGREGAR
  capacity_total: int (default: 20),        // Cupos totales
  capacity_available: int (default: 20),    // Cupos disponibles
  pickup_service: boolean (default: false), // Servicio de recogida
  pickup_price: float (default: 15000),     // Costo adicional recogida
  pickup_radius_km: float (default: 10),    // Radio de recogida
  coordinates: {
    lat: float,
    lng: float
  },
  is_active: boolean (default: true),       // Aceptando reservas
  
  created_at: datetime
}
```

#### 4. `pets` (Mascotas)
```javascript
{
  id: string (UUID),
  owner_id: string (FK → users),
  name: string,
  breed: string,
  age: int,
  weight: float,
  special_needs: string,
  photo: string (URL),
  
  // 🆕 A AGREGAR
  behavior: enum['calm', 'active', 'aggressive', 'shy'],
  vaccination_card: string (URL),           // Carnet de vacunas
  medical_conditions: array[string],        // Condiciones médicas
  
  created_at: datetime
}
```

#### 5. `bookings` (Reservas)
```javascript
{
  id: string (UUID),
  owner_id: string (FK → users),
  owner_name: string,
  pet_id: string (FK → pets),
  pet_name: string,
  service_type: enum['walker', 'daycare'],
  service_id: string (FK → walkers/daycares),
  service_name: string,
  
  date: string (YYYY-MM-DD),
  time: string (HH:MM),
  
  // ✅ Existente
  status: enum['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
  price: float,
  payment_status: enum['pending', 'paid', 'refunded'],
  payment_id: string,
  started_at: datetime,
  completed_at: datetime,
  
  // 🆕 A AGREGAR
  requires_pickup: boolean (default: false), // Necesita recogida
  pickup_address: string,                    // Dirección de recogida
  pickup_coordinates: { lat: float, lng: float },
  pickup_time: string,                       // Hora estimada de recogida
  checkin_at: datetime,                      // Check-in del paseador
  checkin_location: { lat: float, lng: float },
  slot_time: string (HH:MM),                 // Slot reservado
  
  created_at: datetime
}
```

---

### 🆕 NUEVAS COLECCIONES A CREAR

#### 6. `availability_slots` (Slots de Disponibilidad)
```javascript
{
  id: string (UUID),
  provider_id: string (FK → walkers/daycares),
  provider_type: enum['walker', 'daycare'],
  date: string (YYYY-MM-DD),
  time_slot: string (HH:MM),                // Ej: "09:00", "14:00"
  capacity: int,                            // Cupos disponibles en ese slot
  is_available: boolean,                    // Si acepta reservas
  created_at: datetime
}
```

**Índices:**
- `provider_id + date + time_slot` (único)
- `date + is_available`

#### 7. `service_requests` (Solicitudes Pendientes)
```javascript
{
  id: string (UUID),
  booking_id: string (FK → bookings),
  owner_id: string (FK → users),
  pet_id: string (FK → pets),
  service_type: enum['walker', 'daycare'],
  
  // Datos de la solicitud
  requested_date: string,
  requested_time: string,
  requires_pickup: boolean,
  pickup_location: { lat: float, lng: float },
  owner_location: { lat: float, lng: float },
  
  // Matching
  matched_providers: array[string],         // IDs de proveedores notificados
  status: enum['pending', 'accepted', 'rejected', 'expired'],
  accepted_by: string (provider_id),        // Quién aceptó
  accepted_at: datetime,
  expires_at: datetime,                     // 15 min para responder
  
  created_at: datetime
}
```

**Índices:**
- `status + expires_at`
- `matched_providers` (array index)

#### 8. `provider_inbox` (Bandeja de Entrada Proveedores)
```javascript
{
  id: string (UUID),
  provider_id: string (FK → walkers/daycares),
  request_id: string (FK → service_requests),
  
  // Vista previa
  pet_name: string,
  pet_photo: string,
  owner_name: string,
  service_date: string,
  service_time: string,
  distance_km: float,                       // Distancia al pickup
  earnings: float,                          // Ganancia neta
  
  // Estado
  is_read: boolean (default: false),
  is_dismissed: boolean (default: false),
  responded_at: datetime,
  
  created_at: datetime
}
```

#### 9. `geofences` (Zonas de Cobertura)
```javascript
{
  id: string (UUID),
  provider_id: string (FK → walkers/daycares),
  center: { lat: float, lng: float },       // Centro del círculo
  radius_km: float,                         // Radio de cobertura
  is_active: boolean,
  created_at: datetime
}
```

---

## 🔄 FLUJOS DE NEGOCIO ACTUALIZADOS

### Flujo 1: Solicitud de Paseo (Con Matching)

```
1. Usuario crea solicitud
   POST /api/service-requests
   Body: {
     service_type: "walker",
     pet_id: "pet-123",
     date: "2025-01-20",
     time: "09:00",
     requires_pickup: true,
     pickup_address: "Calle 123 #45-67"
   }

2. Sistema captura ubicación GPS del usuario
   - Obtiene coordinates del navegador

3. Backend ejecuta Matching Automático:
   - Busca walkers con:
     ✓ is_active = true
     ✓ Distancia ≤ radius_km (calculado con Haversine)
     ✓ Slot disponible en date + time
     ✓ capacity_current < capacity_max
   
   Query MongoDB:
   db.walkers.find({
     is_active: true,
     $and: [
       { capacity_current: { $lt: "$capacity_max" } },
       { 
         $expr: {
           $lte: [
             haversineDistance(coordinates, userLocation),
             radius_km
           ]
         }
       }
     ]
   })

4. Se crean entradas en provider_inbox para cada match
   - Notificación push a cada paseador

5. Paseadores ven "Card de Solicitud" en Dashboard
   - Foto del perro
   - Ubicación en mapa
   - Hora y fecha
   - Ganancia: $25,000 COP

6. Primer paseador que acepta gana la solicitud
   - Se actualiza service_request.status = 'accepted'
   - Se crea booking con status = 'confirmed'
   - Se resta 1 de walker.capacity_current
   - Se notifica al usuario

7. Otros paseadores ven "Ya tomada" automáticamente
```

### Flujo 2: Reserva de Guardería con Recogida

```
1. Usuario busca guarderías
   GET /api/daycares/search?date=2025-01-20&needs_pickup=true

2. Backend filtra:
   - capacity_available > 0 para esa fecha
   - pickup_service = true
   - Distancia al usuario ≤ pickup_radius_km

3. Usuario ve opciones con precio total:
   - Base: $80,000
   - + Recogida: $15,000
   - Total: $95,000

4. Usuario confirma reserva
   POST /api/bookings
   Body: {
     service_type: "daycare",
     service_id: "daycare-456",
     date: "2025-01-20",
     requires_pickup: true,
     pickup_address: "Calle XYZ"
   }

5. Sistema valida capacidad en tiempo real:
   - Cuenta bookings para esa fecha
   - Si count < capacity_total → Procede
   - Si count >= capacity_total → Rechaza (409 Conflict)

6. Booking creado exitosamente
   - daycare.capacity_available -= 1
   - status = 'confirmed'
   - Guardería recibe notificación

7. Día de servicio: Conductor marca Check-in
   POST /api/bookings/{id}/pickup-checkin
   - Captura GPS
   - Notifica al dueño
   - Activa seguro PetTrust
```

### Flujo 3: Gestión de Cupos (Dashboard Proveedor)

```
Dashboard del Paseador/Guardería:

┌─────────────────────────────────────────┐
│ 🟢 Estado: ACTIVO                       │
│ [Toggle] Recibir solicitudes            │
│                                         │
│ Capacidad Hoy: 2 / 4 perros            │
│ [Slider: 0 ────●──── 4]               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📥 BANDEJA DE ENTRADA (3 nuevas)        │
│                                         │
│ 🐕 Max - Golden Retriever               │
│ 📍 2.3 km de distancia                  │
│ 🕐 Hoy 9:00 AM                          │
│ 💰 $25,000                              │
│ [Aceptar] [Rechazar]                   │
│                                         │
│ 🐩 Luna - Poodle                        │
│ 📍 1.8 km de distancia                  │
│ 🕐 Hoy 14:00 PM                         │
│ 💰 $30,000                              │
│ [Aceptar] [Rechazar]                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📅 AGENDA SEMANAL                       │
│                                         │
│ Hoy (Lun 20)                            │
│ • 09:00 - Max (Confirmado)              │
│ • 14:00 - Disponible                    │
│ • 17:00 - Rocky (Confirmado)            │
│                                         │
│ Mar 21                                  │
│ • 10:00 - Disponible                    │
│ • 15:00 - Disponible                    │
└─────────────────────────────────────────┘
```

---

## 🛠️ ENDPOINTS ADICIONALES A IMPLEMENTAR

### Matching y Solicitudes

```bash
# Crear solicitud con matching automático
POST /api/service-requests
Body: {
  service_type: "walker",
  pet_id: "pet-123",
  date: "2025-01-20",
  time: "09:00",
  requires_pickup: true,
  pickup_address: "Calle 123"
}
Response: {
  request_id: "req-789",
  matched_providers_count: 5,
  expires_at: "2025-01-20T09:15:00Z"
}

# Buscar proveedores disponibles
GET /api/providers/search?service_type=walker&date=2025-01-20&time=09:00&lat=4.6951&lng=-74.0621
Response: [
  {
    id: "walker-1",
    name: "Carlos Mendoza",
    distance_km: 2.3,
    rating: 4.9,
    price: 25000,
    available_slots: ["09:00", "14:00"],
    capacity_available: 2
  }
]
```

### Gestión de Capacidad

```bash
# Actualizar estado del proveedor
PATCH /api/providers/me/status
Body: {
  is_active: true,
  capacity_max: 3
}

# Obtener bandeja de entrada
GET /api/providers/me/inbox
Response: [
  {
    id: "inbox-1",
    request_id: "req-789",
    pet_name: "Max",
    pet_photo: "url",
    distance_km: 2.3,
    earnings: 25000,
    expires_in_seconds: 780,
    is_read: false
  }
]

# Responder solicitud
POST /api/providers/me/inbox/{inbox_id}/respond
Body: {
  action: "accept" | "reject"
}
```

### Validación de Espacios

```bash
# Verificar disponibilidad antes de crear booking
GET /api/availability/check?service_id=walker-1&date=2025-01-20&time=09:00
Response: {
  available: true,
  capacity_remaining: 2,
  next_available_slot: "10:00"
}
```

---

## 🛡️ REGLAS DE NEGOCIO AUTOMATIZADAS

### 1. Validación de Capacidad (Pre-Booking)

```javascript
// Backend - antes de crear booking
async function validateCapacity(serviceId, serviceType, date, time) {
  const bookingsCount = await db.bookings.countDocuments({
    service_id: serviceId,
    date: date,
    time: time,
    status: { $in: ['confirmed', 'in_progress'] }
  });
  
  const provider = await getProvider(serviceId, serviceType);
  
  if (serviceType === 'walker') {
    if (bookingsCount >= provider.capacity_max) {
      throw new Error('Paseador sin capacidad en ese horario');
    }
  } else if (serviceType === 'daycare') {
    const dailyCount = await db.bookings.countDocuments({
      service_id: serviceId,
      date: date,
      status: { $in: ['confirmed', 'in_progress'] }
    });
    
    if (dailyCount >= provider.capacity_total) {
      throw new Error('Guardería llena ese día');
    }
  }
  
  return true;
}
```

### 2. Cálculo Automático de Precio

```javascript
function calculateTotalPrice(service, requiresPickup) {
  let total = service.price_per_day || service.price_per_walk;
  
  if (requiresPickup && service.pickup_service) {
    total += service.pickup_price || 15000;
  }
  
  return total;
}
```

### 3. Expiración de Solicitudes

```javascript
// Cron job cada minuto
async function expireOldRequests() {
  const now = new Date();
  
  const expired = await db.service_requests.updateMany(
    {
      status: 'pending',
      expires_at: { $lt: now }
    },
    {
      $set: { status: 'expired' }
    }
  );
  
  // Notificar a usuarios que su solicitud expiró
  // Sugerir ampliar radio o cambiar horario
}
```

---

## 🎯 PRIORIZACIÓN PARA IMPLEMENTACIÓN

### FASE 1: CRÍTICO (Esta Semana)
1. ✅ Capacidad y estado activo/inactivo
2. ✅ Servicio de recogida (pickup)
3. ✅ Validación automática de espacios
4. ✅ Bandeja de inbox básica

### FASE 2: IMPORTANTE (Semana 2)
5. ⏳ Matching automático por geolocalización
6. ⏳ Slots de horario dinámicos
7. ⏳ Check-in de recogida con GPS
8. ⏳ Notificaciones push en tiempo real

### FASE 3: DESEABLE (Semana 3-4)
9. ⏳ Dashboard avanzado con métricas
10. ⏳ Gestión de disponibilidad semanal
11. ⏳ Sistema de prioridad (proveedores premium)
12. ⏳ Historial y analytics

---

¿Quieres que implemente FASE 1 ahora mismo? 🚀
