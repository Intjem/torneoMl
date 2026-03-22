# Torneos MLBB Backend

Backend para el sistema de torneos Mobile Legends con API REST y WebSocket.

## 🚀 Características

- ✅ API REST completa
- ✅ Autenticación JWT segura
- ✅ Base de datos MongoDB
- ✅ WebSocket para actualizaciones en tiempo real
- ✅ Rate limiting y seguridad
- ✅ Validaciones robustas

## 📋 Requisitos

- Node.js 16+
- MongoDB Atlas (gratuito)
- Variables de entorno configuradas

## 🛠️ Instalación

1. **Clonar e instalar dependencias:**
```bash
cd backend
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus datos
```

3. **Iniciar servidor:**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🌐 Endpoints API

### Autenticación
- `POST /api/auth/login` - Login de administrador
- `GET /api/auth/me` - Obtener info del admin actual
- `POST /api/auth/setup` - Crear primer admin
- `PUT /api/auth/change-password` - Cambiar contraseña

### Torneos
- `GET /api/torneos` - Listar torneos (público)
- `GET /api/torneos/:id` - Obtener torneo específico
- `POST /api/torneos` - Crear torneo (admin)
- `PUT /api/torneos/:id` - Actualizar torneo (admin)
- `DELETE /api/torneos/:id` - Eliminar torneo (admin)
- `PUT /api/torneos/:id/bracket` - Actualizar bracket (admin)
- `POST /api/torneos/:id/knockout` - Generar llaves (admin)
- `PUT /api/torneos/:id/knockout/results` - Actualizar resultados (admin)

### Registros
- `GET /api/registros` - Listar registros (admin)
- `GET /api/registros/:id` - Obtener registro (admin)
- `POST /api/registros` - Crear registro (público)
- `PUT /api/registros/:id` - Actualizar registro (admin)
- `DELETE /api/registros/:id` - Eliminar registro (admin)
- `GET /api/registros/torneo/:torneoId` - Registros por torneo (público)
- `GET /api/registros/stats/overview` - Estadísticas (admin)

## 🔌 WebSocket Events

### Cliente → Servidor
- `join-torneo` - Unirse a actualizaciones de un torneo

### Servidor → Cliente
- `torneo-created` - Nuevo torneo creado
- `torneo-updated` - Torneo actualizado
- `torneo-deleted` - Torneo eliminado
- `registro-created` - Nuevo registro
- `registro-updated` - Registro actualizado
- `registro-deleted` - Registro eliminado
- `new-registration` - Nueva inscripción en torneo específico
- `registration-deleted` - Inscripción eliminada de torneo específico
- `bracket-updated` - Bracket actualizado
- `knockout-updated` - Llaves generadas
- `knockout-results-updated` - Resultados actualizados

## 🗄️ Base de Datos

### Modelos

#### Admin
- email (único)
- password (hash)
- role
- createdAt
- lastLogin

#### Torneo
- nombre
- fecha, hora
- tipoFormato (eliminatoria/liga)
- modalidad (individual/1v1/2v2/4v4)
- estado (inscripción/en_curso/finalizado)
- bracket (main/waitlist)
- knockoutBracket

#### Registro
- category
- torneoId
- teamName
- players (mlId, nick, role)
- captainPhone
- status
- registeredAt

## 🔒 Seguridad

- JWT tokens con expiración
- bcrypt para hash de contraseñas
- Rate limiting (100 req/15min)
- Helmet para headers seguros
- CORS configurado
- Validaciones de entrada

## 🚀 Despliegue Gratuito

### Render (Backend)
1. Crear cuenta en [render.com](https://render.com)
2. Conectar repositorio GitHub
3. Configurar variables de entorno
4. Hacer deploy automáticamente

### MongoDB Atlas
1. Crear cluster gratuito
2. Configurar whitelist de IPs
3. Obtener connection string

### Variables de Entorno en Render
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=tu_secreto_unico
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://tu-frontend.vercel.app
```

## 📝 Scripts Útiles

```bash
# Ver logs
npm logs

# Instalar nueva dependencia
npm install nombre-paquete

# Actualizar dependencias
npm update
```

## 🐛 Debug

Los errores se registran en consola. En producción, considera agregar un servicio como Logtail o similar.

## 📄 Licencia

MIT
