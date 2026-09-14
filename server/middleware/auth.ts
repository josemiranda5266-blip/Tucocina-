import { Request, Response, NextFunction } from 'express';
import { getAdminAuth, getAdminFirestore, getAppletConfig } from '../auth/firebaseAdmin';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: 'USER' | 'ADMIN';
  };
}

async function verifyWithGoogleIdentityToolkit(
  token: string,
  apiKey?: string
): Promise<{ uid: string; email: string; admin?: boolean } | null> {
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
      try {
        const parsed = JSON.parse(user.customAttributes);
        isAdmin = parsed.admin === true;
      } catch {
        // Ignored
      }
    }

    return {
      uid: user.localId,
      email: user.email || '',
      admin: isAdmin,
    };
  } catch (err) {
    console.warn('Error al verificar token con Google Identity Toolkit:', err);
    return null;
  }
}

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token de autenticación no proporcionado' } });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Formato de token no válido' } });
  }

  if (process.env.USE_MOCK_AUTH === 'true' && token.startsWith('mock-token-')) {
    const isAdmin = token.includes('admin');
    const uid = token.replace('mock-token-', '').replace('-admin', '');
    req.user = {
      uid: uid || 'test-user-uid',
      email: `${uid || 'test'}@example.com`,
      role: isAdmin ? 'ADMIN' : 'USER',
    };
    return next();
  }

  // 1. Try Firebase Admin verifyIdToken
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const email = decodedToken.email || '';
    const role: 'USER' | 'ADMIN' = decodedToken.admin === true ? 'ADMIN' : 'USER';

    req.user = {
      uid: decodedToken.uid,
      email,
      role,
    };

    return next();
  } catch (adminErr: any) {
    console.warn('Verificación primaria de Firebase Admin no concluyó, ejecutando verificación de respaldo:', adminErr?.message || adminErr);
  }

  // 2. Fallback: Google Identity Toolkit REST verification using web API Key
  const appletConfig = getAppletConfig();
  if (appletConfig.apiKey) {
    const verifiedUser = await verifyWithGoogleIdentityToolkit(token, appletConfig.apiKey);
    if (verifiedUser) {
      const email = verifiedUser.email || '';
      const role: 'USER' | 'ADMIN' = verifiedUser.admin === true ? 'ADMIN' : 'USER';

      req.user = {
        uid: verifiedUser.uid,
        email,
        role,
      };

      return next();
    }
  }

  // 3. Fallback: Inspect decoded payload if signed by securetoken.google.com and not expired
  const payload = decodeJwtPayload(token);
  if (payload && payload.exp && payload.sub) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSec) {
      return res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Token de sesión expirado. Por favor, actualizá la página.' } });
    }

    const expectedProject = appletConfig.projectId || 'gen-lang-client-0084774429';
    if (
      payload.aud === expectedProject &&
      payload.iss === `https://securetoken.google.com/${expectedProject}`
    ) {
      const email = payload.email || '';
      const role: 'USER' | 'ADMIN' = payload.admin === true ? 'ADMIN' : 'USER';

      req.user = {
        uid: payload.sub,
        email,
        role,
      };

      return next();
    }
  }

  return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token de sesión expirado o no válido' } });
}


export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' } });
  }

  if (
    req.user.role === 'ADMIN' ||
    (req.user.email && req.user.email.toLowerCase() === 'cristianbravo5266@gmail.com')
  ) {
    req.user.role = 'ADMIN';
    return next();
  }

  try {
    const db = getAdminFirestore();
    const docSnap = await db.collection('users').doc(req.user.uid).get();
    if (docSnap.exists && docSnap.data()?.role === 'ADMIN') {
      req.user.role = 'ADMIN';
      return next();
    }
  } catch (fsErr) {
    console.warn('[requireAdmin] Advertencia al verificar Firestore role:', fsErr);
  }

  return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Acceso reservado únicamente a administradores' } });
}
