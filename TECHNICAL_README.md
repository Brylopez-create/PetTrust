# 🐾 PetTrust Bogotá - Arquitectura de Alto Rendimiento

Este repositorio contiene la implementación de **PetTrust**, el primer marketplace de cuidadores de mascotas en Bogotá optimizado bajo estándares de ingeniería de software de primer nivel. No es solo una app de perros; es un sistema diseñado para la perfección técnica.

## 🏆 El "Póquer de 100" (Google Lighthouse)

PetTrust ha sido diseñado para alcanzar y mantener el **100%** en las cuatro métricas principales de Lighthouse:

*   **Performance:** Uso de CSS Crítico Inline, formatos **WebP**, Lazy Loading nativo, compresión **Gzip/Brotli** y una estrategia de caché **Stale-While-Revalidate** mediante Service Workers.
*   **Accessibility:** Cumplimiento estricto de **WCAG 2.1 AAA**. Jerarquía semántica de encabezados, foco de teclado visible, y ratios de contraste superiores a 7.0 para legibilidad universal.
*   **Best Practices:** Servido sobre **HTTPS** (HSTS enabled), sin vulnerabilidades en librerías, y con una arquitectura que minimiza el Total Blocking Time (TBT).
*   **SEO:** Jerarquía de rastreo optimizada con `sitemap.xml` y `robots.txt`, meta-etiquetas Open Graph completas y una estructura semántica perfecta para el motor de búsqueda de Google.

---

## 🚀 Innovaciones Técnicas

### 🛡️ Ciberseguridad Proactiva (Seguridad de Nivel Platino)
Para garantizar el 100% en *Best Practices* y proteger los datos de mascotas y dueños, implementamos una estrategia de **Defensa en Profundidad**:
*   **Sesiones Blindadas (HttpOnly Cookies):** Migramos la gestión de sesiones de `localStorage` a Cookies `HttpOnly` y `Secure` con política `SameSite=Lax`. Esto hace que los tokens sean **invisibles para JavaScript**, neutralizando por completo el robo de sesiones mediante ataques XSS.
*   **Content Security Policy (CSP) Estricta:** Bloqueo proactivo de ataques XSS, Clickjacking e inyecciones de datos, permitiendo solo fuentes de confianza (Google Fonts, OpenStreetMap, Cloudinary).
*   **Defensa contra Fuerza Bruta:** Rate Limiting robusto mediante `slowapi`, restringiendo intentos de login a 5 cada 15 minutos para prevenir ataques automatizados.
*   **Headers de Grado Bancario:** Implementación de `HSTS` (con preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Referrer-Policy`.

### 🧠 PetMatch v1: El "Cerebro" de Emparejamiento
Hemos implementado un algoritmo de matching inteligente que va más allá de un simple filtro, puntuando a los paseadores en una escala de 0 a 100:
*   **Proximidad Geográfica (40 pts):** Cálculo mediante la fórmula de Haversine para encontrar paseadores en un radio de hasta 3km, con decaimiento lineal de puntuación.
*   **Reputación Dinámica (30 pts):** Combina el rating promedio (20 pts) con un bonus por volumen de reviews verificadas (10 pts).
*   **Compatibilidad de Especie (30 pts):** Analiza el peso de la mascota frente a los años de experiencia del paseador (ej: perros grandes >20kg requieren paseadores senior).
*   **Disponibilidad en Tiempo Real:** Filtro estricto por slots horarios disponibles y capacidad actual (`capacity_current < capacity_max`).

### 🛰️ Tracking GPS de Siguiente Generación
Para ofrecer una experiencia premium en el seguimiento de paseos, implementamos:
*   **GPS Smoothing (Lerp):** Algoritmo de interpolación lineal que suaviza el movimiento del paseador en el mapa a 60fps, evitando los "saltos" cada vez que se recibe una coordenada.
*   **Skeleton Screens:** Eliminación total del *Cumulative Layout Shift* (CLS) mediante pantallas de esqueleto que mantienen la estructura visual mientras el mapa carga.

### 📊 Real User Monitoring (RUM)
Integramos un **Performance Monitor** ligero basado en Core Web Vitals. La aplicación captura datos reales de carga (LCP, FID, CLS) desde los dispositivos de los usuarios y los envía al backend mediante `navigator.sendBeacon`, permitiendo optimizar el servicio basándonos en condiciones reales de red en Bogotá.

### 🛡️ Resiliencia Offline (PWA)
PetTrust es una **Progressive Web App**. Gracias a nuestro Service Worker avanzado, la aplicación es capaz de:
*   Cargar instantáneamente mediante activos pre-cacheados.
*   Funcionar en zonas de baja señal (parques o ascensores).
*   Permitir la instalación como App nativa en iOS y Android con shortcuts personalizados.

---

## ⚙️ Stack Tecnológico Pro

*   **Frontend:** React 19 + Tailwind CSS + Leaflet (Mapas).
*   **Backend:** FastAPI modular + MongoDB (Motor Async).
*   **Seguridad:** JWT Auth + Headers de seguridad estrictos (HSTS, No-Sniff, X-Frame).
*   **Infraestructura:** Compresión Gzip dinámica y manejo de caché inteligente.

---

## 🛠️ Instalación y Carga

```bash
# Servir el backend (Auto-optimizado con Gzip y Headers)
cd backend
pip install -r requirements.txt
uvicorn app.main:app

# Probar la landing ultra-optimizada
# URL disponible: /landing-optimizada
```

---

<div align="center">
Hecho con ❤️ y un enfoque obsesivo por el rendimiento. PetTrust Bogotá es la prueba de que el código limpio y la ingeniería avanzada pueden transformar el cuidado de mascotas.
</div>
