# Security Verification Checklist - Phase 1

- [x] Autenticación real implementada con Firebase Auth (Google Sign-In)
- [x] Autorización server-side mediante token ID Bearer en backend Express
- [x] Verificación de rol administrativo en backend (`requireAdmin`)
- [x] Reglas de seguridad de Firestore configuradas con default deny
- [x] `.env` excluido de control de versiones y `.env.example` creado
- [x] Configuración de CORS restrictiva configurable por variable de entorno
- [x] Rate limiting activado en Express para prevenir ataques de saturación
- [x] Validación de schemas con Zod en endpoints de entrada
- [x] Límite de tamaño de body en Express (`100kb`)
- [x] Protección SSRF activa para URLs externas con allowlist de dominios
- [x] Bloqueo de IPs privadas / locales
- [x] Embeds generados únicamente desde IDs validados sin HTML inseguro
- [x] Sanitización de respuestas de error sin stack traces
- [x] Paginación en endpoints de catálogo y administración
- [x] Persistencia real en Firestore (sin arrays globales en memoria)
- [x] IDs seguros y únicos
