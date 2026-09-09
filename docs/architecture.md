# Arquitectura de CO-Cocina

## Visión General
CO-Cocina adopta una arquitectura en capas separada entre Frontend (React + Vite) y Backend (Express + Node.js), respaldada por Cloud Firestore y Firebase Auth.

```
[ Cliente React SPA ] 
        │
   (HTTPS / Bearer Token)
        ▼
[ Express API Server (Node.js) ]
  ├── Security & SSRF Middleware
  ├── Auth Middleware (Firebase Admin Token Verification)
  ├── Connector Adapters (YouTube, Instagram, TikTok)
  └── Rate Limiter & Input Validation (Zod)
        │
        ▼
[ Google Cloud Firestore Database ]
```

## Módulos Principales
- **Connectors**: Adaptadores que parsean URLs de YouTube, Instagram y TikTok para extraer IDs limpios y construir URLs de embed seguras.
- **SSRF Guard**: Validación estricta contra IPs privadas y dominios fuera de la allowlist.
- **Auth & RBAC**: Verificación server-side de tokens. El usuario normal únicamente administra sus propios favoritos.
