# CO-Cocina 🍳

CO-Cocina es una plataforma web moderna para **descubrir, buscar y guardar videos de cocina** alojados en plataformas externas (YouTube, Instagram, TikTok).

## 📌 Concepto del Producto
CO-Cocina no es un chatbot ni una aplicación centrada en la IA. Es un catálogo y buscador gastronómico ágil, visual y seguro. Los videos pertenecen a sus respectivos creadores y plataformas originales, siendo reproducidos mediante incrustación oficial (embed).

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
