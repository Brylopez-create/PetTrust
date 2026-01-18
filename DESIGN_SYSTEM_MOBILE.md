# PetTrust - Guía de Diseño UI/UX para App Nativa

## 🎨 Identidad Visual

### Logo
- Icono: 🐾 (huella de mascota) dentro de círculo con gradiente
- Nombre: "PetTrust" en fuente bold
- Tagline: "Cuidado Premium para tu Mascota"

### Paleta de Colores

#### Colores Primarios
```
Emerald (Principal):
- emerald-400: #34D399 (botones principales, acciones)
- emerald-500: #10B981 (hover estados)
- emerald-600: #059669 (textos activos)
- emerald-100: #D1FAE5 (backgrounds suaves)
- emerald-50:  #ECFDF5 (highlights)

Stone (Neutros):
- stone-900: #1C1917 (textos principales)
- stone-700: #44403C (textos secundarios)
- stone-600: #57534E (textos terciarios)
- stone-500: #78716C (placeholders)
- stone-200: #E7E5E4 (bordes)
- stone-100: #F5F5F4 (backgrounds cards)
- stone-50:  #FAFAF9 (background principal)
```

#### Colores de Acento
```
Amber (Ratings/Warnings):
- amber-400: #FBBF24 (estrellas, alertas)
- amber-100: #FEF3C7 (badges warning)
- amber-700: #B45309 (texto warning)

Sky (Info/Verificación):
- sky-100: #E0F2FE (badge verificado)
- sky-600: #0284C7 (icono verificado)
- sky-700: #0369A1 (texto verificado)

Red (Peligro/Logout):
- red-500: #EF4444 (botón SOS, logout)
- red-100: #FEE2E2 (background error)
- red-700: #B91C1C (texto error)

Purple (Servicios):
- purple-100: #F3E8FF (badge servicios)
- purple-600: #9333EA (iconos servicios)
- purple-700: #7C3AED (texto servicios)
```

### Tipografía

```
Font Family Principal: Inter (o system-ui como fallback)
Font Family Headings: Nunito Sans (font-heading)

Tamaños:
- Display: 48px (3rem) - Hero titles
- H1: 36px (2.25rem) - Page titles
- H2: 24px (1.5rem) - Section titles  
- H3: 20px (1.25rem) - Card titles
- Body: 16px (1rem) - Texto normal
- Small: 14px (0.875rem) - Labels, captions
- XSmall: 12px (0.75rem) - Badges, timestamps

Pesos:
- Bold: 700 (headings, precios)
- Semibold: 600 (nombres, labels importantes)
- Medium: 500 (botones, links)
- Regular: 400 (body text)
```

---

## 📱 Componentes UI

### Botones

#### Botón Primario (CTA)
```
- Background: emerald-400 → emerald-500 (hover)
- Texto: white
- Border Radius: 9999px (pill/rounded-full)
- Padding: 16px 32px (h-14 para grandes)
- Shadow: shadow-lg shadow-emerald-100
- Font: semibold

Ejemplo: "Reservar Paseo", "Pagar Ahora"
```

#### Botón Secundario (Outline)
```
- Background: transparent → stone-50 (hover)
- Border: 1px stone-200
- Texto: stone-700
- Border Radius: 9999px

Ejemplo: "Enviar Mensaje", "Cancelar"
```

#### Botón Ghost
```
- Background: transparent → accent/10 (hover)
- Texto: stone-700 o emerald-600
- Sin border

Ejemplo: Items de navegación
```

#### Botón Danger
```
- Background: transparent → red-50 (hover)
- Texto: red-500
- Para: Logout, cancelar, SOS

Ejemplo: "Cerrar Sesión", "Botón SOS"
```

### Cards

```
- Background: white
- Border: 1px stone-200
- Border Radius: 24px (rounded-3xl)
- Padding: 24px (p-6) o 32px (p-8)
- Shadow: none por defecto, shadow-lg en hover
- Transition: all 200ms

Variantes:
- Card elevada: shadow-sm siempre
- Card interactiva: hover:shadow-lg
- Card destacada: border-2 border-emerald-200
```

### Badges

```
Verificado:
- bg-sky-100, text-sky-700
- Icono: CheckCircle

Asegurado:
- bg-emerald-100, text-emerald-700
- Icono: Shield

Servicio (Paseo/Guardería):
- bg-purple-100, text-purple-700

Status Pendiente:
- bg-amber-100, text-amber-700

Status Confirmado:
- bg-emerald-100, text-emerald-700

Status En Progreso:
- bg-sky-100, text-sky-700

Pagado:
- bg-emerald-100, text-emerald-700

No leído (chat):
- bg-red-500, text-white
- Border Radius: full (círculo)
- Min width: 20px
```

