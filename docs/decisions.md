# Registro de Decisiones de Arquitectura (ADR)

## ADR 001: Elección de Entidad Principal "Video"
- **Decisión**: La entidad principal del modelo de datos es `Video` en lugar de `Recipe`.
- **Razón**: El producto es un catálogo indexador de videos externos, no un generador o creador de recetas escritas paso a paso.

## ADR 002: Estado Inicial 'DRAFT' en Importación
- **Decisión**: Todos los videos importados por URL ingresan por defecto con `status: 'DRAFT'`.
- **Razón**: Requiere aprobación o publicación explícita por parte de un administrador para evitar la publicación automática de contenido inadecuado o inapropiado.

## ADR 003: IA Opcional / No Crítica
- **Decisión**: Gemini es completamente opcional y no participa en el flujo principal del sitio.
- **Razón**: Reducción de costos, prevención de fallos cuando la API Key está ausente y enfoque estricto en la experiencia de búsqueda rápida.
