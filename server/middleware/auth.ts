import { Request, Response, NextFunction } from 'express';
import { getAdminAuth, getAdminFirestore, getAppletConfig } from '../auth/firebaseAdmin';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    role: 'USER' | 'ADMIN';
    admin?: boolean;
  };
}

async function verifyWithGoogleIdentityToolkit(token: string, apiKey?: string): Promise<{ uid: string; email: string; admin?: boolean } | null> {
  if (!apiKey) return null;
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });
    if (!response.ok) return null;
    const data: any = await response.json();
    const user = data.users?.[0];
    if (!user) return null;
    let isAdmin = false;
    if (user.customAttributes) {
      try { isAdmin = JSON.parse(user.customAttributes).admin === true; } catch { /* ignore */ }
    }
    return { uid: user.localId, email: user.email || '', admin: isAdmin };
  } catch (err) {
    console.warn('Error al verificar token con Google Identity Toolkit:', err);
    return null;
  }
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token de autenticación no proporcionado' } });
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Formato de token no válido' } });

  // Mock authentication is strictly development/test-only. Never allow a
  // client-supplied mock token to authenticate when NODE_ENV is production.
  if (process.env.NODE_ENV !== 'production' && process.env.USE_MOCK_AUTH === 'true' && token.startsWith('mock-token-')) {
    const isAdmin = token.includes('admin');
    const uid = token.replace('mock-token-', '').replace('-admin', '');
    req.user = { uid: uid || 'test-user-uid', email: `${uid || 'test'}@example.com`, role: isAdmin ? 'ADMIN' : 'USER', admin: isAdmin };
    return next();
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const email = decodedToken.email || '';
    const bootstrapEmails = (process.env.ADMIN_BOOTSTRAP_EMAILS || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
    const isAdmin = decodedToken.admin === true || bootstrapEmails.includes(email.toLowerCase());
    req.user = {
      uid: decodedToken.uid,
      email,
      displayName: (decodedToken.name as string) || (decodedToken.displayName as string) || email.split('@')[0],
      photoURL: (decodedToken.picture as string) || (decodedToken.photoURL as string),
      role: isAdmin ? 'ADMIN' : 'USER',
      admin: isAdmin,
    };
    return next();
  } catch (adminErr: any) {
    console.warn('Verificación primaria de Firebase Admin falló; usando Identity Toolkit verificado:', adminErr?.message || adminErr);
  }

  const verifiedUser = await verifyWithGoogleIdentityToolkit(token, getAppletConfig().apiKey);
  if (verifiedUser) {
    const email = verifiedUser.email || '';
    const bootstrapEmails = (process.env.ADMIN_BOOTSTRAP_EMAILS || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
    const isAdmin = verifiedUser.admin === true || bootstrapEmails.includes(email.toLowerCase());
    req.user = { uid: verifiedUser.uid, email, role: isAdmin ? 'ADMIN' : 'USER', admin: isAdmin };
    return next();
  }

  return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token de sesión expirado o no válido' } });
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' } });
  if (req.user.role === 'ADMIN') return next();

  try {
    const db = getAdminFirestore();
    const docSnap = await db.collection('users').doc(req.user.uid).get();
    if (docSnap.exists && docSnap.data()?.role === 'ADMIN') {
      req.user.role = 'ADMIN';
      req.user.admin = true;
      return next();
    }
  } catch (fsErr) {
    console.warn('[requireAdmin] Advertencia al verificar Firestore role:', fsErr);
  }
  return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Acceso reservado únicamente a administradores' } });
}
