# 🚀 Guía de Despliegue Gratuito - Torneos MLBB

## 📋 Resumen

Vamos a desplegar tu sistema de torneos completamente gratis usando:
- **Vercel** para el frontend
- **Render** para el backend  
- **MongoDB Atlas** para la base de datos

## 🗄️ Paso 1: Configurar MongoDB Atlas (Gratis)

1. **Crear cuenta**: [mongodb.com/atlas](https://mongodb.com/atlas)
2. **Crear cluster gratuito**:
   - Click "Build a Cluster"
   - Seleccionar "Shared Cluster (Free)"
   - Elegir región cercana (ej: AWS us-east-1)
   - Dejar configuración por defecto
   - Click "Create Cluster"

3. **Configurar acceso**:
   - En "Database Access", crear usuario:
     - Username: `torneos-admin`
     - Password: generar una segura
   - En "Network Access", agregar IP: `0.0.0.0/0` (permite todo)

4. **Obtener connection string**:
   - Click "Connect" → "Connect your application"
   - Copiar el string (ej: `mongodb+srv://torneos-admin:PASSWORD@cluster.mongodb.net/torneos-mlbb`)

## 🔧 Paso 2: Preparar Backend para Render

1. **Crear archivo `render.yaml`**:
```yaml
services:
  - type: web
    name: torneos-mlbb-api
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

2. **Actualizar `package.json`**:
```json
{
  "scripts": {
    "start": "node src/app.js"
  }
}
```

3. **Crear `.gitignore`**:
```
node_modules/
.env
.DS_Store
```

## 🌐 Paso 3: Desplegar Backend en Render

1. **Subir a GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/torneos-mlbb.git
git push -u origin main
```

2. **Crear cuenta en Render**: [render.com](https://render.com)

3. **Crear nuevo Web Service**:
   - Click "New +" → "Web Service"
   - Conectar repositorio GitHub
   - Seleccionar `torneos-mlbb/backend`
   - Configurar:
     - Name: `torneos-mlbb-api`
     - Runtime: `Node`
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Plan: `Free`

4. **Configurar variables de entorno**:
   ```
   MONGODB_URI=mongodb+srv://torneos-admin:TU_PASSWORD@cluster.mongodb.net/torneos-mlbb
   JWT_SECRET=tu_secreto_super_unico_y_largo_aqui
   JWT_EXPIRES_IN=7d
   PORT=10000
   NODE_ENV=production
   FRONTEND_URL=https://tu-dominio.vercel.app
   ```

5. **Obtener URL del backend**: `https://torneos-mlbb-api.onrender.com`

## 🎨 Paso 4: Preparar Frontend para Vercel

1. **Actualizar `api-client.js`** con tu URL de backend:
```javascript
this.baseURL = 'https://torneos-mlbb-api.onrender.com';
```

2. **Crear `vercel.json`**:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/$1"
    }
  ]
}
```

3. **Crear `package.json`** en la raíz:
```json
{
  "name": "torneos-mlbb-frontend",
  "version": "1.0.0",
  "scripts": {
    "build": "echo 'No build needed'"
  }
}
```

## 🚀 Paso 5: Desplegar Frontend en Vercel

1. **Crear cuenta en Vercel**: [vercel.com](https://vercel.com)

2. **Importar proyecto**:
   - Click "New Project"
   - Conectar repositorio GitHub
   - Seleccionar el repositorio
   - Configurar:
     - Framework Preset: `Other`
     - Root Directory: `./`
     - Output Directory: (dejar vacío)

3. **Configurar dominio** (opcional):
   - Puedes usar el dominio gratuito de Vercel
   - O conectar tu propio dominio

4. **Obtener URL del frontend**: `https://tu-dominio.vercel.app`

## 🔐 Paso 6: Configurar Seguridad

1. **Actualizar CORS en backend**:
   En `src/app.js`, asegurar que el CORS permita tu frontend:
```javascript
cors({
  origin: ['https://tu-dominio.vercel.app', 'http://localhost:3000'],
  credentials: true
})
```

2. **Crear primer administrador**:
   - Visita `https://tu-dominio.vercel.app/admin-api.html`
   - Click "Crear administrador"
   - Ingresa email y contraseña

## 📱 Paso 7: Probar Todo

1. **Verificar backend**: `https://torneos-mlbb-api.onrender.com/health`
2. **Verificar frontend**: `https://tu-dominio.vercel.app`
3. **Probar login admin**
4. **Crear torneo de prueba**
5. **Hacer registro de prueba**

## 🔄 Actualizaciones Futuras

Cada vez que hagas cambios:
1. Hacer push a GitHub
2. Render y Vercel se actualizan automáticamente
3. Los cambios están en vivo en minutos

## 📊 Monitoreo Gratuito

### Backend (Render)
- Logs en tiempo real
- Métricas básicas
- Uso de recursos

### Frontend (Vercel)  
- Analytics básicos
- Performance metrics
- Error tracking

## 🆓 Límites del Plan Gratuito

### Render (Backend)
- 750 horas/mes (~31 días continuos)
- Se "duerme" después de 15 min inactividad
- Tarda ~30 seg en despertar

### MongoDB Atlas
- 512MB storage
- Suficiente para miles de registros

### Vercel
- 100GB bandwidth/mes
- Ilimitado sitios estáticos

## 💡 Optimizaciones

### Para evitar "sleep" del backend:
- Crear un cron job que haga ping cada 10 min
- O usar UptimeRobot (gratis) para mantener activo

### Para mejor performance:
- Implementar cache simple
- Optimizar imágenes
- Minificar CSS/JS

## 🚨 Solución de Problemas

### Error CORS
```javascript
// En backend, asegurarse de incluir tu dominio
cors({
  origin: ['https://tu-dominio.vercel.app'],
  credentials: true
})
```

### Error de conexión MongoDB
- Verificar IP whitelist en MongoDB Atlas
- Revisar connection string
- Checar usuario/contraseña

### Frontend no carga API
- Verificar URL del backend en `api-client.js`
- Revisar variables de entorno en Render
- Checar logs del backend

## 🎉 ¡Listo!

Tu sistema de torneos está ahora en línea y funcionando 24/7 gratis. Usuarios pueden:
- Ver torneos públicos
- Registrarse para participar  
- Administradores pueden gestionar todo

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Render y Vercel
2. Verifica las variables de entorno
3. Prueba localmente primero
4. Contacta si necesitas ayuda adicional
