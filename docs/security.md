# Seguridad en CO-Cocina

## Medidas de Seguridad Clave

1. **Protección contra SSRF (Server-Side Request Forgery)**
   - Ningún request saliente arbitrario.
   - Allowlist de dominios permitidos: `youtube.com`, `instagram.com`, `tiktok.com`.
   - Bloqueo de direcciones IP locales/privadas (`127.0.0.1`, `10.x.x.x`, `172.16.x.x`, `192.168.x.x`, `169.254.x.x`, `::1`).

2. **Incrustación de Embeds Segura**
   - No se acepta HTML o `<iframe>` crudo enviado por el usuario.
   - Generación de `embedUrl` únicamente a partir de identificadores validados mediante expresiones regulares.

3. **Autenticación y Autorización Server-Side**
   - El rol administrativo se verifica en cada request mediante `verifyIdToken` de Firebase Admin.
   - Nunca se confía en parámetros enviados por el frontend (`isAdmin=true`).

4. **Reglas de Seguridad de Firestore**
   - Lectura pública restringida a documentos con `status == "PUBLISHED"`.
   - Modificación de catálogo exclusiva para administradores.
   - Subcolección `favorites` aislada por `request.auth.uid`.

5. **Rate Limiting e Inmutabilidad**
   - Límite de peticiones por ventana de tiempo en endpoints sensibles (reportes, búsqueda, importación).
   - Sanitización con Zod.
