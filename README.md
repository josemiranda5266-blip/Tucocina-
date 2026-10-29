# CociFlash 📚

CociFlash es una plataforma web para descubrir ideas culinarias, explorar videos de cocina y consultar consejos prácticos sobre preparación, técnicas y seguridad alimentaria. Los videos se alojan en plataformas externas como YouTube, Instagram y TikTok.

## 📌 Concepto del Producto
CociFlash combina un catálogo de videos de cocina de plataformas externas con contenido editorial propio. El objetivo es aportar contexto práctico y ayudar a las personas a aprender técnicas culinarias, sin apropiarse de las obras de terceros. Los videos pertenecen a sus respectivos creadores y plataformas originales, siendo reproducidos mediante incrustación oficial (embed).

## 🛠️ Stack Tecnológico
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend**: Node.js, Express, TypeScript, Zod, SSRF Protection.
- **Base de Datos & Autenticación**: Firebase Auth (Google Sign-In), Cloud Firestore, Firebase Admin SDK.

## 🚀 Instalación y Desarrollo
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar para producción
npm run build

# 4. Verificar tipos y build
npm run verify
```

## 🔐 Seguridad y Funcionalidades
- **Autenticación Real**: Google Sign-In con verificación server-side de Firebase ID Tokens.
- **Protección SSRF**: Validación estricta de dominios externos permitidos para evitar vulnerabilidades de red.
- **Incrustación Segura**: Transformación de IDs en enlaces de embed oficiales (no iframe HTML arbitrario).
- **Panel Administrativo**: Importación segura por URL, revisión de reportes y gestión de catálogo.


## Publicidad y AdSense
La publicidad está desactivada por defecto. Para habilitar el proveedor de AdSense en una publicación, configurar únicamente el ID real de editor de la cuenta responsable y las variables `VITE_ADS_ENABLED=true`, `VITE_ADS_PROVIDER=adsense` y `VITE_ADSENSE_PUBLISHER_ID=ca-pub-...`. En el entorno del servidor, `ADSENSE_PUBLISHER_ID` permite generar `/ads.txt`. No habilitar anuncios hasta verificar el estado del sitio en AdSense, las políticas aplicables y los mecanismos de consentimiento requeridos.

El servidor expone `/robots.txt`, `/sitemap.xml` y `/ads.txt`. El último endpoint devuelve un archivo válido únicamente cuando existe un publisher ID con formato correcto.