### Inputs

```
- Background: white
- Border: 1px stone-200 → emerald-400 (focus)
- Border Radius: 12px (rounded-xl) o full para search
- Padding: 12px 16px
- Font: 16px (previene zoom en iOS)
- Placeholder: stone-500

Estados:
- Default: border-stone-200
- Focus: border-emerald-400, ring-2 ring-emerald-100
- Error: border-red-400, ring-2 ring-red-100
- Disabled: bg-stone-100, opacity-50
```

### Avatar

```
- Tamaños: 32px, 40px, 48px, 64px, 128px
- Border Radius: full (círculo) o 16px (rounded-2xl para grandes)
- Fallback: Gradiente emerald-100 to stone-100 + inicial del nombre
- Border: 2px white (para superposición)
```

### Tabs

```
- Background contenedor: stone-100
- Border Radius contenedor: 12px
- Tab activa: bg-white, shadow-sm
- Tab inactiva: transparent
- Texto activo: stone-900
- Texto inactivo: stone-600
- Padding tab: 8px 16px
- Gap entre tabs: 4px
```

### Dialogs/Modales

```
- Background overlay: black/50 con backdrop-blur
- Card: bg-white
- Border Radius: 24px (rounded-3xl)
- Max Width: 32rem (max-w-lg) o 42rem (max-w-2xl)
- Padding: 24px
- Shadow: shadow-2xl
- Animación: fade + scale desde 95%
```

### Bottom Sheet (Móvil)

```
- Background: white
- Border Radius Top: 24px
- Handle: 40px x 4px, bg-stone-300, rounded-full
- Padding: 16px
- Max Height: 90vh
```

---

## 📐 Layout y Espaciado

### Sistema de Espaciado (8px base)

```
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px
```

### Contenedor Principal

```
- Max Width: 80rem (1280px)
- Padding horizontal: 16px (móvil), 24px (tablet), 32px (desktop)
- Margin: auto (centrado)
```

### Grid

```
- Mobile: 1 columna
- Tablet (md): 2 columnas
- Desktop (lg): 3-4 columnas
- Gap: 24px
```

---

## 🖼️ Pantallas Principales

### 1. Home (Sin Login)

```
Layout:
┌─────────────────────────────────────┐
│ [Navbar]                            │
│ Logo    Explorar  Ingresar  Registro│
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │        HERO SECTION         │    │
│  │  "Cuidado Premium para      │    │
│  │   tu Mascota de Confianza"  │    │
│  │                             │    │
│  │  [🔍 Buscar paseador...]    │    │
│  │                             │    │
│  │  [Buscar Paseadores] [Guarderías]│
│  └─────────────────────────────┘    │
│                                     │
│  ┌───────┬───────┬───────┐          │
│  │ 500+  │ 4.9⭐ │ 24/7  │          │
│  │Cuidadores│Rating│Soporte│        │
│  └───────┴───────┴───────┘          │
│                                     │
│  [Sección: Por qué PetTrust]        │
│  - Verificados                      │
│  - GPS Tiempo Real                  │
│  - Seguro Incluido                  │
│                                     │
└─────────────────────────────────────┘
```

### 2. Explorar

