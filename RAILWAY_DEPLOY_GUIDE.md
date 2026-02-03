# 🚂 GUÍA COMPLETA: DEPLOY BACKEND EN RAILWAY

## 📋 PASOS A SEGUIR

### PASO 1: CREAR CUENTA EN RAILWAY (Gratis)

1. Ve a: https://railway.app
2. Click en "Login"
3. Usa tu cuenta de GitHub
4. Plan gratuito: $5 USD de crédito mensual (suficiente para MVP)

---

### PASO 2: CREAR BASE DE DATOS EN MONGODB ATLAS (Gratis)

#### 2.1 Crear Cuenta
1. Ve a: https://www.mongodb.com/cloud/atlas/register
2. Registrarse con Google/GitHub
3. Crear "Free Cluster" (M0)

#### 2.2 Configurar Cluster
1. Cloud Provider: AWS
2. Region: **us-east-1** (más cercano a Colombia)
3. Cluster Name: PetTrust
4. Click "Create Cluster" (toma 3-5 minutos)

#### 2.3 Crear Usuario de Base de Datos
1. Security > Database Access
2. Add New Database User
   - Username: `pettrust_admin`
   - Password: (genera una segura) `GuardaEstaPassword123!`
   - Database User Privileges: Atlas Admin

#### 2.4 Permitir Acceso desde Railway
1. Security > Network Access
2. Add IP Address
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Confirm

#### 2.5 Obtener Connection String
1. Database > Connect
2. Drivers > Python
3. Copiar connection string:
   ```
   mongodb+srv://pettrust_admin:<password>@pettrust.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Reemplazar `<password>` con tu password real

**Tu MONGO_URL final:**
```
mongodb+srv://pettrust_admin:GuardaEstaPassword123!@pettrust.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

---

### PASO 3: CREAR PROYECTO EN RAILWAY

#### 3.1 Nuevo Proyecto
1. Dashboard de Railway
2. Click "New Project"
3. Select: "Deploy from GitHub repo"
4. Authorize Railway en GitHub si es necesario
5. Seleccionar: `Brylopez-create/PetTrust`

#### 3.2 Configurar Root Directory
1. Settings
2. Build & Deploy
3. Root Directory: `backend`
4. Save

#### 3.3 Agregar Variables de Entorno

Click en "Variables" y agrega:

```bash
# MongoDB (tu connection string de Atlas)
MONGO_URL=mongodb+srv://<usuario>:<password>@pettrust.xxxxx.mongodb.net/?retryWrites=true&w=majority

# Nombre de base de datos
DB_NAME=pettrust_production

# Secret Key (genera una nueva)
SECRET_KEY=HInPCfApEhjdpjgMmNpjxqklwaAZpD_AQNMxLu8OQCY

# CORS (agrega tu dominio de Vercel)
CORS_ORIGINS=https://pet-trust.vercel.app,https://pettrust.co,*

# Puerto (Railway lo asigna automáticamente)
PORT=${{RAILWAY_PUBLIC_PORT}}
```

**⚠️ IMPORTANTE:** 
- Usa tu MONGO_URL real de Atlas
- Cambia SECRET_KEY por una tuya (usa el script generate_secret.py)
- Actualiza CORS_ORIGINS con tu dominio real de Vercel

---

### PASO 4: DEPLOY

1. Railway detectará automáticamente `railway.toml`
2. Click "Deploy" o espera el auto-deploy
3. Monitorea logs en tiempo real
4. Espera 3-5 minutos

**Logs esperados:**
```
✓ Installing Python 3.11
✓ Installing dependencies
✓ Starting uvicorn server
✓ Application startup complete
```

---

### PASO 5: OBTENER URL PÚBLICA

1. En tu proyecto Railway
2. Settings > Networking
3. Generate Domain
4. Obtendrás algo como:
   ```
   https://pettrust-backend-production.up.railway.app
   ```
5. **COPIA ESTA URL** ← La necesitarás para Vercel

---

### PASO 6: SEED DATA INICIAL (Primera vez)

Necesitas poblar la base de datos con datos de prueba:

**Opción A: Desde tu máquina local**
```bash
# Instalar MongoDB Compass (GUI)
# Conectar con tu MONGO_URL
# Importar colecciones desde backup
```

**Opción B: Crear un endpoint temporal**

Ya existe un admin creado automáticamente:
- Email: admin@pettrust.co
- Password: admin123

Para crear paseadores de prueba, usa el endpoint:
```bash
# Registrar un walker de prueba
curl -X POST https://tu-railway-url.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "walker1@example.com",
    "password": "password123",
    "name": "Carlos Paseador",
    "role": "walker"
  }'
```

---

### PASO 7: ACTUALIZAR FRONTEND EN VERCEL

1. Ve a tu proyecto en Vercel
2. Settings > Environment Variables
3. Edita `REACT_APP_BACKEND_URL`
4. Cambia a: `https://tu-railway-url.up.railway.app`
5. Save
6. Deployments > Latest > Redeploy

---

### PASO 8: PROBAR QUE TODO FUNCIONA

#### Test 1: Backend Health Check
```bash
curl https://tu-railway-url.up.railway.app/api/
# Respuesta esperada: {"message":"PetTrust Bogotá API v1.0"}
```

#### Test 2: Login Admin
```bash
curl -X POST https://tu-railway-url.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pettrust.co","password":"admin123"}'
# Respuesta esperada: {"token":"...", "user":{...}}
```

#### Test 3: Frontend Conectado
1. Abre: https://pet-trust.vercel.app
2. Intenta hacer login
3. Revisa que las llamadas API funcionen

---

## 🎯 CHECKLIST FINAL

- [ ] Railway proyecto creado
- [ ] MongoDB Atlas cluster activo
- [ ] Variables de entorno configuradas
- [ ] Deploy exitoso (sin errores en logs)
- [ ] URL pública generada
- [ ] Vercel actualizado con nueva URL
- [ ] API health check funciona
- [ ] Login funciona desde el frontend

---

## 💰 COSTOS

**Railway (Plan Gratuito):**
- $5 USD/mes de crédito gratis
- Uso estimado: $3-4 USD/mes (sobra para testing)
- Después de gratis: $0.000463/GB-hour

**MongoDB Atlas (Plan M0):**
- Completamente gratis
- 512 MB de storage
- Suficiente para 10K usuarios

**TOTAL: $0 USD/mes** (con planes gratuitos)

---

## 🚨 TROUBLESHOOTING

### Error: "Application failed to start"
- Verifica que `requirements.txt` tenga todas las dependencias
- Check logs en Railway para ver el error específico

### Error: "MongoServerError: Authentication failed"
- MONGO_URL incorrecto
- Password con caracteres especiales (encodea con %XX)

### Error: "CORS policy"
- Agrega tu dominio a CORS_ORIGINS
- Redeploy Railway

### Error: "502 Bad Gateway"
- Railway está iniciando (espera 30s)
- Check logs para errores en el código

---

## 📞 SIGUIENTE PASO

Una vez completado, tendrás:
✅ Backend en Railway (escalable)
✅ Frontend en Vercel (rápido)
✅ MongoDB Atlas (confiable)
✅ Todo gratis hasta cierto uso

**¿Listo para empezar? Sigue los pasos en orden y cualquier duda, pregúntame!** 🚀
