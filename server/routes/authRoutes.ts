import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { getAdminAuth, getAdminFirestore } from '../auth/firebaseAdmin';

const router = Router();
router.use(authenticateUser);

const CURRENT_LEGAL_VERSION = '2026-09-14';

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

/**
 * Record explicit acceptance of the current Terms and Privacy Notice.
 * This is intentionally server-side so Firestore client rules do not need to
 * allow arbitrary edits to legal/audit fields on the user profile.
 */
router.post('/legal-acceptance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado' } });

    const acceptedAt = new Date().toISOString();
    const db = getAdminFirestore();
    await db.collection('users').doc(uid).set({
      legalVersion: CURRENT_LEGAL_VERSION,
      legalAcceptedAt: acceptedAt,
      termsAcceptedAt: acceptedAt,
      privacyNoticeVersion: CURRENT_LEGAL_VERSION,
      updatedAt: acceptedAt,
    }, { merge: true });

    return res.json({
      success: true,
      legalVersion: CURRENT_LEGAL_VERSION,
      acceptedAt,
    });
  } catch (error: any) {
    console.error('[AuthLegal] Error al guardar aceptación legal:', error);
    return res.status(500).json({ error: { code: 'LEGAL_ACCEPTANCE_FAILED', message: 'No se pudo registrar la aceptación legal.' } });
  }
});

/**
 * Permanently delete the authenticated user's account and first-party data.
 * Anonymous aggregate analytics are not linked to the user and therefore are
 * intentionally retained as aggregate statistics.
 */
router.delete('/account', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado' } });

    const db = getAdminFirestore();
    const collections = ['favorites', 'reports', 'comments'];
    const deletedCounts: Record<string, number> = {};

    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).where('userId', '==', uid).get();
      deletedCounts[collectionName] = snapshot.size;

      const docs = snapshot.docs;
      for (let index = 0; index < docs.length; index += 450) {
        const batch = db.batch();
        for (const item of docs.slice(index, index + 450)) batch.delete(item.ref);
        await batch.commit();
      }
    }

    await db.collection('users').doc(uid).delete();
    await getAdminAuth().deleteUser(uid);

    return res.json({ success: true, deleted: deletedCounts });
  } catch (error: any) {
    console.error('[AuthAccount] Error eliminando cuenta:', error);
    return res.status(500).json({ error: { code: 'ACCOUNT_DELETE_FAILED', message: 'No se pudo eliminar completamente la cuenta. No cierres la sesión y contactá al soporte de CociFlash.' } });
  }
});

export default router;
