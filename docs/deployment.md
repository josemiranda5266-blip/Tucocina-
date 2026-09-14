# Despliegue de CO-Cocina

## Configuración de Entorno

La configuración de Firebase (Project ID, API Key, Auth Domain, Database ID) se lee automáticamente desde `firebase-applet-config.json`.

```env
PORT=3000
NODE_ENV=production

# Opcional: Lista explícita de orígenes permitidos por CORS (si no se especifica, permite orígenes del mismo host/preview)
ALLOWED_ORIGINS=https://tu-dominio.com

# Opcional: Credenciales explícitas de servicio para despliegues fuera de Google Cloud
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

> **Nota de Seguridad**: Las funciones administrativas se gestionan estrictamente a través de Firebase Custom Claims (`admin === true`). Las variables `ADMIN_EMAILS` y `VITE_ADMIN_EMAILS` son obsoletas.

## Proceso de Build y Ejecución
```bash
npm run build
npm start
```

El comando `npm run build` genera la SPA estática con Vite en `/dist` y empaqueta el servidor Express en `/dist/server.cjs` utilizando `esbuild`.
