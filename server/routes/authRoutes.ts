import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { getAdminAuth, getAdminFirestore } from '../auth/firebaseAdmin';

const router = Router();
router.use(authenticateUser);

/**
 * One-time/allowlisted admin bootstrap.
 * The caller must be authenticated AND their email must be explicitly present
 * in ADMIN_BOOTSTRAP_EMAILS. Never allow arbitrary self-promotion.
 */
router.post('/claim-admin', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = (req.user?.email || '').trim().toLowerCase();
    const allowedEmails = (process.env.ADMIN_BOOTSTRAP_EMAILS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (!uid || !email) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado' } });
    }

    if (!allowedEmails.includes(email)) {
      return res.status(403).json({ error: { code: 'ADMIN_BOOTSTRAP_FORBIDDEN', message: 'Este usuario no está autorizado para activar el administrador.' } });
    }

    const adminAuth = getAdminAuth();
    const currentUser = await adminAuth.getUser(uid);
    const currentClaims = currentUser.customClaims || {};
    await adminAuth.setCustomUserClaims(uid, { ...currentClaims, admin: true });

    const db = getAdminFirestore();
    const userRef = db.collection('users').doc(uid);
    const now = new Date().toISOString();
    await userRef.set({
      id: uid,
      uid,
      email,
      displayName: req.user?.displayName || email.split('@')[0],
      photoURL: req.user?.photoURL || '',
      role: 'ADMIN',
      updatedAt: now,
    }, { merge: true });

    return res.json({ success: true, message: 'Administrador activado correctamente. Cerrá sesión y volvé a ingresar para renovar el token.' });
  } catch (error: any) {
    console.error('[AuthAdmin] Error al procesar bootstrap de admin:', error);
    return res.status(500).json({ error: { code: 'ADMIN_CLAIM_FAILED', message: 'No se pudo activar el administrador.' } });
  }
});

export default router;
