# Tucocina — Registro de hallazgos

| ID | Severidad inicial | Hallazgo | Estado | Corrección |
|---|---|---|---|---|
| TUC-SEC-001 | 🔴 Alta | Email hardcodeado podía elevar a ADMIN en backend | ✅ Corregido | Custom claim `admin == true` como única fuente |
| TUC-DATA-001 | 🔴 Alta | Catálogo descargaba colección completa para paginar | ✅ Corregido | Cursor + `limit` + `count()` |
| TUC-SEC-002 | 🟠 Media | Firebase Admin tenía fallback permisivo en producción | ✅ Corregido | Fail-closed en producción |
| TUC-SEC-003 | 🟠 Media | Reglas Firestore sin suficientes invariantes de campos | ✅ Corregido | `hasOnly()` + `diff().affectedKeys()` + custom claims |
| TUC-SEC-004 | 🔴 Alta | Validación SSRF/allowlist podía aceptar subdominios arbitrarios | ✅ Corregido | HTTPS + hosts exactos + bloqueo de rangos privados |
| TUC-DATA-002 | 🟠 Media | Favorito podía apuntar a cualquier video | ✅ Corregido | Verificación de video `PUBLISHED` |
| TUC-PERF-001 | 🟠 Media | Favoritos se cargaban completos | ✅ Corregido | Cursor pagination |
| TUC-API-001 | 🟠 Media | Reportes administrativos sin paginación | ✅ Corregido | Cursor pagination |
| TUC-API-002 | 🟠 Media | Dashboard descargaba colecciones completas | ✅ Corregido | Firestore aggregation `count()` |
| TUC-API-003 | 🟠 Media | Incremento de vistas no era atómico | ✅ Corregido | `FieldValue.increment(1)` |
| TUC-API-004 | 🟠 Media | Detalle público permitía leer estados no publicados | ✅ Corregido | Solo `PUBLISHED` |
| TUC-SEC-005 | 🔴 Alta | Frontend mantenía email hardcodeado como mecanismo de ADMIN | ✅ Corregido | `getIdTokenResult()` + custom claim `admin`; sin elevación desde cliente |
| TUC-API-005 | 🟠 Media | Frontend seguía enviando paginación por `page` aunque backend usa cursores | ✅ Corregido | Tipos, servicio API, búsqueda y catálogo admin migrados a `cursor` |
| TUC-API-006 | 🟠 Media | Contratos frontend/backend desalineados en favoritos y reportes paginados | ✅ Corregido | Respuestas `items/hasMore/nextCursor` consumidas correctamente |

## Convención

- 🔴 Alta: debe resolverse antes de producción.
- 🟠 Media: resolver antes de escala o si afecta costo/abuso.
- 🟢 Baja: mejora recomendada.

Los hallazgos no se eliminan del registro: se conservan para trazabilidad histórica.
