import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json' with { type: 'json' };

export const firebaseConfig = appletConfig;

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'categories', 'cat-carnes'));
    return true;
  } catch (error: any) {
    if (error?.message?.includes('client is offline') || error?.code === 'unavailable') {
      console.warn('Conexión con Firestore en modo offline.');
    }
    return false;
  }
}
