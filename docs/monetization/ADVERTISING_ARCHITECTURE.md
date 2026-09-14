# Tucocina — Arquitectura de Monetización Publicitaria

## Visión General y Objetivo

El objetivo de esta arquitectura es preparar técnicamente a **Tucocina** para incorporar monetización publicitaria en el futuro sin modificar la estructura de las páginas consumidoras ni degradar la experiencia de usuario o la velocidad de carga.

El modelo conceptual es:

```text
Tucocina  --->  Contenido Gratuito  --->  Publicidad Desacoplada  --->  Ingresos
```

Actualmente, **LA PUBLICIDAD PERMANECE TOTALMENTE DESACTIVADA (`ads.enabled = false`)**. No se renderiza ningún espacio publicitario vacío, no se descargan scripts externos y no se realizan peticiones de red hacia servidores publicitarios.

---

## Estado Actual

```text
=====================================================
CURRENT STATUS: ADVERTISEMENT DISABLED
VITE_ADS_ENABLED=false
VITE_ADS_PROVIDER=none
=====================================================
```

- **Anuncios visibles**: Ninguno.
- **Banners / Placeholders**: Ninguno (los componentes `<AdSlot />` devuelven `null` con cero huella en el DOM).
- **Scripts externos**: Ninguno.
- **Impacto en Layout/Core Web Vitals**: Cero.

---

## Arquitectura y Capa de Abstracción

La aplicación no depende de ningún proveedor publicitario específico (como Google AdSense). En su lugar, utiliza un patrón de diseño Estrategia y Desacoplamiento mediante una capa independiente en `src/components/ads/` y `src/services/ads/`:

```text
[ Vistas React (HomePage, VideoDetailPage, SearchPage, CategoriesPage) ]
                                   │
                                   ▼
                         [ Componente <AdSlot /> ]
                                   │
                                   ▼
                          [ Provider Factory ]
                                   │
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
    [ NullAdProvider ]     [ AdsenseProvider ]  [ DirectSponsorProvider ]
   (Inerte / Por defecto)      (Inactivo / Futuro)     (Inactivo / Futuro)
```

### Componentes Clave

1. **`src/services/ads/adTypes.ts`**:
   - Define los tipos de ubicaciones (`AdPlacement`), formato (`AdFormat`), tipos de proveedor (`AdProviderType`), e interfaz de configuración.

2. **`src/services/ads/adConfig.ts`**:
   - Centraliza la lectura de configuración desde variables de entorno (`VITE_ADS_ENABLED`, `VITE_ADS_PROVIDER`, `VITE_ADSENSE_PUBLISHER_ID`).
   - Aplica un **principio de seguridad estricto**: si no hay credenciales ni proveedor válido, la publicidad se fuerza a estar deshabilitada (`enabled = false`).

3. **`src/services/ads/AdProvider.ts`**:
   - Interfaz `IAdProvider` desacoplada.
   - `NullAdProvider`: Implementación por defecto que retorna `null` y no realiza peticiones.
   - `AdsenseProvider`: Estructura para futura integración con Google AdSense.
   - `DirectSponsorProvider`: Estructura para futuras campañas con marcas o marcas gastronómicas.

4. **`src/components/ads/AdSlot.tsx`**:
   - Componente reutilizable utilizado en la UI:
     ```tsx
     <AdSlot placement="HOME_TOP" />
     ```
   - Retorna `null` de inmediato cuando `ads.enabled === false`.

---

## Posiciones Reservadas (Placements)

Se han dispuesto puntos estratégicos en las vistas de la aplicación:

- `HOME_TOP`: Parte superior de la página principal.
- `HOME_MIDDLE`: Entre las categorías y las recetas populares.
- `SEARCH_MIDDLE`: Entre la barra de filtros y los resultados de búsqueda.
- `CATEGORY_TOP`: Encabezado de la vista de categorías.
- `CATEGORY_MIDDLE`: Dentro de la grilla de categorías.
- `VIDEO_BEFORE`: Inmediatamente antes del reproductor de video.
- `VIDEO_AFTER`: Inmediatamente después del bloque de metadatos de la receta.
- `VIDEO_MIDDLE`: Intermedio en la sección de interacción del video.

