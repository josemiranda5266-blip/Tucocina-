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
| TUC-API-007 | 🟠 Media | Estado `DISMISSED` del backend no coincidía con `REJECTED` del dominio/frontend | ✅ Corregido | Contrato unificado en `REJECTED` |
| TUC-SEC-006 | 🟠 Media | Frontend confiaba directamente en `embedUrl`/`originalUrl` persistidos para iframe y navegación externa | ✅ Corregido | Allowlist por plataforma + HTTPS + rutas de embed esperadas |
| TUC-AUTH-001 | 🟠 Media | OAuth Google usaba popup también en navegadores móviles | ✅ Corregido | Redirect en dispositivos/navegadores con pointer coarse; popup en desktop |
| TUC-FE-001 | 🟢 Baja | Metadatos HTML conservaban branding histórico `CO-Cocina` en el nuevo producto | ✅ Corregido | `<title>`, Open Graph, Twitter y descripción actualizados a Tucocina |
| TUC-BUILD-001 | 🟠 Media | Persistía infraestructura específica del prototipo AI Studio sin función para el MVP | ✅ Corregido | Eliminado plugin de medios AI Studio y placeholder `public/assets/aistudio` |
| TUC-A11Y-001 | 🟢 Baja | Header tenía navegación/iconos sin semántica accesible suficiente | ✅ Corregido | Botón semántico para marca, `nav` etiquetado, `aria-label`, `aria-expanded` y `aria-hidden` |
| TUC-NAV-001 | 🟠 Media | Navegación era estado local: URLs no representaban pantallas y refresh/back perdían contexto | ✅ Corregido | Rutas `/buscar`, `/categorias`, `/favoritos`, `/video/:id`, `/admin`; History API + `popstate` |
| TUC-DATA-003 | 🟠 Media | Consultas compuestas de Firestore no tenían configuración de índices versionada | ✅ Corregido | Añadidos `firestore.indexes.json` y `firebase.json` con índices de catálogo/reportes |
| TUC-CI-001 | 🟠 Media | No había pipeline automatizado de typecheck/build para detectar regresiones antes de release | ✅ Corregido | GitHub Actions con Bun, typecheck, test y build en push/PR |
| TUC-API-008 | 🟠 Media | Conteo `count()` en catálogo de videos se aplicaba sobre la consulta ya modificada con cursor | ✅ Corregido | Se utiliza `baseQuery` antes de aplicar `startAfter` |
| TUC-API-009 | 🟠 Media | Filtros de estado `.where()` en panel administrativo se ejecutaban tras `.orderBy()` | ✅ Corregido | `.where()` posicionado previo a `.orderBy()` acorde a las reglas de Firestore |
| TUC-SEC-007 | 🟠 Media | Inconsistencia de esquema de campos y falta de invariantes en reglas de reportes | ✅ Corregido | `firestore.rules` actualizado con la lista de campos exacta e invariante `status == 'OPEN'` |
| TUC-SEC-008 | 🟠 Media | CORS en modo desarrollo bloqueaba peticiones con header `Origin` cuando `ALLOWED_ORIGINS` estaba vacío | ✅ Corregido | Permitidas solicitudes en desarrollo previa validación si la lista no está configurada |
| TUC-CI-002 | 🟠 Media | El flujo de trabajo de CI no ejecutaba la suite de pruebas automatizadas | ✅ Corregido | Se integró el paso `bun run test` en `.github/workflows/ci.yml` |
| TUC-SEC-009 | 🟠 Media | Función `isAdmin()` en `firestore.rules` podía provocar error en evaluación al no comprobar si `admin` existía en `request.auth.token` | ✅ Corregido | Se usó `('admin' in request.auth.token) && request.auth.token.admin == true` |
| TUC-SEC-010 | 🟠 Media | Regla de lectura pública de `/videos/{videoId}` intentaba acceder a `resource.data` sin validar `resource != null` | ✅ Corregido | Se añadió salvaguarda `resource != null` para evitar runtime errors en documentos inexistentes |
| TUC-TEST-001 | 🔴 Alta | Cobertura de Security Rules no contaba con ejecuciones automatizadas contra Firebase Local Emulator Suite | ✅ Corregido | Implementada suite en `tests/rules.test.ts` con Java 21 y Firebase Emulator ejecutando 28 aserciones |

## Convención

- 🔴 Alta: debe resolverse antes de producción.
- 🟠 Media: resolver antes de escala o si afecta costo/abuso.
- 🟢 Baja: mejora recomendada.

Los hallazgos no se eliminan del registro: se conservan para trazabilidad histórica.