```
Layout:
┌─────────────────────────────────────┐
│ [Navbar]                            │
├─────────────────────────────────────┤
│ Explorar Cuidadores                 │
│ "Encuentra el cuidador perfecto..." │
│                                     │
│ [Tabs: Paseadores | Guarderías]     │
│                                     │
│ ┌─────────────────────────────┐     │
│ │ 📷 Avatar  Carlos Mendoza   │     │
│ │ ⭐ 4.9 (127) · Chapinero   │     │
│ │ ✓ Verificado  🛡️ Asegurado │     │
│ │ $25,000/paseo    [Ver →]   │     │
│ └─────────────────────────────┘     │
│                                     │
│ ┌─────────────────────────────┐     │
│ │ [Otra card de paseador]     │     │
│ └─────────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

### 3. Perfil de Paseador

```
Layout:
┌─────────────────────────────────────┐
│ [Navbar]                            │
├─────────────────────────────────────┤
│  ┌────────┐                         │
│  │ Avatar │  Carlos Mendoza         │
│  │ 128px  │  📍 Chapinero, Bogotá   │
│  └────────┘                         │
│                                     │
│  [✓Verificado] [🛡️Asegurado] [5años]│
│                                     │
│  ⭐ 4.9 (127 reseñas)               │
│                                     │
│  ─────────────────────────────────  │
│  Sobre Mí                           │
│  "Paseador profesional con 5..."    │
│                                     │
│  Certificaciones                    │
│  • Primeros Auxilios Caninos        │
│  • Comportamiento Animal            │
│                                     │
├──────────────┬──────────────────────┤
│              │  ┌────────────────┐  │
│   Reseñas    │  │   $25,000      │  │
│   ⭐⭐⭐⭐⭐    │  │   por paseo    │  │
│   "Excelente │  │                │  │
│    servicio" │  │ [Reservar]     │  │
│              │  │ [💬 Mensaje]   │  │
│              │  │                │  │
│              │  │ ⏱️ Respuesta   │  │
│              │  │ 🛡️ Seguro      │  │
│              │  │ 📍 GPS         │  │
│              │  │ ❤️ Bienestar   │  │
│              │  └────────────────┘  │
└──────────────┴──────────────────────┘
```

### 4. Dashboard Owner (Móvil)

```
Layout:
┌─────────────────────────────────────┐
│ [Navbar con menú hamburguesa]       │
├─────────────────────────────────────┤
│ Dashboard                           │
│ Bienvenido, Usuario Demo            │
│                                     │
│ [Tabs: Mis Reservas | Mis Mascotas] │
│                                     │
│ ┌─────────────────────────────┐     │
│ │ [Paseo]        [Confirmado] │     │
│ │                             │     │
│ │ Carlos Mendoza              │     │
│ │ 🐕 Max                      │     │
│ │ 📅 20/1/2025                │     │
│ │ 🕐 09:00                    │     │
│ │                             │     │
│ │ $25.000        [Pagado]     │     │
│ │                             │     │
│ │ [📍 Rastrear]               │     │
│ └─────────────────────────────┘     │
│                                     │
│ ┌─────────────────────────────┐     │
│ │ [Otra reserva pendiente]    │     │
│ │ [💳 Pagar]                  │     │
│ └─────────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

### 5. Dashboard Provider (Paseador)

```
Layout:
┌─────────────────────────────────────┐
│ [Navbar]                            │
├─────────────────────────────────────┤
│ Panel de Paseador                   │
│ Bienvenido, Paseador Demo           │
│                                     │
│ ┌─────────────────────────────┐     │
│ │ ● Recibiendo solicitudes    │     │
│ │ [Toggle: ON/OFF]            │     │
│ └─────────────────────────────┘     │
│                                     │
│ ┌───────┬───────┬───────┐           │
│ │🐕 2/4 │📥 3   │💰$25k │           │
│ │Capac. │Nuevas │Precio │           │
│ └───────┴───────┴───────┘           │
│                                     │
│ [Tabs: Bandeja | Agenda | Config]   │
│                                     │
│ ┌─────────────────────────────┐     │
│ │ 🐕 Max (Golden Retriever)   │     │
│ │ 👤 Usuario Demo · 5.17km    │     │
│ │ 📅 21/1/2025 · 10:00        │     │
│ │                             │     │
│ │ $25,000    ⏱️ Expira 14:32  │     │
│ │                             │     │
│ │ [❌ Rechazar] [✓ Aceptar]   │     │
│ └─────────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

### 6. Centro de Seguridad (Modal)

```
Layout:
┌─────────────────────────────────────┐
│ Centro de Seguridad         [X]    │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🆘 EMERGENCIA              │    │
│  │  [BOTÓN SOS GRANDE ROJO]    │    │
│  │  Presiona 3 segundos        │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📤 Compartir Paseo          │    │
│  │ Envía link a familiares     │    │
│  │ [Generar Link]              │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🔐 Verificación PIN         │    │
│  │ Verifica identidad          │    │
│  │ [Generar PIN]               │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 👥 Contactos de Emergencia  │    │
│  │ María García (Hermana)      │    │
│  │ +57 300 123 4567            │    │
│  │ [+ Agregar Contacto]        │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

### 7. Chat

