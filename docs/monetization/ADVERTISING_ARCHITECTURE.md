# SaborClick — Arquitectura de Monetización Publicitaria

## Estado y alcance de la integración Adsterra

Se incorporan dos unidades proporcionadas por el propietario desde su panel de Adsterra:
- Native Banner: script /21/295a4cea70299fca7890e4ac7af65489, ubicado en HOME_MIDDLE.
- Banner iframe 300 × 250: script /22/e1ab3355ac39411bfd3f2c4dee527a05, ubicado en HOME_TOP.

Los anuncios permanecen desactivados por defecto. Ningún script se ejecuta salvo que se habiliten explícitamente la configuración global, el proveedor y el placement.

## Activación controlada

Configurar en el entorno de compilación de Vite solo cuando se decida probar la publicidad:

```env
VITE_ADS_ENABLED=true
VITE_ADS_PROVIDER=adsterra
VITE_ADSTERRA_NATIVE_ENABLED=true
VITE_ADSTERRA_300X250_ENABLED=true
```

Para probar un formato individual, activar su variable y dejar la otra en false. Para apagar toda la publicidad, usar VITE_ADS_ENABLED=false o VITE_ADS_PROVIDER=none.

## Ubicaciones y límites

| Placement | Formato | Estado por defecto |
|---|---|---|
| HOME_TOP | Banner 300 × 250 | Desactivado |
| HOME_MIDDLE | Native Banner | Desactivado |
| SEARCH_MIDDLE | — | Desactivado |
| CATEGORY_TOP | — | Desactivado |
| CATEGORY_MIDDLE | — | Desactivado |
| VIDEO_BEFORE | — | Desactivado |
| VIDEO_AFTER | — | Desactivado |
| VIDEO_MIDDLE | — | Desactivado |

No se insertan anuncios antes, durante ni después del reproductor. Ambos formatos se limitan a la página de inicio.

## Implementación técnica

- Los scripts se inyectan desde un efecto React después de montar el slot, nunca durante el render.
- Cada formato tiene un identificador de script para evitar inserciones repetidas.
- El bloque 300 × 250 define window.atOptions antes de cargar su script.
- El Native Banner usa el contenedor con el ID exacto entregado por el panel.
- No se acepta código arbitrario desde usuarios ni parámetros de URL.
- Se conservan los proveedores existentes: AdSense, patrocinio directo y proveedor nulo.

## Verificaciones pendientes antes de activar

1. Ejecutar npm run verify en un entorno con dependencias instaladas.
2. Probar en staging ambos formatos, primero individualmente y luego juntos.
3. Verificar que los anuncios renderizados correspondan al inventario esperado en el panel de Adsterra.
4. Revisar política de privacidad, consentimiento aplicable y CSP del hosting.
5. Comprobar móvil y escritorio y confirmar que no haya superposición con el reproductor.

La integración queda en una rama de trabajo; no implica merge ni despliegue.
