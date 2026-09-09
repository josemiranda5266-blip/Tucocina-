# Despliegue de CO-Cocina

## Variables de Entorno Requeridas

```env
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://tu-dominio.com

# Firebase Admin Credentials
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

## Proceso de Build
```bash
npm run build
npm start
```

El comando `npm run build` genera la SPA estática con Vite en `/dist` y empaqueta el servidor Express en `/dist/server.cjs` utilizando `esbuild`.
