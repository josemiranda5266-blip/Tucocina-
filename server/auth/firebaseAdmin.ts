import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

export function getFirebaseAdmin(): App {
  if (!adminApp) {
    const apps = getApps();
    if (apps.length > 0) {
      adminApp = apps[0]!;
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const isProduction = process.env.NODE_ENV === 'production';

      if (projectId && clientEmail && privateKey) {
        adminApp = initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });
      } else if (isProduction) {
        throw new Error('Firebase Admin no está configurado: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY son obligatorios en producción.');
      } else {
        // Local development may use Application Default Credentials (ADC).
        adminApp = initializeApp();
      }
    }
  }
  return adminApp;
}

export function getAdminAuth() {
  getFirebaseAdmin();
  return getAuth();
}

export function getAdminFirestore() {
  getFirebaseAdmin();
  return getFirestore();
}
