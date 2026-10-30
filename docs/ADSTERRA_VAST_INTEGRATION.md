# Integración de Adsterra VAST en CociFlash

## Estado

Preparación técnica únicamente. Esta documentación **no activa publicidad**, no carga scripts de terceros y no modifica el reproductor publicado.

## Hallazgo que condiciona la integración

El reproductor actual de CociFlash (`src/components/VideoPlayer.tsx`) muestra videos mediante `iframe` de plataformas externas. Los videos del catálogo incluyen YouTube, Instagram, TikTok y Facebook.

Los espacios `VIDEO_BEFORE` y `VIDEO_AFTER` de `VideoDetailPage.tsx` son slots de anuncios de página; no son pausas publicitarias dentro del flujo audiovisual. Un anuncio VAST no puede insertarse de forma fiable antes de que empiece un video dentro de un iframe de terceros que CociFlash no controla.

No se debe:
- superponer un anuncio propio sobre un reproductor externo;
- interceptar o simular el botón Play de YouTube, Instagram, TikTok o Facebook;
- bloquear el acceso al video externo hasta que se vea un anuncio;
- afirmar que se mostró una impresión publicitaria cuando no hubo una reproducción VAST válida.

## Qué exige un pre-roll real

Adsterra indica que el publisher debe añadir el sitio, solicitar una unidad VAST, esperar la aprobación y copiar la etiqueta VAST aprobada. Esa etiqueta se configura dentro de un reproductor compatible con VAST; no se pega como si fuera un banner HTML común.

Flujo previsto para una fase posterior:

1. Obtener la etiqueta VAST oficial desde la cuenta Publisher de Adsterra para el dominio aprobado.
2. Incorporar un reproductor propio compatible con VAST para videos que CociFlash tenga derecho a alojar y reproducir directamente.
3. Ejecutar el pre-roll solo en esos videos propios/autorizados.
4. Al completar el anuncio, iniciar el video principal. Si no hay anuncio disponible, el tag falla o el usuario tiene bloqueadores, permitir la reproducción principal sin bloqueo.
5. Aplicar un límite de frecuencia por sesión/visitante, sin volver a pedir anuncio al pausar/reanudar.
6. Medir por separado solicitudes, anuncios servidos, reproducciones completadas y fallos; no contar solicitudes como impresiones.

## Estrategia compatible con el catálogo actual

- **Videos externos embebidos:** conservar el reproductor oficial de cada plataforma y no insertar pre-roll propio dentro de sus iframes. Los slots de página existentes pueden utilizarse para formatos display permitidos por la red, una vez implementado el proveedor y aprobados los códigos concretos.
- **Videos propios o con licencia/permiso de reproducción:** evaluar un reproductor VAST dedicado. La etiqueta VAST y el reproductor deben probarse juntos en escritorio y móvil.
- **Fallo publicitario:** nunca impedir que el visitante acceda al contenido por ausencia de anuncios.

## Datos pendientes antes de activar

- Dominio aprobado en Adsterra.
- Etiqueta VAST exacta emitida por Adsterra (no inventar ni reutilizar una etiqueta de ejemplo).
- Confirmación del tipo de inventario permitido por Adsterra para el contenido y tráfico del sitio.
- Fuente de videos propios/autorizados y derechos para alojarlos o reproducirlos en un reproductor propio.
- Reproductor VAST elegido, licencia/costos si los hubiera y compatibilidad móvil.
- Política de privacidad/cookies y divulgación publicitaria apropiadas para las tecnologías que finalmente se carguen.

## Referencia oficial

Tutorial de Adsterra: https://adsterra.com/blog/es/monetizar-sitio-web-con-vast-video-ads/

La guía explica que la etiqueta VAST se obtiene después de añadir/aprobar el sitio y se integra en un reproductor compatible (por ejemplo, Video.js con plugin VAST u otro reproductor que soporte VAST).

## Criterio de aceptación para la implementación futura

- Sin etiqueta VAST configurada: no se carga publicidad VAST ni se altera el reproductor.
- Etiqueta válida y reproductor compatible: pre-roll solo en contenido propio/autorizado.
- Sin fill, timeout, error de VAST o bloqueo del anuncio: el video principal comienza sin bloqueo.
- El anuncio no se repite por pausa/reanudación.
- Los iframes externos siguen funcionando sin overlays ni interceptaciones.
- La integración no cambia el catálogo, favoritos, comentarios, reportes, analítica existente ni administración.
