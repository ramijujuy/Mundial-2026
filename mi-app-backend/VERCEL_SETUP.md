# Backend Serverless para Vercel

## Estructura de Archivos

```
mi-app-backend/
├── api/
│   └── index.js          # Función serverless principal
├── models.js             # Esquemas de MongoDB (compartidos)
├── middleware.js         # Middleware de autenticación (compartido)
├── routes/
│   ├── auth.js
│   ├── admin.js
│   ├── pronosticos.js
│   ├── fixtures.js
│   └── rankings.js
├── index.js              # Entry point para desarrollo local
├── vercel.json           # Configuración de Vercel
├── package.json
└── .env                  # Variables de entorno
```

## Variables de Entorno Requeridas

Asegúrate de que tu `vercel.json` proyecto tiene estas variables:

- `MONGO_URI` - URL de conexión a MongoDB Atlas
- `JWT_SECRET` - Secret para tokens JWT
- `ADMIN_USERNAME` - Usuario admin por defecto
- `ADMIN_PASSWORD` - Contraseña admin por defecto

## Cómo Funciona

1. **Desarrollo Local**: Ejecuta `npm start` que corre `index.js` → que importa `api/index.js` como Express app
2. **Vercel Production**: Vercel detecta `api/index.js` como función serverless y la ejecuta automáticamente

## Notas Importantes

- La carpeta `api/` es requerida por Vercel. No renombres ni la muevas.
- El `api/index.js` exporta una función que acepta `(req, res)` para Vercel
- También exporta el objeto `app` para desarrollo local
- La conexión a MongoDB se establece una sola vez gracias a `mongoose.connection.readyState`