*Nota:* Cada ubicación puede activarse o desactivarse de forma independiente en la configuración centralizada sin alterar las demás.

---

## Guía de Integración Futura para Google AdSense

Cuando Tucocina cuente con un dominio propio aprobado y una cuenta de AdSense válida, se seguirán estos pasos:

1. **Configurar Variables de Entorno en Servidor / Despliegue**:
   ```env
   VITE_ADS_ENABLED=true
   VITE_ADS_PROVIDER=adsense
   VITE_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXXXXX
   ```

2. **Carga del Script Oficial**:
   En `AdsenseProvider.ts`, el método `init()` inyectará el script oficial de Google AdSense de forma asíncrona:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXX" crossorigin="anonymous"></script>
   ```

3. **Renderizado de Ad Units**:
   El método `renderSlot()` de `AdsenseProvider` generará la etiqueta oficial:
   ```html
   <ins class="adsbygoogle"
        style="display:block"
        data-ad-client="ca-pub-XXXXXXXXXXXXX"
        data-ad-slot="1234567890"
        data-ad-format="auto"
        data-full-width-responsive="true"></ins>
   ```

---

## Guía de Integración Futura para Publicidad Directa (Sponsors)

Para acuerdos comerciales directos con restaurantes, utensilios o marcas gastronómicas:

1. Configurar `VITE_ADS_PROVIDER=direct_sponsor`.
2. Implementar `DirectSponsorProvider.ts` para obtener banners o patrocinios desde una API o archivo de campañas interno.
3. El componente `<AdSlot />` continuará funcionando de forma idéntica sin tocar las páginas consumidoras.

---

## Privacidad, Consentimiento y CMP

- **Reglamentos Afectados**: GDPR (Europa), ePrivacy, CCPA (California).
- **Requisito Antes de Activar Publicidad**:
  - Implementar una Plataforma de Gestión de Consentimiento (CMP) certificada por IAB TCF v2.2.
  - Asegurar que no se carguen scripts de seguimiento publicitario ni cookies personalizadas antes de que el usuario acepte el consentimiento.
- **Estado Actual**: No se recopilan ni almacenan datos publicitarios.

---

## Requisitos de Archivo `ads.txt`

El archivo `ads.txt` previene la venta no autorizada de inventario publicitario.

- **REGLA IMPORTANTE**: No crear un archivo `ads.txt` inventado o con datos falsos.
- **Cuándo crearlo**: Una vez que la cuenta de AdSense o la red publicitaria esté aprobada y se asigne el Publisher ID real.
- **Ubicación futura**: `/public/ads.txt`.
- **Ejemplo futuro**:
  ```text
  google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
  ```

---

## Rendimiento y Seguridad

1. **Impacto en Bundle**: Menor a 2 KB (solo la abstracción de tipos y proveedor inerte).
2. **Cero Peticiones Innecesarias**: En estado deshabilitado, no hay peticiones HTTP salientes a adservers.
3. **Seguridad**: No se aceptan etiquetas HTML o scripts arbitrarios desde inputs de usuarios o administradores. Todo el flujo está controlado por código tipado en TypeScript.

---

## Pre-Activation Checklist (Lista de Verificación previa a la Activación)

- [ ] Dominio propio registrado y en producción con HTTPS.
- [ ] Solicitud de Google AdSense aprobada para el dominio.
- [ ] Publisher ID oficial (`ca-pub-XXXXXXXXXXXXX`) verificado.
- [ ] CMP / Banner de consentimiento de cookies instalado si aplica a la región.
- [ ] Archivo `public/ads.txt` subido con las líneas oficiales proporcionadas por el proveedor.
- [ ] Pruebas en ambiente Staging con `VITE_ADS_ENABLED=true` confirmando que los anuncios responden y no rompen el layout en dispositivos móviles.
