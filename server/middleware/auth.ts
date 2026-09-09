import { Request, Response, NextFunction } from 'express';
import { getAdminAuth } from '../auth/firebaseAdmin';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: 'USER' | 'ADMIN';
  };
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
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token de sesión expirado o no válido' } });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' } });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Acceso reservado únicamente a administradores' } });
  }

  return next();
}