```
Layout:
┌─────────────────────────────────────┐
│ ← Carlos Mendoza                    │
│    Paseador                         │
├─────────────────────────────────────┤
│                                     │
│         ── Hoy ──                   │
│                                     │
│                    ┌──────────────┐ │
│                    │ Hola! Estoy  │ │
│                    │ interesado...│ │
│                    │      10:15 ✓✓│ │
│                    └──────────────┘ │
│                                     │
│  ┌──────────────┐                   │
│  │ Hola! Claro, │                   │
│  │ tengo dispo- │                   │
│  │ nibilidad... │                   │
│  │ 10:18        │                   │
│  └──────────────┘                   │
│                                     │
├─────────────────────────────────────┤
│ [📎] [Escribe un mensaje...] [➤]   │
└─────────────────────────────────────┘

Mensajes propios:
- Alineación: derecha
- Background: emerald-500
- Texto: white
- Border Radius: rounded-2xl rounded-br-md

Mensajes otros:
- Alineación: izquierda
- Background: white
- Texto: stone-800
- Border Radius: rounded-2xl rounded-bl-md
- Shadow: shadow-sm
```

### 8. Menú Móvil (Sheet)

```
Layout:
┌─────────────────────────────────────┐
│ 🐾 PetTrust                    [X] │
├─────────────────────────────────────┤
│ ┌─────────────────────────────┐     │
│ │ Usuario Demo                │     │
│ │ testowner@demo.com          │     │
│ │ [Dueño]                     │     │
│ └─────────────────────────────┘     │
│ (Background: emerald-50)            │
│                                     │
│ 🏠 Inicio                           │
│                                     │
│ 🔍 Explorar                         │
│                                     │
│ 📊 Dashboard                        │
│                                     │
│ 🛡️ Centro de Seguridad (verde)     │
│                                     │
│ 💬 Mensajes              [3]        │
│                                     │
│ ─────────────────────────────────   │
│                                     │
│ ↪️ Cerrar Sesión (rojo)            │
│                                     │
├─────────────────────────────────────┤
│       PetTrust Bogotá © 2025        │
└─────────────────────────────────────┘
```

---

## 🔄 Estados y Animaciones

### Loading States

```
- Spinner: Loader2 icon de Lucide
- Animación: animate-spin
- Color: emerald-500
- Skeleton: bg-stone-200 animate-pulse
```

### Transiciones

```
- Duración estándar: 200ms
- Duración modal: 300ms
- Easing: ease-in-out
- Propiedades: opacity, transform, background-color
```

### Micro-interacciones

```
- Hover cards: scale(1.02), shadow-lg
- Click buttons: scale(0.98)
- Toggle switch: translate-x con spring
- Badge contador: pulse animation al actualizar
```

---

## 🎯 Iconografía (Lucide React)

### Navegación
- Home, Search, LayoutDashboard, Settings
- Menu (hamburguesa), X (cerrar), ArrowLeft

### Acciones
- Plus, PlusCircle, Send, Check, CheckCheck
- Edit, Trash, Share, Copy, Download

### Estados
- Loader2 (loading), AlertCircle, CheckCircle
- Clock, Calendar, MapPin

### Funcionalidades
- User, Dog, Shield, Heart, Star
- MessageCircle, Phone, Mail, CreditCard
- LogOut, LogIn

### Seguridad
- Shield, AlertTriangle, Lock, Unlock
- Eye, EyeOff, Key

---

## 📏 Responsive Breakpoints

```
- Mobile: < 640px (default)
- Tablet (sm): 640px+
- Desktop (md): 768px+
- Large (lg): 1024px+
- XL: 1280px+
```

---

## ✅ Checklist de Implementación

### Screens Requeridas (App Nativa)

1. [ ] Splash Screen
2. [ ] Onboarding (opcional)
3. [ ] Login
4. [ ] Register
5. [ ] Home/Explorar
6. [ ] Lista Paseadores
7. [ ] Lista Guarderías
8. [ ] Perfil Paseador
9. [ ] Perfil Guardería
10. [ ] Booking Flow
11. [ ] Payment (Wompi)
12. [ ] Dashboard Owner
13. [ ] Dashboard Provider
14. [ ] Provider Inbox
15. [ ] Chat Lista
16. [ ] Chat Conversación
17. [ ] Centro Seguridad
18. [ ] GPS Tracking
19. [ ] Perfil Usuario
20. [ ] Settings

### Componentes Reusables

1. [ ] Button (variants)
2. [ ] Card
3. [ ] Badge
4. [ ] Input
5. [ ] Avatar
6. [ ] Tabs
7. [ ] Modal/Dialog
8. [ ] Bottom Sheet
9. [ ] Toast/Snackbar
10. [ ] Loading Spinner
11. [ ] Empty State
12. [ ] Error State
13. [ ] List Item
14. [ ] Header/Navbar
15. [ ] Tab Bar (bottom navigation)
