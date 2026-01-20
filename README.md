# 🐾 PetTrust Bogotá - Marketplace Premium de Cuidadores de Mascotas

<div align="center">

![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb)

**La primera plataforma en Bogotá que conecta dueños con paseadores certificados**

[Demo en Vivo](https://pettrust-bogota.preview.emergentagent.com) · [Documentación](#-documentación) · [Reportar Bug](https://github.com/Brylopez-create/PetTrust/issues)

</div>

---

## 📖 Sobre el Proyecto

PetTrust es un marketplace premium que revoluciona el cuidado de mascotas en Bogotá  y Colombia mediante:

- ✅ **Paseadores Verificados:** Background checks y certificaciones validadas
- 🗺️ **GPS en Tiempo Real:** Tracking activo durante cada paseo
- 🛡️ **Seguro Incluido:** $2M COP de cobertura por incidente
- ⭐ **Sistema de Reputación:** Calificaciones bidireccionales transparentes
- 📱 **Mobile First:** Optimizado para iOS y Android

---

## 🚀 Demo y Credenciales

**Demo en Vivo:** https://pettrust-bogota.preview.emergentagent.com

**Credenciales de prueba:**
- **Admin:** admin@pettrust.co / admin123
- **Usuario:** test@example.com / password123

---

## ⚙️ Stack Tecnológico

- **Frontend:** React 19 + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI + MongoDB + JWT Auth
- **Deployment:** Kubernetes (Emergent Platform)
- **GPS:** Simulado (listo para Google Maps API)

---

## 📦 Instalación Rápida

```bash
# Clonar
git clone https://github.com/Brylopez-create/PetTrust.git
cd PetTrust

# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend (nueva terminal)
cd frontend
yarn install
yarn start
```

---

## 📚 Documentación Completa

- 📄 [Política de Privacidad](./frontend/public/privacidad.html)
- 📋 [Términos y Condiciones](./frontend/public/terminos.html)
- 🎯 [Copy para Stores](./STORE_COPY.md)
- 📅 [Plan de Lanzamiento 90 Días](./LAUNCH_PLAN_90_DAYS.md)
- 🎨 [Design Guidelines](./design_guidelines.json)

---

## 🔐 API Endpoints Principales

```
POST   /api/auth/register       # Registro
POST   /api/auth/login          # Login
GET    /api/walkers             # Listar paseadores
POST   /api/bookings            # Crear reserva
POST   /api/bookings/:id/start  # Iniciar paseo (walker)
POST   /api/reviews             # Calificar servicio
GET    /api/tracking/:id        # GPS tracking
```

**Docs interactivas:** http://localhost:8001/docs

---

## 📱 Próximos Pasos (Stores)

1. **Semana 1-2:** Integrar Google Maps API real
2. **Semana 3:** Build Android con Capacitor
3. **Semana 4:** Submit a Google Play Store
4. **Semana 7-8:** Build iOS + App Store

Ver [LAUNCH_PLAN_90_DAYS.md](./LAUNCH_PLAN_90_DAYS.md) para roadmap completo.

---

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:
1. Fork el proyecto
2. Crea tu branch (`git checkout -b feature/NewFeature`)
3. Commit (`git commit -m 'Add: nueva funcionalidad'`)
4. Push (`git push origin feature/NewFeature`)
5. Abre un Pull Request

---

## 📞 Contacto

- **Email:** soporte@pettrust.co
- **WhatsApp:** +57 3128463555
- **Web:** https://pettrust-bogota.preview.emergentagent.com

---

<div align="center">

**Hecho con ❤️ para las familias peludas de Bogotá** 🐾

</div>
