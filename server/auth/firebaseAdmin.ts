import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

export interface AppletConfig {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  oAuthClientId?: string;
}

export function getAppletConfig(): AppletConfig {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Advertencia al leer firebase-applet-config.json:', err);
  }
  return {};
}

export function getFirebaseAdmin(): App {
  if (!adminApp) {
    const apps = getApps();
    if (apps.length > 0) {
      adminApp = apps[0]!;
    } else {
      const appletConfig = getAppletConfig();
      const projectId = process.env.FIREBASE_PROJECT_ID || appletConfig.projectId || 'gen-lang-client-0084774429';
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (projectId && clientEmail && privateKey) {
        adminApp = initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          projectId,
        });
      } else {
        // Initialize with the exact Firebase Project ID so ID tokens can be verified
        adminApp = initializeApp({
          projectId,
        });
      }
    }
  }
  return adminApp;
}

export function getAdminAuth() {
  const app = getFirebaseAdmin();
  return getAuth(app);
}

export function getAdminFirestore() {
  const app = getFirebaseAdmin();
  const appletConfig = getAppletConfig();
  const dbId = process.env.FIRESTORE_DATABASE_ID || appletConfig.firestoreDatabaseId || '(default)';
  return getFirestore(app, dbId);
}

