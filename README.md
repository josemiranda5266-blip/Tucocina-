# SaborClick 📚

SaborClick es una plataforma web para **descubrir, buscar y guardar videos de aprendizaje práctico**: cocina, pastelería, oficios técnicos, trabajos manuales, tecnología y habilidades laborales. Los videos se alojan en plataformas externas como YouTube, Instagram y TikTok.

## 📌 Concepto del Producto
SaborClick es un catálogo y buscador audiovisual, no un chatbot. Su objetivo es facilitar el acceso a tutoriales y demostraciones prácticas, respetando a los creadores y las plataformas originales. Los videos pertenecen a sus respectivos creadores y plataformas originales, siendo reproducidos mediante incrustación oficial (embed).

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
